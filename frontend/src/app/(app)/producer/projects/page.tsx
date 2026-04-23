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

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-slate-100">
      {label}
    </span>
  );
}

function ProgressStepDot({ state }: { state: "done" | "current" | "upcoming" }) {
  if (state === "done") {
    return <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />;
  }

  if (state === "current") {
    return <span className="h-2.5 w-2.5 rounded-full bg-[#f2c94c]" />;
  }

  return <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />;
}

function ProgressMiniBar({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="mt-4">
      <div className="grid grid-cols-5 gap-2">
        {steps.map((step, idx) => (
          <div key={`${step.label}-${idx}`} className="min-w-0">
            <div
              className={[
                "h-1.5 w-full rounded-full",
                step.state === "done"
                  ? "bg-emerald-400"
                  : step.state === "current"
                  ? "bg-[#f2c94c]"
                  : "bg-white/8",
              ].join(" ")}
            />
            <div className="mt-2 flex items-center gap-1.5">
              <ProgressStepDot state={step.state} />
              <span
                className={[
                  "truncate text-[10px] font-bold uppercase tracking-[0.06em]",
                  step.state === "done"
                    ? "text-emerald-300"
                    : step.state === "current"
                    ? "text-[#f2c94c]"
                    : "text-slate-400",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function hasClientDefined(project: Project) {
  return !!(
    project.client_name?.trim() ||
    project.client_email?.trim() ||
    project.client_company?.trim()
  );
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

  let mappedStage: "created" | "nda" | "quote" | "agreement" | "paid" = "created";

  if (quotesApproved > 0) {
    mappedStage = "agreement";
  } else if (quotesCount > 0) {
    mappedStage = "quote";
  } else if (stage === "nda" || ndasPending > 0) {
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
      ? "NDA pendiente"
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
  const quotesApproved = Number(project.quotes_approved || 0);

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

  if (quotesApproved > 0 || quotesCount > 0 || Number(project.participants_count || 0) > 0) {
    return "progress";
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
    return { label: "Agregar cliente", tab: "general", tone: "gold" };
  }

  if (hasTeam && ndasPending > 0) {
    return { label: "Revisar NDAs", tab: "ndas", tone: "violet" };
  }

  if (hasCommercial && clientDefined && quotesCount === 0) {
    return { label: "Nueva cotización", tab: "quotes", tone: "green" };
  }

  if (hasCommercial && quotesApproved > 0) {
    return { label: "Generar acuerdo", tab: "agreement", tone: "gold" };
  }

  if (hasTeam && participantsCount === 0) {
    return { label: "Agregar participantes", tab: "talents", tone: "gold" };
  }

  if (hasCommercial && quotesCount > 0) {
    return { label: "Ver cotización", tab: "quotes", tone: "green" };
  }

  return { label: "Abrir proyecto", tab: "general", tone: "slate" };
}

function actionButtonClass(tone: "gold" | "green" | "violet" | "slate") {
  if (tone === "gold") return "text-[#0b0f17]";
  if (tone === "green") return "text-[#0b0f17]";
  if (tone === "violet") return "text-[#0b0f17]";
  return "text-white";
}

function actionButtonStyle(tone: "gold" | "green" | "violet" | "slate") {
  if (tone === "gold") {
    return { background: "linear-gradient(135deg,#f2c94c,#d4a72c)" };
  }
  if (tone === "green") {
    return { background: "linear-gradient(135deg,#10b981,#34d399)" };
  }
  if (tone === "violet") {
    return { background: "linear-gradient(135deg,#a78bfa,#8b5cf6)" };
  }
  return { background: "rgba(255,255,255,0.06)" };
}

function SectionHeader({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-black text-white sm:text-lg">{title}</h2>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-300">
          {count}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
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
      const r = await api<{ ok: true; projects: Project[] }>("/projects");
      setProjects(r.projects || []);
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

    return (
      <div
        key={p.id}
        className={[
          "overflow-hidden rounded-[24px] border shadow-sm transition-all",
          isExpanded
            ? "border-[#f2c94c]/30 bg-[#0d1320]"
            : "border-white/8 bg-[#0d1320] hover:border-white/12 hover:bg-[#101827]",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => openProject(p.id, "general")}
          className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
        >
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div
              className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl text-[#0b0f17]"
              style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
            >
              📁
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-extrabold text-white sm:text-lg">
                    {p.title}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{created}</span>
                    <span className="text-slate-600">•</span>
                    <span>{p.currency || "CLP"}</span>
                    <span className="text-slate-600">•</span>
                    <StatusPill label={progress.statusLabel} />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold uppercase tracking-[0.08em] text-slate-400">
                        Siguiente paso:
                      </span>
                      <span className="font-bold text-[#f2c94c]">
                        {progress.nextLabel}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openProject(p.id, action.tab);
                      }}
                      className={[
                        "rounded-2xl px-4 py-2 text-xs font-bold transition hover:opacity-95",
                        actionButtonClass(action.tone),
                      ].join(" ")}
                      style={actionButtonStyle(action.tone)}
                    >
                      {action.label}
                    </button>
                  </div>

                  <ProgressMiniBar steps={progress.steps} />

                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-300">
                    <span>Participantes: {p.participants_count ?? 0}</span>
                    <span className="text-slate-600">•</span>
                    <span>NDAs pendientes: {p.ndas_pending ?? 0}</span>
                    <span className="text-slate-600">•</span>
                    <span>Cotizaciones: {p.quotes_count ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <span
            className={[
              "rounded-xl bg-white/[0.04] p-2 text-slate-300 transition",
              isExpanded ? "rotate-180" : "",
            ].join(" ")}
          >
            <ChevronDown />
          </span>
        </button>

        {isExpanded ? (
          <div className="border-t border-white/8 px-5 pb-5" ref={panelRef}>
            <div className="mt-4">
              <ProjectTabs
                projectId={p.id}
                mode="inline"
                showHeader={false}
                tab={expandedTab}
                onTabChange={setExpandedTab}
                initialTab={expandedTab}
              />
            </div>

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
                href={`/producer/projects/${p.id}?tab=${expandedTab}`}
                className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/[0.06]"
              >
                Abrir en página
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="min-h-[calc(100vh-56px)] rounded-3xl bg-[#070b14] p-4 sm:p-6 md:p-7">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-400">
                my workspace
              </div>

              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[#f2c94c] shadow-sm">
                  <FolderIcon />
                </span>
                <h1 className="text-[22px] font-black text-white sm:text-[28px]">
                  Mis Proyectos
                </h1>
              </div>

              <p className="mt-2 text-sm text-slate-300">
                Aquí gestionas los proyectos que has creado dentro de WEZET.
              </p>
            </div>

            <Link
              href="/producer/projects/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-[#0b0f17] shadow-sm hover:opacity-95 active:opacity-90"
              style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
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
                className="w-full rounded-2xl border border-white/8 bg-[#0d1320] px-4 py-3 pl-10 text-sm text-slate-100 outline-none transition focus:border-[#f2c94c]/30 focus:ring-2 focus:ring-[#f2c94c]/10"
              />
            </div>
          </div>

          {err ? (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {err}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-white/8 bg-[#0d1320] p-6 text-sm text-slate-300 shadow-sm">
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-white/8 bg-[#0d1320] p-10 text-center shadow-sm">
              <div className="mb-3 text-5xl">📁</div>
              <div className="text-lg font-bold text-white">
                {search ? "No se encontraron proyectos" : "No tienes proyectos aún"}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                {search ? "Prueba con otro término de búsqueda" : "Crea tu primer proyecto para comenzar"}
              </div>
              {!search ? (
                <Link
                  href="/producer/projects/new"
                  className="mt-6 inline-flex rounded-2xl px-6 py-3 text-sm font-bold text-[#0b0f17] shadow-sm"
                  style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                >
                  + Crear mi primer proyecto
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="space-y-8">
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

              {grouped.attention.length > 0 ? (
                <section>
                  <SectionHeader
                    title="Requieren atención"
                    description="Proyectos con un siguiente paso claro que conviene resolver ahora."
                    count={grouped.attention.length}
                  />
                  <div className="flex flex-col gap-4">
                    {grouped.attention.map(renderProjectCard)}
                  </div>
                </section>
              ) : null}

              {grouped.completed.length > 0 ? (
                <section>
                  <SectionHeader
                    title="Completados"
                    description="Proyectos cerrados o finalizados."
                    count={grouped.completed.length}
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

// import Link from "next/link";
// import { useEffect, useMemo, useRef, useState } from "react";
// import { api } from "@/lib/api";
// import ProjectTabs from "@/components/projects/ProjectTabs";

// type Project = {
//   id: string;
//   title: string;
//   status: string | null;
//   currency?: string | null;
//   created_at?: string | null;

//   participants_count?: number;
//   ndas_total?: number;
//   ndas_pending?: number;
//   ndas_accepted?: number;
//   quotes_count?: number;
//   quotes_sent?: number;
//   quotes_approved?: number;
//   has_team_dimension?: boolean;
//   has_commercial_dimension?: boolean;
//   progress_stage?: "created" | "participants" | "nda" | "quote" | "agreement";
//   next_step_label?: string;
// };

// type TabKey = "general" | "quotes" | "talents" | "ndas";
// type ProgressStep = { label: string; state: "done" | "current" | "upcoming" };

// function SearchIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M21 21l-4.3-4.3" />
//       <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
//     </svg>
//   );
// }

// function ChevronDown() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M6 9l6 6 6-6" />
//     </svg>
//   );
// }

// function FolderIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
//     </svg>
//   );
// }

// function StatusPill({ label }: { label: string }) {
//   return (
//     <span className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-slate-300">
//       {label}
//     </span>
//   );
// }

// function ProgressStepDot({ state }: { state: "done" | "current" | "upcoming" }) {
//   if (state === "done") {
//     return <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />;
//   }

//   if (state === "current") {
//     return <span className="h-2.5 w-2.5 rounded-full bg-[#f2c94c]" />;
//   }

//   return <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />;
// }

// function ProgressMiniBar({ steps }: { steps: ProgressStep[] }) {
//   return (
//     <div className="mt-4">
//       <div className="grid grid-cols-5 gap-2">
//         {steps.map((step, idx) => (
//           <div key={`${step.label}-${idx}`} className="min-w-0">
//             <div
//               className={[
//                 "h-1.5 w-full rounded-full",
//                 step.state === "done"
//                   ? "bg-emerald-400"
//                   : step.state === "current"
//                   ? "bg-[#f2c94c]"
//                   : "bg-white/8",
//               ].join(" ")}
//             />
//             <div className="mt-2 flex items-center gap-1.5">
//               <ProgressStepDot state={step.state} />
//               <span
//                 className={[
//                   "truncate text-[10px] font-bold uppercase tracking-[0.06em]",
//                   step.state === "done"
//                     ? "text-emerald-300"
//                     : step.state === "current"
//                     ? "text-[#f2c94c]"
//                     : "text-slate-500",
//                 ].join(" ")}
//               >
//                 {step.label}
//               </span>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// function buildProgressFromSummary(project: Project): {
//   statusLabel: string;
//   nextLabel: string;
//   steps: ProgressStep[];
// } {
//   const stage = project.progress_stage || "created";

//   const stepState = (key: "created" | "participants" | "nda" | "quote" | "agreement") => {
//     const order = ["created", "participants", "nda", "quote", "agreement"];
//     const currentIndex = order.indexOf(stage);
//     const keyIndex = order.indexOf(key);

//     if (keyIndex < currentIndex) return "done" as const;
//     if (keyIndex === currentIndex) return "current" as const;
//     return "upcoming" as const;
//   };

//   const statusLabel =
//     stage === "agreement"
//       ? "Listo para acuerdo"
//       : stage === "quote"
//       ? "Cotización activa"
//       : stage === "nda"
//       ? "NDA pendiente"
//       : stage === "participants"
//       ? "Equipo iniciado"
//       : "Borrador";

//   return {
//     statusLabel,
//     nextLabel: project.next_step_label || "Participantes",
//     steps: [
//       { label: "Creado", state: stepState("created") },
//       { label: "Participantes", state: stepState("participants") },
//       { label: "NDA", state: stepState("nda") },
//       { label: "Cotización", state: stepState("quote") },
//       { label: "Acuerdo", state: stepState("agreement") },
//     ],
//   };
// }

// export default function ProducerProjectsPage() {
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);

//   const [search, setSearch] = useState("");
//   const [expandedId, setExpandedId] = useState<string | null>(null);
//   const [expandedTab, setExpandedTab] = useState<TabKey>("general");

//   const panelRef = useRef<HTMLDivElement | null>(null);

//   const load = async () => {
//     setLoading(true);
//     setErr(null);
//     try {
//       const r = await api<{ ok: true; projects: Project[] }>("/projects");
//       setProjects(r.projects || []);
//     } catch (e: any) {
//       setErr(String(e?.message || e));
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     load();
//   }, []);

//   useEffect(() => {
//     if (typeof window === "undefined") return;
//     const sp = new URLSearchParams(window.location.search);
//     const open = sp.get("open");
//     const tab = sp.get("tab");

//     if (open) setExpandedId(open);
//     if (tab === "general" || tab === "quotes" || tab === "talents" || tab === "ndas") {
//       setExpandedTab(tab);
//     }
//   }, []);

//   const filtered = useMemo(() => {
//     const q = search.trim().toLowerCase();
//     if (!q) return projects;
//     return projects.filter((p) => (p.title || "").toLowerCase().includes(q));
//   }, [projects, search]);

//   const openProject = (id: string, nextTab: TabKey = "general") => {
//     setExpandedId((cur) => (cur === id ? null : id));
//     setExpandedTab(nextTab);

//     setTimeout(() => {
//       panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
//     }, 50);
//   };

//   return (
//     <div className="w-full">
//       <div className="min-h-[calc(100vh-56px)] rounded-3xl bg-[#070b14] p-4 sm:p-6 md:p-7">
//         <div className="mx-auto max-w-[1100px]">
//           <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
//             <div className="min-w-0">
//               <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
//                 my workspace
//               </div>

//               <div className="mt-2 flex items-center gap-3">
//                 <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[#f2c94c] shadow-sm">
//                   <FolderIcon />
//                 </span>
//                 <h1 className="text-[22px] font-black text-white sm:text-[28px]">
//                   Mis Proyectos
//                 </h1>
//               </div>

//               <p className="mt-2 text-sm text-slate-400">
//                 Aquí gestionas los proyectos que has creado dentro de WEZET.
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

//           <div className="mb-5 flex flex-col gap-3">
//             <div className="relative w-full">
//               <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
//                 <SearchIcon />
//               </span>
//               <input
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 placeholder="Buscar proyectos..."
//                 className="w-full rounded-2xl border border-white/8 bg-[#0d1320] px-4 py-3 pl-10 text-sm text-slate-200 outline-none transition focus:border-[#f2c94c]/30 focus:ring-2 focus:ring-[#f2c94c]/10"
//               />
//             </div>
//           </div>

//           {err ? (
//             <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
//               {err}
//             </div>
//           ) : null}

//           {loading ? (
//             <div className="rounded-2xl border border-white/8 bg-[#0d1320] p-6 text-sm text-slate-400 shadow-sm">
//               Cargando...
//             </div>
//           ) : filtered.length === 0 ? (
//             <div className="rounded-3xl border border-white/8 bg-[#0d1320] p-10 text-center shadow-sm">
//               <div className="mb-3 text-5xl">📁</div>
//               <div className="text-lg font-bold text-white">
//                 {search ? "No se encontraron proyectos" : "No tienes proyectos aún"}
//               </div>
//               <div className="mt-2 text-sm text-slate-500">
//                 {search ? "Prueba con otro término de búsqueda" : "Crea tu primer proyecto para comenzar"}
//               </div>
//               {!search ? (
//                 <Link
//                   href="/producer/projects/new"
//                   className="mt-6 inline-flex rounded-2xl px-6 py-3 text-sm font-bold text-[#0b0f17] shadow-sm"
//                   style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//                 >
//                   + Crear mi primer proyecto
//                 </Link>
//               ) : null}
//             </div>
//           ) : (
//             <div className="flex flex-col gap-4">
//               {filtered.map((p) => {
//                 const isExpanded = expandedId === p.id;
//                 const created = p.created_at ? new Date(p.created_at).toLocaleDateString() : "—";
//                 const progress = buildProgressFromSummary(p);

//                 return (
//                   <div
//                     key={p.id}
//                     className={[
//                       "overflow-hidden rounded-[24px] border shadow-sm transition-all",
//                       isExpanded
//                         ? "border-[#f2c94c]/30 bg-[#0d1320]"
//                         : "border-white/8 bg-[#0d1320] hover:border-white/12 hover:bg-[#101827]",
//                     ].join(" ")}
//                   >
//                     <button
//                       type="button"
//                       onClick={() => openProject(p.id, "general")}
//                       className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
//                     >
//                       <div className="flex min-w-0 flex-1 items-start gap-4">
//                         <div
//                           className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl text-[#0b0f17]"
//                           style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//                         >
//                           📁
//                         </div>

//                         <div className="min-w-0 flex-1">
//                           <div className="flex flex-col gap-3">
//                             <div className="min-w-0">
//                               <div className="truncate text-base font-extrabold text-white sm:text-lg">
//                                 {p.title}
//                               </div>

//                               <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
//                                 <span>{created}</span>
//                                 <span className="text-slate-700">•</span>
//                                 <span>{p.currency || "CLP"}</span>
//                                 <span className="text-slate-700">•</span>
//                                 <StatusPill label={progress.statusLabel} />
//                               </div>
//                             </div>

//                             <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
//                               <div className="flex flex-wrap items-center gap-2 text-xs">
//                                 <span className="font-bold uppercase tracking-[0.08em] text-slate-500">
//                                   Siguiente paso:
//                                 </span>
//                                 <span className="font-bold text-[#f2c94c]">
//                                   {progress.nextLabel}
//                                 </span>
//                               </div>

//                               <ProgressMiniBar steps={progress.steps} />

//                               <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
//                                 <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-300">
//                                   Participantes: {p.participants_count ?? 0}
//                                 </span>
//                                 <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-300">
//                                   NDAs pendientes: {p.ndas_pending ?? 0}
//                                 </span>
//                                 <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-300">
//                                   Cotizaciones: {p.quotes_count ?? 0}
//                                 </span>
//                               </div>
//                             </div>
//                           </div>
//                         </div>
//                       </div>

//                       <span
//                         className={[
//                           "rounded-xl bg-white/[0.04] p-2 text-slate-400 transition",
//                           isExpanded ? "rotate-180" : "",
//                         ].join(" ")}
//                       >
//                         <ChevronDown />
//                       </span>
//                     </button>

//                     {isExpanded ? (
//                       <div className="border-t border-white/8 px-5 pb-5" ref={panelRef}>
//                         <div className="mt-4">
//                           <ProjectTabs
//                             projectId={p.id}
//                             mode="inline"
//                             showHeader={false}
//                             tab={expandedTab}
//                             onTabChange={setExpandedTab}
//                             initialTab={expandedTab}
//                           />
//                         </div>

//                         <div className="mt-4 flex flex-wrap gap-2">
//                           <button
//                             type="button"
//                             onClick={() => setExpandedTab("quotes")}
//                             className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
//                             style={{ background: "linear-gradient(135deg,#10b981,#34d399)" }}
//                           >
//                             Cotizaciones
//                           </button>

//                           <button
//                             type="button"
//                             onClick={() => setExpandedTab("talents")}
//                             className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
//                             style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//                           >
//                             Participantes
//                           </button>

//                           <Link
//                             href={`/producer/projects/${p.id}?tab=general`}
//                             className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/[0.06]"
//                           >
//                             Abrir en página
//                           </Link>
//                         </div>
//                       </div>
//                     ) : null}
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
