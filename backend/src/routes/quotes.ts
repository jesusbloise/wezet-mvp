import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool";
import { requireAuth } from "../middlewares/requireAuth";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const router = Router();
const uuid = z.string().uuid();

function getUserId(req: any, res: any): string | null {
  const userId = req.user?.userId;
  if (typeof userId !== "string" || !userId) {
    res.status(401).json({ ok: false, error: "No userId" });
    return null;
  }
  return userId;
}

function getOwnerOrgId(req: any): string | null {
  const orgId = req.user?.orgId;
  return typeof orgId === "string" && orgId ? orgId : null;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getApiBaseUrl(req: any) {
  const envBase = process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL;
  if (envBase && typeof envBase === "string") {
    return envBase.replace(/\/+$/, "");
  }

  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.get("host");
  return `${protocol}://${host}`;
}

async function assertProjectOwner(projectId: string, ownerUserId: string) {
  const pr = await pool.query(
    `SELECT id, title, currency, producer_org_id, created_by
     FROM projects
     WHERE id = $1 AND created_by = $2`,
    [projectId, ownerUserId]
  );
  return pr.rowCount ? pr.rows[0] : null;
}

async function assertQuoteOwner(quoteId: string, ownerUserId: string) {
  const r = await pool.query(
    `
    SELECT q.*
    FROM project_quotes q
    JOIN projects p ON p.id = q.project_id
    WHERE q.id = $1
      AND p.created_by = $2
    `,
    [quoteId, ownerUserId]
  );
  return r.rowCount ? r.rows[0] : null;
}

async function assertQuoteItemOwner(itemId: string, ownerUserId: string) {
  const r = await pool.query(
    `
    SELECT qi.*, q.id AS quote_id
    FROM quote_items qi
    JOIN project_quotes q ON q.id = qi.quote_id
    JOIN projects p ON p.id = q.project_id
    WHERE qi.id = $1
      AND p.created_by = $2
    LIMIT 1
    `,
    [itemId, ownerUserId]
  );

  return r.rowCount ? r.rows[0] : null;
}

async function recalcQuoteTotals(quoteId: string) {
  const items = await pool.query(
    `SELECT COALESCE(SUM(line_total), 0) AS subtotal
     FROM quote_items WHERE quote_id = $1`,
    [quoteId]
  );

  const q = await pool.query(
    `SELECT discount, tax_rate FROM project_quotes WHERE id = $1`,
    [quoteId]
  );

  const subtotal = Number(items.rows[0].subtotal || 0);
  const discount = Number(q.rows[0]?.discount || 0);
  const taxRate = Number(q.rows[0]?.tax_rate || 0);

  const base = Math.max(0, subtotal - discount);
  const taxAmount = base * taxRate;
  const total = base + taxAmount;

  await pool.query(
    `UPDATE project_quotes
     SET subtotal = $2, tax_amount = $3, total_amount = $4, updated_at = now()
     WHERE id = $1`,
    [quoteId, subtotal, taxAmount, total]
  );

  return { subtotal, discount, taxRate, taxAmount, total };
}

/**
 * POST /quotes/upload-attachment
 * Sube un adjunto y devuelve una URL pública
 */
const uploadAttachmentSchema = z.object({
  file_name: z.string().min(1).max(500),
  mime_type: z.string().min(1).max(255),
  content_base64: z.string().min(1),
});

router.post("/quotes/upload-attachment", requireAuth, async (req, res) => {
  const ownerUserId = getUserId(req, res);
  if (!ownerUserId) return;

  const parsed = uploadAttachmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  try {
    const { file_name, mime_type, content_base64 } = parsed.data;

    const cleanName = sanitizeFileName(file_name);
    const ext = path.extname(cleanName);
    const base = path.basename(cleanName, ext);
    const unique = `${Date.now()}-${crypto.randomUUID()}`;
    const finalName = `${base}-${unique}${ext}`;

    const uploadDir = path.resolve(process.cwd(), "uploads", "quote-attachments");
    await fs.mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(content_base64, "base64");

    const maxSize = 15 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return res.status(400).json({ ok: false, error: "File exceeds 15 MB limit" });
    }

    const absolutePath = path.join(uploadDir, finalName);
    await fs.writeFile(absolutePath, buffer);

    const baseUrl = getApiBaseUrl(req);
    const publicPath = `/uploads/quote-attachments/${finalName}`;
    const url = `${baseUrl}${publicPath}`;

    return res.json({
      ok: true,
      file: {
        file_name,
        mime_type,
        url,
      },
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e?.message || "Could not upload attachment",
    });
  }
});

/**
 * GET /projects/:projectId/quotes
 */
router.get("/projects/:projectId/quotes", requireAuth, async (req, res) => {
  const ownerUserId = getUserId(req, res);
  if (!ownerUserId) return;

  const projectId = req.params?.projectId;
  if (typeof projectId !== "string" || !uuid.safeParse(projectId).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const pr = await assertProjectOwner(projectId, ownerUserId);
  if (!pr) return res.status(404).json({ ok: false, error: "Project not found" });

  const r = await pool.query(
    `SELECT
       id,
       status,
       client_name,
       client_email,
       currency,
       total_amount,
       valid_until,
       public_id,
       attachment_name,
       attachment_url,
       attachment_mime_type,
       created_at,
       updated_at
     FROM project_quotes
     WHERE project_id = $1
     ORDER BY created_at DESC`,
    [projectId]
  );

  res.json({ ok: true, quotes: r.rows });
});

/**
 * POST /projects/:projectId/quotes  (crear quote)
 */
const createQuoteSchema = z.object({
  client_name: z.string().min(2).optional(),
  client_email: z.string().email().optional(),
  currency: z.string().min(1).max(10).optional(),
  discount: z.coerce.number().min(0).optional(),
  tax_rate: z.coerce.number().min(0).max(1).optional(),
  valid_until: z.string().optional(),
  notes: z.string().max(10000).optional(),
  terms: z.string().max(10000).optional(),
  attachment_name: z.string().max(500).optional(),
  attachment_url: z.string().max(4000).optional(),
  attachment_mime_type: z.string().max(255).optional(),
});

router.post("/projects/:projectId/quotes", requireAuth, async (req, res) => {
  const ownerUserId = getUserId(req, res);
  if (!ownerUserId) return;

  const ownerOrgId = getOwnerOrgId(req);

  const projectId = req.params?.projectId;
  if (typeof projectId !== "string" || !uuid.safeParse(projectId).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const parsed = createQuoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const pr = await assertProjectOwner(projectId, ownerUserId);
  if (!pr) return res.status(404).json({ ok: false, error: "Project not found" });

  const data = parsed.data;

  const r = await pool.query(
    `INSERT INTO project_quotes (
      project_id,
      producer_org_id,
      status,
      client_name,
      client_email,
      currency,
      discount,
      tax_rate,
      valid_until,
      notes,
      terms,
      attachment_name,
      attachment_url,
      attachment_mime_type
     )
     VALUES ($1,$2,'draft',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      projectId,
      ownerOrgId,
      data.client_name || null,
      data.client_email || null,
      data.currency || pr.currency || "CLP",
      data.discount ?? 0,
      data.tax_rate ?? 0,
      data.valid_until || null,
      data.notes || null,
      data.terms || null,
      data.attachment_name || null,
      data.attachment_url || null,
      data.attachment_mime_type || null,
    ]
  );

  res.json({ ok: true, quote: r.rows[0] });
});

/**
 * GET /quotes/:quoteId (detalle + items)
 */
router.get("/quotes/:quoteId", requireAuth, async (req, res) => {
  const ownerUserId = getUserId(req, res);
  if (!ownerUserId) return;

  const quoteId = req.params?.quoteId;
  if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
    return res.status(400).json({ ok: false, error: "Invalid quote id" });
  }

  const q = await assertQuoteOwner(quoteId, ownerUserId);
  if (!q) return res.status(404).json({ ok: false, error: "Quote not found" });

  const items = await pool.query(
    `SELECT id, title, description, qty, unit_price, line_total, sort_order
     FROM quote_items
     WHERE quote_id = $1
     ORDER BY sort_order ASC, created_at ASC NULLS LAST`,
    [quoteId]
  ).catch(async () => {
    const items2 = await pool.query(
      `SELECT id, title, description, qty, unit_price, line_total, sort_order
       FROM quote_items
       WHERE quote_id = $1
       ORDER BY sort_order ASC`,
      [quoteId]
    );
    return items2;
  });

  res.json({ ok: true, quote: q, items: items.rows });
});

/**
 * PATCH /quotes/:quoteId (update quote)
 */
const updateQuoteSchema = createQuoteSchema.extend({
  status: z.enum(["draft", "sent", "accepted", "rejected", "archived"]).optional(),
});

router.patch("/quotes/:quoteId", requireAuth, async (req, res) => {
  const ownerUserId = getUserId(req, res);
  if (!ownerUserId) return;

  const quoteId = req.params?.quoteId;
  if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
    return res.status(400).json({ ok: false, error: "Invalid quote id" });
  }

  const parsed = updateQuoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const q = await assertQuoteOwner(quoteId, ownerUserId);
  if (!q) return res.status(404).json({ ok: false, error: "Quote not found" });

  const d = parsed.data;

  await pool.query(
    `UPDATE project_quotes
     SET
       status = COALESCE($2, status),
       client_name = COALESCE($3, client_name),
       client_email = COALESCE($4, client_email),
       currency = COALESCE($5, currency),
       discount = COALESCE($6, discount),
       tax_rate = COALESCE($7, tax_rate),
       valid_until = COALESCE($8, valid_until),
       notes = COALESCE($9, notes),
       terms = COALESCE($10, terms),
       attachment_name = COALESCE($11, attachment_name),
       attachment_url = COALESCE($12, attachment_url),
       attachment_mime_type = COALESCE($13, attachment_mime_type),
       updated_at = now()
     WHERE id = $1`,
    [
      quoteId,
      d.status || null,
      d.client_name || null,
      d.client_email || null,
      d.currency || null,
      d.discount ?? null,
      d.tax_rate ?? null,
      d.valid_until || null,
      d.notes || null,
      d.terms || null,
      d.attachment_name || null,
      d.attachment_url || null,
      d.attachment_mime_type || null,
    ]
  );

  const totals = await recalcQuoteTotals(quoteId);
  const updated = await pool.query(`SELECT * FROM project_quotes WHERE id = $1`, [quoteId]);

  res.json({ ok: true, quote: updated.rows[0], totals });
});

/**
 * POST /quotes/:quoteId/items (add item)
 */
const addItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  qty: z.coerce.number().positive().optional(),
  unit_price: z.coerce.number().min(0).optional(),
  sort_order: z.coerce.number().int().optional(),
});

router.post("/quotes/:quoteId/items", requireAuth, async (req, res) => {
  const ownerUserId = getUserId(req, res);
  if (!ownerUserId) return;

  const quoteId = req.params?.quoteId;
  if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
    return res.status(400).json({ ok: false, error: "Invalid quote id" });
  }

  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const q = await assertQuoteOwner(quoteId, ownerUserId);
  if (!q) return res.status(404).json({ ok: false, error: "Quote not found" });

  const d = parsed.data;
  const qty = d.qty ?? 1;
  const unit = d.unit_price ?? 0;
  const line = qty * unit;

  const r = await pool.query(
    `INSERT INTO quote_items (quote_id, title, description, qty, unit_price, total, line_total, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [quoteId, d.title, d.description || null, qty, unit, line, line, d.sort_order ?? 0]
  );

  const totals = await recalcQuoteTotals(quoteId);
  res.json({ ok: true, item: r.rows[0], totals });
});

/**
 * POST /quotes/:quoteId/publish  (genera link público)
 */
router.post("/quotes/:quoteId/publish", requireAuth, async (req, res) => {
  const ownerUserId = getUserId(req, res);
  if (!ownerUserId) return;

  const quoteId = req.params?.quoteId;
  if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
    return res.status(400).json({ ok: false, error: "Invalid quote id" });
  }

  const q = await assertQuoteOwner(quoteId, ownerUserId);
  if (!q) return res.status(404).json({ ok: false, error: "Quote not found" });

  const publicId = q.public_id || (await pool.query(`SELECT gen_random_uuid() AS id`)).rows[0].id;

  await pool.query(
    `UPDATE project_quotes
     SET public_id = $2, status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END, updated_at = now()
     WHERE id = $1`,
    [quoteId, publicId]
  );

  const updated = await pool.query(`SELECT * FROM project_quotes WHERE id = $1`, [quoteId]);

  res.json({ ok: true, quote: updated.rows[0], public_url: `/quote/${publicId}` });
});

/**
 * DELETE /quotes/:quoteId
 */
router.delete("/quotes/:quoteId", requireAuth, async (req, res) => {
  const ownerUserId = getUserId(req, res);
  if (!ownerUserId) return;

  const quoteId = req.params?.quoteId;
  if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
    return res.status(400).json({ ok: false, error: "Invalid quote id" });
  }

  const q = await assertQuoteOwner(quoteId, ownerUserId);
  if (!q) {
    return res.status(404).json({ ok: false, error: "Quote not found" });
  }

  await pool.query(`DELETE FROM project_quotes WHERE id = $1`, [quoteId]);

  return res.json({ ok: true, deleted: true, quoteId });
});

/**
 * DELETE /quotes/:quoteId/items/:itemId
 */
router.delete("/quotes/:quoteId/items/:itemId", requireAuth, async (req, res) => {
  const ownerUserId = getUserId(req, res);
  if (!ownerUserId) return;

  const quoteId = req.params?.quoteId;
  const itemId = req.params?.itemId;

  if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
    return res.status(400).json({ ok: false, error: "Invalid quote id" });
  }

  if (typeof itemId !== "string" || !uuid.safeParse(itemId).success) {
    return res.status(400).json({ ok: false, error: "Invalid item id" });
  }

  const q = await assertQuoteOwner(quoteId, ownerUserId);
  if (!q) {
    return res.status(404).json({ ok: false, error: "Quote not found" });
  }

  const item = await assertQuoteItemOwner(itemId, ownerUserId);
  if (!item || item.quote_id !== quoteId) {
    return res.status(404).json({ ok: false, error: "Item not found" });
  }

  await pool.query(`DELETE FROM quote_items WHERE id = $1`, [itemId]);

  const totals = await recalcQuoteTotals(quoteId);

  return res.json({
    ok: true,
    deleted: true,
    itemId,
    quoteId,
    totals,
  });
});

export default router;
// import { Router } from "express";
// import { z } from "zod";
// import pool from "../db/pool";
// import { requireAuth } from "../middlewares/requireAuth";

// const router = Router();
// const uuid = z.string().uuid();

// function getUserId(req: any, res: any): string | null {
//   const userId = req.user?.userId;
//   if (typeof userId !== "string" || !userId) {
//     res.status(401).json({ ok: false, error: "No userId" });
//     return null;
//   }
//   return userId;
// }

// function getOwnerOrgId(req: any): string | null {
//   const orgId = req.user?.orgId;
//   return typeof orgId === "string" && orgId ? orgId : null;
// }

// async function assertProjectOwner(projectId: string, ownerUserId: string) {
//   const pr = await pool.query(
//     `SELECT id, title, currency, producer_org_id, created_by
//      FROM projects
//      WHERE id = $1 AND created_by = $2`,
//     [projectId, ownerUserId]
//   );
//   return pr.rowCount ? pr.rows[0] : null;
// }

// async function assertQuoteOwner(quoteId: string, ownerUserId: string) {
//   const r = await pool.query(
//     `
//     SELECT q.*
//     FROM project_quotes q
//     JOIN projects p ON p.id = q.project_id
//     WHERE q.id = $1
//       AND p.created_by = $2
//     `,
//     [quoteId, ownerUserId]
//   );
//   return r.rowCount ? r.rows[0] : null;
// }

// async function assertQuoteItemOwner(itemId: string, ownerUserId: string) {
//   const r = await pool.query(
//     `
//     SELECT qi.*, q.id AS quote_id
//     FROM quote_items qi
//     JOIN project_quotes q ON q.id = qi.quote_id
//     JOIN projects p ON p.id = q.project_id
//     WHERE qi.id = $1
//       AND p.created_by = $2
//     LIMIT 1
//     `,
//     [itemId, ownerUserId]
//   );

//   return r.rowCount ? r.rows[0] : null;
// }

// async function recalcQuoteTotals(quoteId: string) {
//   const items = await pool.query(
//     `SELECT COALESCE(SUM(line_total), 0) AS subtotal
//      FROM quote_items WHERE quote_id = $1`,
//     [quoteId]
//   );

//   const q = await pool.query(
//     `SELECT discount, tax_rate FROM project_quotes WHERE id = $1`,
//     [quoteId]
//   );

//   const subtotal = Number(items.rows[0].subtotal || 0);
//   const discount = Number(q.rows[0]?.discount || 0);
//   const taxRate = Number(q.rows[0]?.tax_rate || 0);

//   const base = Math.max(0, subtotal - discount);
//   const taxAmount = base * taxRate;
//   const total = base + taxAmount;

//   await pool.query(
//     `UPDATE project_quotes
//      SET subtotal = $2, tax_amount = $3, total_amount = $4, updated_at = now()
//      WHERE id = $1`,
//     [quoteId, subtotal, taxAmount, total]
//   );

//   return { subtotal, discount, taxRate, taxAmount, total };
// }

// /**
//  * GET /projects/:projectId/quotes
//  */
// router.get("/projects/:projectId/quotes", requireAuth, async (req, res) => {
//   const ownerUserId = getUserId(req, res);
//   if (!ownerUserId) return;

//   const projectId = req.params?.projectId;
//   if (typeof projectId !== "string" || !uuid.safeParse(projectId).success) {
//     return res.status(400).json({ ok: false, error: "Invalid project id" });
//   }

//   const pr = await assertProjectOwner(projectId, ownerUserId);
//   if (!pr) return res.status(404).json({ ok: false, error: "Project not found" });

//   const r = await pool.query(
//     `SELECT
//        id,
//        status,
//        client_name,
//        client_email,
//        currency,
//        total_amount,
//        valid_until,
//        public_id,
//        attachment_name,
//        attachment_url,
//        attachment_mime_type,
//        created_at,
//        updated_at
//      FROM project_quotes
//      WHERE project_id = $1
//      ORDER BY created_at DESC`,
//     [projectId]
//   );

//   res.json({ ok: true, quotes: r.rows });
// });

// /**
//  * POST /projects/:projectId/quotes  (crear quote)
//  */
// const createQuoteSchema = z.object({
//   client_name: z.string().min(2).optional(),
//   client_email: z.string().email().optional(),
//   currency: z.string().min(1).max(10).optional(),
//   discount: z.coerce.number().min(0).optional(),
//   tax_rate: z.coerce.number().min(0).max(1).optional(),
//   valid_until: z.string().optional(),
//   notes: z.string().max(10000).optional(),
//   terms: z.string().max(10000).optional(),
//   attachment_name: z.string().max(500).optional(),
//   attachment_url: z.string().max(4000).optional(),
//   attachment_mime_type: z.string().max(255).optional(),
// });

// router.post("/projects/:projectId/quotes", requireAuth, async (req, res) => {
//   const ownerUserId = getUserId(req, res);
//   if (!ownerUserId) return;

//   const ownerOrgId = getOwnerOrgId(req);

//   const projectId = req.params?.projectId;
//   if (typeof projectId !== "string" || !uuid.safeParse(projectId).success) {
//     return res.status(400).json({ ok: false, error: "Invalid project id" });
//   }

//   const parsed = createQuoteSchema.safeParse(req.body);
//   if (!parsed.success) {
//     return res.status(400).json({ ok: false, error: parsed.error.flatten() });
//   }

//   const pr = await assertProjectOwner(projectId, ownerUserId);
//   if (!pr) return res.status(404).json({ ok: false, error: "Project not found" });

//   const data = parsed.data;

//   const r = await pool.query(
//     `INSERT INTO project_quotes (
//       project_id,
//       producer_org_id,
//       status,
//       client_name,
//       client_email,
//       currency,
//       discount,
//       tax_rate,
//       valid_until,
//       notes,
//       terms,
//       attachment_name,
//       attachment_url,
//       attachment_mime_type
//      )
//      VALUES ($1,$2,'draft',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
//      RETURNING *`,
//     [
//       projectId,
//       ownerOrgId,
//       data.client_name || null,
//       data.client_email || null,
//       data.currency || pr.currency || "CLP",
//       data.discount ?? 0,
//       data.tax_rate ?? 0,
//       data.valid_until || null,
//       data.notes || null,
//       data.terms || null,
//       data.attachment_name || null,
//       data.attachment_url || null,
//       data.attachment_mime_type || null,
//     ]
//   );

//   res.json({ ok: true, quote: r.rows[0] });
// });

// /**
//  * GET /quotes/:quoteId (detalle + items)
//  */
// router.get("/quotes/:quoteId", requireAuth, async (req, res) => {
//   const ownerUserId = getUserId(req, res);
//   if (!ownerUserId) return;

//   const quoteId = req.params?.quoteId;
//   if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
//     return res.status(400).json({ ok: false, error: "Invalid quote id" });
//   }

//   const q = await assertQuoteOwner(quoteId, ownerUserId);
//   if (!q) return res.status(404).json({ ok: false, error: "Quote not found" });

//   const items = await pool.query(
//     `SELECT id, title, description, qty, unit_price, line_total, sort_order
//      FROM quote_items
//      WHERE quote_id = $1
//      ORDER BY sort_order ASC, created_at ASC NULLS LAST`,
//     [quoteId]
//   ).catch(async () => {
//     const items2 = await pool.query(
//       `SELECT id, title, description, qty, unit_price, line_total, sort_order
//        FROM quote_items
//        WHERE quote_id = $1
//        ORDER BY sort_order ASC`,
//       [quoteId]
//     );
//     return items2;
//   });

//   res.json({ ok: true, quote: q, items: items.rows });
// });

// /**
//  * PATCH /quotes/:quoteId (update quote)
//  */
// const updateQuoteSchema = createQuoteSchema.extend({
//   status: z.enum(["draft", "sent", "accepted", "rejected", "archived"]).optional(),
// });

// router.patch("/quotes/:quoteId", requireAuth, async (req, res) => {
//   const ownerUserId = getUserId(req, res);
//   if (!ownerUserId) return;

//   const quoteId = req.params?.quoteId;
//   if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
//     return res.status(400).json({ ok: false, error: "Invalid quote id" });
//   }

//   const parsed = updateQuoteSchema.safeParse(req.body);
//   if (!parsed.success) {
//     return res.status(400).json({ ok: false, error: parsed.error.flatten() });
//   }

//   const q = await assertQuoteOwner(quoteId, ownerUserId);
//   if (!q) return res.status(404).json({ ok: false, error: "Quote not found" });

//   const d = parsed.data;

//   await pool.query(
//     `UPDATE project_quotes
//      SET
//        status = COALESCE($2, status),
//        client_name = COALESCE($3, client_name),
//        client_email = COALESCE($4, client_email),
//        currency = COALESCE($5, currency),
//        discount = COALESCE($6, discount),
//        tax_rate = COALESCE($7, tax_rate),
//        valid_until = COALESCE($8, valid_until),
//        notes = COALESCE($9, notes),
//        terms = COALESCE($10, terms),
//        attachment_name = COALESCE($11, attachment_name),
//        attachment_url = COALESCE($12, attachment_url),
//        attachment_mime_type = COALESCE($13, attachment_mime_type),
//        updated_at = now()
//      WHERE id = $1`,
//     [
//       quoteId,
//       d.status || null,
//       d.client_name || null,
//       d.client_email || null,
//       d.currency || null,
//       d.discount ?? null,
//       d.tax_rate ?? null,
//       d.valid_until || null,
//       d.notes || null,
//       d.terms || null,
//       d.attachment_name || null,
//       d.attachment_url || null,
//       d.attachment_mime_type || null,
//     ]
//   );

//   const totals = await recalcQuoteTotals(quoteId);
//   const updated = await pool.query(`SELECT * FROM project_quotes WHERE id = $1`, [quoteId]);

//   res.json({ ok: true, quote: updated.rows[0], totals });
// });

// /**
//  * POST /quotes/:quoteId/items (add item)
//  */
// const addItemSchema = z.object({
//   title: z.string().min(1),
//   description: z.string().optional(),
//   qty: z.coerce.number().positive().optional(),
//   unit_price: z.coerce.number().min(0).optional(),
//   sort_order: z.coerce.number().int().optional(),
// });

// router.post("/quotes/:quoteId/items", requireAuth, async (req, res) => {
//   const ownerUserId = getUserId(req, res);
//   if (!ownerUserId) return;

//   const quoteId = req.params?.quoteId;
//   if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
//     return res.status(400).json({ ok: false, error: "Invalid quote id" });
//   }

//   const parsed = addItemSchema.safeParse(req.body);
//   if (!parsed.success) {
//     return res.status(400).json({ ok: false, error: parsed.error.flatten() });
//   }

//   const q = await assertQuoteOwner(quoteId, ownerUserId);
//   if (!q) return res.status(404).json({ ok: false, error: "Quote not found" });

//   const d = parsed.data;
//   const qty = d.qty ?? 1;
//   const unit = d.unit_price ?? 0;
//   const line = qty * unit;

//   const r = await pool.query(
//     `INSERT INTO quote_items (quote_id, title, description, qty, unit_price, total, line_total, sort_order)
//      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
//      RETURNING *`,
//     [quoteId, d.title, d.description || null, qty, unit, line, line, d.sort_order ?? 0]
//   );

//   const totals = await recalcQuoteTotals(quoteId);
//   res.json({ ok: true, item: r.rows[0], totals });
// });

// /**
//  * POST /quotes/:quoteId/publish  (genera link público)
//  */
// router.post("/quotes/:quoteId/publish", requireAuth, async (req, res) => {
//   const ownerUserId = getUserId(req, res);
//   if (!ownerUserId) return;

//   const quoteId = req.params?.quoteId;
//   if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
//     return res.status(400).json({ ok: false, error: "Invalid quote id" });
//   }

//   const q = await assertQuoteOwner(quoteId, ownerUserId);
//   if (!q) return res.status(404).json({ ok: false, error: "Quote not found" });

//   const publicId = q.public_id || (await pool.query(`SELECT gen_random_uuid() AS id`)).rows[0].id;

//   await pool.query(
//     `UPDATE project_quotes
//      SET public_id = $2, status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END, updated_at = now()
//      WHERE id = $1`,
//     [quoteId, publicId]
//   );

//   const updated = await pool.query(`SELECT * FROM project_quotes WHERE id = $1`, [quoteId]);

//   res.json({ ok: true, quote: updated.rows[0], public_url: `/quote/${publicId}` });
// });

// /**
//  * DELETE /quotes/:quoteId
//  */
// router.delete("/quotes/:quoteId", requireAuth, async (req, res) => {
//   const ownerUserId = getUserId(req, res);
//   if (!ownerUserId) return;

//   const quoteId = req.params?.quoteId;
//   if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
//     return res.status(400).json({ ok: false, error: "Invalid quote id" });
//   }

//   const q = await assertQuoteOwner(quoteId, ownerUserId);
//   if (!q) {
//     return res.status(404).json({ ok: false, error: "Quote not found" });
//   }

//   await pool.query(`DELETE FROM project_quotes WHERE id = $1`, [quoteId]);

//   return res.json({ ok: true, deleted: true, quoteId });
// });

// /**
//  * DELETE /quotes/:quoteId/items/:itemId
//  */
// router.delete("/quotes/:quoteId/items/:itemId", requireAuth, async (req, res) => {
//   const ownerUserId = getUserId(req, res);
//   if (!ownerUserId) return;

//   const quoteId = req.params?.quoteId;
//   const itemId = req.params?.itemId;

//   if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
//     return res.status(400).json({ ok: false, error: "Invalid quote id" });
//   }

//   if (typeof itemId !== "string" || !uuid.safeParse(itemId).success) {
//     return res.status(400).json({ ok: false, error: "Invalid item id" });
//   }

//   const q = await assertQuoteOwner(quoteId, ownerUserId);
//   if (!q) {
//     return res.status(404).json({ ok: false, error: "Quote not found" });
//   }

//   const item = await assertQuoteItemOwner(itemId, ownerUserId);
//   if (!item || item.quote_id !== quoteId) {
//     return res.status(404).json({ ok: false, error: "Item not found" });
//   }

//   await pool.query(`DELETE FROM quote_items WHERE id = $1`, [itemId]);

//   const totals = await recalcQuoteTotals(quoteId);

//   return res.json({
//     ok: true,
//     deleted: true,
//     itemId,
//     quoteId,
//     totals,
//   });
// });

// export default router;

