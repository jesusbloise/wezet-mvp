import { Router } from "express";
import pool from "../db/pool";

const router = Router();

// GET /contacts
router.get("/", async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

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

// POST /contacts
router.post("/", async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const body = req.body || {};
    const type = String(body.type || "").trim();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();

    const phone = body.phone ? String(body.phone).trim() : null;
    const specialty = body.specialty ? String(body.specialty).trim() : null;
    const company = body.company ? String(body.company).trim() : null;
    const source = body.source ? String(body.source).trim() : "manual";

    if (!type || !name || !email) {
      return res
        .status(400)
        .json({ ok: false, error: "type, name y email son requeridos" });
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

// PATCH /contacts/:id
router.patch("/:id", async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const id = String(req.params.id || "").trim();
    if (!id) {
      return res.status(400).json({ ok: false, error: "id requerido" });
    }

    const body = req.body || {};

    const type = body.type !== undefined ? String(body.type).trim() : undefined;
    const name = body.name !== undefined ? String(body.name).trim() : undefined;
    const email = body.email !== undefined ? String(body.email).trim() : undefined;
    const phone = body.phone !== undefined ? (body.phone ? String(body.phone).trim() : "") : undefined;
    const specialty =
      body.specialty !== undefined ? (body.specialty ? String(body.specialty).trim() : "") : undefined;
    const company =
      body.company !== undefined ? (body.company ? String(body.company).trim() : "") : undefined;
    const source = body.source !== undefined ? String(body.source).trim() : undefined;

    const existing = await pool.query(
      `SELECT id, type, name, email, phone, specialty, company, source
       FROM contacts
       WHERE id = $1 AND owner_user_id = $2
       LIMIT 1`,
      [id, userId]
    );

    if ((existing.rowCount ?? 0) === 0) {
      return res.status(404).json({ ok: false, error: "Contacto no encontrado" });
    }

    const current = existing.rows[0];

    const finalType = type ?? current.type;
    const finalName = name ?? current.name;
    const finalEmail = email ?? current.email;
    const finalPhone = phone !== undefined ? (phone || null) : current.phone;
    const finalSpecialty =
      specialty !== undefined ? (specialty || null) : current.specialty;
    const finalCompany = company !== undefined ? (company || null) : current.company;
    const finalSource = source ?? current.source;

    if (!finalType || !finalName || !finalEmail) {
      return res
        .status(400)
        .json({ ok: false, error: "type, name y email son requeridos" });
    }

    if (finalType !== "creativo" && finalType !== "empresa") {
      return res.status(400).json({ ok: false, error: "type inválido" });
    }

    if (!["manual", "talents", "quotes"].includes(finalSource)) {
      return res.status(400).json({ ok: false, error: "source inválido" });
    }

    const { rows } = await pool.query(
      `UPDATE contacts
       SET
         type = $3,
         name = $4,
         email = $5,
         phone = $6,
         specialty = $7,
         company = $8,
         source = $9,
         updated_at = now()
       WHERE id = $1
         AND owner_user_id = $2
       RETURNING id, type, name, email, phone, specialty, company, source, created_at, updated_at`,
      [
        id,
        userId,
        finalType,
        finalName,
        finalEmail,
        finalPhone,
        finalType === "creativo" ? finalSpecialty : null,
        finalType === "empresa" ? finalCompany : null,
        finalSource,
      ]
    );

    return res.json({ ok: true, contact: rows[0] });
  } catch (e: any) {
    const msg = String(e?.message || e);

    if (msg.toLowerCase().includes("duplicate key")) {
      return res.status(400).json({
        ok: false,
        error: "Ya existe otro contacto con ese email",
      });
    }

    return res.status(500).json({ ok: false, error: msg });
  }
});

// DELETE /contacts/:id
router.delete("/:id", async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({ ok: false, error: "id requerido" });
    }

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


// import { Router } from "express";
// import pool from "../db/pool";

// const router = Router();

// // GET /contacts
// router.get("/", async (req: any, res) => {
//   try {
//     const userId = req.user?.userId;
//     if (!userId) return res.status(401).json({ ok: false, error: "Unauthorized" });

//     const { rows } = await pool.query(
//       `SELECT id, type, name, email, phone, specialty, company, source, created_at, updated_at
//        FROM contacts
//        WHERE owner_user_id = $1
//        ORDER BY created_at DESC`,
//       [userId]
//     );

//     return res.json({ ok: true, contacts: rows });
//   } catch (e: any) {
//     return res.status(500).json({ ok: false, error: String(e?.message || e) });
//   }
// });

// // POST /contacts (upsert)
// router.post("/", async (req: any, res) => {
//   try {
//     const userId = req.user?.userId;
//     if (!userId) return res.status(401).json({ ok: false, error: "Unauthorized" });

//     const body = req.body || {};
//     const type = String(body.type || "").trim();
//     const name = String(body.name || "").trim();
//     const email = String(body.email || "").trim();

//     const phone = body.phone ? String(body.phone).trim() : null;
//     const specialty = body.specialty ? String(body.specialty).trim() : null;
//     const company = body.company ? String(body.company).trim() : null;
//     const source = body.source ? String(body.source).trim() : "manual";

//     if (!type || !name || !email) {
//       return res.status(400).json({ ok: false, error: "type, name y email son requeridos" });
//     }

//     if (type !== "creativo" && type !== "empresa") {
//       return res.status(400).json({ ok: false, error: "type inválido" });
//     }

//     if (!["manual", "talents", "quotes"].includes(source)) {
//       return res.status(400).json({ ok: false, error: "source inválido" });
//     }

//     const { rows } = await pool.query(
//       `INSERT INTO contacts (owner_user_id, type, name, email, phone, specialty, company, source)
//        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
//        ON CONFLICT (owner_user_id, lower(email))
//        DO UPDATE SET
//          type = EXCLUDED.type,
//          name = COALESCE(NULLIF(EXCLUDED.name,''), contacts.name),
//          phone = COALESCE(NULLIF(EXCLUDED.phone,''), contacts.phone),
//          specialty = COALESCE(NULLIF(EXCLUDED.specialty,''), contacts.specialty),
//          company = COALESCE(NULLIF(EXCLUDED.company,''), contacts.company),
//          updated_at = now()
//        RETURNING id, type, name, email, phone, specialty, company, source, created_at, updated_at`,
//       [userId, type, name, email, phone, specialty, company, source]
//     );

//     return res.json({ ok: true, contact: rows[0] });
//   } catch (e: any) {
//     return res.status(500).json({ ok: false, error: String(e?.message || e) });
//   }
// });

// // DELETE /contacts/:id
// router.delete("/:id", async (req: any, res) => {
//   try {
//     const userId = req.user?.userId;
//     if (!userId) return res.status(401).json({ ok: false, error: "Unauthorized" });

//     const id = String(req.params.id || "");
//     if (!id) return res.status(400).json({ ok: false, error: "id requerido" });

//     const { rowCount } = await pool.query(
//       `DELETE FROM contacts WHERE id = $1 AND owner_user_id = $2`,
//       [id, userId]
//     );

//     return res.json({ ok: true, deleted: (rowCount ?? 0) > 0 });
//   } catch (e: any) {
//     return res.status(500).json({ ok: false, error: String(e?.message || e) });
//   }
// });

// export default router;