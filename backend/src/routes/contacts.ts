import { Router } from "express";
import pool from "../db/pool";

const router = Router();

// GET /contacts
router.get("/", async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const { rows } = await pool.query(
      `SELECT id, type, name, email, phone, specialty, company, source, created_at, updated_at
       FROM contacts
       WHERE owner_user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({ ok: true, contacts: rows });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// POST /contacts (upsert)
router.post("/", async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const body = req.body || {};
    const type = String(body.type || "").trim();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();

    const phone = body.phone ? String(body.phone).trim() : null;
    const specialty = body.specialty ? String(body.specialty).trim() : null;
    const company = body.company ? String(body.company).trim() : null;
    const source = body.source ? String(body.source).trim() : "manual";

    if (!type || !name || !email) {
      return res.status(400).json({ ok: false, error: "type, name y email son requeridos" });
    }

    if (type !== "creativo" && type !== "empresa") {
      return res.status(400).json({ ok: false, error: "type inválido" });
    }

    if (!["manual", "talents", "quotes"].includes(source)) {
      return res.status(400).json({ ok: false, error: "source inválido" });
    }

    const { rows } = await pool.query(
      `INSERT INTO contacts (owner_user_id, type, name, email, phone, specialty, company, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (owner_user_id, lower(email))
       DO UPDATE SET
         type = EXCLUDED.type,
         name = COALESCE(NULLIF(EXCLUDED.name,''), contacts.name),
         phone = COALESCE(NULLIF(EXCLUDED.phone,''), contacts.phone),
         specialty = COALESCE(NULLIF(EXCLUDED.specialty,''), contacts.specialty),
         company = COALESCE(NULLIF(EXCLUDED.company,''), contacts.company),
         updated_at = now()
       RETURNING id, type, name, email, phone, specialty, company, source, created_at, updated_at`,
      [userId, type, name, email, phone, specialty, company, source]
    );

    return res.json({ ok: true, contact: rows[0] });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// DELETE /contacts/:id
router.delete("/:id", async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ ok: false, error: "id requerido" });

    const { rowCount } = await pool.query(
      `DELETE FROM contacts WHERE id = $1 AND owner_user_id = $2`,
      [id, userId]
    );

    return res.json({ ok: true, deleted: (rowCount ?? 0) > 0 });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;