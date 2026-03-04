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
};

type TabKey = "general" | "quotes" | "talents" | "ndas";

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

export default function ProducerProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ✅ este tab ahora “controla” ProjectTabs (para que no se desincronicen)
  const [expandedTab, setExpandedTab] = useState<TabKey>("general");

  // ✅ opcional: scroll suave al panel expandido (look MVP)
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

  // ✅ reabrir el mismo proyecto al volver desde modal: /producer/projects?open=<id>&tab=quotes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const open = sp.get("open");
    const tab = sp.get("tab");

    if (open) setExpandedId(open);
    if (tab === "general" || tab === "quotes" || tab === "talents" || tab === "ndas") {
      setExpandedTab(tab);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => (p.title || "").toLowerCase().includes(q));
  }, [projects, search]);

  const openProject = (id: string, nextTab: TabKey = "general") => {
    setExpandedId((cur) => (cur === id ? null : id));
    setExpandedTab(nextTab);

    // scroll suave al abrir
    setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div className="w-full">
      <div className="min-h-[calc(100vh-56px)] rounded-3xl bg-[#f0f4f8] p-4 sm:p-6 md:p-7">
        <div className="mx-auto max-w-[1100px]">
          {/* Header MVP */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm">
                  <FolderIcon />
                </span>
                <h1 className="text-[22px] sm:text-[28px] font-black text-slate-900">📁 Mis Proyectos</h1>
              </div>
              <p className="mt-2 text-sm text-slate-500">Todo tu trabajo organizado en un solo lugar</p>
            </div>

            <Link
              href="/producer/projects/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-sm hover:opacity-95 active:opacity-90"
              style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
            >
              <span className="text-base leading-none">+</span>
              <span>Nuevo Proyecto</span>
            </Link>
          </div>

          {/* Search */}
          <div className="mb-5 flex flex-col gap-3">
            <div className="relative w-full">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar proyectos..."
                className="w-full rounded-2xl border border-slate-200 bg-[#f1f5f9] px-4 py-3 pl-10 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {err ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="text-5xl mb-3">📁</div>
              <div className="text-lg font-bold text-slate-900">
                {search ? "No se encontraron proyectos" : "No tienes proyectos aún"}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {search ? "Prueba con otro término de búsqueda" : "Crea tu primer proyecto para comenzar"}
              </div>
              {!search ? (
                <Link
                  href="/producer/projects/new"
                  className="mt-6 inline-flex rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-sm"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
                >
                  + Crear mi primer proyecto
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((p) => {
                const isExpanded = expandedId === p.id;
                const created = p.created_at ? new Date(p.created_at).toLocaleDateString() : "—";

                return (
                  <div
                    key={p.id}
                    className={[
                      "rounded-2xl border overflow-hidden shadow-sm",
                      isExpanded ? "border-blue-300 bg-white" : "border-slate-200 bg-white/80",
                    ].join(" ")}
                  >
                    {/* Header del proyecto */}
                    <button
                      type="button"
                      onClick={() => openProject(p.id, "general")}
                      className={[
                        "w-full px-5 py-5 text-left flex items-center justify-between gap-4",
                        isExpanded ? "bg-white" : "bg-white/80 hover:bg-white",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-xl shrink-0"
                          style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
                        >
                          📁
                        </div>

                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-extrabold text-slate-900 truncate">{p.title}</div>
                          <div className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-600">jesus</span>
                            <span className="text-slate-300">•</span>
                            <span>{created}</span>
                            <span className="text-slate-300">•</span>
                            <span>{p.currency || "CLP"}</span>
                          </div>
                        </div>
                      </div>

                      <span className={["transition", isExpanded ? "rotate-180" : ""].join(" ")}>
                        <ChevronDown />
                      </span>
                    </button>

                    {/* Expanded */}
                    {isExpanded ? (
                      <div className="px-5 pb-5" ref={panelRef}>
                        <div className="mt-4">
                          <ProjectTabs
                            projectId={p.id}
                            mode="inline"
                            showHeader={false}
                            // ✅ CONTROLADO: esto arregla que “no se veía” lo que hacíamos
                            tab={expandedTab}
                            onTabChange={setExpandedTab}
                            // initialTab ya no es necesario si es controlado, pero lo dejamos safe:
                            initialTab={expandedTab}
                          />
                        </div>

                        {/* Acciones rápidas tipo MVP (sin “brinco”) */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedTab("quotes")}
                            className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
                            style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}
                          >
                            Cotizaciones
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedTab("talents")}
                            className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
                            style={{ background: "linear-gradient(135deg,#3b82f6,#60a5fa)" }}
                          >
                            Talentos
                          </button>

                          <Link
                            href={`/producer/projects/${p.id}?tab=general`}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Abrir en página
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// "use client";

// import Link from "next/link";
// import { useEffect, useMemo, useState } from "react";
// import { api } from "@/lib/api";

// type Project = {
//   id: string;
//   title: string;
//   status: string | null;
//   currency?: string | null;
//   created_at?: string | null;
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
//   const base = "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold";
//   switch (status) {
//     case "created":
//       return { cls: `${base} bg-violet-50 text-violet-700`, label: "Creado" };
//     case "pending":
//       return { cls: `${base} bg-amber-50 text-amber-700`, label: "Pendiente" };
//     case "sent":
//       return { cls: `${base} bg-indigo-50 text-indigo-700`, label: "Enviado" };
//     case "approved":
//       return { cls: `${base} bg-sky-50 text-sky-700`, label: "Aprobado" };
//     case "in_progress":
//       return { cls: `${base} bg-blue-50 text-blue-700`, label: "En ejecución" };
//     case "completed":
//       return { cls: `${base} bg-emerald-50 text-emerald-700`, label: "Terminado" };
//     case "paid":
//       return { cls: `${base} bg-teal-50 text-teal-700`, label: "Cobrado" };
//     case "rejected":
//       return { cls: `${base} bg-rose-50 text-rose-700`, label: "Rechazado" };
//     default:
//       return { cls: `${base} bg-slate-100 text-slate-700`, label: "Creado" };
//   }
// }

// /* ===== iconitos mínimos ===== */
// function FolderIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
//     </svg>
//   );
// }
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

// type FilterKey =
//   | "all"
//   | "pending"
//   | "sent"
//   | "approved"
//   | "in_progress"
//   | "completed"
//   | "paid";

// const FILTERS: { id: FilterKey; label: string; icon: string }[] = [
//   { id: "all", label: "Todos", icon: "📋" },
//   { id: "pending", label: "Pendientes", icon: "⏳" },
//   { id: "sent", label: "Enviados", icon: "📤" },
//   { id: "approved", label: "Aprobados", icon: "👍" },
//   { id: "in_progress", label: "En Ejecución", icon: "⚡" },
//   { id: "completed", label: "Terminados", icon: "✅" },
//   { id: "paid", label: "Cobrados", icon: "💵" },
// ];

// export default function ProducerProjectsPage() {
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);

//   const [search, setSearch] = useState("");
//   const [filter, setFilter] = useState<FilterKey>("all");
//   const [expandedId, setExpandedId] = useState<string | null>(null);

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

//   const filteredProjects = useMemo(() => {
//     const q = search.trim().toLowerCase();
//     return (projects || []).filter((p) => {
//       const titleOk = !q || (p.title || "").toLowerCase().includes(q);
//       const st = normalizeStatus(p.status);
//       const statusOk = filter === "all" ? true : st === filter;
//       return titleOk && statusOk;
//     });
//   }, [projects, search, filter]);

//   const stats = useMemo(() => {
//     const counts: Record<FilterKey | "total", number> = {
//       all: 0,
//       pending: 0,
//       sent: 0,
//       approved: 0,
//       in_progress: 0,
//       completed: 0,
//       paid: 0,
//       total: 0,
//     };

//     for (const p of projects || []) {
//       const st = normalizeStatus(p.status);
//       if (st === "pending") counts.pending += 1;
//       if (st === "sent") counts.sent += 1;
//       if (st === "approved") counts.approved += 1;
//       if (st === "in_progress") counts.in_progress += 1;
//       if (st === "completed") counts.completed += 1;
//       if (st === "paid") counts.paid += 1;
//       counts.total += 1;
//     }

//     return counts;
//   }, [projects]);

//   return (
//     <div className="w-full">
//       {/* Fondo tipo MVP */}
//       <div className="min-h-[calc(100vh-56px)] rounded-3xl bg-[#f0f4f8] p-4 sm:p-6 md:p-7">
//         <div className="mx-auto max-w-[1100px]">
//           {/* Header */}
//           <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
//             <div className="min-w-0">
//               <div className="flex items-center gap-3">
//                 <span className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm">
//                   <FolderIcon />
//                 </span>
//                 <h1 className="text-[22px] sm:text-[28px] font-black text-slate-900">📁 Mis Proyectos</h1>
//               </div>
//               <p className="mt-2 text-sm text-slate-500">Todo tu trabajo organizado en un solo lugar</p>
//             </div>

//             <Link
//               href="/producer/projects/new"
//               className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-sm hover:opacity-95 active:opacity-90"
//               style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}
//             >
//               <span className="text-base leading-none">+</span>
//               <span>Nuevo Proyecto</span>
//             </Link>
//           </div>

//           {/* Search + filtros (pill group tipo MVP) */}
//           <div className="mb-5 flex flex-col gap-3">
//             <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
//               <div className="relative w-full lg:flex-1">
//                 <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
//                   <SearchIcon />
//                 </span>
//                 <input
//                   value={search}
//                   onChange={(e) => setSearch(e.target.value)}
//                   placeholder="Buscar proyectos..."
//                   className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 pl-10 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
//                 />
//               </div>

//               <div className="rounded-2xl bg-slate-100 p-1.5 border border-slate-200 overflow-x-auto">
//                 <div className="flex gap-1.5">
//                   {FILTERS.map((f) => (
//                     <button
//                       key={f.id}
//                       type="button"
//                       onClick={() => setFilter(f.id)}
//                       className={[
//                         "shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition",
//                         filter === f.id
//                           ? "text-white"
//                           : "text-slate-600 hover:bg-white/70",
//                       ].join(" ")}
//                       style={
//                         filter === f.id
//                           ? { background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }
//                           : undefined
//                       }
//                     >
//                       {f.icon} {f.label}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             </div>

//             {/* Stats rápidas (7) */}
//             <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
//               <StatCard label="Pendientes" value={stats.pending} tone="amber" />
//               <StatCard label="Enviados" value={stats.sent} tone="violet" />
//               <StatCard label="Aprobados" value={stats.approved} tone="sky" />
//               <StatCard label="En Ejecución" value={stats.in_progress} tone="blue" />
//               <StatCard label="Terminados" value={stats.completed} tone="green" />
//               <StatCard label="Cobrados" value={stats.paid} tone="teal" />
//               <StatCard label="Total" value={stats.total} tone="slate" />
//             </div>
//           </div>

//           {err ? (
//             <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
//               {err}
//             </div>
//           ) : null}

//           {loading ? (
//             <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
//               Cargando...
//             </div>
//           ) : filteredProjects.length === 0 ? (
//             <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
//               <div className="text-5xl mb-3">📁</div>
//               <div className="text-lg font-bold text-slate-900">
//                 {search ? "No se encontraron proyectos" : "No tienes proyectos aún"}
//               </div>
//               <div className="mt-2 text-sm text-slate-500">
//                 {search ? "Prueba con otro término de búsqueda" : "Crea tu primer proyecto para comenzar"}
//               </div>

//               {!search ? (
//                 <Link
//                   href="/producer/projects/new"
//                   className="mt-6 inline-flex rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-sm"
//                   style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}
//                 >
//                   + Crear mi primer proyecto
//                 </Link>
//               ) : null}
//             </div>
//           ) : (
//             <div className="space-y-3">
//               {filteredProjects.map((p) => (
//                 <ProjectExpandableCard
//                   key={p.id}
//                   project={p}
//                   expanded={expandedId === p.id}
//                   onToggle={() => setExpandedId((cur) => (cur === p.id ? null : p.id))}
//                 />
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// function StatCard({
//   label,
//   value,
//   tone,
// }: {
//   label: string;
//   value: number;
//   tone: "amber" | "violet" | "sky" | "blue" | "green" | "teal" | "slate";
// }) {
//   const map = {
//     amber: { c: "#f59e0b", bg: "rgba(251,191,36,0.12)", bd: "rgba(251,191,36,0.25)" },
//     violet: { c: "#8b5cf6", bg: "rgba(139,92,246,0.12)", bd: "rgba(139,92,246,0.25)" },
//     sky: { c: "#0ea5e9", bg: "rgba(14,165,233,0.12)", bd: "rgba(14,165,233,0.25)" },
//     blue: { c: "#3b82f6", bg: "rgba(59,130,246,0.12)", bd: "rgba(59,130,246,0.25)" },
//     green: { c: "#15803d", bg: "rgba(34,197,94,0.12)", bd: "rgba(34,197,94,0.25)" },
//     teal: { c: "#10b981", bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.25)" },
//     slate: { c: "#64748b", bg: "rgba(100,116,139,0.12)", bd: "rgba(100,116,139,0.25)" },
//   }[tone];

//   return (
//     <div className="rounded-2xl border bg-white/60 p-4 shadow-sm" style={{ borderColor: map.bd }}>
//       <div className="text-2xl font-extrabold" style={{ color: map.c }}>
//         {value}
//       </div>
//       <div className="text-[11px] text-slate-500">{label}</div>
//       <div className="mt-2 h-2 rounded-full" style={{ background: map.bg }} />
//     </div>
//   );
// }

// function ProjectExpandableCard({
//   project,
//   expanded,
//   onToggle,
// }: {
//   project: Project;
//   expanded: boolean;
//   onToggle: () => void;
// }) {
//   const st = normalizeStatus(project.status);
//   const pill = statusPill(st);
//   const created = project.created_at ? new Date(project.created_at).toLocaleDateString() : "—";
//   const currency = project.currency || "CLP";

//   const detailBase = `/producer/projects/${project.id}`;
//   const detailGeneral = `${detailBase}?tab=general`;
//   const detailQuotes = `${detailBase}?tab=quotes`;
//   const detailTalents = `${detailBase}?tab=talents`;

//   const returnToQuotes = encodeURIComponent(`${detailBase}?tab=quotes`);
//   const newQuoteModal = `/producer/projects/${project.id}/quotes/new?returnTo=${returnToQuotes}`;

//   return (
//     <div
//       className={[
//         "rounded-2xl border overflow-hidden shadow-sm transition",
//         expanded ? "border-blue-300 bg-white" : "border-slate-200 bg-white/70",
//       ].join(" ")}
//     >
//       {/* Header always visible */}
//       <button
//         type="button"
//         onClick={onToggle}
//         className={[
//           "w-full px-5 py-5 text-left flex items-center justify-between gap-4",
//           expanded ? "bg-white" : "bg-white/70 hover:bg-white",
//         ].join(" ")}
//       >
//         <div className="flex items-center gap-4 min-w-0">
//           <div
//             className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-xl shrink-0"
//             style={{
//               background: expanded
//                 ? "linear-gradient(135deg,#3b82f6,#8b5cf6)"
//                 : "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(139,92,246,0.18))",
//               color: expanded ? "#fff" : "#3b82f6",
//             }}
//           >
//             📁
//           </div>

//           <div className="min-w-0">
//             <div className="text-base sm:text-lg font-extrabold text-slate-900 truncate">{project.title}</div>
//             <div className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-2">
//               <span className="font-semibold text-slate-600">jesus</span>
//               <span className="text-slate-300">•</span>
//               <span>{created}</span>
//               <span className="text-slate-300">•</span>
//               <span>{currency}</span>
//             </div>
//           </div>
//         </div>

//         <div className="flex items-center gap-3 shrink-0">
//           <span className={pill.cls}>
//             <span className="h-2 w-2 rounded-full bg-current opacity-70" />
//             {pill.label}
//           </span>

//           <span className={["transition", expanded ? "rotate-180" : ""].join(" ")}>
//             <ChevronDown />
//           </span>
//         </div>
//       </button>

//       {/* Expanded content (NO lógica duplicada; solo navegación) */}
//       {expanded ? (
//         <div className="px-5 pb-5">
//           <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
//             <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Acciones rápidas</div>

//             <div className="mt-3 flex flex-wrap gap-2">
//               <Link
//                 href={detailGeneral}
//                 className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
//               >
//                 Ver detalle
//               </Link>

//               <Link
//                 href={detailQuotes}
//                 className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
//                 style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}
//               >
//                 Cotizaciones
//               </Link>

//               <Link
//                 href={detailTalents}
//                 className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
//                 style={{ background: "linear-gradient(135deg,#3b82f6,#60a5fa)" }}
//               >
//                 Talentos
//               </Link>

//               <Link
//                 href={newQuoteModal}
//                 className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
//                 style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}
//               >
//                 + Nueva cotización
//               </Link>

//               <Link
//                 href="/producer/negotiations"
//                 className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
//                 style={{ background: "linear-gradient(135deg,#0ea5e9,#3b82f6)" }}
//               >
//                 Negociaciones
//               </Link>
//             </div>

//             <div className="mt-4 text-xs text-slate-500">
//               * Nota: aquí no duplicamos tabs ni lógica; todo vive en el detalle del proyecto.
//             </div>
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// }

// "use client";

// import Link from "next/link";
// import { useEffect, useMemo, useState } from "react";
// import { api } from "@/lib/api";

// type Project = {
//   id: string;
//   title: string;
//   status: string | null;
//   currency?: string | null;
//   created_at?: string | null;
// };

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
//   const base = "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold";
//   switch (status) {
//     case "created":
//       return { cls: `${base} bg-violet-50 text-violet-700`, label: "Creado" };
//     case "pending":
//       return { cls: `${base} bg-amber-50 text-amber-700`, label: "Pendiente" };
//     case "sent":
//       return { cls: `${base} bg-indigo-50 text-indigo-700`, label: "Enviado" };
//     case "approved":
//       return { cls: `${base} bg-sky-50 text-sky-700`, label: "Aprobado" };
//     case "in_progress":
//       return { cls: `${base} bg-blue-50 text-blue-700`, label: "En ejecución" };
//     case "completed":
//       return { cls: `${base} bg-emerald-50 text-emerald-700`, label: "Terminado" };
//     case "paid":
//       return { cls: `${base} bg-teal-50 text-teal-700`, label: "Cobrado" };
//     case "rejected":
//       return { cls: `${base} bg-rose-50 text-rose-700`, label: "Rechazado" };
//     default:
//       return { cls: `${base} bg-slate-100 text-slate-700`, label: "Creado" };
//   }
// }

// /* ===== iconitos mínimos ===== */
// function FolderIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
//     </svg>
//   );
// }
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

// type TabKey = "general" | "quotes" | "talents" | "ndas";

// export default function ProducerProjectsPage() {
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);

//   const [search, setSearch] = useState("");

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

//   const filtered = useMemo(() => {
//     const q = search.trim().toLowerCase();
//     if (!q) return projects;
//     return projects.filter((p) => (p.title || "").toLowerCase().includes(q));
//   }, [projects, search]);

//   return (
//     <div className="w-full">
//       <div className="mx-auto max-w-[1100px]">
//         {/* Header */}
//         <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
//           <div className="min-w-0">
//             <div className="flex items-center gap-3">
//               <span className="h-9 w-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
//                 <FolderIcon />
//               </span>
//               <h1 className="text-[22px] sm:text-[28px] font-black text-slate-900">Mis Proyectos</h1>
//             </div>
//             <p className="mt-2 text-sm text-slate-500">Todo tu trabajo organizado en un solo lugar</p>
//           </div>

//           <Link
//             href="/producer/projects/new"
//             className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-sm hover:opacity-95 active:opacity-90"
//             style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
//           >
//             <span className="text-base leading-none">+</span>
//             <span>Nuevo Proyecto</span>
//           </Link>
//         </div>

//         {/* Search + chips */}
//         <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
//           <div className="relative w-full sm:max-w-[420px]">
//             <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
//               <SearchIcon />
//             </span>
//             <input
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               placeholder="Buscar proyectos..."
//               className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pl-10 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
//             />
//           </div>

//           <div className="flex gap-2 overflow-x-auto">
//             <Chip active label="Todos" />
//             <Chip label="Pendientes" />
//             <Chip label="Enviados" />
//             <Chip label="Aprobados" />
//             <Chip label="En ejecución" />
//             <Chip label="Terminados" />
//             <Chip label="Cobrados" />
//           </div>
//         </div>

//         {err ? (
//           <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
//             {err}
//           </div>
//         ) : null}

//         {loading ? (
//           <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Cargando...</div>
//         ) : filtered.length === 0 ? (
//           <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
//             No hay proyectos.
//           </div>
//         ) : (
//           <div className="space-y-4">
//             {filtered.map((p) => (
//               <ProjectAccordionCard key={p.id} project={p} />
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// function Chip({ label, active }: { label: string; active?: boolean }) {
//   return (
//     <button
//       type="button"
//       className={[
//         "shrink-0 rounded-2xl px-4 py-2 text-xs font-semibold border transition",
//         active
//           ? "bg-blue-600 text-white border-blue-600"
//           : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
//       ].join(" ")}
//     >
//       {label}
//     </button>
//   );
// }

// function ProjectAccordionCard({ project }: { project: Project }) {
//   const [open, setOpen] = useState(false);
//   const [tab, setTab] = useState<TabKey>("general");

//   const st = normalizeStatus(project.status);
//   const pill = statusPill(st);
//   const created = project.created_at ? new Date(project.created_at).toLocaleDateString() : "—";

//   // placeholders por ahora (luego conectamos)
//   const quotesCount = 0;
//   const talentsCount = 0;
//   const ndasCount = 0;

//   return (
//     <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
//       {/* top row */}
//       <button
//         type="button"
//         className="w-full px-5 sm:px-6 py-5 flex items-center justify-between gap-4 bg-[#f6f9fc] hover:bg-[#f2f7fd] transition"
//         onClick={() => setOpen((v) => !v)}
//       >
//         <div className="flex items-center gap-4 min-w-0">
//           <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center">
//             <FolderIcon />
//           </div>

//           <div className="min-w-0 text-left">
//             <div className="text-base sm:text-lg font-extrabold text-slate-900 truncate">{project.title}</div>
//             <div className="mt-1 text-xs text-slate-500 flex items-center gap-2 flex-wrap">
//               <span className="text-slate-600 font-semibold">jesus</span>
//               <span className="text-slate-300">•</span>
//               <span>{created}</span>
//             </div>
//           </div>
//         </div>

//         <div className="flex items-center gap-3">
//           <span className={pill.cls}>
//             <span className="h-2 w-2 rounded-full bg-current opacity-70" />
//             {pill.label}
//           </span>

//           <span className={["transition", open ? "rotate-180" : ""].join(" ")}>
//             <ChevronDown />
//           </span>
//         </div>
//       </button>

//       {/* expanded */}
//       {open ? (
//         <div className="px-5 sm:px-6 py-5">
//           {/* tabs */}
//           <div className="flex gap-2 overflow-x-auto pb-2">
//             <TabButton label="General" active={tab === "general"} onClick={() => setTab("general")} />
//             <TabButton label="Cotizaciones" active={tab === "quotes"} onClick={() => setTab("quotes")} />
//             <TabButton label="Talentos" active={tab === "talents"} onClick={() => setTab("talents")} />
//             <TabButton label="NDAs" active={tab === "ndas"} onClick={() => setTab("ndas")} />
//           </div>

//           {/* content */}
//           {tab === "general" ? (
//             <div className="mt-4">
//               <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Acciones rápidas</div>

//               <div className="mt-3 flex flex-wrap gap-2">
//                 <Link
//                   href={`/producer/projects/${project.id}/quotes`}
//                   className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
//                   style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}
//                 >
//                   Cotización
//                 </Link>

//                 <Link
//                   href={`/producer/negotiations`}
//                   className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
//                   style={{ background: "linear-gradient(135deg,#3b82f6,#60a5fa)" }}
//                 >
//                   Acuerdo
//                 </Link>

//                 <button
//                   type="button"
//                   className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
//                   style={{ background: "linear-gradient(135deg,#a855f7,#6366f1)" }}
//                 >
//                   NDA
//                 </button>
//               </div>

//               <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
//                 <MiniCountCard label="Cotizaciones" value={quotesCount} tone="green" />
//                 <MiniCountCard label="Talentos" value={talentsCount} tone="blue" />
//                 <MiniCountCard label="NDAs" value={ndasCount} tone="violet" />
//               </div>

//               <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
//                 <div className="text-xs text-slate-500">Creado: {created}</div>
//                 <div className="flex gap-2 flex-wrap">
//                   <button type="button" className="rounded-xl px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700">
//                     Editar
//                   </button>
//                   <button type="button" className="rounded-xl px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700">
//                     Duplicar
//                   </button>
//                   <button type="button" className="rounded-xl px-4 py-2 text-xs font-bold bg-rose-50 text-rose-700">
//                     Eliminar
//                   </button>
//                 </div>
//               </div>
//             </div>
//           ) : tab === "quotes" ? (
//             <div className="mt-4">
//               <QuotesInlineMvp projectId={project.id} />
//             </div>
//           ) : tab === "talents" ? (
//             <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
//               (Talentos inline pendiente. El tab Talentos completo ya vive en /producer/projects/{project.id})
//             </div>
//           ) : (
//             <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
//               Sección "ndas" pendiente de conectar.
//             </div>
//           )}
//         </div>
//       ) : null}
//     </div>
//   );
// }

// function TabButton({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       className={[
//         "shrink-0 rounded-2xl px-4 py-2 text-xs font-bold transition border",
//         active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
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
//   tone: "green" | "blue" | "violet";
// }) {
//   const style =
//     tone === "green"
//       ? "bg-emerald-50 text-emerald-700"
//       : tone === "blue"
//       ? "bg-blue-50 text-blue-700"
//       : "bg-violet-50 text-violet-700";

//   return (
//     <div className={["rounded-2xl p-6 text-center", style].join(" ")}>
//       <div className="text-2xl font-black">{value}</div>
//       <div className="mt-1 text-xs font-semibold">{label}</div>
//     </div>
//   );
// }

// /* ===== Quotes Inline (MVP look dentro del accordion) ===== */
// function QuotesInlineMvp({ projectId }: { projectId: string }) {
//   const [quotes, setQuotes] = useState<QuoteRow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);

//   const load = async () => {
//     setLoading(true);
//     setErr(null);
//     try {
//       const r = await api<{ ok: true; quotes: QuoteRow[] }>(`/projects/${projectId}/quotes`);
//       setQuotes(r.quotes || []);
//     } catch (e: any) {
//       setErr(String(e?.message || e));
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [projectId]);

//   return (
//     <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
//       <div className="px-5 sm:px-6 py-4 flex items-center justify-between">
//         <div className="text-sm font-extrabold text-slate-900">Historial de cotizaciones</div>
//         <Link
//           href={`/producer/projects/${projectId}/quotes/new`}
//           className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
//           style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}
//         >
//           + Nueva
//         </Link>
//       </div>

//       <div className="px-5 sm:px-6 pb-6">
//         {err ? (
//           <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
//             {err}
//           </div>
//         ) : null}

//         {loading ? (
//           <div className="text-sm text-slate-500">Cargando...</div>
//         ) : quotes.length === 0 ? (
//           <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
//             <div className="mx-auto h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
//               <span className="text-lg">$</span>
//             </div>
//             <div className="mt-4 text-sm font-semibold text-slate-700">No hay cotizaciones aún</div>
//             <Link
//               href={`/producer/projects/${projectId}/quotes/new`}
//               className="mt-4 inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
//             >
//               Crear primera cotización
//             </Link>
//           </div>
//         ) : (
//           <div className="grid gap-3">
//             {quotes.map((q) => (
//               <div
//                 key={q.id}
//                 className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
//               >
//                 <div className="min-w-0">
//                   <div className="font-bold text-slate-900 truncate">
//                     {q.client_name || "Cliente sin nombre"} {q.client_email ? `• ${q.client_email}` : ""}
//                   </div>
//                   <div className="text-xs text-slate-500 mt-1">
//                     Estado: {q.status} • Total: {q.currency} {q.total_amount}
//                     {q.valid_until ? ` • Válido hasta: ${q.valid_until}` : ""}
//                   </div>
//                 </div>

//                 <div className="flex gap-2 shrink-0">
//                   <Link className="rounded-xl px-3 py-2 text-sm border border-slate-300 bg-white" href={`/producer/quotes/${q.id}`}>
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
