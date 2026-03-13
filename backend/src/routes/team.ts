import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool";
import { requireAuth } from "../middlewares/requireAuth";

type JwtPayload = {
  userId: string;
  email?: string;
  role?: string;
};

const router = Router();

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.string().min(1).max(100),
});

const updateRoleSchema = z.object({
  role: z.string().min(1).max(100),
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = req.user as JwtPayload;

    const meResult = await pool.query(
      `SELECT id, email, role, org_id FROM users WHERE id = $1 LIMIT 1`,
      [user.userId]
    );

    if (meResult.rowCount === 0) {
      return res.status(404).json({ error: "Authenticated user not found" });
    }

    const me = meResult.rows[0];

    if (!me.org_id) {
      return res.json({ items: [] });
    }

    const membersResult = await pool.query(
      `
      SELECT
        id,
        email,
        role,
        org_id,
        display_name,
        profile_type,
        phone,
        country,
        created_at
      FROM users
      WHERE org_id = $1
      ORDER BY created_at ASC
      `,
      [me.org_id]
    );

    return res.json({ items: membersResult.rows });
  } catch (error) {
    console.error("GET /team error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/add", requireAuth, async (req, res) => {
  try {
    const user = req.user as JwtPayload;
    const parsed = addMemberSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { email, role } = parsed.data;

    const meResult = await pool.query(
      `SELECT id, email, role, org_id FROM users WHERE id = $1 LIMIT 1`,
      [user.userId]
    );

    if (meResult.rowCount === 0) {
      return res.status(404).json({ error: "Authenticated user not found" });
    }

    const me = meResult.rows[0];

    if (!me.org_id) {
      return res.status(400).json({ error: "Current user has no organization" });
    }

    const targetResult = await pool.query(
      `
      SELECT id, email, role, org_id, display_name, profile_type, phone, country, created_at
      FROM users
      WHERE lower(email) = lower($1)
      LIMIT 1
      `,
      [email]
    );

    if (targetResult.rowCount === 0) {
      return res.status(404).json({
        error: "Ese usuario no existe todavía. Debe registrarse primero en la plataforma.",
      });
    }

    const target = targetResult.rows[0];

    if (target.id === me.id) {
      return res.status(400).json({ error: "No puedes agregarte a ti mismo" });
    }

    if (target.org_id && target.org_id === me.org_id) {
      return res.status(409).json({ error: "Ese usuario ya pertenece a tu equipo" });
    }

    const updatedResult = await pool.query(
      `
      UPDATE users
      SET org_id = $1, role = $2
      WHERE id = $3
      RETURNING
        id,
        email,
        role,
        org_id,
        display_name,
        profile_type,
        phone,
        country,
        created_at
      `,
      [me.org_id, role, target.id]
    );

    return res.status(201).json(updatedResult.rows[0]);
  } catch (error) {
    console.error("POST /team/add error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:userId/role", requireAuth, async (req, res) => {
  try {
    const user = req.user as JwtPayload;
    const { userId } = req.params;
    const parsed = updateRoleSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { role } = parsed.data;

    const meResult = await pool.query(
      `SELECT id, email, role, org_id FROM users WHERE id = $1 LIMIT 1`,
      [user.userId]
    );

    if (meResult.rowCount === 0) {
      return res.status(404).json({ error: "Authenticated user not found" });
    }

    const me = meResult.rows[0];

    if (!me.org_id) {
      return res.status(400).json({ error: "Current user has no organization" });
    }

    const targetResult = await pool.query(
      `SELECT id, org_id FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (targetResult.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const target = targetResult.rows[0];

    if (target.org_id !== me.org_id) {
      return res.status(403).json({ error: "Ese usuario no pertenece a tu organización" });
    }

    const updatedResult = await pool.query(
      `
      UPDATE users
      SET role = $1
      WHERE id = $2
      RETURNING
        id,
        email,
        role,
        org_id,
        display_name,
        profile_type,
        phone,
        country,
        created_at
      `,
      [role, userId]
    );

    return res.json(updatedResult.rows[0]);
  } catch (error) {
    console.error("PATCH /team/:userId/role error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:userId", requireAuth, async (req, res) => {
  try {
    const user = req.user as JwtPayload;
    const { userId } = req.params;

    const meResult = await pool.query(
      `SELECT id, email, role, org_id FROM users WHERE id = $1 LIMIT 1`,
      [user.userId]
    );

    if (meResult.rowCount === 0) {
      return res.status(404).json({ error: "Authenticated user not found" });
    }

    const me = meResult.rows[0];

    if (!me.org_id) {
      return res.status(400).json({ error: "Current user has no organization" });
    }

    if (me.id === userId) {
      return res.status(400).json({ error: "No puedes eliminarte a ti mismo del equipo" });
    }

    const targetResult = await pool.query(
      `SELECT id, org_id FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (targetResult.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const target = targetResult.rows[0];

    if (target.org_id !== me.org_id) {
      return res.status(403).json({ error: "Ese usuario no pertenece a tu organización" });
    }

    await pool.query(
      `
      UPDATE users
      SET org_id = NULL
      WHERE id = $1
      `,
      [userId]
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error("DELETE /team/:userId error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
