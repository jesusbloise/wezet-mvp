"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type NdaRow = {
  id: string;
  project_id: string;
  creative_user_id: string | null;
  contact_id: string | null;
  participant_type: "creative" | "company";
  email: string;
  display_name: string | null;
  nda_title: string;
  status: "pending" | "accepted" | "rejected";
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
};

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

function statusLabel(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s === "pending") return "Pendiente";
  if (s === "accepted") return "Aceptado";
  if (s === "rejected") return "Rechazado";
  return status || "—";
}

export default function NdasPanel({
  projectId,
  onCountChange,
}: {
  projectId: string;
  onCountChange?: (n: number) => void;
}) {
  const [items, setItems] = useState<NdaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);

    try {
      const r = await api<{ ok: true; ndas: NdaRow[] }>(`/ndas/project/${projectId}`);
      const list = r.ndas || [];
      setItems(list);
      onCountChange?.(list.length);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    load();
  }, [projectId]);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d1320]">
      <div className="flex items-center justify-between gap-3 bg-[#111827] px-5 py-5 sm:px-6">
        <div>
          <div className="text-sm font-extrabold text-white">🔒 NDAs del proyecto</div>
          <div className="text-xs text-slate-500">
            Acuerdos de confidencialidad asociados a los participantes de este proyecto
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-300">
          {items.length} NDA{items.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="px-5 py-6 sm:px-6">
        {err ? (
          <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-slate-400">Cargando NDAs...</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[#f2c94c]">
              <span className="text-xl">🔒</span>
            </div>

            <div className="mt-4 text-sm font-semibold text-slate-300">
              No hay NDAs aún
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Los NDAs aparecerán automáticamente cuando agregues participantes al proyecto
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((nda) => (
              <div
                key={nda.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-white">
                    {nda.display_name || nda.email}
                  </div>

                  <div className="mt-1 truncate text-xs text-slate-500">{nda.email}</div>

                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span>
                      Tipo: {nda.participant_type === "creative" ? "Creativo" : "Empresa"}
                    </span>
                    <span>•</span>
                    <span>{nda.nda_title}</span>
                    <span>•</span>
                    <span>
                      Creado: {nda.created_at ? new Date(nda.created_at).toLocaleDateString() : "—"}
                    </span>
                    {nda.accepted_at ? (
                      <>
                        <span>•</span>
                        <span>
                          Aceptado: {new Date(nda.accepted_at).toLocaleDateString()}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={statusBadge(nda.status)}>{statusLabel(nda.status)}</span>
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

// import { useEffect, useState } from "react";
// import { api } from "@/lib/api";

// type NdaRow = {
//   id: string;
//   project_id: string;
//   creative_user_id: string | null;
//   contact_id: string | null;
//   participant_type: "creative" | "company";
//   email: string;
//   display_name: string | null;
//   nda_title: string;
//   status: "pending" | "accepted" | "rejected";
//   accepted_at: string | null;
//   rejected_at: string | null;
//   created_at: string;
//   updated_at: string;
// };

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

// function statusLabel(status?: string) {
//   const s = String(status || "").toLowerCase();
//   if (s === "pending") return "Pendiente";
//   if (s === "accepted") return "Aceptado";
//   if (s === "rejected") return "Rechazado";
//   return status || "—";
// }

// export default function NdasPanel({
//   projectId,
//   onCountChange,
// }: {
//   projectId: string;
//   onCountChange?: (n: number) => void;
// }) {
//   const [items, setItems] = useState<NdaRow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);

//   const load = async () => {
//     setLoading(true);
//     setErr(null);

//     try {
//       const r = await api<{ ok: true; ndas: NdaRow[] }>(`/ndas/project/${projectId}`);
//       const list = r.ndas || [];
//       setItems(list);
//       onCountChange?.(list.length);
//     } catch (e: any) {
//       setErr(String(e?.message || e));
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (!projectId) return;
//     load();
//   }, [projectId]);

//   return (
//     <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d1320]">
//       <div className="flex items-center justify-between gap-3 bg-[#111827] px-5 py-5 sm:px-6">
//         <div>
//           <div className="text-sm font-extrabold text-white">🔒 NDAs del proyecto</div>
//           <div className="text-xs text-slate-500">
//             Acuerdos de confidencialidad asociados a los participantes
//           </div>
//         </div>

//         <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-300">
//           {items.length} NDA{items.length === 1 ? "" : "s"}
//         </div>
//       </div>

//       <div className="px-5 py-6 sm:px-6">
//         {err ? (
//           <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
//             {err}
//           </div>
//         ) : null}

//         {loading ? (
//           <div className="text-sm text-slate-400">Cargando NDAs...</div>
//         ) : items.length === 0 ? (
//           <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
//             <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[#f2c94c]">
//               <span className="text-xl">🔒</span>
//             </div>

//             <div className="mt-4 text-sm font-semibold text-slate-300">
//               No hay NDAs aún
//             </div>

//             <div className="mt-1 text-xs text-slate-500">
//               Los NDAs aparecerán automáticamente cuando agregues talentos o empresas al proyecto
//             </div>
//           </div>
//         ) : (
//           <div className="grid gap-3">
//             {items.map((nda) => (
//               <div
//                 key={nda.id}
//                 className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between"
//               >
//                 <div className="min-w-0">
//                   <div className="truncate text-sm font-extrabold text-white">
//                     {nda.display_name || nda.email}
//                   </div>

//                   <div className="mt-1 truncate text-xs text-slate-500">{nda.email}</div>

//                   <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
//                     <span>
//                       Tipo: {nda.participant_type === "creative" ? "Creativo" : "Empresa"}
//                     </span>
//                     <span>•</span>
//                     <span>{nda.nda_title}</span>
//                     <span>•</span>
//                     <span>
//                       Creado: {nda.created_at ? new Date(nda.created_at).toLocaleDateString() : "—"}
//                     </span>
//                     {nda.accepted_at ? (
//                       <>
//                         <span>•</span>
//                         <span>
//                           Aceptado: {new Date(nda.accepted_at).toLocaleDateString()}
//                         </span>
//                       </>
//                     ) : null}
//                   </div>
//                 </div>

//                 <div className="flex items-center gap-3">
//                   <span className={statusBadge(nda.status)}>{statusLabel(nda.status)}</span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }