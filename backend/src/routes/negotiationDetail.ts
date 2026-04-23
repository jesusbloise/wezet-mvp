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
      p.title AS project_title,
      p.status AS project_status,
      p.currency AS project_currency,
      p.start_date AS project_start_date,
      p.due_date AS project_due_date,
      p.brief AS project_brief,
      p.has_commercial_dimension,
      p.has_team_dimension,
      p.client_name,
      p.client_email,
      p.client_company

    FROM negotiations n
    JOIN projects p
      ON p.id = n.project_id
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
    LEFT JOIN creative_profiles cp
      ON cp.user_id = u.id
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

  try {
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

    const latestOfferQ = await pool.query(
      `
      SELECT
        o.id,
        o.amount,
        o.currency,
        o.notes AS note,
        o.payment_date,
        o.payment_method,
        o.status,
        o.created_at,
        o.created_by AS created_by_user_id,
        u.email
      FROM negotiation_offers o
      JOIN users u
        ON u.id = o.created_by
      WHERE o.negotiation_id = $1
      ORDER BY o.created_at DESC
      LIMIT 1
      `,
      [id]
    );

    const acceptedOfferQ = await pool.query(
      `
      SELECT
        o.id,
        o.amount,
        o.currency,
        o.notes AS note,
        o.payment_date,
        o.payment_method,
        o.status,
        o.created_at,
        o.created_by AS created_by_user_id,
        u.email
      FROM negotiation_offers o
      JOIN users u
        ON u.id = o.created_by
      WHERE o.negotiation_id = $1
        AND o.status = 'accepted'
      ORDER BY o.created_at DESC
      LIMIT 1
      `,
      [id]
    );

    const messagesCountQ = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM negotiation_messages
      WHERE negotiation_id = $1
      `,
      [id]
    );

    const offersCountQ = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM negotiation_offers
      WHERE negotiation_id = $1
      `,
      [id]
    );

    return res.json({
      ok: true,
      negotiation: n,
      me,
      counterpart,
      creative,
      latest_offer: latestOfferQ.rowCount ? latestOfferQ.rows[0] : null,
      accepted_offer: acceptedOfferQ.rowCount ? acceptedOfferQ.rows[0] : null,
      summary: {
        messages_count: messagesCountQ.rows[0]?.count ?? 0,
        offers_count: offersCountQ.rows[0]?.count ?? 0,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * GET /negotiations/:id/messages
 */
router.get("/:id/messages", requireAuth, async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const id = getParamId(req, res);
  if (!id) return;

  try {
    const n = await assertNegotiationAccess(id, userId);
    if (!n) {
      return res.status(404).json({ ok: false, error: "Negotiation not found" });
    }

    const r = await pool.query(
      `
      SELECT
        m.id,
        m.message,
        m.created_at,
        m.sender_user_id,
        u.email,
        cp.display_name
      FROM negotiation_messages m
      JOIN users u
        ON u.id = m.sender_user_id
      LEFT JOIN creative_profiles cp
        ON cp.user_id = u.id
      WHERE m.negotiation_id = $1
      ORDER BY m.created_at ASC
      `,
      [id]
    );

    const messages = r.rows.map((x: any) => ({
      id: x.id,
      body: x.message,
      created_at: x.created_at,
      sender_user_id: x.sender_user_id,
      email: x.email,
      display_name: x.display_name,
    }));

    return res.json({ ok: true, messages });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
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

  try {
    const n = await assertNegotiationAccess(id, userId);
    if (!n) {
      return res.status(404).json({ ok: false, error: "Negotiation not found" });
    }

    const r = await pool.query(
      `
      INSERT INTO negotiation_messages (negotiation_id, sender_user_id, message)
      VALUES ($1, $2, $3)
      RETURNING id, message, created_at, sender_user_id
      `,
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
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * GET /negotiations/:id/offers
 */
router.get("/:id/offers", requireAuth, async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const id = getParamId(req, res);
  if (!id) return;

  try {
    const n = await assertNegotiationAccess(id, userId);
    if (!n) {
      return res.status(404).json({ ok: false, error: "Negotiation not found" });
    }

    const r = await pool.query(
      `
      SELECT
        o.id,
        o.amount,
        o.currency,
        o.notes AS note,
        o.payment_date,
        o.payment_method,
        o.status,
        o.created_at,
        o.created_by AS created_by_user_id,
        u.email
      FROM negotiation_offers o
      JOIN users u
        ON u.id = o.created_by
      WHERE o.negotiation_id = $1
      ORDER BY o.created_at DESC
      `,
      [id]
    );

    return res.json({ ok: true, offers: r.rows });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * POST /negotiations/:id/offers
 */
const offerSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().min(1).max(10).optional(),
  note: z.string().max(2000).optional(),
  payment_date: z.string().optional(),
  payment_method: z.string().max(100).optional(),
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

  try {
    const n = await assertNegotiationAccess(id, userId);
    if (!n) {
      return res.status(404).json({ ok: false, error: "Negotiation not found" });
    }

    const alreadyAccepted = await pool.query(
      `
      SELECT id
      FROM negotiation_offers
      WHERE negotiation_id = $1
        AND status = 'accepted'
      LIMIT 1
      `,
      [id]
    );

    if ((alreadyAccepted.rowCount ?? 0) > 0) {
      return res.status(400).json({
        ok: false,
        error: "Ya existe una oferta aceptada en esta negociación",
      });
    }

    const paymentDate =
      parsed.data.payment_date && parsed.data.payment_date.trim()
        ? parsed.data.payment_date.trim()
        : null;

    const paymentMethod =
      parsed.data.payment_method && parsed.data.payment_method.trim()
        ? parsed.data.payment_method.trim()
        : null;

    const r = await pool.query(
      `
      INSERT INTO negotiation_offers (
        negotiation_id,
        created_by,
        amount,
        currency,
        notes,
        payment_date,
        payment_method,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'proposed')
      RETURNING
        id,
        amount,
        currency,
        notes AS note,
        payment_date,
        payment_method,
        status,
        created_at,
        created_by AS created_by_user_id
      `,
      [
        id,
        userId,
        parsed.data.amount,
        parsed.data.currency || "CLP",
        parsed.data.note || null,
        paymentDate,
        paymentMethod,
      ]
    );

  await pool.query(
  `
  UPDATE negotiations
  SET status = 'open'
  WHERE id = $1
    AND COALESCE(status, 'open') <> 'agreed'
  `,
  [id]
);

    return res.json({ ok: true, offer: r.rows[0] });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * PATCH /negotiations/:id/offers/:offerId/status
 */
const offerActionSchema = z.object({
  action: z.enum(["accepted", "rejected"]),
});

router.patch("/:id/offers/:offerId/status", requireAuth, async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const negotiationId = getParamId(req, res);
  if (!negotiationId) return;

  const offerId = req.params?.offerId;
  if (typeof offerId !== "string" || !uuid.safeParse(offerId).success) {
    return res.status(400).json({ ok: false, error: "Invalid offer id" });
  }

  const parsed = offerActionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const negotiation = await assertNegotiationAccess(negotiationId, userId);
  if (!negotiation) {
    return res.status(404).json({ ok: false, error: "Negotiation not found" });
  }

  const offerQ = await pool.query(
    `
    SELECT
      id,
      negotiation_id,
      created_by,
      status
    FROM negotiation_offers
    WHERE id = $1
      AND negotiation_id = $2
    LIMIT 1
    `,
    [offerId, negotiationId]
  );

  if (offerQ.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "Offer not found" });
  }

  const offer = offerQ.rows[0];

  if (String(offer.created_by) === String(userId)) {
    return res.status(400).json({
      ok: false,
      error: "No puedes responder tu propia oferta",
    });
  }

  if (offer.status === "accepted") {
    return res.status(400).json({
      ok: false,
      error: "Esta oferta ya fue aceptada",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (parsed.data.action === "accepted") {
      await client.query(
        `
        UPDATE negotiation_offers
        SET status = 'accepted'
        WHERE id = $1
        `,
        [offerId]
      );

      await client.query(
        `
        UPDATE negotiation_offers
        SET status = 'rejected'
        WHERE negotiation_id = $1
          AND id <> $2
          AND status <> 'accepted'
        `,
        [negotiationId, offerId]
      );

      await client.query(
        `
        UPDATE negotiations
        SET status = 'agreed'
        WHERE id = $1
        `,
        [negotiationId]
      );
    } else {
      await client.query(
        `
        UPDATE negotiation_offers
        SET status = 'rejected'
        WHERE id = $1
        `,
        [offerId]
      );
    }

    await client.query("COMMIT");

    return res.json({
      ok: true,
      negotiation_id: negotiationId,
      offer_id: offerId,
      status: parsed.data.action,
    });
  } catch (e: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  } finally {
    client.release();
  }
});

export default router;

