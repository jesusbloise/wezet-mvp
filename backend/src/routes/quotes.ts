import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool";
import { requireAuth } from "../middlewares/requireAuth";
import { requireProducer } from "../middlewares/requireProducer";

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

function getProducerOrgId(req: any, res: any): string | null {
  const orgId = req.user?.orgId;
  if (typeof orgId !== "string" || !orgId) {
    res.status(403).json({ ok: false, error: "No orgId" });
    return null;
  }
  return orgId;
}

async function assertProjectOwner(projectId: string, producerOrgId: string) {
  const pr = await pool.query(
    `SELECT id, title, currency FROM projects WHERE id = $1 AND producer_org_id = $2`,
    [projectId, producerOrgId]
  );
  return pr.rowCount ? pr.rows[0] : null;
}

async function assertQuoteOwner(quoteId: string, producerOrgId: string) {
  const r = await pool.query(
    `SELECT * FROM project_quotes WHERE id = $1 AND producer_org_id = $2`,
    [quoteId, producerOrgId]
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
 * GET /projects/:projectId/quotes
 */
router.get("/projects/:projectId/quotes", requireAuth, requireProducer, async (req, res) => {
  const producerOrgId = getProducerOrgId(req, res);
  if (!producerOrgId) return;

  const projectId = req.params?.projectId;
  if (typeof projectId !== "string" || !uuid.safeParse(projectId).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const pr = await assertProjectOwner(projectId, producerOrgId);
  if (!pr) return res.status(404).json({ ok: false, error: "Project not found" });

  const r = await pool.query(
    `SELECT id, status, client_name, client_email, currency, total_amount, valid_until, public_id, created_at, updated_at
     FROM project_quotes
     WHERE project_id = $1 AND producer_org_id = $2
     ORDER BY created_at DESC`,
    [projectId, producerOrgId]
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
  tax_rate: z.coerce.number().min(0).max(1).optional(), // 0.19
  valid_until: z.string().optional(), // YYYY-MM-DD
  notes: z.string().max(10000).optional(),
  terms: z.string().max(10000).optional(),
});

router.post("/projects/:projectId/quotes", requireAuth, requireProducer, async (req, res) => {
  const producerOrgId = getProducerOrgId(req, res);
  if (!producerOrgId) return;
  getUserId(req, res); // solo para asegurar sesión, no lo usamos aquí

  const projectId = req.params?.projectId;
  if (typeof projectId !== "string" || !uuid.safeParse(projectId).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const parsed = createQuoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const pr = await assertProjectOwner(projectId, producerOrgId);
  if (!pr) return res.status(404).json({ ok: false, error: "Project not found" });

  const data = parsed.data;

  const r = await pool.query(
    `INSERT INTO project_quotes (
      project_id, producer_org_id, status,
      client_name, client_email,
      currency, discount, tax_rate,
      valid_until, notes, terms
     )
     VALUES ($1,$2,'draft',$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      projectId,
      producerOrgId,
      data.client_name || null,
      data.client_email || null,
      data.currency || pr.currency || "CLP",
      data.discount ?? 0,
      data.tax_rate ?? 0,
      data.valid_until || null,
      data.notes || null,
      data.terms || null,
    ]
  );

  res.json({ ok: true, quote: r.rows[0] });
});

/**
 * GET /quotes/:quoteId (detalle + items)
 */
router.get("/quotes/:quoteId", requireAuth, requireProducer, async (req, res) => {
  const producerOrgId = getProducerOrgId(req, res);
  if (!producerOrgId) return;

  const quoteId = req.params?.quoteId;
  if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
    return res.status(400).json({ ok: false, error: "Invalid quote id" });
  }

  const q = await assertQuoteOwner(quoteId, producerOrgId);
  if (!q) return res.status(404).json({ ok: false, error: "Quote not found" });

  const items = await pool.query(
    `SELECT id, title, description, qty, unit_price, line_total, sort_order
     FROM quote_items
     WHERE quote_id = $1
     ORDER BY sort_order ASC, created_at ASC NULLS LAST`,
    [quoteId]
  ).catch(async () => {
    // si tu tabla no tiene created_at, no pasa nada
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

router.patch("/quotes/:quoteId", requireAuth, requireProducer, async (req, res) => {
  const producerOrgId = getProducerOrgId(req, res);
  if (!producerOrgId) return;

  const quoteId = req.params?.quoteId;
  if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
    return res.status(400).json({ ok: false, error: "Invalid quote id" });
  }

  const parsed = updateQuoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const q = await assertQuoteOwner(quoteId, producerOrgId);
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

router.post("/quotes/:quoteId/items", requireAuth, requireProducer, async (req, res) => {
  const producerOrgId = getProducerOrgId(req, res);
  if (!producerOrgId) return;

  const quoteId = req.params?.quoteId;
  if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
    return res.status(400).json({ ok: false, error: "Invalid quote id" });
  }

  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const q = await assertQuoteOwner(quoteId, producerOrgId);
  if (!q) return res.status(404).json({ ok: false, error: "Quote not found" });

  const d = parsed.data;
  const qty = d.qty ?? 1;
  const unit = d.unit_price ?? 0;
  const line = qty * unit;

  const r = await pool.query(
    `INSERT INTO quote_items (quote_id, title, description, qty, unit_price, line_total, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [quoteId, d.title, d.description || null, qty, unit, line, d.sort_order ?? 0]
  );

  const totals = await recalcQuoteTotals(quoteId);
  res.json({ ok: true, item: r.rows[0], totals });
});

/**
 * POST /quotes/:quoteId/publish  (genera link público)
 */
router.post("/quotes/:quoteId/publish", requireAuth, requireProducer, async (req, res) => {
  const producerOrgId = getProducerOrgId(req, res);
  if (!producerOrgId) return;

  const quoteId = req.params?.quoteId;
  if (typeof quoteId !== "string" || !uuid.safeParse(quoteId).success) {
    return res.status(400).json({ ok: false, error: "Invalid quote id" });
  }

  const q = await assertQuoteOwner(quoteId, producerOrgId);
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

export default router;