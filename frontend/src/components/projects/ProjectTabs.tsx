"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import TalentsPanel from "@/components/projects/TalentsPanel";
import AgreementFlowModal from "@/components/projects/AgreementFlowModal";
import NdasPanel from "@/components/projects/NdasPanel";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

type Project = {
  id: string;
  title: string;
  brief: string | null;
  status: string | null;
  currency: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
};

type TabKey = "general" | "quotes" | "talents" | "ndas";

type QuoteRow = {
  id: string;
  status: string;
  client_name: string | null;
  client_email: string | null;
  currency: string;
  total_amount: string | number;
  valid_until: string | null;
  public_id: string | null;
  created_at: string;
};

type StatusKey =
  | "created"
  | "pending"
  | "sent"
  | "approved"
  | "in_progress"
  | "completed"
  | "paid"
  | "rejected";

function normalizeStatus(s?: string | null): StatusKey {
  if (!s) return "created";
  const v = String(s).toLowerCase();
  if (v === "open") return "pending";
  if (v === "draft") return "created";
  if (
    v === "created" ||
    v === "pending" ||
    v === "sent" ||
    v === "approved" ||
    v === "in_progress" ||
    v === "completed" ||
    v === "paid" ||
    v === "rejected"
  )
    return v;
  return "created";
}

function statusPill(status: StatusKey) {
  const base =
    "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold";
  switch (status) {
    case "created":
      return { cls: `${base} bg-violet-500/12 text-violet-300`, label: "Creado" };
    case "pending":
      return { cls: `${base} bg-amber-500/12 text-amber-300`, label: "Pendiente" };
    case "sent":
      return { cls: `${base} bg-indigo-500/12 text-indigo-300`, label: "Enviado" };
    case "approved":
      return { cls: `${base} bg-sky-500/12 text-sky-300`, label: "Aprobado" };
    case "in_progress":
      return {
        cls: `${base} bg-blue-500/12 text-blue-300`,
        label: "En ejecución",
      };
    case "completed":
      return {
        cls: `${base} bg-emerald-500/12 text-emerald-300`,
        label: "Terminado",
      };
    case "paid":
      return { cls: `${base} bg-teal-500/12 text-teal-300`, label: "Cobrado" };
    case "rejected":
      return { cls: `${base} bg-rose-500/12 text-rose-300`, label: "Rechazado" };
    default:
      return { cls: `${base} bg-white/8 text-slate-300`, label: "Creado" };
  }
}

function FolderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

export default function ProjectTabs({
  projectId,
  mode = "inline",
  initialTab = "general",
  showHeader = true,
  tab: controlledTab,
  onTabChange,
}: {
  projectId: string;
  mode?: "inline" | "page";
  initialTab?: TabKey;
  showHeader?: boolean;
  tab?: TabKey;
  onTabChange?: (t: TabKey) => void;
}) {
  const router = useRouter();

  const validProjectId = useMemo(() => isUuid(projectId), [projectId]);

  const [tabInternal, setTabInternal] = useState<TabKey>(initialTab);
  const tab = controlledTab ?? tabInternal;

  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [errProject, setErrProject] = useState<string | null>(null);

  const [talentsCount, setTalentsCount] = useState(0);
  const [ndasCount, setNdasCount] = useState(0);
  const [agreementOpen, setAgreementOpen] = useState(false);

  const setTabSafe = (next: TabKey) => {
    if (onTabChange) onTabChange(next);
    else setTabInternal(next);

    if (mode === "page") router.replace(`/producer/projects/${projectId}?tab=${next}`);
  };

  useEffect(() => {
    if (mode !== "page") return;
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("tab");
    if (t === "general" || t === "quotes" || t === "talents" || t === "ndas") {
      if (onTabChange) onTabChange(t);
      else setTabInternal(t);
    }
  }, [mode, onTabChange]);

  useEffect(() => {
    if (controlledTab) return;
    setTabInternal(initialTab);
  }, [initialTab, controlledTab]);

  useEffect(() => {
    if (!validProjectId) {
      setLoadingProject(false);
      setProject(null);
      setErrProject("Invalid project id");
      return;
    }

    let alive = true;
    setLoadingProject(true);
    setErrProject(null);

    api<{ ok: true; project: Project }>(`/projects/${projectId}`)
      .then((r) => {
        if (!alive) return;
        setProject(r.project);
        setLoadingProject(false);
      })
      .catch((e: any) => {
        if (!alive) return;
        setErrProject(String(e?.message || e));
        setLoadingProject(false);
      });

    return () => {
      alive = false;
    };
  }, [projectId, validProjectId]);

  const created = project?.created_at
    ? new Date(project.created_at).toLocaleDateString()
    : "—";
  const st = normalizeStatus(project?.status);
  const pill = statusPill(st);

  const returnToQuotes =
    mode === "inline"
      ? encodeURIComponent(`/producer/projects?open=${projectId}&tab=quotes`)
      : encodeURIComponent(`/producer/projects/${projectId}?tab=quotes`);

  if (!validProjectId) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
        Invalid project id
      </div>
    );
  }

  if (loadingProject) {
    return (
      <div className="rounded-3xl border border-white/8 bg-[#0d1320] p-6 text-sm text-slate-400">
        Cargando...
      </div>
    );
  }

  if (errProject) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
        {errProject}
      </div>
    );
  }

  if (!project) return null;

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d1320]">
        {showHeader ? (
          <div className="flex items-start justify-between gap-4 bg-[#111827] px-5 py-5 sm:px-6">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2c94c] text-[#0b0f17] shadow-sm">
                <FolderIcon />
              </div>

              <div className="min-w-0">
                <div className="truncate text-xl font-black text-white sm:text-2xl">
                  {project.title}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className={pill.cls}>
                    <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                    {pill.label}
                  </span>
                  {project.currency ? <span className="text-slate-700">•</span> : null}
                  {project.currency ? (
                    <span className="font-semibold text-slate-400">{project.currency}</span>
                  ) : null}
                  <span className="text-slate-700">•</span>
                  <span>{created}</span>
                </div>
              </div>
            </div>

            <Link
              href={`/producer/projects/${project.id}/quotes/new?returnTo=${returnToQuotes}`}
              className="shrink-0 rounded-2xl px-4 py-3 text-sm font-bold text-[#0b0f17] shadow-sm hover:opacity-95 active:opacity-90"
              style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
            >
              Nueva cotización
            </Link>
          </div>
        ) : null}

        <div
          className={[
            "px-5 py-4 sm:px-6",
            showHeader ? "border-t border-white/8" : "border-t-0",
          ].join(" ")}
        >
          <div className="flex gap-2 overflow-x-auto">
            <TabButton
              label="General"
              active={tab === "general"}
              onClick={() => setTabSafe("general")}
            />
            <TabButton
              label="Cotizaciones"
              active={tab === "quotes"}
              onClick={() => setTabSafe("quotes")}
            />
            <TabButton
              label="Talentos"
              active={tab === "talents"}
              onClick={() => setTabSafe("talents")}
            />
            <TabButton
              label="NDAs"
              active={tab === "ndas"}
              onClick={() => setTabSafe("ndas")}
            />
          </div>
        </div>

        <div className="px-5 pb-6 sm:px-6">
          {tab === "general" ? (
            <div className="mt-4">
              <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
                acciones rápidas
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
                  style={{ background: "linear-gradient(135deg,#10b981,#34d399)" }}
                  onClick={() => setTabSafe("quotes")}
                >
                  Cotización
                </button>

                <button
                  type="button"
                  className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
                  style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                  onClick={() => setAgreementOpen(true)}
                >
                  Acuerdo
                </button>

                <button
                  type="button"
                  className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
                  style={{ background: "linear-gradient(135deg,#a855f7,#6366f1)" }}
                  onClick={() => setTabSafe("ndas")}
                >
                  NDA
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MiniCountCard label="Cotizaciones" value={0} tone="green" />
                <MiniCountCard label="Talentos" value={talentsCount} tone="yellow" />
                <MiniCountCard label="NDAs" value={ndasCount} tone="violet" />
              </div>

              <div className="mt-6">
                <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  descripción
                </div>
                <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
                  {project.brief || "Sin descripción."}
                </div>
              </div>
            </div>
          ) : tab === "quotes" ? (
            <div className="mt-4">
              <QuotesTabMvp projectId={project.id} returnTo={returnToQuotes} />
            </div>
          ) : tab === "talents" ? (
            <div className="mt-4">
              <TalentsPanel
                projectId={project.id}
                title="Participantes del proyecto"
                description="Agrega creativos o empresas para colaborar"
                buttonLabel="+ Agregar"
                onCountChange={(n) => setTalentsCount(n)}
              />
            </div>
          ) : (
            <div className="mt-4">
              <NdasPanel
                projectId={project.id}
                onCountChange={(n) => setNdasCount(n)}
              />
            </div>
          )}
        </div>
      </div>

      <AgreementFlowModal
        open={agreementOpen}
        onClose={() => setAgreementOpen(false)}
        projectId={project.id}
        projectTitle={project.title}
        onDone={() => {
          setTabSafe("talents");
        }}
      />
    </>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "shrink-0 rounded-2xl border px-4 py-2 text-xs font-bold transition",
        active
          ? "border-[#f2c94c] bg-[#f2c94c] text-[#0b0f17]"
          : "border-white/8 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function MiniCountCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "yellow" | "violet";
}) {
  const style =
    tone === "green"
      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/15"
      : tone === "yellow"
      ? "bg-[#f2c94c]/10 text-[#f2c94c] border border-[#f2c94c]/15"
      : "bg-violet-500/10 text-violet-300 border border-violet-500/15";

  return (
    <div className={["rounded-2xl p-6 text-center", style].join(" ")}>
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs font-semibold">{label}</div>
    </div>
  );
}

function QuotesTabMvp({ projectId, returnTo }: { projectId: string; returnTo: string }) {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const r = await api<{ ok: true; quotes: QuoteRow[] }>(
        `/projects/${projectId}/quotes`
      );
      setQuotes(r.quotes || []);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isUuid(projectId)) return;
    load();
  }, [projectId]);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d1320]">
      <div className="flex items-center justify-between gap-3 bg-[#111827] px-5 py-5 sm:px-6">
        <div>
          <div className="text-sm font-extrabold text-white">
            Historial de cotizaciones
          </div>
          <div className="text-xs text-slate-500">
            Cotizaciones asociadas a este proyecto
          </div>
        </div>

        <Link
          href={`/producer/projects/${projectId}/quotes/new?returnTo=${returnTo}`}
          className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
          style={{ background: "linear-gradient(135deg,#10b981,#22c55e)" }}
        >
          + Nueva
        </Link>
      </div>

      <div className="px-5 py-6 sm:px-6">
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-slate-400">Cargando...</div>
        ) : quotes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <div className="text-sm font-semibold text-slate-300">
              No hay cotizaciones aún
            </div>
            <Link
              href={`/producer/projects/${projectId}/quotes/new?returnTo=${returnTo}`}
              className="mt-4 inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-bold text-[#0b0f17]"
              style={{ background: "linear-gradient(135deg,#10b981,#22c55e)" }}
            >
              Crear primera cotización
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {quotes.map((q) => (
              <div
                key={q.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate font-bold text-white">
                    {q.client_name || "Cliente sin nombre"}{" "}
                    {q.client_email ? `• ${q.client_email}` : ""}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Estado: {q.status} • Total: {q.currency} {q.total_amount}
                    {q.valid_until ? ` • Válido hasta: ${q.valid_until}` : ""}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Link
                    className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.08]"
                    href={`/producer/quotes/${q.id}`}
                  >
                    Abrir
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// "use client";

// import Link from "next/link";
// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import { api } from "@/lib/api";
// import TalentsPanel from "@/components/projects/TalentsPanel";
// import AgreementFlowModal from "@/components/projects/AgreementFlowModal";

// function isUuid(v: string) {
//   return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
//     v
//   );
// }

// type Project = {
//   id: string;
//   title: string;
//   brief: string | null;
//   status: string | null;
//   currency: string | null;
//   start_date: string | null;
//   due_date: string | null;
//   created_at: string;
// };

// type TabKey = "general" | "quotes" | "talents" | "ndas";

// type QuoteRow = {
//   id: string;
//   status: string;
//   client_name: string | null;
//   client_email: string | null;
//   currency: string;
//   total_amount: string | number;
//   valid_until: string | null;
//   public_id: string | null;
//   created_at: string;
// };

// type StatusKey =
//   | "created"
//   | "pending"
//   | "sent"
//   | "approved"
//   | "in_progress"
//   | "completed"
//   | "paid"
//   | "rejected";

// function normalizeStatus(s?: string | null): StatusKey {
//   if (!s) return "created";
//   const v = String(s).toLowerCase();
//   if (v === "open") return "pending";
//   if (v === "draft") return "created";
//   if (
//     v === "created" ||
//     v === "pending" ||
//     v === "sent" ||
//     v === "approved" ||
//     v === "in_progress" ||
//     v === "completed" ||
//     v === "paid" ||
//     v === "rejected"
//   )
//     return v;
//   return "created";
// }

// function statusPill(status: StatusKey) {
//   const base =
//     "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold";
//   switch (status) {
//     case "created":
//       return { cls: `${base} bg-violet-500/12 text-violet-300`, label: "Creado" };
//     case "pending":
//       return { cls: `${base} bg-amber-500/12 text-amber-300`, label: "Pendiente" };
//     case "sent":
//       return { cls: `${base} bg-indigo-500/12 text-indigo-300`, label: "Enviado" };
//     case "approved":
//       return { cls: `${base} bg-sky-500/12 text-sky-300`, label: "Aprobado" };
//     case "in_progress":
//       return {
//         cls: `${base} bg-blue-500/12 text-blue-300`,
//         label: "En ejecución",
//       };
//     case "completed":
//       return {
//         cls: `${base} bg-emerald-500/12 text-emerald-300`,
//         label: "Terminado",
//       };
//     case "paid":
//       return { cls: `${base} bg-teal-500/12 text-teal-300`, label: "Cobrado" };
//     case "rejected":
//       return { cls: `${base} bg-rose-500/12 text-rose-300`, label: "Rechazado" };
//     default:
//       return { cls: `${base} bg-white/8 text-slate-300`, label: "Creado" };
//   }
// }

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

// export default function ProjectTabs({
//   projectId,
//   mode = "inline",
//   initialTab = "general",
//   showHeader = true,
//   tab: controlledTab,
//   onTabChange,
// }: {
//   projectId: string;
//   mode?: "inline" | "page";
//   initialTab?: TabKey;
//   showHeader?: boolean;
//   tab?: TabKey;
//   onTabChange?: (t: TabKey) => void;
// }) {
//   const router = useRouter();

//   const validProjectId = useMemo(() => isUuid(projectId), [projectId]);

//   const [tabInternal, setTabInternal] = useState<TabKey>(initialTab);
//   const tab = controlledTab ?? tabInternal;

//   const [project, setProject] = useState<Project | null>(null);
//   const [loadingProject, setLoadingProject] = useState(true);
//   const [errProject, setErrProject] = useState<string | null>(null);

//   const [talentsCount, setTalentsCount] = useState(0);
//   const [agreementOpen, setAgreementOpen] = useState(false);

//   const setTabSafe = (next: TabKey) => {
//     if (onTabChange) onTabChange(next);
//     else setTabInternal(next);

//     if (mode === "page") router.replace(`/producer/projects/${projectId}?tab=${next}`);
//   };

//   useEffect(() => {
//     if (mode !== "page") return;
//     if (typeof window === "undefined") return;
//     const sp = new URLSearchParams(window.location.search);
//     const t = sp.get("tab");
//     if (t === "general" || t === "quotes" || t === "talents" || t === "ndas") {
//       if (onTabChange) onTabChange(t);
//       else setTabInternal(t);
//     }
//   }, [mode, onTabChange]);

//   useEffect(() => {
//     if (controlledTab) return;
//     setTabInternal(initialTab);
//   }, [initialTab, controlledTab]);

//   useEffect(() => {
//     if (!validProjectId) {
//       setLoadingProject(false);
//       setProject(null);
//       setErrProject("Invalid project id");
//       return;
//     }

//     let alive = true;
//     setLoadingProject(true);
//     setErrProject(null);

//     api<{ ok: true; project: Project }>(`/projects/${projectId}`)
//       .then((r) => {
//         if (!alive) return;
//         setProject(r.project);
//         setLoadingProject(false);
//       })
//       .catch((e: any) => {
//         if (!alive) return;
//         setErrProject(String(e?.message || e));
//         setLoadingProject(false);
//       });

//     return () => {
//       alive = false;
//     };
//   }, [projectId, validProjectId]);

//   const created = project?.created_at
//     ? new Date(project.created_at).toLocaleDateString()
//     : "—";
//   const st = normalizeStatus(project?.status);
//   const pill = statusPill(st);

//   const returnToQuotes =
//     mode === "inline"
//       ? encodeURIComponent(`/producer/projects?open=${projectId}&tab=quotes`)
//       : encodeURIComponent(`/producer/projects/${projectId}?tab=quotes`);

//   if (!validProjectId) {
//     return (
//       <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
//         Invalid project id
//       </div>
//     );
//   }

//   if (loadingProject) {
//     return (
//       <div className="rounded-3xl border border-white/8 bg-[#0d1320] p-6 text-sm text-slate-400">
//         Cargando...
//       </div>
//     );
//   }

//   if (errProject) {
//     return (
//       <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
//         {errProject}
//       </div>
//     );
//   }

//   if (!project) return null;

//   return (
//     <>
//       <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d1320]">
//         {showHeader ? (
//           <div className="flex items-start justify-between gap-4 bg-[#111827] px-5 py-5 sm:px-6">
//             <div className="flex min-w-0 items-start gap-4">
//               <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2c94c] text-[#0b0f17] shadow-sm">
//                 <FolderIcon />
//               </div>

//               <div className="min-w-0">
//                 <div className="truncate text-xl font-black text-white sm:text-2xl">
//                   {project.title}
//                 </div>
//                 <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
//                   <span className={pill.cls}>
//                     <span className="h-2 w-2 rounded-full bg-current opacity-70" />
//                     {pill.label}
//                   </span>
//                   {project.currency ? <span className="text-slate-700">•</span> : null}
//                   {project.currency ? (
//                     <span className="font-semibold text-slate-400">{project.currency}</span>
//                   ) : null}
//                   <span className="text-slate-700">•</span>
//                   <span>{created}</span>
//                 </div>
//               </div>
//             </div>

//             <Link
//               href={`/producer/projects/${project.id}/quotes/new?returnTo=${returnToQuotes}`}
//               className="shrink-0 rounded-2xl px-4 py-3 text-sm font-bold text-[#0b0f17] shadow-sm hover:opacity-95 active:opacity-90"
//               style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//             >
//               Nueva cotización
//             </Link>
//           </div>
//         ) : null}

//         <div
//           className={[
//             "px-5 py-4 sm:px-6",
//             showHeader ? "border-t border-white/8" : "border-t-0",
//           ].join(" ")}
//         >
//           <div className="flex gap-2 overflow-x-auto">
//             <TabButton
//               label="General"
//               active={tab === "general"}
//               onClick={() => setTabSafe("general")}
//             />
//             <TabButton
//               label="Cotizaciones"
//               active={tab === "quotes"}
//               onClick={() => setTabSafe("quotes")}
//             />
//             <TabButton
//               label="Talentos"
//               active={tab === "talents"}
//               onClick={() => setTabSafe("talents")}
//             />
//             <TabButton
//               label="NDAs"
//               active={tab === "ndas"}
//               onClick={() => setTabSafe("ndas")}
//             />
//           </div>
//         </div>

//         <div className="px-5 pb-6 sm:px-6">
//           {tab === "general" ? (
//             <div className="mt-4">
//               <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
//                 acciones rápidas
//               </div>

//               <div className="mt-3 flex flex-wrap gap-2">
//                 <button
//                   type="button"
//                   className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
//                   style={{ background: "linear-gradient(135deg,#10b981,#34d399)" }}
//                   onClick={() => setTabSafe("quotes")}
//                 >
//                   Cotización
//                 </button>

//                 <button
//                   type="button"
//                   className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
//                   style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//                   onClick={() => setAgreementOpen(true)}
//                 >
//                   Acuerdo
//                 </button>

//                 <button
//                   type="button"
//                   className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
//                   style={{ background: "linear-gradient(135deg,#a855f7,#6366f1)" }}
//                 >
//                   NDA
//                 </button>
//               </div>

//               <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
//                 <MiniCountCard label="Cotizaciones" value={0} tone="green" />
//                 <MiniCountCard label="Talentos" value={talentsCount} tone="yellow" />
//                 <MiniCountCard label="NDAs" value={0} tone="violet" />
//               </div>

//               <div className="mt-6">
//                 <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
//                   descripción
//                 </div>
//                 <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
//                   {project.brief || "Sin descripción."}
//                 </div>
//               </div>
//             </div>
//           ) : tab === "quotes" ? (
//             <div className="mt-4">
//               <QuotesTabMvp projectId={project.id} returnTo={returnToQuotes} />
//             </div>
//           ) : tab === "talents" ? (
//             <div className="mt-4">
//               <TalentsPanel
//                 projectId={project.id}
//                 title="Participantes del proyecto"
//                 description="Agrega creativos o empresas para colaborar"
//                 buttonLabel="+ Agregar"
//                 onCountChange={(n) => setTalentsCount(n)}
//               />
//             </div>
//           ) : (
//             <div className="mt-4 rounded-3xl border border-white/8 bg-white/[0.03] p-6 text-sm text-slate-400">
//               Sección "NDAs" pendiente de conectar.
//             </div>
//           )}
//         </div>
//       </div>

//       <AgreementFlowModal
//         open={agreementOpen}
//         onClose={() => setAgreementOpen(false)}
//         projectId={project.id}
//         projectTitle={project.title}
//         onDone={() => {
//           setTabSafe("talents");
//         }}
//       />
//     </>
//   );
// }

// function TabButton({
//   label,
//   active,
//   onClick,
// }: {
//   label: string;
//   active?: boolean;
//   onClick: () => void;
// }) {
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       className={[
//         "shrink-0 rounded-2xl border px-4 py-2 text-xs font-bold transition",
//         active
//           ? "border-[#f2c94c] bg-[#f2c94c] text-[#0b0f17]"
//           : "border-white/8 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]",
//       ].join(" ")}
//     >
//       {label}
//     </button>
//   );
// }

// function MiniCountCard({
//   label,
//   value,
//   tone,
// }: {
//   label: string;
//   value: number;
//   tone: "green" | "yellow" | "violet";
// }) {
//   const style =
//     tone === "green"
//       ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/15"
//       : tone === "yellow"
//       ? "bg-[#f2c94c]/10 text-[#f2c94c] border border-[#f2c94c]/15"
//       : "bg-violet-500/10 text-violet-300 border border-violet-500/15";

//   return (
//     <div className={["rounded-2xl p-6 text-center", style].join(" ")}>
//       <div className="text-2xl font-black">{value}</div>
//       <div className="mt-1 text-xs font-semibold">{label}</div>
//     </div>
//   );
// }

// function QuotesTabMvp({ projectId, returnTo }: { projectId: string; returnTo: string }) {
//   const [quotes, setQuotes] = useState<QuoteRow[]>([]);
//   const [error, setError] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);

//   const load = async () => {
//     setError(null);
//     setLoading(true);
//     try {
//       const r = await api<{ ok: true; quotes: QuoteRow[] }>(
//         `/projects/${projectId}/quotes`
//       );
//       setQuotes(r.quotes || []);
//     } catch (e: any) {
//       setError(String(e?.message || e));
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (!isUuid(projectId)) return;
//     load();
//   }, [projectId]);

//   return (
//     <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d1320]">
//       <div className="flex items-center justify-between gap-3 bg-[#111827] px-5 py-5 sm:px-6">
//         <div>
//           <div className="text-sm font-extrabold text-white">
//             Historial de cotizaciones
//           </div>
//           <div className="text-xs text-slate-500">
//             Cotizaciones asociadas a este proyecto
//           </div>
//         </div>

//         <Link
//           href={`/producer/projects/${projectId}/quotes/new?returnTo=${returnTo}`}
//           className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
//           style={{ background: "linear-gradient(135deg,#10b981,#22c55e)" }}
//         >
//           + Nueva
//         </Link>
//       </div>

//       <div className="px-5 py-6 sm:px-6">
//         {error ? (
//           <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
//             {error}
//           </div>
//         ) : null}

//         {loading ? (
//           <div className="text-sm text-slate-400">Cargando...</div>
//         ) : quotes.length === 0 ? (
//           <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
//             <div className="text-sm font-semibold text-slate-300">
//               No hay cotizaciones aún
//             </div>
//             <Link
//               href={`/producer/projects/${projectId}/quotes/new?returnTo=${returnTo}`}
//               className="mt-4 inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-bold text-[#0b0f17]"
//               style={{ background: "linear-gradient(135deg,#10b981,#22c55e)" }}
//             >
//               Crear primera cotización
//             </Link>
//           </div>
//         ) : (
//           <div className="grid gap-3">
//             {quotes.map((q) => (
//               <div
//                 key={q.id}
//                 className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5 sm:flex-row sm:items-start sm:justify-between"
//               >
//                 <div className="min-w-0">
//                   <div className="truncate font-bold text-white">
//                     {q.client_name || "Cliente sin nombre"}{" "}
//                     {q.client_email ? `• ${q.client_email}` : ""}
//                   </div>
//                   <div className="mt-1 text-xs text-slate-500">
//                     Estado: {q.status} • Total: {q.currency} {q.total_amount}
//                     {q.valid_until ? ` • Válido hasta: ${q.valid_until}` : ""}
//                   </div>
//                 </div>

//                 <div className="flex shrink-0 gap-2">
//                   <Link
//                     className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.08]"
//                     href={`/producer/quotes/${q.id}`}
//                   >
//                     Abrir
//                   </Link>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

