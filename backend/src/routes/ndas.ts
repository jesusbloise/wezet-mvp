import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();
const uuid = z.string().uuid();

router.get("/project/:projectId", requireAuth, async (req, res) => {
  const ownerUserId = req.user!.userId;
  const { projectId } = req.params;

  if (!uuid.safeParse(projectId).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const pr = await pool.query(
    `SELECT id FROM projects WHERE id = $1 AND created_by = $2`,
    [projectId, ownerUserId]
  );
  if (pr.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "Project not found" });
  }

  const r = await pool.query(
    `
    SELECT
      id,
      project_id,
      creative_user_id,
      contact_id,
      participant_type,
      email,
      display_name,
      nda_title,
      status,
      accepted_at,
      rejected_at,
      created_at,
      updated_at
    FROM project_ndas
    WHERE project_id = $1
    ORDER BY created_at DESC
    `,
    [projectId]
  );

  return res.json({ ok: true, ndas: r.rows });
});

router.get("/:id", requireAuth, async (req, res) => {
  const ownerUserId = req.user!.userId;
  const { id } = req.params;

  if (!uuid.safeParse(id).success) {
    return res.status(400).json({ ok: false, error: "Invalid nda id" });
  }

  const r = await pool.query(
    `
    SELECT
      pn.id,
      pn.project_id,
      pn.creative_user_id,
      pn.contact_id,
      pn.participant_type,
      pn.email,
      pn.display_name,
      pn.nda_title,
      pn.nda_body,
      pn.status,
      pn.accepted_at,
      pn.rejected_at,
      pn.created_at,
      pn.updated_at
    FROM project_ndas pn
    JOIN projects p
      ON p.id = pn.project_id
    WHERE pn.id = $1
      AND p.created_by = $2
    LIMIT 1
    `,
    [id, ownerUserId]
  );

  if (r.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "NDA not found" });
  }

  return res.json({ ok: true, nda: r.rows[0] });
});

// NDAs del usuario logueado por email
router.get("/me/list", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  const u = await pool.query(
    `SELECT id, email, role FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );

  if (u.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }

  const user = u.rows[0];

  const r = await pool.query(
    `
    SELECT
      pn.id,
      pn.project_id,
      pn.creative_user_id,
      pn.contact_id,
      pn.participant_type,
      pn.email,
      pn.display_name,
      pn.nda_title,
      pn.nda_body,
      pn.status,
      pn.accepted_at,
      pn.rejected_at,
      pn.created_at,
      pn.updated_at,
      p.title AS project_title
    FROM project_ndas pn
    JOIN projects p ON p.id = pn.project_id
    WHERE lower(pn.email) = lower($1)
    ORDER BY pn.created_at DESC
    `,
    [user.email]
  );

  return res.json({ ok: true, ndas: r.rows });
});

// detalle de NDA para el usuario logueado
router.get("/me/:id", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  if (!uuid.safeParse(id).success) {
    return res.status(400).json({ ok: false, error: "Invalid nda id" });
  }

  const u = await pool.query(
    `SELECT id, email FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );

  if (u.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }

  const user = u.rows[0];

  const r = await pool.query(
    `
    SELECT
      pn.id,
      pn.project_id,
      pn.creative_user_id,
      pn.contact_id,
      pn.participant_type,
      pn.email,
      pn.display_name,
      pn.nda_title,
      pn.nda_body,
      pn.status,
      pn.accepted_at,
      pn.rejected_at,
      pn.created_at,
      pn.updated_at,
      p.title AS project_title
    FROM project_ndas pn
    JOIN projects p ON p.id = pn.project_id
    WHERE pn.id = $1
      AND lower(pn.email) = lower($2)
    LIMIT 1
    `,
    [id, user.email]
  );

  if (r.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "NDA not found" });
  }

  return res.json({ ok: true, nda: r.rows[0] });
});

// aceptar NDA
router.post("/me/:id/accept", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  if (!uuid.safeParse(id).success) {
    return res.status(400).json({ ok: false, error: "Invalid nda id" });
  }

  const u = await pool.query(
    `SELECT id, email FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );

  if (u.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }

  const user = u.rows[0];

  const nda = await pool.query(
    `
    SELECT id, project_id, status
    FROM project_ndas
    WHERE id = $1
      AND lower(email) = lower($2)
    LIMIT 1
    `,
    [id, user.email]
  );

  if (nda.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "NDA not found" });
  }

  const updated = await pool.query(
    `
    UPDATE project_ndas
    SET
      status = 'accepted',
      accepted_at = now(),
      rejected_at = null,
      updated_at = now()
    WHERE id = $1
    RETURNING id, project_id, status, accepted_at, updated_at
    `,
    [id]
  );

  return res.json({ ok: true, nda: updated.rows[0] });
});

// rechazar NDA
router.post("/me/:id/reject", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  if (!uuid.safeParse(id).success) {
    return res.status(400).json({ ok: false, error: "Invalid nda id" });
  }

  const u = await pool.query(
    `SELECT id, email FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );

  if (u.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }

  const user = u.rows[0];

  const nda = await pool.query(
    `
    SELECT id
    FROM project_ndas
    WHERE id = $1
      AND lower(email) = lower($2)
    LIMIT 1
    `,
    [id, user.email]
  );

  if (nda.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "NDA not found" });
  }

  const updated = await pool.query(
    `
    UPDATE project_ndas
    SET
      status = 'rejected',
      rejected_at = now(),
      accepted_at = null,
      updated_at = now()
    WHERE id = $1
    RETURNING id, project_id, status, rejected_at, updated_at
    `,
    [id]
  );

  return res.json({ ok: true, nda: updated.rows[0] });
});

export default router;

// import { Router } from "express";
// import { z } from "zod";
// import pool from "../db/pool";
// import { requireAuth } from "../middlewares/requireAuth";
// import { requireProducer } from "../middlewares/requireProducer";

// const router = Router();
// const uuid = z.string().uuid();

// router.get("/project/:projectId", requireAuth, requireProducer, async (req, res) => {
//   const producerOrgId = req.user!.orgId;
//   const { projectId } = req.params;

//   if (!uuid.safeParse(projectId).success) {
//     return res.status(400).json({ ok: false, error: "Invalid project id" });
//   }

//   const pr = await pool.query(
//     `SELECT id FROM projects WHERE id = $1 AND producer_org_id = $2`,
//     [projectId, producerOrgId]
//   );
//   if (pr.rowCount === 0) {
//     return res.status(404).json({ ok: false, error: "Project not found" });
//   }

//   const r = await pool.query(
//     `
//     SELECT
//       id,
//       project_id,
//       creative_user_id,
//       contact_id,
//       participant_type,
//       email,
//       display_name,
//       nda_title,
//       status,
//       accepted_at,
//       rejected_at,
//       created_at,
//       updated_at
//     FROM project_ndas
//     WHERE project_id = $1
//       AND producer_org_id = $2
//     ORDER BY created_at DESC
//     `,
//     [projectId, producerOrgId]
//   );

//   return res.json({ ok: true, ndas: r.rows });
// });

// router.get("/:id", requireAuth, requireProducer, async (req, res) => {
//   const producerOrgId = req.user!.orgId;
//   const { id } = req.params;

//   if (!uuid.safeParse(id).success) {
//     return res.status(400).json({ ok: false, error: "Invalid nda id" });
//   }

//   const r = await pool.query(
//     `
//     SELECT
//       id,
//       project_id,
//       creative_user_id,
//       contact_id,
//       participant_type,
//       email,
//       display_name,
//       nda_title,
//       nda_body,
//       status,
//       accepted_at,
//       rejected_at,
//       created_at,
//       updated_at
//     FROM project_ndas
//     WHERE id = $1
//       AND producer_org_id = $2
//     `,
//     [id, producerOrgId]
//   );

//   if (r.rowCount === 0) {
//     return res.status(404).json({ ok: false, error: "NDA not found" });
//   }

//   return res.json({ ok: true, nda: r.rows[0] });
// });

// // NUEVO: NDAs del usuario logueado por email
// router.get("/me/list", requireAuth, async (req, res) => {
//   const userId = req.user!.userId;

//   const u = await pool.query(
//     `SELECT id, email, role FROM users WHERE id = $1 LIMIT 1`,
//     [userId]
//   );

//   if (u.rowCount === 0) {
//     return res.status(404).json({ ok: false, error: "User not found" });
//   }

//   const user = u.rows[0];

//   const r = await pool.query(
//     `
//     SELECT
//       pn.id,
//       pn.project_id,
//       pn.creative_user_id,
//       pn.contact_id,
//       pn.participant_type,
//       pn.email,
//       pn.display_name,
//       pn.nda_title,
//       pn.nda_body,
//       pn.status,
//       pn.accepted_at,
//       pn.rejected_at,
//       pn.created_at,
//       pn.updated_at,
//       p.title AS project_title
//     FROM project_ndas pn
//     JOIN projects p ON p.id = pn.project_id
//     WHERE lower(pn.email) = lower($1)
//     ORDER BY pn.created_at DESC
//     `,
//     [user.email]
//   );

//   return res.json({ ok: true, ndas: r.rows });
// });

// // NUEVO: detalle de NDA para el usuario logueado
// router.get("/me/:id", requireAuth, async (req, res) => {
//   const userId = req.user!.userId;
//   const { id } = req.params;

//   if (!uuid.safeParse(id).success) {
//     return res.status(400).json({ ok: false, error: "Invalid nda id" });
//   }

//   const u = await pool.query(
//     `SELECT id, email FROM users WHERE id = $1 LIMIT 1`,
//     [userId]
//   );

//   if (u.rowCount === 0) {
//     return res.status(404).json({ ok: false, error: "User not found" });
//   }

//   const user = u.rows[0];

//   const r = await pool.query(
//     `
//     SELECT
//       pn.id,
//       pn.project_id,
//       pn.creative_user_id,
//       pn.contact_id,
//       pn.participant_type,
//       pn.email,
//       pn.display_name,
//       pn.nda_title,
//       pn.nda_body,
//       pn.status,
//       pn.accepted_at,
//       pn.rejected_at,
//       pn.created_at,
//       pn.updated_at,
//       p.title AS project_title
//     FROM project_ndas pn
//     JOIN projects p ON p.id = pn.project_id
//     WHERE pn.id = $1
//       AND lower(pn.email) = lower($2)
//     LIMIT 1
//     `,
//     [id, user.email]
//   );

//   if (r.rowCount === 0) {
//     return res.status(404).json({ ok: false, error: "NDA not found" });
//   }

//   return res.json({ ok: true, nda: r.rows[0] });
// });

// // NUEVO: aceptar NDA
// router.post("/me/:id/accept", requireAuth, async (req, res) => {
//   const userId = req.user!.userId;
//   const { id } = req.params;

//   if (!uuid.safeParse(id).success) {
//     return res.status(400).json({ ok: false, error: "Invalid nda id" });
//   }

//   const u = await pool.query(
//     `SELECT id, email FROM users WHERE id = $1 LIMIT 1`,
//     [userId]
//   );

//   if (u.rowCount === 0) {
//     return res.status(404).json({ ok: false, error: "User not found" });
//   }

//   const user = u.rows[0];

//   const nda = await pool.query(
//     `
//     SELECT id, project_id, status
//     FROM project_ndas
//     WHERE id = $1
//       AND lower(email) = lower($2)
//     LIMIT 1
//     `,
//     [id, user.email]
//   );

//   if (nda.rowCount === 0) {
//     return res.status(404).json({ ok: false, error: "NDA not found" });
//   }

//   const updated = await pool.query(
//     `
//     UPDATE project_ndas
//     SET
//       status = 'accepted',
//       accepted_at = now(),
//       rejected_at = null,
//       updated_at = now()
//     WHERE id = $1
//     RETURNING id, project_id, status, accepted_at, updated_at
//     `,
//     [id]
//   );

//   return res.json({ ok: true, nda: updated.rows[0] });
// });

// // NUEVO: rechazar NDA
// router.post("/me/:id/reject", requireAuth, async (req, res) => {
//   const userId = req.user!.userId;
//   const { id } = req.params;

//   if (!uuid.safeParse(id).success) {
//     return res.status(400).json({ ok: false, error: "Invalid nda id" });
//   }

//   const u = await pool.query(
//     `SELECT id, email FROM users WHERE id = $1 LIMIT 1`,
//     [userId]
//   );

//   if (u.rowCount === 0) {
//     return res.status(404).json({ ok: false, error: "User not found" });
//   }

//   const user = u.rows[0];

//   const nda = await pool.query(
//     `
//     SELECT id
//     FROM project_ndas
//     WHERE id = $1
//       AND lower(email) = lower($2)
//     LIMIT 1
//     `,
//     [id, user.email]
//   );

//   if (nda.rowCount === 0) {
//     return res.status(404).json({ ok: false, error: "NDA not found" });
//   }

//   const updated = await pool.query(
//     `
//     UPDATE project_ndas
//     SET
//       status = 'rejected',
//       rejected_at = now(),
//       accepted_at = null,
//       updated_at = now()
//     WHERE id = $1
//     RETURNING id, project_id, status, rejected_at, updated_at
//     `,
//     [id]
//   );

//   return res.json({ ok: true, nda: updated.rows[0] });
// });

// export default router;

