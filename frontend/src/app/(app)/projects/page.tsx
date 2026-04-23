"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import ProjectTabs from "@/components/projects/ProjectTabs";

type Project = {
  id: string;
  title: string;
  status: string | null;
  currency?: string | null;
  created_at?: string | null;

  participants_count?: number;
  ndas_total?: number;
  ndas_pending?: number;
  ndas_accepted?: number;
  quotes_count?: number;
  quotes_sent?: number;
  quotes_approved?: number;
  has_team_dimension?: boolean;
  has_commercial_dimension?: boolean;
  client_name?: string | null;
  client_email?: string | null;
  client_company?: string | null;
  progress_stage?: "created" | "participants" | "nda" | "client" | "quote" | "agreement";
  next_step_label?: string;

  source?: "own" | "shared";
  access_type?: "owner" | "participant" | "nda_only" | string | null;
};

type SharedProjectApiRow = {
  id: string;
  title: string;
  status: string | null;
  currency?: string | null;
  created_at?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  brief?: string | null;

  participants_count?: number;
  ndas_total?: number;
  ndas_pending?: number;
  ndas_accepted?: number;
  quotes_count?: number;
  quotes_sent?: number;
  quotes_approved?: number;
  has_team_dimension?: boolean;
  has_commercial_dimension?: boolean;
  client_name?: string | null;
  client_email?: string | null;
  client_company?: string | null;
  progress_stage?: "created" | "participants" | "nda" | "client" | "quote" | "agreement";
  next_step_label?: string;

  access?: {
    type?: "owner" | "participant" | "nda_only" | string;
    nda_status?: string;
  } | null;

  access_type?: "owner" | "participant" | "nda_only" | string | null;
};

type TabKey = "general" | "quotes" | "talents" | "ndas" | "agreement";
type ProgressStep = { label: string; state: "done" | "current" | "upcoming" };
type GroupKey = "attention" | "progress" | "completed";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M21 21l-4.3-4.3" />
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function hasClientDefined(project: Project) {
  return !!(
    project.client_name?.trim() ||
    project.client_email?.trim() ||
    project.client_company?.trim()
  );
}

function translateProjectStatus(status?: string | null) {
  const s = String(status || "").toLowerCase();

  if (s === "draft") return "Borrador";
  if (s === "pending") return "Pendiente";
  if (s === "open") return "Abierto";
  if (s === "approved") return "Aprobado";
  if (s === "in_progress") return "En progreso";
  if (s === "completed") return "Completado";
  if (s === "paid") return "Cobrado";
  if (s === "rejected") return "Rechazado";

  return status || "Borrador";
}

function translateAccessType(accessType?: string | null, source?: "own" | "shared") {
  if (source === "own") return "Proyecto propio";

  const t = String(accessType || "").toLowerCase();
  if (t === "participant") return "Participando";
  if (t === "nda_only") return "Acceso por NDA";
  if (t === "owner") return "Proyecto propio";

  return "Compartido";
}

function buildProgressFromSummary(project: Project): {
  statusLabel: string;
  nextLabel: string;
  steps: ProgressStep[];
} {
  const stage = project.progress_stage || "created";
  const hasCommercial = !!project.has_commercial_dimension;
  const quotesApproved = Number(project.quotes_approved || 0);
  const quotesCount = Number(project.quotes_count || 0);
  const ndasPending = Number(project.ndas_pending || 0);
  const ndasAccepted = Number(project.ndas_accepted || 0);

  let mappedStage: "created" | "nda" | "quote" | "agreement" | "paid" = "created";

  if (quotesApproved > 0) {
    mappedStage = "agreement";
  } else if (quotesCount > 0) {
    mappedStage = "quote";
  } else if (stage === "nda" || ndasPending > 0 || ndasAccepted > 0) {
    mappedStage = "nda";
  } else {
    mappedStage = "created";
  }

  const order = ["created", "nda", "quote", "agreement", "paid"];

  const stepState = (key: "created" | "nda" | "quote" | "agreement" | "paid") => {
    const currentIndex = order.indexOf(mappedStage);
    const keyIndex = order.indexOf(key);

    if (keyIndex < currentIndex) return "done" as const;
    if (keyIndex === currentIndex) return "current" as const;
    return "upcoming" as const;
  };

  const statusLabel =
    mappedStage === "agreement"
      ? "Listo para acuerdo"
      : mappedStage === "quote"
      ? "Cotización activa"
      : mappedStage === "nda"
      ? "NDA en curso"
      : hasCommercial && !hasClientDefined(project)
      ? "Cliente pendiente"
      : "Borrador";

  return {
    statusLabel,
    nextLabel: project.next_step_label || "Participantes",
    steps: [
      { label: "Creado", state: stepState("created") },
      { label: "NDA", state: stepState("nda") },
      { label: "Cotización", state: stepState("quote") },
      { label: "Acuerdo", state: stepState("agreement") },
      { label: "Cobro", state: stepState("paid") },
    ],
  };
}

function getGroup(project: Project): GroupKey {
  const status = String(project.status || "").toLowerCase();
  const hasCommercial = !!project.has_commercial_dimension;
  const clientDefined = hasClientDefined(project);
  const ndasPending = Number(project.ndas_pending || 0);
  const quotesCount = Number(project.quotes_count || 0);

  if (["completed", "paid", "won", "archived"].includes(status)) {
    return "completed";
  }

  if (
    (hasCommercial && !clientDefined) ||
    ndasPending > 0 ||
    (hasCommercial && clientDefined && quotesCount === 0)
  ) {
    return "attention";
  }

  return "progress";
}

function getContextAction(project: Project): {
  label: string;
  tab: TabKey;
  tone: "gold" | "green" | "violet" | "slate";
} {
  const hasCommercial = !!project.has_commercial_dimension;
  const hasTeam = !!project.has_team_dimension;
  const clientDefined = hasClientDefined(project);
  const ndasPending = Number(project.ndas_pending || 0);
  const quotesCount = Number(project.quotes_count || 0);
  const quotesApproved = Number(project.quotes_approved || 0);
  const participantsCount = Number(project.participants_count || 0);

  if (hasCommercial && !clientDefined) {
    return { label: "Completar", tab: "general", tone: "gold" };
  }

  if (hasTeam && ndasPending > 0) {
    return { label: "Recordar", tab: "ndas", tone: "violet" };
  }

  if (hasCommercial && clientDefined && quotesCount === 0) {
    return { label: "Cotizar", tab: "quotes", tone: "green" };
  }

  if (hasCommercial && quotesApproved > 0) {
    return { label: "Acuerdo", tab: "agreement", tone: "gold" };
  }

  if (hasTeam && participantsCount === 0) {
    return { label: "Invitar", tab: "talents", tone: "gold" };
  }

  return { label: "Ver", tab: "general", tone: "slate" };
}

function actionButtonClass(tone: "gold" | "green" | "violet" | "slate") {
  if (tone === "gold") return "text-[#0b0f17]";
  if (tone === "green") return "text-[#0b0f17]";
  if (tone === "violet") return "text-[#0b0f17]";
  return "text-[#0b0f17]";
}

function actionButtonStyle(tone: "gold" | "green" | "violet" | "slate") {
  if (tone === "gold") {
    return { background: "#f2c94c" };
  }
  if (tone === "green") {
    return { background: "#9fe870" };
  }
  if (tone === "violet") {
    return { background: "#d6c4ff" };
  }
  return { background: "#f3f4f6" };
}

function StepCircle({
  number,
  state,
}: {
  number: number;
  state: "done" | "current" | "upcoming";
}) {
  const cls =
    state === "done"
      ? "border-black bg-black text-white"
      : state === "current"
      ? "border-[#f2c94c] bg-[#f2c94c] text-black"
      : "border-[#d6d6d6] bg-white text-[#b9b9b9]";

  return (
    <div
      className={[
        "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black",
        cls,
      ].join(" ")}
    >
      {number}
    </div>
  );
}

function ProgressMiniBar({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        {steps.map((step, idx) => (
          <div key={`${step.label}-${idx}`} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-col items-center">
              <StepCircle number={idx + 1} state={step.state} />
              <span
                className={[
                  "mt-1 text-[10px] font-medium",
                  step.state === "done"
                    ? "text-black"
                    : step.state === "current"
                    ? "text-[#9a7b00]"
                    : "text-[#b4b4b4]",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>

            {idx < steps.length - 1 ? (
              <div
                className={[
                  "h-[2px] flex-1 rounded-full",
                  step.state === "done" || step.state === "current"
                    ? "bg-[#d9d9d9]"
                    : "bg-[#ececec]",
                ].join(" ")}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  count,
  tone = "default",
}: {
  title: string;
  description: string;
  count: number;
  tone?: "default" | "attention" | "completed";
}) {
  const toneClass =
    tone === "attention"
      ? "text-[#c18400]"
      : tone === "completed"
      ? "text-emerald-700"
      : "text-slate-800";

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <h2 className={["text-base font-black sm:text-lg", toneClass].join(" ")}>
          {title}
        </h2>
        <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">
          {count}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function normalizeSharedProject(row: SharedProjectApiRow): Project {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    currency: row.currency || "CLP",
    created_at: row.created_at || null,

    participants_count: row.participants_count ?? 0,
    ndas_total: row.ndas_total ?? 0,
    ndas_pending: row.ndas_pending ?? 0,
    ndas_accepted: row.ndas_accepted ?? 0,
    quotes_count: row.quotes_count ?? 0,
    quotes_sent: row.quotes_sent ?? 0,
    quotes_approved: row.quotes_approved ?? 0,

    has_team_dimension: row.has_team_dimension ?? true,
    has_commercial_dimension: row.has_commercial_dimension ?? false,

    client_name: row.client_name ?? null,
    client_email: row.client_email ?? null,
    client_company: row.client_company ?? null,
    progress_stage: row.progress_stage,
    next_step_label: row.next_step_label,

    source: "shared",
    access_type: row.access?.type || row.access_type || "participant",
  };
}

export default function ProducerProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<TabKey>("general");

  const panelRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);

    try {
      const [ownRes, sharedRes] = await Promise.allSettled([
        api<{ ok: true; projects: Project[] }>("/projects"),
        api<{ ok: true; projects: SharedProjectApiRow[] }>("/projects/shared"),
      ]);

      const ownProjects =
        ownRes.status === "fulfilled"
          ? (ownRes.value.projects || []).map((p) => ({
              ...p,
              source: "own" as const,
              access_type: "owner" as const,
            }))
          : [];

      const sharedProjects =
        sharedRes.status === "fulfilled"
          ? (sharedRes.value.projects || []).map(normalizeSharedProject)
          : [];

      const ownIds = new Set(ownProjects.map((p) => p.id));
      const merged = [
        ...ownProjects,
        ...sharedProjects.filter((p) => !ownIds.has(p.id)),
      ];

      setProjects(merged);

      if (ownRes.status === "rejected" && sharedRes.status === "rejected") {
        throw new Error("No se pudieron cargar los proyectos");
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const open = sp.get("open");
    const tab = sp.get("tab");

    if (open) setExpandedId(open);
    if (
      tab === "general" ||
      tab === "quotes" ||
      tab === "talents" ||
      tab === "ndas" ||
      tab === "agreement"
    ) {
      setExpandedTab(tab);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => (p.title || "").toLowerCase().includes(q));
  }, [projects, search]);

  const grouped = useMemo(() => {
    const attention = filtered.filter((p) => getGroup(p) === "attention");
    const progress = filtered.filter((p) => getGroup(p) === "progress");
    const completed = filtered.filter((p) => getGroup(p) === "completed");
    return { attention, progress, completed };
  }, [filtered]);

  const openProject = (id: string, nextTab: TabKey = "general") => {
    setExpandedId((cur) => (cur === id ? null : id));
    setExpandedTab(nextTab);

    setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const renderProjectCard = (p: Project) => {
    const isExpanded = expandedId === p.id;
    const created = p.created_at ? new Date(p.created_at).toLocaleDateString() : "—";
    const progress = buildProgressFromSummary(p);
    const action = getContextAction(p);
    const translatedStatus = translateProjectStatus(p.status);
    const accessLabel = translateAccessType(p.access_type, p.source);

    const detailHref =
      p.source === "shared"
        ? `/projects/${p.id}`
        : `/producer/projects/${p.id}?tab=${expandedTab}`;

    return (
      <div
        key={p.id}
        className={[
          "overflow-hidden rounded-[20px] border transition-all",
          isExpanded
            ? "border-[#f2c94c]/40 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
            : "border-black/10 bg-white hover:border-black/15 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => openProject(p.id, "general")}
          className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
        >
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
              <FolderIcon />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-base font-black text-black sm:text-[17px]">
                    {p.title}
                  </div>

                  <span className="rounded-full border border-black/10 bg-[#f7f7f7] px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {translatedStatus}
                  </span>

                  <span
                    className={[
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      p.source === "shared"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-[#f2c94c]/20 bg-[#fff8db] text-[#9a7b00]",
                    ].join(" ")}
                  >
                    {accessLabel}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{p.currency || "CLP"}</span>
                  <span>•</span>
                  <span>{created}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700">
                    Siguiente paso: {progress.nextLabel}
                  </span>
                </div>

                <ProgressMiniBar steps={progress.steps} />

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span>Participantes: {p.participants_count ?? 0}</span>
                  <span>•</span>
                  <span>NDA pendientes: {p.ndas_pending ?? 0}</span>
                  <span>•</span>
                  <span>Cotizaciones: {p.quotes_count ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openProject(p.id, action.tab);
              }}
              className={[
                "rounded-xl px-4 py-2 text-xs font-bold transition hover:opacity-95",
                actionButtonClass(action.tone),
              ].join(" ")}
              style={actionButtonStyle(action.tone)}
            >
              {action.label}
            </button>

            <span
              className={[
                "rounded-xl border border-black/10 bg-[#fafafa] p-2 text-slate-500 transition",
                isExpanded ? "rotate-180" : "",
              ].join(" ")}
            >
              <ChevronDown />
            </span>
          </div>
        </button>

        {isExpanded ? (
          <div className="border-t border-black/10 bg-[#0d1320] px-4 pb-4 pt-4 sm:px-5" ref={panelRef}>
            {p.source === "own" ? (
              <>
                <ProjectTabs
                  projectId={p.id}
                  mode="inline"
                  showHeader={false}
                  tab={expandedTab}
                  onTabChange={setExpandedTab}
                  initialTab={expandedTab}
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  {p.has_commercial_dimension ? (
                    <button
                      type="button"
                      onClick={() => setExpandedTab("quotes")}
                      className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
                      style={{ background: "linear-gradient(135deg,#10b981,#34d399)" }}
                    >
                      Cotizaciones
                    </button>
                  ) : null}

                  {p.has_team_dimension ? (
                    <button
                      type="button"
                      onClick={() => setExpandedTab("talents")}
                      className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
                      style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                    >
                      Participantes
                    </button>
                  ) : null}

                  {p.has_team_dimension ? (
                    <button
                      type="button"
                      onClick={() => setExpandedTab("ndas")}
                      className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
                      style={{ background: "linear-gradient(135deg,#a78bfa,#8b5cf6)" }}
                    >
                      NDAs
                    </button>
                  ) : null}

                  {p.has_commercial_dimension ? (
                    <button
                      type="button"
                      onClick={() => setExpandedTab("agreement")}
                      className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
                      style={{ background: "linear-gradient(135deg,#f4d35e,#f2c94c)" }}
                    >
                      Acuerdo
                    </button>
                  ) : null}

                  <Link
                    href={detailHref}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/[0.06]"
                  >
                    Abrir en página
                  </Link>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <div className="text-sm font-bold text-white">
                  Proyecto compartido contigo
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Este proyecto no usa el panel interno del productor. Ábrelo en su vista compartida.
                </div>

                <div className="mt-4">
                  <Link
                    href={`/projects/${p.id}`}
                    className="inline-flex rounded-2xl bg-[#f2c94c] px-4 py-2 text-sm font-bold text-[#0b0f17]"
                  >
                    Ver proyecto compartido
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="min-h-[calc(100vh-56px)] bg-[#f3f1eb] p-4 sm:p-6 md:p-7">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                proyectos
              </div>

              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-[#f2c94c] shadow-sm">
                  <FolderIcon />
                </span>
                <h1 className="text-[24px] font-black text-black sm:text-[30px]">
                  Lista de proyectos
                </h1>
              </div>

              <p className="mt-2 text-sm text-slate-600">
                Tarjetas con progreso, siguiente paso sugerido y acción contextual.
              </p>
            </div>

            <Link
              href="/producer/projects/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f2c94c] px-5 py-3 text-sm font-bold text-[#0b0f17] shadow-sm hover:opacity-95 active:opacity-90"
            >
              <span className="text-base leading-none">+</span>
              <span>Nuevo Proyecto</span>
            </Link>
          </div>

          <div className="mb-5 flex flex-col gap-3">
            <div className="relative w-full">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar proyectos..."
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 pl-10 text-sm text-slate-900 outline-none transition focus:border-[#f2c94c]/40 focus:ring-2 focus:ring-[#f2c94c]/10"
              />
            </div>
          </div>

          {err ? (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-black/10 bg-white p-10 text-center shadow-sm">
              <div className="mb-3 text-5xl">📁</div>
              <div className="text-lg font-bold text-black">
                {search ? "No se encontraron proyectos" : "No tienes proyectos aún"}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {search ? "Prueba con otro término de búsqueda" : "Crea tu primer proyecto para comenzar"}
              </div>
              {!search ? (
                <Link
                  href="/producer/projects/new"
                  className="mt-6 inline-flex rounded-2xl bg-[#f2c94c] px-6 py-3 text-sm font-bold text-[#0b0f17] shadow-sm"
                >
                  + Crear mi primer proyecto
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.attention.length > 0 ? (
                <section>
                  <SectionHeader
                    title="Requieren atención"
                    description="Proyectos con un siguiente paso claro que conviene resolver ahora."
                    count={grouped.attention.length}
                    tone="attention"
                  />
                  <div className="flex flex-col gap-4">
                    {grouped.attention.map(renderProjectCard)}
                  </div>
                </section>
              ) : null}

              {grouped.progress.length > 0 ? (
                <section>
                  <SectionHeader
                    title="En progreso"
                    description="Proyectos activos con avance en curso dentro del flujo."
                    count={grouped.progress.length}
                  />
                  <div className="flex flex-col gap-4">
                    {grouped.progress.map(renderProjectCard)}
                  </div>
                </section>
              ) : null}

              {grouped.completed.length > 0 ? (
                <section>
                  <SectionHeader
                    title="Completados"
                    description="Proyectos cerrados o finalizados."
                    count={grouped.completed.length}
                    tone="completed"
                  />
                  <div className="flex flex-col gap-4">
                    {grouped.completed.map(renderProjectCard)}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// "use client";

// import { useAuth } from "@/context/AuthContext";
// import { api } from "@/lib/api";
// import Link from "next/link";
// import { useEffect, useMemo, useState } from "react";

// type SharedProject = {
//   id: string;
//   title: string;
//   status: string | null;
//   currency?: string | null;
//   start_date?: string | null;
//   due_date?: string | null;
//   created_at?: string | null;
//   access_type: "owner" | "participant" | "nda_only";
//   nda_status: "pending" | "accepted" | "rejected";
// };

// function FolderIcon() {
//   return (
//     <svg
//       viewBox="0 0 24 24"
//       className="h-5 w-5"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2.2"
//     >
//       <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
//     </svg>
//   );
// }

// function statusBadge(status?: string) {
//   const s = String(status || "").toLowerCase();
//   const base =
//     "inline-flex items-center rounded-xl border px-3 py-1 text-[11px] font-bold";

//   if (s === "pending") {
//     return `${base} border-amber-500/20 bg-amber-500/10 text-amber-300`;
//   }
//   if (s === "accepted") {
//     return `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-300`;
//   }
//   if (s === "rejected") {
//     return `${base} border-rose-500/20 bg-rose-500/10 text-rose-300`;
//   }

//   return `${base} border-white/10 bg-white/[0.04] text-slate-300`;
// }

// function accessLabel(accessType?: string) {
//   if (accessType === "owner") return "Proyecto propio";
//   if (accessType === "participant") return "Participando";
//   if (accessType === "nda_only") return "Pendiente por NDA";
//   return "Proyecto";
// }

// function accessBadge(accessType?: string) {
//   const base =
//     "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]";

//   if (accessType === "owner") {
//     return `${base} bg-[#f2c94c]/14 text-[#f2c94c] border border-[#f2c94c]/20`;
//   }

//   if (accessType === "participant") {
//     return `${base} bg-emerald-500/14 text-emerald-300 border border-emerald-500/20`;
//   }

//   if (accessType === "nda_only") {
//     return `${base} bg-violet-500/14 text-violet-300 border border-violet-500/20`;
//   }

//   return `${base} bg-white/[0.04] text-slate-300 border border-white/10`;
// }

// function projectHref(project: SharedProject) {
//   if (project.access_type === "owner") {
//     return `/producer/projects/${project.id}`;
//   }
//   return `/projects/${project.id}`;
// }

// function groupTitle(accessType: SharedProject["access_type"]) {
//   if (accessType === "owner") return "Mis proyectos";
//   if (accessType === "participant") return "Proyectos donde participo";
//   return "Pendientes por NDA";
// }

// function groupDescription(accessType: SharedProject["access_type"]) {
//   if (accessType === "owner") {
//     return "Proyectos creados por ti y que puedes gestionar completamente.";
//   }
//   if (accessType === "participant") {
//     return "Proyectos donde ya tienes acceso activo como talento o participante.";
//   }
//   return "Proyectos donde todavía dependes del flujo de NDA para el acceso completo.";
// }

// function cardAccent(accessType: SharedProject["access_type"]) {
//   if (accessType === "owner") return "bg-[#f2c94c]";
//   if (accessType === "participant") return "bg-emerald-400";
//   return "bg-violet-400";
// }

// function SectionHeader({
//   title,
//   description,
//   count,
// }: {
//   title: string;
//   description: string;
//   count: number;
// }) {
//   return (
//     <div className="mb-3">
//       <div className="flex items-center gap-3">
//         <h2
//           className="text-base font-black sm:text-lg !text-white !opacity-100"
//           style={{
//             color: "#ffffff",
//             WebkitTextFillColor: "#ffffff",
//             textShadow: "0 1px 10px rgba(255,255,255,0.08)",
//             opacity: 1,
//           }}
//         >
//           {title}
//         </h2>

//         <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-300">
//           {count}
//         </span>
//       </div>

//       <p className="mt-1 text-xs !text-slate-300 sm:text-sm">
//         {description}
//       </p>
//     </div>
//   );
// }

// function ProjectCard({
//   project,
//   deletingId,
//   onDelete,
// }: {
//   project: SharedProject;
//   deletingId: string | null;
//   onDelete: (project: SharedProject) => void;
// }) {
//   const created = project.created_at
//     ? new Date(project.created_at).toLocaleDateString()
//     : "—";

//   const isOwner = project.access_type === "owner";
//   const isDeleting = deletingId === project.id;

//   return (
//     <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#0d1320] shadow-sm">
//       <div className={`absolute inset-y-0 left-0 w-1.5 ${cardAccent(project.access_type)}`} />

//       <div className="p-5 pl-6">
//         <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//           <div className="min-w-0">
//             <div className="truncate text-lg font-extrabold text-white">
//               {project.title}
//             </div>

//             <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
//               <span className={accessBadge(project.access_type)}>
//                 {accessLabel(project.access_type)}
//               </span>

//               <span className="text-slate-700">•</span>
//               <span>{created}</span>

//               <span className="text-slate-700">•</span>
//               <span>{project.currency || "CLP"}</span>

//               {project.status ? (
//                 <>
//                   <span className="text-slate-700">•</span>
//                   <span>{project.status}</span>
//                 </>
//               ) : null}
//             </div>
//           </div>

//           <div className="flex flex-wrap items-center gap-2">
//             <span className={statusBadge(project.nda_status)}>
//               NDA: {project.nda_status}
//             </span>

//             {project.access_type === "owner" || project.nda_status === "accepted" ? (
//               <Link
//                 href={projectHref(project)}
//                 className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
//                 style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//               >
//                 Ver proyecto
//               </Link>
//             ) : (
//               <span className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2 text-sm font-bold text-slate-300">
//                 Pendiente de NDA
//               </span>
//             )}

//             {isOwner ? (
//               <button
//                 type="button"
//                 onClick={() => onDelete(project)}
//                 disabled={isDeleting}
//                 className="rounded-md border border-rose-500/20 bg-rose-500/8 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-rose-300 transition hover:bg-rose-500/12 disabled:opacity-60"
//               >
//                 {isDeleting ? "..." : "x"}
//               </button>
//             ) : null}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function ProjectsPage() {
//   const { user, loading } = useAuth();

//   const [projects, setProjects] = useState<SharedProject[]>([]);
//   const [projectsLoading, setProjectsLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);
//   const [deletingId, setDeletingId] = useState<string | null>(null);

//   const load = async () => {
//     setProjectsLoading(true);
//     setErr(null);
//     try {
//       const r = await api<{ ok: true; projects: SharedProject[] }>("/projects/shared");
//       setProjects(r.projects || []);
//     } catch (e: any) {
//       setErr(String(e?.message || e));
//     } finally {
//       setProjectsLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (loading) return;
//     if (!user) return;
//     load();
//   }, [loading, user]);

//   const handleDeleteProject = async (project: SharedProject) => {
//     if (project.access_type !== "owner") return;

//     const ok = window.confirm(
//       `¿Seguro que quieres eliminar el proyecto "${project.title}"?\n\nEsta acción borrará también cotizaciones, talentos, NDAs y negociaciones relacionadas.`
//     );
//     if (!ok) return;

//     setDeletingId(project.id);
//     setErr(null);

//     try {
//       await api(`/projects/${project.id}`, { method: "DELETE" });
//       setProjects((prev) => prev.filter((p) => p.id !== project.id));
//     } catch (e: any) {
//       setErr(String(e?.message || e));
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   const ownProjects = useMemo(
//     () => projects.filter((p) => p.access_type === "owner"),
//     [projects]
//   );

//   const participantProjects = useMemo(
//     () => projects.filter((p) => p.access_type === "participant"),
//     [projects]
//   );

//   const ndaProjects = useMemo(
//     () => projects.filter((p) => p.access_type === "nda_only"),
//     [projects]
//   );

//   if (loading) {
//     return (
//       <div className="rounded-3xl border border-white/8 bg-[#0d1320] p-6 text-sm text-slate-400">
//         Cargando...
//       </div>
//     );
//   }

//   if (!user) {
//     return (
//       <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
//         Debes iniciar sesión.
//       </div>
//     );
//   }

//   return (
//     <div className="w-full">
//       <div className="min-h-[calc(100vh-56px)] rounded-3xl bg-[#070b14] p-4 sm:p-6 md:p-7">
//         <div className="mx-auto max-w-[1100px]">
//           <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
//             <div className="min-w-0">
//               <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
//                 collaborative workspace
//               </div>

//               <div className="mt-2 flex items-center gap-3">
//                 <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[#f2c94c] shadow-sm">
//                   <FolderIcon />
//                 </span>
//                 <h1
//   className="text-[22px] font-black sm:text-[28px] !text-white !opacity-100"
//   style={{
//     color: "#ffffff",
//     WebkitTextFillColor: "#ffffff",
//     textShadow: "0 1px 10px rgba(255,255,255,0.08)",
//     opacity: 1,
//   }}
// >
//   Proyectos
// </h1>
//               </div>

//               <p className="mt-2 text-sm text-slate-400">
//                 Aquí verás tus proyectos propios y también los proyectos compartidos contigo.
//               </p>
//             </div>

//             <Link
//               href="/producer/projects/new"
//               className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-[#0b0f17] shadow-sm hover:opacity-95 active:opacity-90"
//               style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//             >
//               <span className="text-base leading-none">+</span>
//               <span>Nuevo Proyecto</span>
//             </Link>
//           </div>

//           {err ? (
//             <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
//               {err}
//             </div>
//           ) : null}

//           {projectsLoading ? (
//             <div className="rounded-2xl border border-white/8 bg-[#0d1320] p-6 text-sm text-slate-400">
//               Cargando proyectos...
//             </div>
//           ) : projects.length === 0 ? (
//             <div className="rounded-3xl border border-white/8 bg-[#0d1320] p-10 text-center shadow-sm">
//               <div className="mb-3 text-5xl">📁</div>
//               <div className="text-lg font-bold text-white">
//                 No tienes proyectos aún
//               </div>
//               <div className="mt-2 text-sm text-slate-500">
//                 Crea tu primer proyecto o espera una invitación para colaborar en uno.
//               </div>

//               <Link
//                 href="/producer/projects/new"
//                 className="mt-6 inline-flex rounded-2xl px-6 py-3 text-sm font-bold text-[#0b0f17] shadow-sm"
//                 style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//               >
//                 + Crear mi primer proyecto
//               </Link>
//             </div>
//           ) : (
//             <div className="space-y-8">
//               {ownProjects.length > 0 ? (
//                 <section>
//                   <SectionHeader
//                     title={groupTitle("owner")}
//                     description={groupDescription("owner")}
//                     count={ownProjects.length}
//                   />
//                   <div className="grid gap-4">
//                     {ownProjects.map((p) => (
//                       <ProjectCard
//                         key={p.id}
//                         project={p}
//                         deletingId={deletingId}
//                         onDelete={handleDeleteProject}
//                       />
//                     ))}
//                   </div>
//                 </section>
//               ) : null}

//               {participantProjects.length > 0 ? (
//                 <section>
//                   <SectionHeader
//                     title={groupTitle("participant")}
//                     description={groupDescription("participant")}
//                     count={participantProjects.length}
//                   />
//                   <div className="grid gap-4">
//                     {participantProjects.map((p) => (
//                       <ProjectCard
//                         key={p.id}
//                         project={p}
//                         deletingId={deletingId}
//                         onDelete={handleDeleteProject}
//                       />
//                     ))}
//                   </div>
//                 </section>
//               ) : null}

//               {ndaProjects.length > 0 ? (
//                 <section>
//                   <SectionHeader
//                     title={groupTitle("nda_only")}
//                     description={groupDescription("nda_only")}
//                     count={ndaProjects.length}
//                   />
//                   <div className="grid gap-4">
//                     {ndaProjects.map((p) => (
//                       <ProjectCard
//                         key={p.id}
//                         project={p}
//                         deletingId={deletingId}
//                         onDelete={handleDeleteProject}
//                       />
//                     ))}
//                   </div>
//                 </section>
//               ) : null}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

