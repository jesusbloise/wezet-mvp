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

  // Solo proyectos del producer
  const pr = await pool.query(
    `SELECT id FROM projects WHERE id = $1 AND producer_org_id = $2`,
    [projectId, producerOrgId]
  );
  if (pr.rowCount === 0) return res.status(404).json({ ok: false, error: "Project not found" });

  const r = await pool.query(
    `
    SELECT
      n.id,
      n.status,
      n.created_at,
      u.id as creative_user_id,
      u.email,
      cp.display_name
    FROM negotiations n
    JOIN users u ON u.id = n.creative_user_id
    LEFT JOIN creative_profiles cp ON cp.user_id = u.id
    WHERE n.project_id = $1 AND n.producer_org_id = $2
    ORDER BY n.created_at DESC
    `,
    [projectId, producerOrgId]
  );

  return res.json({ ok: true, negotiations: r.rows });
});

export default router;