import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool";
import { requireAuth } from "../middlewares/requireAuth";
import { requireProducer } from "../middlewares/requireProducer";


const router = Router();

// Crear proyecto
const createProjectSchema = z.object({
  title: z.string().min(2),
  brief: z.string().optional(),
  currency: z.string().optional(),
  start_date: z.string().optional(), // "YYYY-MM-DD"
  due_date: z.string().optional(),   // "YYYY-MM-DD"
});


router.post("/", requireAuth, requireProducer, async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const { title, brief, currency, start_date, due_date } = parsed.data;

  const producerOrgId = req.user!.orgId;  // viene del JWT
  const createdBy = req.user!.userId;

  const r = await pool.query(
    `INSERT INTO projects (producer_org_id, title, brief, currency, start_date, due_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, title, brief, status, currency, start_date, due_date, created_at`,
    [producerOrgId, title, brief ?? null, currency ?? null, start_date ?? null, due_date ?? null, createdBy]
  );

  res.json({ ok: true, project: r.rows[0] });
});

// Listar proyectos (solo de esa productora)
router.get("/", requireAuth, requireProducer, async (req, res) => {
  const producerOrgId = req.user!.orgId;

  const r = await pool.query(
    `SELECT id, title, status, currency, start_date, due_date, created_at
     FROM projects
     WHERE producer_org_id = $1
     ORDER BY created_at DESC`,
    [producerOrgId]
  );

  res.json({ ok: true, projects: r.rows });
});

// Detalle proyecto
const idSchema = z.string().uuid();

router.get("/:id", requireAuth, requireProducer, async (req, res) => {
  const producerOrgId = req.user!.orgId;
  const { id } = req.params;

  const valid = idSchema.safeParse(id);
  if (!valid.success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const r = await pool.query(
    `SELECT id, title, brief, status, currency, start_date, due_date, created_at
     FROM projects
     WHERE id = $1 AND producer_org_id = $2`,
    [id, producerOrgId]
  );

  if (r.rowCount === 0) return res.status(404).json({ ok: false, error: "Project not found" });

  res.json({ ok: true, project: r.rows[0] });
});

const uuidSchema = z.string().uuid();

router.get("/:id/creatives", requireAuth, requireProducer, async (req, res) => {
  const producerOrgId = req.user!.orgId;
  const { id } = req.params;

  if (!uuidSchema.safeParse(id).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  // valida que el proyecto sea de esta productora
  const pr = await pool.query(
    `SELECT id FROM projects WHERE id = $1 AND producer_org_id = $2`,
    [id, producerOrgId]
  );
  if (pr.rowCount === 0) return res.status(404).json({ ok: false, error: "Project not found" });

  const r = await pool.query(
    `
    SELECT
      pc.creative_user_id,
      pc.status,
      pc.created_at,
      u.email,
      cp.display_name
    FROM project_creatives pc
    JOIN users u ON u.id = pc.creative_user_id
    LEFT JOIN creative_profiles cp ON cp.user_id = u.id
    WHERE pc.project_id = $1
    ORDER BY pc.created_at DESC
    `,
    [id]
  );

  return res.json({ ok: true, creatives: r.rows });
});

const inviteSchema = z.object({
  creativeEmail: z.string().email(),
});

router.post("/:id/invite", requireAuth, requireProducer, async (req, res) => {
  const producerOrgId = req.user!.orgId;
  const { id } = req.params;

  if (!uuidSchema.safeParse(id).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const { creativeEmail } = parsed.data;

  // valida proyecto pertenece a esta productora
  const pr = await pool.query(
    `SELECT id FROM projects WHERE id = $1 AND producer_org_id = $2`,
    [id, producerOrgId]
  );
  if (pr.rowCount === 0) return res.status(404).json({ ok: false, error: "Project not found" });

  // el creativo debe existir y ser role=creative
  const u = await pool.query(
    `SELECT id, email, role FROM users WHERE lower(email) = lower($1)`,
    [creativeEmail]
  );
  if (u.rowCount === 0) return res.status(404).json({ ok: false, error: "Creative user not found" });

  const creative = u.rows[0];
  if (creative.role !== "creative") {
    return res.status(400).json({ ok: false, error: "User is not a creative" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Inserta invitación (si ya existe, no duplica)
    await client.query(
      `
      INSERT INTO project_creatives (project_id, creative_user_id, invited_by, status)
      VALUES ($1, $2, $3, 'invited')
      ON CONFLICT (project_id, creative_user_id) DO NOTHING
      `,
      [id, creative.id, req.user!.userId]
    );

    // Crea negociación (si ya existe, no duplica)
    await client.query(
      `
      INSERT INTO negotiations (project_id, producer_org_id, creative_user_id, status)
      VALUES ($1, $2, $3, 'open')
      ON CONFLICT (project_id, creative_user_id) DO NOTHING
      `,
      [id, producerOrgId, creative.id]
    );

    await client.query("COMMIT");

    return res.json({
      ok: true,
      invited: { creative_user_id: creative.id, email: creative.email, status: "invited" },
    });
  } catch (e: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  } finally {
    client.release();
  }
});

export default router;