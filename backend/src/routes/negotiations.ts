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

  const pr = await pool.query(
    `SELECT id FROM projects WHERE id = $1 AND created_by = $2`,
    [projectId, userId]
  );

  if (pr.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "Project not found" });
  }

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
    WHERE n.project_id = $1
    ORDER BY n.created_at DESC
    `,
    [projectId]
  );

  return res.json({ ok: true, negotiations: r.rows });
});

export default router;

