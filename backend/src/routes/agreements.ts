import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool";
import { requireAuth } from "../middlewares/requireAuth";

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

const agreementSchema = z.object({
  producer_name: z.string().optional(),
  producer_email: z.string().optional(),
  participant_name: z.string().optional(),
  participant_email: z.string().optional(),

  role: z.string().optional(),
  scope_text: z.string().optional(),
  revisions: z.string().optional(),

  start_date: z.string().optional(),
  delivery_date: z.string().optional(),
  milestones_text: z.string().optional(),

  amount_total: z.coerce.number().optional(),
  currency: z.string().optional(),
  payment_structure: z.string().optional(),

  credits_text: z.string().optional(),
  cancellation_policy: z.string().optional(),
  confidentiality_text: z.string().optional(),

  status: z.enum(["draft", "sent", "signed"]).optional(),
});

/**
 * GET /agreements/from-negotiation/:id
 * Devuelve el acuerdo si ya existe, o el prefill desde negociación si aún no existe
 */
router.get("/from-negotiation/:id", requireAuth, async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const negotiationId = req.params?.id;
  if (typeof negotiationId !== "string" || !uuid.safeParse(negotiationId).success) {
    return res.status(400).json({ ok: false, error: "Invalid negotiation id" });
  }

  try {
    const negotiation = await assertNegotiationAccess(negotiationId, userId);
    if (!negotiation) {
      return res.status(404).json({ ok: false, error: "Negotiation not found" });
    }

    const existingAgreement = await pool.query(
      `
      SELECT *
      FROM participant_agreements
      WHERE negotiation_id = $1
      LIMIT 1
      `,
      [negotiationId]
    );

    if (existingAgreement.rowCount) {
      return res.json({
        ok: true,
        source: "agreement",
        agreement: existingAgreement.rows[0],
      });
    }

    const me = await getUserSummary(String(negotiation.created_by));
    const participant = negotiation.creative_user_id
      ? await getUserSummary(String(negotiation.creative_user_id))
      : null;

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
      JOIN users u ON u.id = o.created_by
      WHERE o.negotiation_id = $1
        AND o.status = 'accepted'
      ORDER BY o.created_at DESC
      LIMIT 1
      `,
      [negotiationId]
    );

    const acceptedOffer = acceptedOfferQ.rowCount ? acceptedOfferQ.rows[0] : null;

    const ndaQ = await pool.query(
      `
      SELECT
        id,
        project_id,
        creative_user_id,
        email,
        display_name,
        nda_title,
        status,
        accepted_at
      FROM project_ndas
      WHERE project_id = $1
        AND status = 'accepted'
      ORDER BY accepted_at DESC NULLS LAST, created_at DESC
      LIMIT 1
      `,
      [negotiation.project_id]
    );

    const nda = ndaQ.rowCount ? ndaQ.rows[0] : null;

    return res.json({
      ok: true,
      source: "negotiation",
      prefill: {
        negotiation_id: negotiation.id,
        project_id: negotiation.project_id,
        nda_id: nda?.id || null,
        accepted_offer_id: acceptedOffer?.id || null,

        producer_user_id: negotiation.created_by,
        participant_user_id: negotiation.creative_user_id,

        producer_name: me?.display_name || me?.email || "",
        producer_email: me?.email || "",
        participant_name: participant?.display_name || participant?.email || "",
        participant_email: participant?.email || "",

        role: "Director de Fotografía",
        scope_text: acceptedOffer?.note || negotiation.project_brief || "",
        revisions: "",

        start_date: negotiation.project_start_date || acceptedOffer?.payment_date || null,
        delivery_date: negotiation.project_due_date || null,
        milestones_text: "",

        amount_total: acceptedOffer?.amount || null,
        currency: acceptedOffer?.currency || negotiation.project_currency || "CLP",
        payment_structure: acceptedOffer?.payment_method || "",

        credits_text: "Sí — puede mostrar en portafolio",
        cancellation_policy: "sin costo",
        confidentiality_text: nda?.accepted_at
          ? `Cubierta por NDA firmado el ${nda.accepted_at}`
          : "Cubierta por NDA firmado",
        status: "draft",
      },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * POST /agreements/from-negotiation/:id
 * Crea o actualiza el acuerdo desde la negociación
 */
router.post("/from-negotiation/:id", requireAuth, async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const negotiationId = req.params?.id;
  if (typeof negotiationId !== "string" || !uuid.safeParse(negotiationId).success) {
    return res.status(400).json({ ok: false, error: "Invalid negotiation id" });
  }

  const parsed = agreementSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  try {
    const negotiation = await assertNegotiationAccess(negotiationId, userId);
    if (!negotiation) {
      return res.status(404).json({ ok: false, error: "Negotiation not found" });
    }

    const acceptedOfferQ = await pool.query(
      `
      SELECT id
      FROM negotiation_offers
      WHERE negotiation_id = $1
        AND status = 'accepted'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [negotiationId]
    );

    const acceptedOfferId = acceptedOfferQ.rowCount ? acceptedOfferQ.rows[0].id : null;

    const ndaQ = await pool.query(
      `
      SELECT id
      FROM project_ndas
      WHERE project_id = $1
        AND status = 'accepted'
      ORDER BY accepted_at DESC NULLS LAST, created_at DESC
      LIMIT 1
      `,
      [negotiation.project_id]
    );

    const ndaId = ndaQ.rowCount ? ndaQ.rows[0].id : null;

    const existingAgreement = await pool.query(
      `
      SELECT id
      FROM participant_agreements
      WHERE negotiation_id = $1
      LIMIT 1
      `,
      [negotiationId]
    );

    const payload = parsed.data;

    if (existingAgreement.rowCount) {
      const updated = await pool.query(
        `
        UPDATE participant_agreements
        SET
          nda_id = $2,
          accepted_offer_id = $3,

          producer_name = $4,
          producer_email = $5,
          participant_name = $6,
          participant_email = $7,

          role = $8,
          scope_text = $9,
          revisions = $10,

          start_date = $11,
          delivery_date = $12,
          milestones_text = $13,

          amount_total = $14,
          currency = $15,
          payment_structure = $16,

          credits_text = $17,
          cancellation_policy = $18,
          confidentiality_text = $19,

          status = $20,
          updated_at = now()
        WHERE negotiation_id = $1
        RETURNING *
        `,
        [
          negotiationId,
          ndaId,
          acceptedOfferId,

          payload.producer_name || null,
          payload.producer_email || null,
          payload.participant_name || null,
          payload.participant_email || null,

          payload.role || null,
          payload.scope_text || null,
          payload.revisions || null,

          payload.start_date || null,
          payload.delivery_date || null,
          payload.milestones_text || null,

          payload.amount_total ?? null,
          payload.currency || "CLP",
          payload.payment_structure || null,

          payload.credits_text || null,
          payload.cancellation_policy || null,
          payload.confidentiality_text || null,

          payload.status || "draft",
        ]
      );

      return res.json({ ok: true, agreement: updated.rows[0] });
    }

    const inserted = await pool.query(
      `
      INSERT INTO participant_agreements (
        negotiation_id,
        project_id,
        nda_id,
        accepted_offer_id,
        producer_user_id,
        participant_user_id,
        producer_name,
        producer_email,
        participant_name,
        participant_email,
        role,
        scope_text,
        revisions,
        start_date,
        delivery_date,
        milestones_text,
        amount_total,
        currency,
        payment_structure,
        credits_text,
        cancellation_policy,
        confidentiality_text,
        status
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
      )
      RETURNING *
      `,
      [
        negotiationId,
        negotiation.project_id,
        ndaId,
        acceptedOfferId,
        negotiation.created_by,
        negotiation.creative_user_id,

        payload.producer_name || null,
        payload.producer_email || null,
        payload.participant_name || null,
        payload.participant_email || null,

        payload.role || null,
        payload.scope_text || null,
        payload.revisions || null,

        payload.start_date || null,
        payload.delivery_date || null,
        payload.milestones_text || null,

        payload.amount_total ?? null,
        payload.currency || "CLP",
        payload.payment_structure || null,

        payload.credits_text || null,
        payload.cancellation_policy || null,
        payload.confidentiality_text || null,

        payload.status || "draft",
      ]
    );

    return res.json({ ok: true, agreement: inserted.rows[0] });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default router;
