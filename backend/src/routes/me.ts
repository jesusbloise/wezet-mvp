import { Router } from "express";
import pool from "../db/pool";
import { requireAuth } from "../middlewares/requireAuth";

type JwtPayload = {
  userId: string;
  email?: string;
  role?: string;
};

const router = Router();

router.get("/profile", requireAuth, async (req, res) => {
  try {
    const user = req.user as JwtPayload;

    const result = await pool.query(
      `
      SELECT
        id,
        email,
        role,
        org_id,
        created_at,
        profile_type,
        display_name,
        phone,
        country,
        website,
        bio,
        specialty,
        portfolio,
        experience,
        company_name,
        tax_id,
        industry,
        address,
        avatar_url
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("GET /me/profile error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/profile", requireAuth, async (req, res) => {
  try {
    const user = req.user as JwtPayload;

    const {
      profile_type,
      display_name,
      phone,
      country,
      website,
      bio,
      specialty,
      portfolio,
      experience,
      company_name,
      tax_id,
      industry,
      address,
      avatar_url,
    } = req.body ?? {};

    const result = await pool.query(
      `
      UPDATE users
      SET
        profile_type = $1,
        display_name = $2,
        phone = $3,
        country = $4,
        website = $5,
        bio = $6,
        specialty = $7,
        portfolio = $8,
        experience = $9,
        company_name = $10,
        tax_id = $11,
        industry = $12,
        address = $13,
        avatar_url = $14
      WHERE id = $15
      RETURNING
        id,
        email,
        role,
        org_id,
        created_at,
        profile_type,
        display_name,
        phone,
        country,
        website,
        bio,
        specialty,
        portfolio,
        experience,
        company_name,
        tax_id,
        industry,
        address,
        avatar_url
      `,
      [
        profile_type ?? null,
        display_name ?? null,
        phone ?? null,
        country ?? null,
        website ?? null,
        bio ?? null,
        specialty ?? null,
        portfolio ?? null,
        experience ?? null,
        company_name ?? null,
        tax_id ?? null,
        industry ?? null,
        address ?? null,
        avatar_url ?? null,
        user.userId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("PUT /me/profile error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
