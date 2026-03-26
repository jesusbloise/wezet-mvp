"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";

type SharedProject = {
  id: string;
  title: string;
  status: string | null;
  currency?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  access_type: "owner" | "participant" | "nda_only";
  nda_status: "pending" | "accepted" | "rejected";
};

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

function statusBadge(status?: string) {
  const s = String(status || "").toLowerCase();
  const base =
    "inline-flex items-center rounded-xl border px-3 py-1 text-[11px] font-bold";

  if (s === "pending") {
    return `${base} border-amber-500/20 bg-amber-500/10 text-amber-300`;
  }
  if (s === "accepted") {
    return `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-300`;
  }
  if (s === "rejected") {
    return `${base} border-rose-500/20 bg-rose-500/10 text-rose-300`;
  }

  return `${base} border-white/10 bg-white/[0.04] text-slate-300`;
}

function accessLabel(accessType?: string) {
  if (accessType === "owner") return "Propio";
  if (accessType === "participant") return "Participante";
  if (accessType === "nda_only") return "Pendiente de acceso";
  return "Proyecto";
}

function projectHref(project: SharedProject) {
  if (project.access_type === "owner") {
    return `/producer/projects/${project.id}`;
  }
  return `/projects/${project.id}`;
}

export default function ProjectsPage() {
  const { user, loading } = useAuth();

  const [projects, setProjects] = useState<SharedProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const load = async () => {
      setProjectsLoading(true);
      setErr(null);
      try {
        const r = await api<{ ok: true; projects: SharedProject[] }>("/projects/shared");
        setProjects(r.projects || []);
      } catch (e: any) {
        setErr(String(e?.message || e));
      } finally {
        setProjectsLoading(false);
      }
    };

    load();
  }, [loading, user]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/8 bg-[#0d1320] p-6 text-sm text-slate-400">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
        Debes iniciar sesión.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="min-h-[calc(100vh-56px)] rounded-3xl bg-[#070b14] p-4 sm:p-6 md:p-7">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
                collaborative workspace
              </div>

              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[#f2c94c] shadow-sm">
                  <FolderIcon />
                </span>
                <h1 className="text-[22px] font-black text-white sm:text-[28px]">
                  Proyectos
                </h1>
              </div>

              <p className="mt-2 text-sm text-slate-400">
                Aquí verás tus proyectos propios y también los proyectos compartidos contigo.
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

          {err ? (
            <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {err}
            </div>
          ) : null}

          {projectsLoading ? (
            <div className="rounded-2xl border border-white/8 bg-[#0d1320] p-6 text-sm text-slate-400">
              Cargando proyectos...
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-3xl border border-white/8 bg-[#0d1320] p-10 text-center shadow-sm">
              <div className="mb-3 text-5xl">📁</div>
              <div className="text-lg font-bold text-white">
                No tienes proyectos aún
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Crea tu primer proyecto o espera una invitación para colaborar en uno.
              </div>

              <Link
                href="/producer/projects/new"
                className="mt-6 inline-flex rounded-2xl px-6 py-3 text-sm font-bold text-[#0b0f17] shadow-sm"
                style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
              >
                + Crear mi primer proyecto
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map((p) => {
                const created = p.created_at
                  ? new Date(p.created_at).toLocaleDateString()
                  : "—";

                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-white/8 bg-[#0d1320] p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-lg font-extrabold text-white">
                          {p.title}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-slate-300">
                            {accessLabel(p.access_type)}
                          </span>
                          <span className="text-slate-700">•</span>
                          <span>{created}</span>
                          <span className="text-slate-700">•</span>
                          <span>{p.currency || "CLP"}</span>
                          {p.status ? (
                            <>
                              <span className="text-slate-700">•</span>
                              <span>{p.status}</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className={statusBadge(p.nda_status)}>
                          NDA: {p.nda_status}
                        </span>

                        {p.access_type === "owner" || p.nda_status === "accepted" ? (
                          <Link
                            href={projectHref(p)}
                            className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
                            style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                          >
                            Ver proyecto
                          </Link>
                        ) : (
                          <span className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2 text-sm font-bold text-slate-300">
                            Pendiente de NDA
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}3


// "use client";

// import { useAuth } from "@/context/AuthContext";
// import ProducerProjectsPage from "@/app/(app)/producer/projects/page";
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
//   if (accessType === "owner") return "Propio";
//   if (accessType === "participant") return "Participante";
//   if (accessType === "nda_only") return "Pendiente de acceso";
//   return "Proyecto";
// }

// export default function ProjectsPage() {
//   const { user, loading } = useAuth();

//   const [projects, setProjects] = useState<SharedProject[]>([]);
//   const [projectsLoading, setProjectsLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);

//   const isProducer = useMemo(() => {
//     return user?.role === "producer_owner" || user?.role === "producer";
//   }, [user?.role]);

//   useEffect(() => {
//     if (loading) return;
//     if (!user) return;
//     if (isProducer) return;

//     const load = async () => {
//       setProjectsLoading(true);
//       setErr(null);
//       try {
//         const r = await api<{ ok: true; projects: SharedProject[] }>("/projects/shared");
//         setProjects(r.projects || []);
//       } catch (e: any) {
//         setErr(String(e?.message || e));
//       } finally {
//         setProjectsLoading(false);
//       }
//     };

//     load();
//   }, [loading, user, isProducer]);

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

//   if (isProducer) {
//     return <ProducerProjectsPage />;
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
//                 <h1 className="text-[22px] font-black text-white sm:text-[28px]">
//                   Proyectos compartidos
//                 </h1>
//               </div>

//               <p className="mt-2 text-sm text-slate-400">
//                 Aquí verás los proyectos donde participas o tienes NDA pendiente.
//               </p>
//             </div>
//           </div>

//           {err ? (
//             <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
//               {err}
//             </div>
//           ) : null}

//           {projectsLoading ? (
//             <div className="rounded-2xl border border-white/8 bg-[#0d1320] p-6 text-sm text-slate-400">
//               Cargando proyectos compartidos...
//             </div>
//           ) : projects.length === 0 ? (
//             <div className="rounded-3xl border border-white/8 bg-[#0d1320] p-10 text-center shadow-sm">
//               <div className="mb-3 text-5xl">📁</div>
//               <div className="text-lg font-bold text-white">
//                 No tienes proyectos compartidos aún
//               </div>
//               <div className="mt-2 text-sm text-slate-500">
//                 Cuando alguien te invite a un proyecto y te asocie un NDA, aparecerá aquí.
//               </div>
//             </div>
//           ) : (
//             <div className="grid gap-4">
//               {projects.map((p) => {
//                 const created = p.created_at
//                   ? new Date(p.created_at).toLocaleDateString()
//                   : "—";

//                 return (
//                   <div
//                     key={p.id}
//                     className="rounded-2xl border border-white/8 bg-[#0d1320] p-5 shadow-sm"
//                   >
//                     <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//                       <div className="min-w-0">
//                         <div className="truncate text-lg font-extrabold text-white">
//                           {p.title}
//                         </div>

//                         <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
//                           <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-slate-300">
//                             {accessLabel(p.access_type)}
//                           </span>
//                           <span className="text-slate-700">•</span>
//                           <span>{created}</span>
//                           <span className="text-slate-700">•</span>
//                           <span>{p.currency || "CLP"}</span>
//                           {p.status ? (
//                             <>
//                               <span className="text-slate-700">•</span>
//                               <span>{p.status}</span>
//                             </>
//                           ) : null}
//                         </div>
//                       </div>

//                       <div className="flex flex-wrap items-center gap-2">
//                         <span className={statusBadge(p.nda_status)}>
//                           NDA: {p.nda_status}
//                         </span>

//                         {p.nda_status === "accepted" ? (
//                              <Link
//     href={`/projects/${p.id}`}
//     className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
//     style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//   >
//     Ver proyecto
//   </Link>
//                         //   <span className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17] bg-[#f2c94c]">
//                         //     Acceso habilitado
//                         //   </span>
//                         ) : (
//                           <span className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2 text-sm font-bold text-slate-300">
//                             Pendiente de NDA
//                           </span>
//                         )}
//                       </div>
//                     </div>
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