import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import pool from "../db/pool";
import { signToken, cookieName } from "../auth/jwt";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  // tipos de usuario principales del MVP
  accountType: z.enum(["producer", "creative", "client"]),
  // para producer/client puedes mandar nombre de org
  orgName: z.string().min(2).optional(),
  displayName: z.string().min(2).optional(), // para creative
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const { email, password, accountType, orgName, displayName } = parsed.data;

  // role por tipo
  const role =
    accountType === "producer"
      ? "producer_owner"
      : accountType === "client"
      ? "client"
      : "creative";

  const passwordHash = await bcrypt.hash(password, 10);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // crear org si aplica
    let orgId: string | null = null;

    if (accountType === "producer" || accountType === "client") {
      if (!orgName) {
        await client.query("ROLLBACK");
        return res.status(400).json({ ok: false, error: "orgName is required for producer/client" });
      }

      const org = await client.query(
        `INSERT INTO orgs (type, name) VALUES ($1, $2) RETURNING id`,
        [accountType, orgName]
      );
      orgId = org.rows[0].id;
    }

    // crear user
    const user = await client.query(
      `INSERT INTO users (email, password_hash, role, org_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, role, org_id`,
      [email, passwordHash, role, orgId]
    );

    const created = user.rows[0];

    // perfil creativo si aplica
    if (accountType === "creative") {
      const name = displayName || email.split("@")[0];
      await client.query(
        `INSERT INTO creative_profiles (user_id, display_name, skills)
         VALUES ($1, $2, $3)`,
        [created.id, name, []]
      );
    }

    await client.query("COMMIT");

    // set cookie
    const token = signToken({ userId: created.id, role: created.role, orgId: created.org_id });
    res.cookie(cookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // local
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ ok: true, user: { id: created.id, email: created.email, role: created.role } });
  } catch (e: any) {
    await client.query("ROLLBACK");

    // email duplicado
    if (String(e?.message || "").includes("users_email_key")) {
      return res.status(409).json({ ok: false, error: "Email already exists" });
    }

    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  } finally {
    client.release();
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const { email, password } = parsed.data;

  const r = await pool.query(
    `SELECT id, email, password_hash, role, org_id FROM users WHERE email = $1`,
    [email]
  );

  if (r.rowCount === 0) return res.status(401).json({ ok: false, error: "Invalid credentials" });

  const user = r.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ ok: false, error: "Invalid credentials" });

  const token = signToken({ userId: user.id, role: user.role, orgId: user.org_id });
  res.cookie(cookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(cookieName());
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const { userId } = req.user!;
  const r = await pool.query(
    `SELECT id, email, role, org_id, created_at FROM users WHERE id = $1`,
    [userId]
  );
  res.json({ ok: true, user: r.rows[0] });
});

export default router;