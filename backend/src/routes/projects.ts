import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool";
import { requireAuth } from "../middlewares/requireAuth";
import { sendInviteEmail } from "../lib/sendInviteEmail";

const router = Router();

function buildDefaultNdaBody(params: {
  projectTitle: string;
  participantName: string;
  participantEmail: string;
}) {
  const { projectTitle, participantName, participantEmail } = params;

  return `
ACUERDO DE CONFIDENCIALIDAD

Proyecto: ${projectTitle}
Participante: ${participantName}
Correo: ${participantEmail}

1. Objeto
El presente acuerdo tiene por objeto proteger toda la información confidencial compartida en relación con el proyecto indicado.

2. Información confidencial
Se considerará confidencial toda información creativa, comercial, técnica, financiera, estratégica, audiovisual, documental o verbal compartida dentro de la plataforma WEZET o por medios asociados al proyecto.

3. Obligaciones del participante
El participante se obliga a:
- no divulgar información del proyecto a terceros sin autorización previa;
- no reutilizar materiales, ideas, documentos o referencias para fines ajenos al proyecto;
- resguardar adecuadamente toda la información recibida;
- utilizar la información únicamente para evaluar, negociar o ejecutar su eventual participación en el proyecto.

4. Alcance
Esta obligación aplica desde el momento en que el participante recibe acceso o información relacionada con el proyecto, incluso si la negociación no llega a concretarse.

5. Incumplimiento
Cualquier uso indebido o divulgación no autorizada podrá dar lugar a la revocación del acceso al proyecto y a las acciones legales o contractuales que correspondan.

6. Aceptación
La aceptación de este documento habilita al participante a continuar dentro del flujo del proyecto en WEZET.
  `.trim();
}

const createProjectSchema = z.object({
  title: z.string().min(2),
  brief: z.string().optional(),
  currency: z.string().optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  has_commercial_dimension: z.boolean().optional(),
  has_team_dimension: z.boolean().optional(),
  client_name: z.string().optional(),
  client_email: z.string().optional(),
  client_company: z.string().optional(),
});

const idSchema = z.string().uuid();
const uuidSchema = z.string().uuid();

const inviteSchema = z.object({
  creativeEmail: z.string().email(),
  participantType: z.enum(["creative", "company"]).optional(),
  displayName: z.string().optional(),
  phone: z.string().optional(),
  specialty: z.string().optional(),
});

const removeCreativeSchema = z.object({
  email: z.string().email(),
});

const updateProjectSchema = z.object({
  title: z.string().min(2).optional(),
  brief: z.string().optional(),
  currency: z.string().optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  has_commercial_dimension: z.boolean().optional(),
  has_team_dimension: z.boolean().optional(),
  client_name: z.string().optional(),
  client_email: z.string().optional(),
  client_company: z.string().optional(),
});

// Crear proyecto
router.post("/", requireAuth, async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const {
    title,
    brief,
    currency,
    start_date,
    due_date,
    has_commercial_dimension,
    has_team_dimension,
    client_name,
    client_email,
    client_company,
  } = parsed.data;

  const ownerOrgId = req.user!.orgId ?? null;
  const createdBy = req.user!.userId;

  const r = await pool.query(
    `INSERT INTO projects (
      producer_org_id,
      title,
      brief,
      currency,
      start_date,
      due_date,
      created_by,
      has_commercial_dimension,
      has_team_dimension,
      client_name,
      client_email,
      client_company
    )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING
       id,
       title,
       brief,
       status,
       currency,
       start_date,
       due_date,
       created_at,
       has_commercial_dimension,
       has_team_dimension,
       client_name,
       client_email,
       client_company`,
    [
      ownerOrgId,
      title,
      brief ?? null,
      currency ?? null,
      start_date ?? null,
      due_date ?? null,
      createdBy,
      has_commercial_dimension ?? false,
      has_team_dimension ?? false,
      client_name?.trim() || null,
      client_email?.trim() || null,
      client_company?.trim() || null,
    ]
  );

  res.json({ ok: true, project: r.rows[0] });
});

// Listar proyectos propios con resumen de progreso
router.get("/", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const ownerOrgId = req.user!.orgId ?? null;

  try {
    const r = await pool.query(
      `
      WITH base_projects AS (
        SELECT
          p.id,
          p.title,
          p.status,
          p.currency,
          p.start_date,
          p.due_date,
          p.created_at,
          p.has_commercial_dimension,
          p.has_team_dimension,
          p.client_name,
          p.client_email,
          p.client_company
        FROM projects p
        WHERE p.created_by = $1
      ),

      participants_summary AS (
        SELECT
          bp.id AS project_id,
          (
            COALESCE((
              SELECT COUNT(*)
              FROM project_creatives pc
              WHERE pc.project_id = bp.id
            ), 0)
            +
            COALESCE((
              SELECT COUNT(*)
              FROM project_participants pp
              WHERE pp.project_id = bp.id
                AND (
                  ($2::uuid IS NULL AND pp.producer_org_id IS NULL)
                  OR pp.producer_org_id = $2::uuid
                )
            ), 0)
          )::int AS participants_count
        FROM base_projects bp
      ),

      nda_summary AS (
        SELECT
          bp.id AS project_id,
          COALESCE(COUNT(pn.*), 0)::int AS ndas_total,
          COALESCE(COUNT(*) FILTER (WHERE COALESCE(pn.status, 'pending') = 'pending'), 0)::int AS ndas_pending,
          COALESCE(COUNT(*) FILTER (WHERE pn.status = 'accepted'), 0)::int AS ndas_accepted
        FROM base_projects bp
        LEFT JOIN project_ndas pn
          ON pn.project_id = bp.id
         AND (
           ($2::uuid IS NULL AND pn.producer_org_id IS NULL)
           OR pn.producer_org_id = $2::uuid
         )
        GROUP BY bp.id
      ),

      quote_summary AS (
        SELECT
          bp.id AS project_id,
          COALESCE(COUNT(q.*), 0)::int AS quotes_count,
          COALESCE(COUNT(*) FILTER (WHERE lower(COALESCE(q.status, 'draft')) IN ('sent','viewed','changes_requested')), 0)::int AS quotes_sent,
          COALESCE(COUNT(*) FILTER (WHERE lower(COALESCE(q.status, 'draft')) = 'approved'), 0)::int AS quotes_approved
        FROM base_projects bp
        LEFT JOIN project_quotes q
          ON q.project_id = bp.id
        GROUP BY bp.id
      )

      SELECT
        bp.id,
        bp.title,
        bp.status,
        bp.currency,
        bp.start_date,
        bp.due_date,
        bp.created_at,

        bp.has_commercial_dimension,
        bp.has_team_dimension,
        bp.client_name,
        bp.client_email,
        bp.client_company,

        ps.participants_count,
        ns.ndas_total,
        ns.ndas_pending,
        ns.ndas_accepted,
        qs.quotes_count,
        qs.quotes_sent,
        qs.quotes_approved,

               CASE
          WHEN bp.has_commercial_dimension = true
               AND COALESCE(NULLIF(trim(bp.client_name), ''), NULL) IS NULL
               AND COALESCE(NULLIF(trim(bp.client_email), ''), NULL) IS NULL
               AND COALESCE(NULLIF(trim(bp.client_company), ''), NULL) IS NULL
            THEN 'client'

          WHEN qs.quotes_count > 0
            THEN 'agreement'

          WHEN bp.has_team_dimension = true
               AND ps.participants_count = 0
            THEN 'participants'

          WHEN bp.has_commercial_dimension = true
               AND (
                 COALESCE(NULLIF(trim(bp.client_name), ''), NULL) IS NOT NULL
                 OR COALESCE(NULLIF(trim(bp.client_email), ''), NULL) IS NOT NULL
                 OR COALESCE(NULLIF(trim(bp.client_company), ''), NULL) IS NOT NULL
               )
               AND qs.quotes_count = 0
            THEN 'quote'

          WHEN bp.has_team_dimension = true
               AND ps.participants_count > 0
               AND bp.has_commercial_dimension = false
            THEN 'participants'

          ELSE 'created'
        END AS progress_stage,

        CASE
          WHEN bp.has_commercial_dimension = true
               AND COALESCE(NULLIF(trim(bp.client_name), ''), NULL) IS NULL
               AND COALESCE(NULLIF(trim(bp.client_email), ''), NULL) IS NULL
               AND COALESCE(NULLIF(trim(bp.client_company), ''), NULL) IS NULL
            THEN 'Agregar cliente'

          WHEN qs.quotes_count > 0
            THEN 'Acuerdo'

          WHEN bp.has_team_dimension = true
               AND ps.participants_count = 0
            THEN 'Agregar participantes'

          WHEN bp.has_commercial_dimension = true
               AND (
                 COALESCE(NULLIF(trim(bp.client_name), ''), NULL) IS NOT NULL
                 OR COALESCE(NULLIF(trim(bp.client_email), ''), NULL) IS NOT NULL
                 OR COALESCE(NULLIF(trim(bp.client_company), ''), NULL) IS NOT NULL
               )
               AND qs.quotes_count = 0
            THEN 'Crear cotización'

          WHEN bp.has_team_dimension = true
               AND ps.participants_count > 0
               AND bp.has_commercial_dimension = false
            THEN CASE
              WHEN ns.ndas_pending > 0 THEN 'Revisar NDA'
              ELSE 'Gestionar participantes'
            END

          ELSE 'Activar flujo'
        END AS next_step_label

      FROM base_projects bp
      LEFT JOIN participants_summary ps ON ps.project_id = bp.id
      LEFT JOIN nda_summary ns ON ns.project_id = bp.id
      LEFT JOIN quote_summary qs ON qs.project_id = bp.id
      ORDER BY bp.created_at DESC
      `,
      [userId, ownerOrgId]
    );

    return res.json({ ok: true, projects: r.rows });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// Proyectos visibles para el usuario
router.get("/shared", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  try {
    const r = await pool.query(
      `
      WITH own_projects AS (
        SELECT
          p.id,
          p.title,
          p.status,
          p.currency,
          p.start_date,
          p.due_date,
          p.created_at,
          p.has_commercial_dimension,
          p.has_team_dimension,
          p.client_name,
          p.client_email,
          p.client_company,
          'owner'::text AS access_type,
          'accepted'::text AS nda_status,
          1 AS priority
        FROM projects p
        WHERE p.created_by = $1
      ),
      invited_projects AS (
        SELECT
          p.id,
          p.title,
          p.status,
          p.currency,
          p.start_date,
          p.due_date,
          p.created_at,
          p.has_commercial_dimension,
          p.has_team_dimension,
          p.client_name,
          p.client_email,
          p.client_company,
          CASE
            WHEN pc.creative_user_id IS NOT NULL THEN 'participant'
            ELSE 'nda_only'
          END AS access_type,
          COALESCE(pn.status, 'pending') AS nda_status,
          2 AS priority
        FROM users u
        JOIN project_ndas pn
          ON lower(pn.email) = lower(u.email)
        JOIN projects p
          ON p.id = pn.project_id
        LEFT JOIN project_creatives pc
          ON pc.project_id = p.id
         AND pc.creative_user_id = u.id
        WHERE u.id = $1
      ),
      merged AS (
        SELECT * FROM own_projects
        UNION ALL
        SELECT * FROM invited_projects
      ),
      dedup AS (
        SELECT DISTINCT ON (id)
          id,
          title,
          status,
          currency,
          start_date,
          due_date,
          created_at,
          has_commercial_dimension,
          has_team_dimension,
          client_name,
          client_email,
          client_company,
          access_type,
          nda_status
        FROM merged
        ORDER BY id, priority ASC, created_at DESC
      )
      SELECT
        id,
        title,
        status,
        currency,
        start_date,
        due_date,
        created_at,
        has_commercial_dimension,
        has_team_dimension,
        client_name,
        client_email,
        client_company,
        access_type,
        nda_status
      FROM dedup
      ORDER BY created_at DESC
      `,
      [userId]
    );

    return res.json({ ok: true, projects: r.rows });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// Detalle compartido o propio
router.get("/shared/:id", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  if (!uuidSchema.safeParse(id).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  try {
    const own = await pool.query(
      `
      SELECT
        id,
        title,
        brief,
        status,
        currency,
        start_date,
        due_date,
        created_at,
        has_commercial_dimension,
        has_team_dimension,
        client_name,
        client_email,
        client_company
      FROM projects
      WHERE id = $1
        AND created_by = $2
      LIMIT 1
      `,
      [id, userId]
    );

    if ((own.rowCount ?? 0) > 0) {
      return res.json({
        ok: true,
        project: own.rows[0],
        access: { type: "owner", nda_status: "accepted" },
        collaboration: {
          negotiation_id: null,
          can_open_negotiation: false,
        },
      });
    }

    const userQ = await pool.query(
      `SELECT id, email FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (userQ.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    const user = userQ.rows[0];

    const shared = await pool.query(
      `
      SELECT
        p.id,
        p.title,
        p.brief,
        p.status,
        p.currency,
        p.start_date,
        p.due_date,
        p.created_at,
        p.has_commercial_dimension,
        p.has_team_dimension,
        p.client_name,
        p.client_email,
        p.client_company,
        CASE
          WHEN pc.creative_user_id IS NOT NULL THEN 'participant'
          ELSE 'nda_only'
        END AS access_type,
        COALESCE(pn.status, 'pending') AS nda_status,
        n.id AS negotiation_id
      FROM projects p
      JOIN project_ndas pn
        ON pn.project_id = p.id
      LEFT JOIN project_creatives pc
        ON pc.project_id = p.id
       AND pc.creative_user_id = $2
      LEFT JOIN negotiations n
        ON n.project_id = p.id
       AND n.creative_user_id = $2
      WHERE p.id = $1
        AND lower(pn.email) = lower($3)
      LIMIT 1
      `,
      [id, userId, user.email]
    );

    if (shared.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Project not found" });
    }

    const row = shared.rows[0];

    if (row.nda_status !== "accepted") {
      return res.status(403).json({
        ok: false,
        error: "NDA pendiente o sin acceso habilitado",
      });
    }

    return res.json({
      ok: true,
      project: {
        id: row.id,
        title: row.title,
        brief: row.brief,
        status: row.status,
        currency: row.currency,
        start_date: row.start_date,
        due_date: row.due_date,
        created_at: row.created_at,
        has_commercial_dimension: row.has_commercial_dimension,
        has_team_dimension: row.has_team_dimension,
        client_name: row.client_name,
        client_email: row.client_email,
        client_company: row.client_company,
      },
      access: {
        type: row.access_type,
        nda_status: row.nda_status,
      },
      collaboration: {
        negotiation_id: row.negotiation_id || null,
        can_open_negotiation:
          !!row.negotiation_id && row.access_type === "participant",
      },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// Listar talentos/participantes del proyecto
router.get("/:id/creatives", requireAuth, async (req, res) => {
  const ownerUserId = req.user!.userId;
  const ownerOrgId = req.user!.orgId ?? null;
  const { id } = req.params;

  if (!uuidSchema.safeParse(id).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const pr = await pool.query(
    `SELECT id FROM projects WHERE id = $1 AND created_by = $2`,
    [id, ownerUserId]
  );

  if (pr.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "Project not found" });
  }

  const r = await pool.query(
    `
    SELECT
      pc.creative_user_id::text AS creative_user_id,
      pc.status,
      pc.created_at,
      u.email,
      cp.display_name,
      n.id AS negotiation_id
    FROM project_creatives pc
    JOIN users u ON u.id = pc.creative_user_id
    LEFT JOIN creative_profiles cp ON cp.user_id = u.id
    LEFT JOIN negotiations n
      ON n.project_id = pc.project_id
     AND n.creative_user_id = pc.creative_user_id
     AND (
       ($2::uuid IS NULL AND n.producer_org_id IS NULL)
       OR n.producer_org_id = $2::uuid
     )
    WHERE pc.project_id = $1

    UNION ALL

    SELECT
      COALESCE(pp.contact_id, pp.id)::text AS creative_user_id,
      pp.status,
      pp.created_at,
      pp.email,
      pp.display_name,
      NULL::uuid AS negotiation_id
    FROM project_participants pp
    WHERE pp.project_id = $1
      AND (
        ($2::uuid IS NULL AND pp.producer_org_id IS NULL)
        OR pp.producer_org_id = $2::uuid
      )

    ORDER BY created_at DESC
    `,
    [id, ownerOrgId]
  );

  return res.json({ ok: true, creatives: r.rows });
});

// Eliminar talento/participante del proyecto
router.delete("/:id/creatives", requireAuth, async (req, res) => {
  const ownerUserId = req.user!.userId;
  const ownerOrgId = req.user!.orgId ?? null;
  const { id } = req.params;

  if (!uuidSchema.safeParse(id).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const parsed = removeCreativeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const projectCheck = await client.query(
      `SELECT id FROM projects WHERE id = $1 AND created_by = $2`,
      [id, ownerUserId]
    );

    if (projectCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Project not found" });
    }

    const userQ = await client.query(
      `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    );

    const creativeUserId = userQ.rowCount ? userQ.rows[0].id : null;

    if (creativeUserId) {
      await client.query(
        `
        DELETE FROM negotiations
        WHERE project_id = $1
          AND creative_user_id = $2
          AND (
            ($3::uuid IS NULL AND producer_org_id IS NULL)
            OR producer_org_id = $3::uuid
          )
        `,
        [id, creativeUserId, ownerOrgId]
      );

      await client.query(
        `
        DELETE FROM project_creatives
        WHERE project_id = $1
          AND creative_user_id = $2
        `,
        [id, creativeUserId]
      );
    }

    await client.query(
      `
      DELETE FROM project_participants
      WHERE project_id = $1
        AND lower(email) = lower($2)
        AND (
          ($3::uuid IS NULL AND producer_org_id IS NULL)
          OR producer_org_id = $3::uuid
        )
      `,
      [id, email, ownerOrgId]
    );

    await client.query(
      `
      DELETE FROM project_ndas
      WHERE project_id = $1
        AND lower(email) = lower($2)
        AND (
          ($3::uuid IS NULL AND producer_org_id IS NULL)
          OR producer_org_id = $3::uuid
        )
      `,
      [id, email, ownerOrgId]
    );

    await client.query("COMMIT");

    return res.json({
      ok: true,
      removed: true,
      email,
      projectId: id,
    });
  } catch (e: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  } finally {
    client.release();
  }
});

// Detalle proyecto propio
router.get("/:id", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const valid = idSchema.safeParse(id);
  if (!valid.success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const r = await pool.query(
    `SELECT
       id,
       title,
       brief,
       status,
       currency,
       start_date,
       due_date,
       created_at,
       has_commercial_dimension,
       has_team_dimension,
       client_name,
       client_email,
       client_company
     FROM projects
     WHERE id = $1 AND created_by = $2`,
    [id, userId]
  );

  if (r.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "Project not found" });
  }

  res.json({ ok: true, project: r.rows[0] });
});

// Invite
router.post("/:id/invite", requireAuth, async (req, res) => {
  const ownerOrgId = req.user!.orgId ?? null;
  const ownerUserId = req.user!.userId;
  const { id } = req.params;

  if (!uuidSchema.safeParse(id).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const { creativeEmail, participantType, displayName, phone, specialty } =
    parsed.data;

  const pr = await pool.query(
    `SELECT id, title FROM projects WHERE id = $1 AND created_by = $2`,
    [id, ownerUserId]
  );

  if (pr.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "Project not found" });
  }

  const project = pr.rows[0];
  const projectTitle = project.title || "Proyecto";

  const pType = participantType || "creative";
  const cType = pType === "company" ? "empresa" : "creativo";
  const fallbackName = creativeEmail.split("@")[0] || "Participante";
  const name: string = (displayName || "").trim() || fallbackName;

  const client = await pool.connect();

  try {
    console.log("[invite] iniciando invitación", {
      projectId: id,
      creativeEmail,
      participantType,
      displayName,
    });

    await client.query("BEGIN");

    const ndaBody = buildDefaultNdaBody({
      projectTitle,
      participantName: name,
      participantEmail: creativeEmail,
    });

    const contactUpsert = await client.query(
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
       RETURNING id, type, name, email`,
      [
        ownerUserId,
        cType,
        name,
        creativeEmail,
        phone?.trim() || null,
        cType === "creativo" ? specialty?.trim() || null : null,
        cType === "empresa" ? specialty?.trim() || null : null,
        "talents",
      ]
    );

    const contact = contactUpsert.rows[0];

    const u = await client.query(
      `SELECT id, email, role FROM users WHERE lower(email) = lower($1)`,
      [creativeEmail]
    );

    if ((u.rowCount ?? 0) > 0 && pType === "creative") {
      const creative = u.rows[0];

      await client.query(
        `
        INSERT INTO project_creatives (project_id, creative_user_id, invited_by, status)
        VALUES ($1, $2, $3, 'invited')
        ON CONFLICT (project_id, creative_user_id) DO NOTHING
        `,
        [id, creative.id, ownerUserId]
      );

      await client.query(
        `
        INSERT INTO negotiations (project_id, producer_org_id, creative_user_id, status)
        VALUES ($1, $2, $3, 'open')
        ON CONFLICT (project_id, creative_user_id) DO NOTHING
        `,
        [id, ownerOrgId, creative.id]
      );

      await client.query(
        `
        INSERT INTO project_ndas
          (project_id, producer_org_id, creative_user_id, participant_type, email, display_name, nda_title, nda_body, status, created_by)
        VALUES
          ($1, $2, $3, 'creative', $4, $5, 'Acuerdo de Confidencialidad', $6, 'pending', $7)
        ON CONFLICT (project_id, lower(email))
        DO UPDATE SET
          display_name = EXCLUDED.display_name,
          nda_body = EXCLUDED.nda_body,
          updated_at = now()
        `,
        [id, ownerOrgId, creative.id, creativeEmail, name, ndaBody, ownerUserId]
      );
    } else {
      await client.query(
        `
        INSERT INTO project_participants
          (project_id, producer_org_id, contact_id, participant_type, email, display_name, phone, specialty, status)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,'invited')
        ON CONFLICT (project_id, lower(email))
        DO UPDATE SET
          display_name = COALESCE(NULLIF(EXCLUDED.display_name,''), project_participants.display_name),
          phone = COALESCE(NULLIF(EXCLUDED.phone,''), project_participants.phone),
          specialty = COALESCE(NULLIF(EXCLUDED.specialty,''), project_participants.specialty)
        `,
        [
          id,
          ownerOrgId,
          contact.id,
          pType,
          creativeEmail,
          name,
          phone?.trim() || null,
          specialty?.trim() || null,
        ]
      );

      await client.query(
        `
        INSERT INTO project_ndas
          (project_id, producer_org_id, contact_id, participant_type, email, display_name, nda_title, nda_body, status, created_by)
        VALUES
          ($1, $2, $3, $4, $5, $6, 'Acuerdo de Confidencialidad', $7, 'pending', $8)
        ON CONFLICT (project_id, lower(email))
        DO UPDATE SET
          display_name = EXCLUDED.display_name,
          nda_body = EXCLUDED.nda_body,
          updated_at = now()
        `,
        [id, ownerOrgId, contact.id, pType, creativeEmail, name, ndaBody, ownerUserId]
      );
    }

    await client.query(
      `
      UPDATE projects
      SET has_team_dimension = true
      WHERE id = $1 AND created_by = $2
      `,
      [id, ownerUserId]
    );

    await client.query("COMMIT");

    const registerUrl =
      process.env.BREVO_REGISTER_URL?.trim() ||
      "https://wezet-frontend-staging-499942741847.us-central1.run.app/register";

    try {
      await sendInviteEmail({
        toEmail: creativeEmail,
        toName: name,
        projectTitle,
        inviterName: "Equipo de WEZET",
        registerUrl,
      });
    } catch (mailError: any) {
      console.error("[invite-email] error enviando correo:", mailError?.message || mailError);
    }

    return res.json({
      ok: true,
      invited: {
        email: creativeEmail,
        display_name: name,
        participantType: pType,
        status: "invited",
      },
    });
  } catch (e: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  } finally {
    client.release();
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const valid = idSchema.safeParse(id);
  if (!valid.success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const existing = await pool.query(
    `SELECT
       id,
       title,
       brief,
       status,
       currency,
       start_date,
       due_date,
       created_at,
       has_commercial_dimension,
       has_team_dimension,
       client_name,
       client_email,
       client_company
     FROM projects
     WHERE id = $1 AND created_by = $2`,
    [id, userId]
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "Project not found" });
  }

  const d = parsed.data;

  const updated = await pool.query(
    `UPDATE projects
     SET
       title = COALESCE($3, title),
       brief = COALESCE($4, brief),
       currency = COALESCE($5, currency),
       start_date = COALESCE($6, start_date),
       due_date = COALESCE($7, due_date),
       has_commercial_dimension = COALESCE($8, has_commercial_dimension),
       has_team_dimension = COALESCE($9, has_team_dimension),
       client_name = COALESCE($10, client_name),
       client_email = COALESCE($11, client_email),
       client_company = COALESCE($12, client_company)
     WHERE id = $1 AND created_by = $2
     RETURNING
       id,
       title,
       brief,
       status,
       currency,
       start_date,
       due_date,
       created_at,
       has_commercial_dimension,
       has_team_dimension,
       client_name,
       client_email,
       client_company`,
    [
      id,
      userId,
      d.title ?? null,
      d.brief ?? null,
      d.currency ?? null,
      d.start_date ?? null,
      d.due_date ?? null,
      typeof d.has_commercial_dimension === "boolean" ? d.has_commercial_dimension : null,
      typeof d.has_team_dimension === "boolean" ? d.has_team_dimension : null,
            d.client_name !== undefined ? d.client_name.trim() || null : null,
      d.client_email !== undefined ? d.client_email.trim() || null : null,
      d.client_company !== undefined ? d.client_company.trim() || null : null,
    ]
  );

  return res.json({ ok: true, project: updated.rows[0] });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const valid = idSchema.safeParse(id);
  if (!valid.success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const pr = await client.query(
      `SELECT id FROM projects WHERE id = $1 AND created_by = $2`,
      [id, userId]
    );

    if (pr.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Project not found" });
    }

    await client.query(
      `DELETE FROM quote_items WHERE quote_id IN (SELECT id FROM project_quotes WHERE project_id = $1)`,
      [id]
    );
    await client.query(`DELETE FROM project_quotes WHERE project_id = $1`, [id]);

    await client.query(`DELETE FROM project_ndas WHERE project_id = $1`, [id]);
    await client.query(`DELETE FROM project_creatives WHERE project_id = $1`, [id]);
    await client.query(`DELETE FROM project_participants WHERE project_id = $1`, [id]);
    await client.query(`DELETE FROM negotiations WHERE project_id = $1`, [id]);

    await client.query(`DELETE FROM projects WHERE id = $1 AND created_by = $2`, [
      id,
      userId,
    ]);

    await client.query("COMMIT");

    return res.json({ ok: true, deleted: true, projectId: id });
  } catch (e: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  } finally {
    client.release();
  }
});

export default router;

