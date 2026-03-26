import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();
const uuid = z.string().uuid();

function getParamId(req: any, res: any): string | null {
  const id = req.params?.id;
  if (typeof id !== "string" || !uuid.safeParse(id).success) {
    res.status(400).json({ ok: false, error: "Invalid negotiation id" });
    return null;
  }
  return id;
}

function getUserId(req: any, res: any): string | null {
  const userId = req.user?.userId;
  if (typeof userId !== "string" || !userId) {
    res.status(401).json({ ok: false, error: "No userId" });
    return null;
  }
  return userId;
}

async function assertNegotiationAccess(negotiationId: string, userId: string) {
  const r = await pool.query(
    `
    SELECT
      n.id,
      n.project_id,
      n.producer_org_id,
      n.creative_user_id,
      n.status,
      n.created_at,
      p.created_by,
      p.title AS project_title
    FROM negotiations n
    JOIN projects p ON p.id = n.project_id
    WHERE n.id = $1
      AND (
        p.created_by = $2
        OR n.creative_user_id = $2
      )
    LIMIT 1
    `,
    [negotiationId, userId]
  );

  return r.rowCount ? r.rows[0] : null;
}

async function getUserSummary(userId: string) {
  const r = await pool.query(
    `
    SELECT
      u.id,
      u.email,
      cp.display_name
    FROM users u
    LEFT JOIN creative_profiles cp ON cp.user_id = u.id
    WHERE u.id = $1
    LIMIT 1
    `,
    [userId]
  );

  return r.rowCount ? r.rows[0] : null;
}

/**
 * GET /negotiations/:id
 */
router.get("/:id", requireAuth, async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const id = getParamId(req, res);
  if (!id) return;

  const n = await assertNegotiationAccess(id, userId);
  if (!n) {
    return res.status(404).json({ ok: false, error: "Negotiation not found" });
  }

  const me = await getUserSummary(userId);

  const counterpartUserId =
    String(n.created_by) === String(userId)
      ? n.creative_user_id
      : n.created_by;

  const counterpart = counterpartUserId
    ? await getUserSummary(counterpartUserId)
    : null;

  const creative = n.creative_user_id
    ? await getUserSummary(n.creative_user_id)
    : null;

  return res.json({
    ok: true,
    negotiation: n,
    me,
    counterpart,
    creative,
  });
});

/**
 * GET /negotiations/:id/messages
 */
router.get("/:id/messages", requireAuth, async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const id = getParamId(req, res);
  if (!id) return;

  const n = await assertNegotiationAccess(id, userId);
  if (!n) {
    return res.status(404).json({ ok: false, error: "Negotiation not found" });
  }

  const r = await pool.query(
    `SELECT m.id, m.message, m.created_at, m.sender_user_id, u.email
     FROM negotiation_messages m
     JOIN users u ON u.id = m.sender_user_id
     WHERE m.negotiation_id = $1
     ORDER BY m.created_at ASC`,
    [id]
  );

  const messages = r.rows.map((x: any) => ({
    id: x.id,
    body: x.message,
    created_at: x.created_at,
    sender_user_id: x.sender_user_id,
    email: x.email,
  }));

  return res.json({ ok: true, messages });
});

/**
 * POST /negotiations/:id/messages
 */
const messageSchema = z.object({
  body: z.string().min(1).max(5000),
});

router.post("/:id/messages", requireAuth, async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const id = getParamId(req, res);
  if (!id) return;

  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const n = await assertNegotiationAccess(id, userId);
  if (!n) {
    return res.status(404).json({ ok: false, error: "Negotiation not found" });
  }

  const r = await pool.query(
    `INSERT INTO negotiation_messages (negotiation_id, sender_user_id, message)
     VALUES ($1, $2, $3)
     RETURNING id, message, created_at, sender_user_id`,
    [id, userId, parsed.data.body]
  );

  return res.json({
    ok: true,
    message: {
      id: r.rows[0].id,
      body: r.rows[0].message,
      created_at: r.rows[0].created_at,
      sender_user_id: r.rows[0].sender_user_id,
    },
  });
});

/**
 * GET /negotiations/:id/offers
 */
router.get("/:id/offers", requireAuth, async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const id = getParamId(req, res);
  if (!id) return;

  const n = await assertNegotiationAccess(id, userId);
  if (!n) {
    return res.status(404).json({ ok: false, error: "Negotiation not found" });
  }

  const r = await pool.query(
    `SELECT
       o.id,
       o.amount,
       o.currency,
       o.notes as note,
       o.created_at,
       o.created_by as created_by_user_id,
       u.email
     FROM negotiation_offers o
     JOIN users u ON u.id = o.created_by
     WHERE o.negotiation_id = $1
     ORDER BY o.created_at DESC`,
    [id]
  );

  return res.json({ ok: true, offers: r.rows });
});

/**
 * POST /negotiations/:id/offers
 */
const offerSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().min(1).max(10).optional(),
  note: z.string().max(2000).optional(),
});

router.post("/:id/offers", requireAuth, async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const id = getParamId(req, res);
  if (!id) return;

  const parsed = offerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const n = await assertNegotiationAccess(id, userId);
  if (!n) {
    return res.status(404).json({ ok: false, error: "Negotiation not found" });
  }

  const r = await pool.query(
    `INSERT INTO negotiation_offers (negotiation_id, created_by, amount, currency, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING
       id,
       amount,
       currency,
       notes as note,
       created_at,
       created_by as created_by_user_id`,
    [id, userId, parsed.data.amount, parsed.data.currency || "CLP", parsed.data.note || null]
  );

  return res.json({ ok: true, offer: r.rows[0] });
});

export default router;


// import { Router } from "express";
// import { z } from "zod";
// import pool from "../db/pool";
// import { requireAuth } from "../middlewares/requireAuth";

// const router = Router();
// const uuid = z.string().uuid();

// function getParamId(req: any, res: any): string | null {
//   const id = req.params?.id;
//   if (typeof id !== "string" || !uuid.safeParse(id).success) {
//     res.status(400).json({ ok: false, error: "Invalid negotiation id" });
//     return null;
//   }
//   return id;
// }

// function getUserId(req: any, res: any): string | null {
//   const userId = req.user?.userId;
//   if (typeof userId !== "string" || !userId) {
//     res.status(401).json({ ok: false, error: "No userId" });
//     return null;
//   }
//   return userId;
// }

// async function assertNegotiationAccess(negotiationId: string, userId: string) {
//   const r = await pool.query(
//     `
//     SELECT
//       n.id,
//       n.project_id,
//       n.producer_org_id,
//       n.creative_user_id,
//       n.status,
//       n.created_at,
//       p.created_by,
//       p.title AS project_title
//     FROM negotiations n
//     JOIN projects p ON p.id = n.project_id
//     WHERE n.id = $1
//       AND (
//         p.created_by = $2
//         OR n.creative_user_id = $2
//       )
//     LIMIT 1
//     `,
//     [negotiationId, userId]
//   );

//   return r.rowCount ? r.rows[0] : null;
// }

// /**
//  * GET /negotiations/:id
//  */
// router.get("/:id", requireAuth, async (req, res) => {
//   const userId = getUserId(req, res);
//   if (!userId) return;

//   const id = getParamId(req, res);
//   if (!id) return;

//   const n = await assertNegotiationAccess(id, userId);
//   if (!n) {
//     return res.status(404).json({ ok: false, error: "Negotiation not found" });
//   }

//   const c = await pool.query(
//     `SELECT u.id, u.email, cp.display_name
//      FROM users u
//      LEFT JOIN creative_profiles cp ON cp.user_id = u.id
//      WHERE u.id = $1`,
//     [n.creative_user_id]
//   );

//   return res.json({
//     ok: true,
//     negotiation: n,
//     creative: c.rows[0] || null,
//   });
// });

// /**
//  * GET /negotiations/:id/messages
//  */
// router.get("/:id/messages", requireAuth, async (req, res) => {
//   const userId = getUserId(req, res);
//   if (!userId) return;

//   const id = getParamId(req, res);
//   if (!id) return;

//   const n = await assertNegotiationAccess(id, userId);
//   if (!n) {
//     return res.status(404).json({ ok: false, error: "Negotiation not found" });
//   }

//   const r = await pool.query(
//     `SELECT m.id, m.message, m.created_at, m.sender_user_id, u.email
//      FROM negotiation_messages m
//      JOIN users u ON u.id = m.sender_user_id
//      WHERE m.negotiation_id = $1
//      ORDER BY m.created_at ASC`,
//     [id]
//   );

//   const messages = r.rows.map((x: any) => ({
//     id: x.id,
//     body: x.message,
//     created_at: x.created_at,
//     sender_user_id: x.sender_user_id,
//     email: x.email,
//   }));

//   return res.json({ ok: true, messages });
// });

// /**
//  * POST /negotiations/:id/messages
//  */
// const messageSchema = z.object({
//   body: z.string().min(1).max(5000),
// });

// router.post("/:id/messages", requireAuth, async (req, res) => {
//   const userId = getUserId(req, res);
//   if (!userId) return;

//   const id = getParamId(req, res);
//   if (!id) return;

//   const parsed = messageSchema.safeParse(req.body);
//   if (!parsed.success) {
//     return res.status(400).json({ ok: false, error: parsed.error.flatten() });
//   }

//   const n = await assertNegotiationAccess(id, userId);
//   if (!n) {
//     return res.status(404).json({ ok: false, error: "Negotiation not found" });
//   }

//   const r = await pool.query(
//     `INSERT INTO negotiation_messages (negotiation_id, sender_user_id, message)
//      VALUES ($1, $2, $3)
//      RETURNING id, message, created_at, sender_user_id`,
//     [id, userId, parsed.data.body]
//   );

//   return res.json({
//     ok: true,
//     message: {
//       id: r.rows[0].id,
//       body: r.rows[0].message,
//       created_at: r.rows[0].created_at,
//       sender_user_id: r.rows[0].sender_user_id,
//     },
//   });
// });

// /**
//  * GET /negotiations/:id/offers
//  */
// router.get("/:id/offers", requireAuth, async (req, res) => {
//   const userId = getUserId(req, res);
//   if (!userId) return;

//   const id = getParamId(req, res);
//   if (!id) return;

//   const n = await assertNegotiationAccess(id, userId);
//   if (!n) {
//     return res.status(404).json({ ok: false, error: "Negotiation not found" });
//   }

//   const r = await pool.query(
//     `SELECT
//        o.id,
//        o.amount,
//        o.currency,
//        o.notes as note,
//        o.created_at,
//        o.created_by as created_by_user_id,
//        u.email
//      FROM negotiation_offers o
//      JOIN users u ON u.id = o.created_by
//      WHERE o.negotiation_id = $1
//      ORDER BY o.created_at DESC`,
//     [id]
//   );

//   return res.json({ ok: true, offers: r.rows });
// });

// /**
//  * POST /negotiations/:id/offers
//  */
// const offerSchema = z.object({
//   amount: z.coerce.number().positive(),
//   currency: z.string().min(1).max(10).optional(),
//   note: z.string().max(2000).optional(),
// });

// router.post("/:id/offers", requireAuth, async (req, res) => {
//   const userId = getUserId(req, res);
//   if (!userId) return;

//   const id = getParamId(req, res);
//   if (!id) return;

//   const parsed = offerSchema.safeParse(req.body);
//   if (!parsed.success) {
//     return res.status(400).json({ ok: false, error: parsed.error.flatten() });
//   }

//   const n = await assertNegotiationAccess(id, userId);
//   if (!n) {
//     return res.status(404).json({ ok: false, error: "Negotiation not found" });
//   }

//   const r = await pool.query(
//     `INSERT INTO negotiation_offers (negotiation_id, created_by, amount, currency, notes)
//      VALUES ($1, $2, $3, $4, $5)
//      RETURNING
//        id,
//        amount,
//        currency,
//        notes as note,
//        created_at,
//        created_by as created_by_user_id`,
//     [id, userId, parsed.data.amount, parsed.data.currency || "CLP", parsed.data.note || null]
//   );

//   return res.json({ ok: true, offer: r.rows[0] });
// });

// export default router;

