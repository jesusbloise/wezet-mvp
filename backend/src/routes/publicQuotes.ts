import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool";

const router = Router();
const uuid = z.string().uuid();

router.get("/quote/:publicId", async (req, res) => {
  const publicId = req.params?.publicId;
  if (typeof publicId !== "string" || !uuid.safeParse(publicId).success) {
    return res.status(400).json({ ok: false, error: "Invalid public id" });
  }

  const q = await pool.query(
    `SELECT id, project_id, status, client_name, client_email, currency,
            subtotal, discount, tax_rate, tax_amount, total_amount,
            valid_until, notes, terms, created_at, updated_at
     FROM project_quotes
     WHERE public_id = $1`,
    [publicId]
  );

  if (q.rowCount === 0) return res.status(404).json({ ok: false, error: "Quote not found" });

  const items = await pool.query(
    `SELECT id, title, description, qty, unit_price, line_total, sort_order
     FROM quote_items
     WHERE quote_id = $1
     ORDER BY sort_order ASC`,
    [q.rows[0].id]
  );

  res.json({ ok: true, quote: q.rows[0], items: items.rows });
});

export default router;