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

router.get("/project/:projectId", requireAuth, async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const { projectId } = req.params;

  if (!uuid.safeParse(projectId).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  try {
    const pr = await pool.query(
      `
      SELECT
        p.id,
        p.title,
        p.created_by
      FROM projects p
      WHERE p.id = $1
        AND p.created_by = $2
      LIMIT 1
      `,
      [projectId, userId]
    );

    if (pr.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Project not found" });
    }

    const r = await pool.query(
      `
      SELECT
        n.id,
        n.project_id,
        n.status,
        n.created_at,

        u.id AS creative_user_id,
        u.email,
        cp.display_name,

        latest_offer.id AS latest_offer_id,
        latest_offer.amount AS latest_offer_amount,
        latest_offer.currency AS latest_offer_currency,
        latest_offer.status AS latest_offer_status,
        latest_offer.created_at AS latest_offer_created_at,

        accepted_offer.id AS accepted_offer_id,
        accepted_offer.amount AS accepted_offer_amount,
        accepted_offer.currency AS accepted_offer_currency,
        accepted_offer.status AS accepted_offer_status,
        accepted_offer.created_at AS accepted_offer_created_at,

        COALESCE(msgs.messages_count, 0)::int AS messages_count,
        COALESCE(offers.offers_count, 0)::int AS offers_count
      FROM negotiations n
      JOIN users u
        ON u.id = n.creative_user_id
      LEFT JOIN creative_profiles cp
        ON cp.user_id = u.id

      LEFT JOIN LATERAL (
        SELECT
          o.id,
          o.amount,
          o.currency,
          o.status,
          o.created_at
        FROM negotiation_offers o
        WHERE o.negotiation_id = n.id
        ORDER BY o.created_at DESC
        LIMIT 1
      ) latest_offer ON true

      LEFT JOIN LATERAL (
        SELECT
          o.id,
          o.amount,
          o.currency,
          o.status,
          o.created_at
        FROM negotiation_offers o
        WHERE o.negotiation_id = n.id
          AND o.status = 'accepted'
        ORDER BY o.created_at DESC
        LIMIT 1
      ) accepted_offer ON true

      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS messages_count
        FROM negotiation_messages m
        WHERE m.negotiation_id = n.id
      ) msgs ON true

      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS offers_count
        FROM negotiation_offers o
        WHERE o.negotiation_id = n.id
      ) offers ON true

      WHERE n.project_id = $1
      ORDER BY n.created_at DESC
      `,
      [projectId]
    );

    return res.json({
      ok: true,
      project: pr.rows[0],
      negotiations: r.rows,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
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

// router.get("/project/:projectId", requireAuth, async (req, res) => {
//   const userId = getUserId(req, res);
//   if (!userId) return;

//   const { projectId } = req.params;

//   if (!uuid.safeParse(projectId).success) {
//     return res.status(400).json({ ok: false, error: "Invalid project id" });
//   }

//   const pr = await pool.query(
//     `SELECT id FROM projects WHERE id = $1 AND created_by = $2`,
//     [projectId, userId]
//   );

//   if (pr.rowCount === 0) {
//     return res.status(404).json({ ok: false, error: "Project not found" });
//   }

//   const r = await pool.query(
//     `
//     SELECT
//       n.id,
//       n.status,
//       n.created_at,
//       u.id as creative_user_id,
//       u.email,
//       cp.display_name
//     FROM negotiations n
//     JOIN users u ON u.id = n.creative_user_id
//     LEFT JOIN creative_profiles cp ON cp.user_id = u.id
//     WHERE n.project_id = $1
//     ORDER BY n.created_at DESC
//     `,
//     [projectId]
//   );

//   return res.json({ ok: true, negotiations: r.rows });
// });

// export default router;

