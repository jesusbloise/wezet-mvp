import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool";
import { requireAuth } from "../middlewares/requireAuth";
import { requireProducer } from "../middlewares/requireProducer";

const router = Router();
const uuid = z.string().uuid();

router.get("/project/:projectId", requireAuth, requireProducer, async (req, res) => {
  const producerOrgId = req.user!.orgId;
  const { projectId } = req.params;

  if (!uuid.safeParse(projectId).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const pr = await pool.query(
    `SELECT id FROM projects WHERE id = $1 AND producer_org_id = $2`,
    [projectId, producerOrgId]
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
      AND producer_org_id = $2
    ORDER BY created_at DESC
    `,
    [projectId, producerOrgId]
  );

  return res.json({ ok: true, ndas: r.rows });
});

router.get("/:id", requireAuth, requireProducer, async (req, res) => {
  const producerOrgId = req.user!.orgId;
  const { id } = req.params;

  if (!uuid.safeParse(id).success) {
    return res.status(400).json({ ok: false, error: "Invalid nda id" });
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
      nda_body,
      status,
      accepted_at,
      rejected_at,
      created_at,
      updated_at
    FROM project_ndas
    WHERE id = $1
      AND producer_org_id = $2
    `,
    [id, producerOrgId]
  );

  if (r.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "NDA not found" });
  }

  return res.json({ ok: true, nda: r.rows[0] });
});

export default router;