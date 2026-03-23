import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool";
import { requireAuth } from "../middlewares/requireAuth";
import { requireProducer } from "../middlewares/requireProducer";

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

// Crear proyecto
const createProjectSchema = z.object({
  title: z.string().min(2),
  brief: z.string().optional(),
  currency: z.string().optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
});

router.post("/", requireAuth, requireProducer, async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const { title, brief, currency, start_date, due_date } = parsed.data;

  const producerOrgId = req.user!.orgId;
  const createdBy = req.user!.userId;

  const r = await pool.query(
    `INSERT INTO projects (producer_org_id, title, brief, currency, start_date, due_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, title, brief, status, currency, start_date, due_date, created_at`,
    [
      producerOrgId,
      title,
      brief ?? null,
      currency ?? null,
      start_date ?? null,
      due_date ?? null,
      createdBy,
    ]
  );

  res.json({ ok: true, project: r.rows[0] });
});

// Listar proyectos
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

  if (r.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "Project not found" });
  }

  res.json({ ok: true, project: r.rows[0] });
});

const uuidSchema = z.string().uuid();

router.get("/:id/creatives", requireAuth, requireProducer, async (req, res) => {
  const producerOrgId = req.user!.orgId;
  const { id } = req.params;

  if (!uuidSchema.safeParse(id).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const pr = await pool.query(
    `SELECT id FROM projects WHERE id = $1 AND producer_org_id = $2`,
    [id, producerOrgId]
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
     AND n.producer_org_id = $2
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
      AND pp.producer_org_id = $2

    ORDER BY created_at DESC
    `,
    [id, producerOrgId]
  );

  return res.json({ ok: true, creatives: r.rows });
});

// ===== INVITE =====

const inviteSchema = z.object({
  creativeEmail: z.string().email(),
  participantType: z.enum(["creative", "company"]).optional(),
  displayName: z.string().optional(),
  phone: z.string().optional(),
  specialty: z.string().optional(),
});

router.post("/:id/invite", requireAuth, requireProducer, async (req, res) => {
  const producerOrgId = req.user!.orgId;
  const ownerUserId = req.user!.userId;
  const { id } = req.params;

  if (!uuidSchema.safeParse(id).success) {
    return res.status(400).json({ ok: false, error: "Invalid project id" });
  }

  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const { creativeEmail, participantType, displayName, phone, specialty } = parsed.data;

  const pr = await pool.query(
    `SELECT id, title FROM projects WHERE id = $1 AND producer_org_id = $2`,
    [id, producerOrgId]
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
    await client.query("BEGIN");

    const ndaBody = buildDefaultNdaBody({
      projectTitle,
      participantName: name,
      participantEmail: creativeEmail,
    });

    // 1) UPSERT CONTACTO
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

    // 2) si existe creative user real y es creative
    const u = await client.query(
      `SELECT id, email, role FROM users WHERE lower(email) = lower($1)`,
      [creativeEmail]
    );

    if (u.rowCount > 0 && u.rows[0].role === "creative" && pType === "creative") {
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
        [id, producerOrgId, creative.id]
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
        [id, producerOrgId, creative.id, creativeEmail, name, ndaBody, ownerUserId]
      );
    } else {
      // 3) participante por contacto
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
          producerOrgId,
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
        [id, producerOrgId, contact.id, pType, creativeEmail, name, ndaBody, ownerUserId]
      );
    }

    await client.query("COMMIT");

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

export default router;

// import { Router } from "express";
// import { z } from "zod";
// import pool from "../db/pool";
// import { requireAuth } from "../middlewares/requireAuth";
// import { requireProducer } from "../middlewares/requireProducer";


// const router = Router();

// // Crear proyecto
// const createProjectSchema = z.object({
//   title: z.string().min(2),
//   brief: z.string().optional(),
//   currency: z.string().optional(),
//   start_date: z.string().optional(), // "YYYY-MM-DD"
//   due_date: z.string().optional(),   // "YYYY-MM-DD"
// });


// router.post("/", requireAuth, requireProducer, async (req, res) => {
//   const parsed = createProjectSchema.safeParse(req.body);
//   if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

//   const { title, brief, currency, start_date, due_date } = parsed.data;

//   const producerOrgId = req.user!.orgId;  // viene del JWT
//   const createdBy = req.user!.userId;

//   const r = await pool.query(
//     `INSERT INTO projects (producer_org_id, title, brief, currency, start_date, due_date, created_by)
//      VALUES ($1,$2,$3,$4,$5,$6,$7)
//      RETURNING id, title, brief, status, currency, start_date, due_date, created_at`,
//     [producerOrgId, title, brief ?? null, currency ?? null, start_date ?? null, due_date ?? null, createdBy]
//   );

//   res.json({ ok: true, project: r.rows[0] });
// });

// // Listar proyectos (solo de esa productora)
// router.get("/", requireAuth, requireProducer, async (req, res) => {
//   const producerOrgId = req.user!.orgId;

//   const r = await pool.query(
//     `SELECT id, title, status, currency, start_date, due_date, created_at
//      FROM projects
//      WHERE producer_org_id = $1
//      ORDER BY created_at DESC`,
//     [producerOrgId]
//   );

//   res.json({ ok: true, projects: r.rows });
// });

// // Detalle proyecto
// const idSchema = z.string().uuid();

// router.get("/:id", requireAuth, requireProducer, async (req, res) => {
//   const producerOrgId = req.user!.orgId;
//   const { id } = req.params;

//   const valid = idSchema.safeParse(id);
//   if (!valid.success) {
//     return res.status(400).json({ ok: false, error: "Invalid project id" });
//   }

//   const r = await pool.query(
//     `SELECT id, title, brief, status, currency, start_date, due_date, created_at
//      FROM projects
//      WHERE id = $1 AND producer_org_id = $2`,
//     [id, producerOrgId]
//   );

//   if (r.rowCount === 0) return res.status(404).json({ ok: false, error: "Project not found" });

//   res.json({ ok: true, project: r.rows[0] });
// });

// const uuidSchema = z.string().uuid();

// router.get("/:id/creatives", requireAuth, requireProducer, async (req, res) => {
//   const producerOrgId = req.user!.orgId;
//   const { id } = req.params;

//   if (!uuidSchema.safeParse(id).success) {
//     return res.status(400).json({ ok: false, error: "Invalid project id" });
//   }

//   // valida que el proyecto sea de esta productora
//   const pr = await pool.query(
//     `SELECT id FROM projects WHERE id = $1 AND producer_org_id = $2`,
//     [id, producerOrgId]
//   );
//   if (pr.rowCount === 0) return res.status(404).json({ ok: false, error: "Project not found" });

//   const r = await pool.query(
//     `
//     -- A) creativos registrados (tu lógica actual)
//     SELECT
//       pc.creative_user_id::text AS creative_user_id,
//       pc.status,
//       pc.created_at,
//       u.email,
//       cp.display_name,
//       n.id AS negotiation_id
//     FROM project_creatives pc
//     JOIN users u ON u.id = pc.creative_user_id
//     LEFT JOIN creative_profiles cp ON cp.user_id = u.id
//     LEFT JOIN negotiations n
//       ON n.project_id = pc.project_id
//      AND n.creative_user_id = pc.creative_user_id
//      AND n.producer_org_id = $2
//     WHERE pc.project_id = $1

//     UNION ALL

//     -- B) participantes por contacto (no registrados / empresa)
//     SELECT
//       COALESCE(pp.contact_id, pp.id)::text AS creative_user_id,
//       pp.status,
//       pp.created_at,
//       pp.email,
//       pp.display_name,
//       NULL::uuid AS negotiation_id
//     FROM project_participants pp
//     WHERE pp.project_id = $1
//       AND pp.producer_org_id = $2

//     ORDER BY created_at DESC
//     `,
//     [id, producerOrgId]
//   );

//   return res.json({ ok: true, creatives: r.rows });
// });

// // ===== INVITE =====

// const inviteSchema = z.object({
//   creativeEmail: z.string().email(),
//   participantType: z.enum(["creative", "company"]).optional(),
//   displayName: z.string().optional(),
//   phone: z.string().optional(),
//   specialty: z.string().optional(),
// });

// router.post("/:id/invite", requireAuth, requireProducer, async (req, res) => {
//   const producerOrgId = req.user!.orgId;
//   const ownerUserId = req.user!.userId;
//   const { id } = req.params;

//   if (!uuidSchema.safeParse(id).success) {
//     return res.status(400).json({ ok: false, error: "Invalid project id" });
//   }

//   const parsed = inviteSchema.safeParse(req.body);
//   if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

//   const { creativeEmail, participantType, displayName, phone, specialty } = parsed.data;

//   // valida proyecto pertenece a esta productora
//   const pr = await pool.query(
//     `SELECT id FROM projects WHERE id = $1 AND producer_org_id = $2`,
//     [id, producerOrgId]
//   );
//   if (pr.rowCount === 0) return res.status(404).json({ ok: false, error: "Project not found" });

//   const pType = participantType || "creative";
//   const cType = pType === "company" ? "empresa" : "creativo";

//   const name = (displayName || "").trim() || creativeEmail.split("@")[0];

//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");

//     // 1) UPSERT CONTACTO
//     const contactUpsert = await client.query(
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
//        RETURNING id, type, name, email`,
//       [
//         ownerUserId,
//         cType,
//         name,
//         creativeEmail,
//         phone?.trim() || null,
//         cType === "creativo" ? (specialty?.trim() || null) : null,
//         cType === "empresa" ? (specialty?.trim() || null) : null,
//         "talents",
//       ]
//     );

//     const contact = contactUpsert.rows[0];

//     // 2) si existe creative user real y es "creative"
//     const u = await client.query(
//       `SELECT id, email, role FROM users WHERE lower(email) = lower($1)`,
//       [creativeEmail]
//     );

//     if (u.rowCount > 0 && u.rows[0].role === "creative" && pType === "creative") {
//       const creative = u.rows[0];

//       await client.query(
//         `
//         INSERT INTO project_creatives (project_id, creative_user_id, invited_by, status)
//         VALUES ($1, $2, $3, 'invited')
//         ON CONFLICT (project_id, creative_user_id) DO NOTHING
//         `,
//         [id, creative.id, ownerUserId]
//       );

//       await client.query(
//         `
//         INSERT INTO negotiations (project_id, producer_org_id, creative_user_id, status)
//         VALUES ($1, $2, $3, 'open')
//         ON CONFLICT (project_id, creative_user_id) DO NOTHING
//         `,
//         [id, producerOrgId, creative.id]
//       );
//     } else {
//       // 3) participante por contacto
//       await client.query(
//         `
//         INSERT INTO project_participants
//           (project_id, producer_org_id, contact_id, participant_type, email, display_name, phone, specialty, status)
//         VALUES
//           ($1,$2,$3,$4,$5,$6,$7,$8,'invited')
//         ON CONFLICT (project_id, lower(email))
//         DO UPDATE SET
//           display_name = COALESCE(NULLIF(EXCLUDED.display_name,''), project_participants.display_name),
//           phone = COALESCE(NULLIF(EXCLUDED.phone,''), project_participants.phone),
//           specialty = COALESCE(NULLIF(EXCLUDED.specialty,''), project_participants.specialty)
//         `,
//         [
//           id,
//           producerOrgId,
//           contact.id,
//           pType,
//           creativeEmail,
//           name,
//           phone?.trim() || null,
//           specialty?.trim() || null,
//         ]
//       );
//     }

//     await client.query("COMMIT");

//     return res.json({
//       ok: true,
//       invited: {
//         email: creativeEmail,
//         display_name: name,
//         participantType: pType,
//         status: "invited",
//       },
//     });
//   } catch (e: any) {
//     await client.query("ROLLBACK");
//     return res.status(500).json({ ok: false, error: e?.message || String(e) });
//   } finally {
//     client.release();
//   }
// });

// export default router;

