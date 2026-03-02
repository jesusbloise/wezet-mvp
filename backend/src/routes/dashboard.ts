import { Router } from "express";
import pool from "../db/pool";
import { requireAuth } from "../middlewares/requireAuth";
import { requireProducer } from "../middlewares/requireProducer";

const router = Router();

type TimeFilter = "all" | "week" | "month" | "quarter" | "year";

type QuoteRow = {
  id: string;
  title: string;
  status: string;
  created_at: string | Date;
  project_id: string | null;
};

type AgreementRow = {
  id: string;
  title: string;
  status: string;
  created_at: string | Date;
  project_id: string | null;
};

type NdaRow = {
  id: string;
  title: string;
  status: string;
  created_at: string | Date;
  project_id: string | null;
};

type ProjectRow = {
  id: string;
  title: string;
  status: string;
  created_at: string | Date;
};

type RecentDoc = {
  id: string;
  type: "quote" | "agreement" | "nda";
  title: string;
  status: string;
  createdAt: string;
  projectId?: string | null;
};

function getUserContext(req: any, res: any) {
  const userId = req.user?.userId;
  const orgId = req.user?.orgId;

  if (!userId || typeof userId !== "string") {
    res.status(401).json({ ok: false, error: "No userId" });
    return null;
  }
  if (!orgId || typeof orgId !== "string") {
    res.status(403).json({ ok: false, error: "No orgId" });
    return null;
  }

  return { userId, orgId };
}

function getPeriodRange(time: TimeFilter) {
  const now = new Date();
  const to = now.toISOString();

  if (time === "all") return { from: null as string | null, to };

  const fromDate = new Date(now);
  if (time === "week") fromDate.setDate(now.getDate() - 7);
  else if (time === "month") fromDate.setMonth(now.getMonth() - 1);
  else if (time === "quarter") fromDate.setMonth(now.getMonth() - 3);
  else if (time === "year") fromDate.setFullYear(now.getFullYear() - 1);

  return { from: fromDate.toISOString(), to };
}

router.get("/summary", requireAuth, requireProducer, async (req, res) => {
  const ctx = getUserContext(req, res);
  if (!ctx) return;

  const { orgId } = ctx;

  const currency = String(req.query.currency || "CLP");
  const time = String(req.query.time || "all") as TimeFilter;
  const project = String(req.query.project || "all");

  const { from, to } = getPeriodRange(time);

  // Filtro proyecto
  const projectFilterSql = project !== "all" ? "AND p.id = $2" : "";
  const projectParams: any[] = project !== "all" ? [orgId, project] : [orgId];

  // Para filtros de fecha cuando hay join con projects (alias x o q o n)
  const dateFilterSql = (alias: string, startIndex: number) => {
    if (!from) return { sql: "", params: [] as any[] };
    return {
      sql: `AND ${alias}.created_at >= $${startIndex} AND ${alias}.created_at <= $${startIndex + 1}`,
      params: [from, to],
    };
  };

  try {
    // =====================
    // 1) Projects count
    // =====================
    const projectsCountQ = await pool.query<{ count: number }>(
      `
      SELECT COUNT(*)::int AS count
      FROM projects
      WHERE producer_org_id = $1
      ${project !== "all" ? "AND id = $2" : ""}
      `,
      projectParams
    );
    const projectsCount = projectsCountQ.rows[0]?.count ?? 0;

    // =====================
    // 2) Talentos asociados (project_creatives)
    // =====================
    let talentsAssociated = 0;
    try {
      const r = await pool.query<{ c: number }>(
        `
        SELECT COUNT(DISTINCT pc.creative_user_id)::int AS c
        FROM project_creatives pc
        JOIN projects p ON p.id = pc.project_id
        WHERE p.producer_org_id = $1
        ${projectFilterSql}
        `,
        projectParams
      );
      talentsAssociated = r.rows[0]?.c ?? 0;
    } catch (e) {
      talentsAssociated = 0;
    }

    // =====================
    // 3) Negotiations como “Acuerdos”
    // =====================
    const negoParams: any[] = [...projectParams];
    const negoDate = dateFilterSql("n", project !== "all" ? 3 : 2);
    negoParams.push(...negoDate.params);

    const negoQ = await pool.query<{ total: number; pending: number; signed: number }>(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN n.status = 'open' THEN 1 END)::int AS pending,
        COUNT(CASE WHEN n.status <> 'open' THEN 1 END)::int AS signed
      FROM negotiations n
      JOIN projects p ON p.id = n.project_id
      WHERE p.producer_org_id = $1
      ${projectFilterSql}
      ${negoDate.sql}
      `,
      negoParams
    );

    const agreementsTotal = negoQ.rows[0]?.total ?? 0;
    const agreementsPending = negoQ.rows[0]?.pending ?? 0;
    const agreementsSigned = negoQ.rows[0]?.signed ?? 0;

    // =====================
    // 4) Quotes (project_quotes)
    // =====================
    const quotesParams: any[] = [...projectParams];
    const quotesDate = dateFilterSql("q", project !== "all" ? 3 : 2);
    quotesParams.push(...quotesDate.params);

    const quotesAggQ = await pool.query<{
      quotes_total: number;
      quoted: number;
      in_execution: number;
      to_collect: number;
      collected: number;
      quotes_in_progress_count: number;
      quotes_completed_count: number;
      quotes_paid_count: number;
    }>(
      `
      SELECT
        COUNT(*)::int AS quotes_total,

        COALESCE(SUM(CASE
          WHEN q.status NOT IN ('archived','rejected') THEN q.total_amount
          ELSE 0 END
        ),0)::float AS quoted,

        COALESCE(SUM(CASE
          WHEN q.status = 'accepted' THEN q.total_amount
          ELSE 0 END
        ),0)::float AS in_execution,

        COALESCE(SUM(CASE
          WHEN q.status = 'accepted' THEN q.total_amount
          ELSE 0 END
        ),0)::float AS to_collect,

        0::float AS collected,

        COUNT(CASE WHEN q.status = 'accepted' THEN 1 END)::int AS quotes_in_progress_count,
        COUNT(CASE WHEN q.status IN ('sent','accepted') THEN 1 END)::int AS quotes_completed_count,
        0::int AS quotes_paid_count

      FROM project_quotes q
      JOIN projects p ON p.id = q.project_id
      WHERE q.producer_org_id = $1
      ${projectFilterSql}
      ${quotesDate.sql}
      `,
      quotesParams
    );

    const qr = quotesAggQ.rows[0] || ({} as any);
    const quotesTotal = qr.quotes_total ?? 0;

    const quoted = Number(qr.quoted ?? 0);
    const inExecution = Number(qr.in_execution ?? 0);
    const toCollect = Number(qr.to_collect ?? 0);
    const collected = Number(qr.collected ?? 0);

    const quotesInProgressCount = qr.quotes_in_progress_count ?? 0;
    const quotesCompletedCount = qr.quotes_completed_count ?? 0;
    const quotesPaidCount = qr.quotes_paid_count ?? 0;

    // =====================
    // 5) NDAs (si existe tabla ndas)
    // =====================
    let ndasTotal = 0;
    let ndasPending = 0;
    let ndasSigned = 0;

    try {
      const ndasParams: any[] = [...projectParams];
      const ndasDate = dateFilterSql("n", project !== "all" ? 3 : 2);
      ndasParams.push(...ndasDate.params);

      const ndasQ = await pool.query<{ total: number; pending: number; signed: number }>(
        `
        SELECT
          COUNT(*)::int AS total,
          COUNT(CASE WHEN n.status = 'pending' THEN 1 END)::int AS pending,
          COUNT(CASE WHEN n.status = 'signed' THEN 1 END)::int AS signed
        FROM ndas n
        JOIN projects p ON p.id = n.project_id
        WHERE p.producer_org_id = $1
        ${projectFilterSql}
        ${ndasDate.sql}
        `,
        ndasParams
      );

      ndasTotal = ndasQ.rows[0]?.total ?? 0;
      ndasPending = ndasQ.rows[0]?.pending ?? 0;
      ndasSigned = ndasQ.rows[0]?.signed ?? 0;
    } catch (e) {
      ndasTotal = 0;
      ndasPending = 0;
      ndasSigned = 0;
    }

    // =====================
    // 6) Recent Docs
    // =====================
    const recentDocs: RecentDoc[] = [];

    // Quotes recientes
    try {
      const r = await pool.query<QuoteRow>(
        `
        SELECT
          q.id::text AS id,
          COALESCE(q.client_name, 'Cotización')::text AS title,
          COALESCE(q.status,'unknown')::text AS status,
          q.created_at::timestamptz AS created_at,
          q.project_id::text AS project_id
        FROM project_quotes q
        JOIN projects p ON p.id = q.project_id
        WHERE q.producer_org_id = $1
        ${projectFilterSql}
        ORDER BY q.created_at DESC
        LIMIT 10
        `,
        projectParams
      );

      r.rows.forEach((x: QuoteRow) => {
        recentDocs.push({
          id: x.id,
          type: "quote",
          title: x.title,
          status: x.status,
          createdAt: new Date(x.created_at).toISOString(),
          projectId: x.project_id,
        });
      });
    } catch (e) {}

    // Agreements recientes desde negotiations
    try {
      const r = await pool.query<AgreementRow>(
        `
        SELECT
          n.id::text AS id,
          COALESCE(p.title, 'Acuerdo')::text AS title,
          COALESCE(n.status,'unknown')::text AS status,
          n.created_at::timestamptz AS created_at,
          n.project_id::text AS project_id
        FROM negotiations n
        JOIN projects p ON p.id = n.project_id
        WHERE p.producer_org_id = $1
        ${projectFilterSql}
        ORDER BY n.created_at DESC
        LIMIT 10
        `,
        projectParams
      );

      r.rows.forEach((x: AgreementRow) => {
        recentDocs.push({
          id: x.id,
          type: "agreement",
          title: `Acuerdo • ${x.title}`,
          status: x.status,
          createdAt: new Date(x.created_at).toISOString(),
          projectId: x.project_id,
        });
      });
    } catch (e) {}

    // NDAs recientes si existen
    try {
      const r = await pool.query<NdaRow>(
        `
        SELECT
          n.id::text AS id,
          COALESCE(n.title, 'NDA')::text AS title,
          COALESCE(n.status,'unknown')::text AS status,
          n.created_at::timestamptz AS created_at,
          n.project_id::text AS project_id
        FROM ndas n
        JOIN projects p ON p.id = n.project_id
        WHERE p.producer_org_id = $1
        ${projectFilterSql}
        ORDER BY n.created_at DESC
        LIMIT 10
        `,
        projectParams
      );

      r.rows.forEach((x: NdaRow) => {
        recentDocs.push({
          id: x.id,
          type: "nda",
          title: x.title,
          status: x.status,
          createdAt: new Date(x.created_at).toISOString(),
          projectId: x.project_id,
        });
      });
    } catch (e) {}

    recentDocs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const recentDocsTop = recentDocs.slice(0, 10);

    // =====================
    // 7) Recent Projects
    // =====================
    const recentProjectsQ = await pool.query<ProjectRow>(
      `
      SELECT id::text, title::text, COALESCE(status,'active')::text AS status, created_at::timestamptz
      FROM projects
      WHERE producer_org_id = $1
      ORDER BY created_at DESC
      LIMIT 6
      `,
      [orgId]
    );

    const recentProjects = recentProjectsQ.rows.map((p: ProjectRow) => ({
      id: p.id,
      name: p.title,
      status: p.status,
      createdAt: new Date(p.created_at).toISOString(),
    }));

    // =====================
    // 8) Payments (por ahora vacío)
    // =====================
    const talentPayments: any[] = [];

    return res.json({
      ok: true,
      period: { time, from, to },
      currency,

      counts: {
        projects: projectsCount,
        talentsAssociated,

        agreementsTotal,
        agreementsPending,
        agreementsSigned,

        quotesTotal,

        ndasTotal,
        ndasPending,
        ndasSigned,
      },

      finance: {
        quoted,
        inExecution,
        toCollect,
        collected,

        quotesInProgressCount,
        quotesCompletedCount,
        quotesPaidCount,
      },

      recentDocs: recentDocsTop,
      recentProjects,
      talentPayments,
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default router;