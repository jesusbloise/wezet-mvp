"use client";

import { useParams } from "next/navigation";
import ProjectTabs from "@/components/projects/ProjectTabs";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";

  if (!id) return <div className="p-6 text-slate-500">Cargando...</div>;

  return (
    <div className="w-full">
      <div className="mx-auto max-w-[1100px]">
        <ProjectTabs projectId={id} mode="page" initialTab="general" showHeader />
      </div>
    </div>
  );
}

// "use client";

// import Link from "next/link";
// import { useEffect, useMemo, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { api } from "@/lib/api";

// function isUuid(v: string) {
//   return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
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

// type CreativeRow = {
//   creative_user_id: string;
//   status: string;
//   created_at: string;
//   email: string;
//   display_name: string | null;
//   negotiation_id: string | null;
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

// function badgeForCreativeStatus(status?: string) {
//   const s = String(status || "").toLowerCase();
//   const base = "inline-flex items-center rounded-xl px-3 py-1 text-[11px] font-bold border";
//   if (s === "invited") return `${base} bg-amber-50 text-amber-700 border-amber-200/60`;
//   if (s === "accepted") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200/60`;
//   if (s === "rejected") return `${base} bg-rose-50 text-rose-700 border-rose-200/60`;
//   return `${base} bg-slate-100 text-slate-700 border-slate-200`;
// }

// function labelForCreativeStatus(status?: string) {
//   const s = String(status || "").toLowerCase();
//   if (s === "invited") return "Invitado";
//   if (s === "accepted") return "Aceptado";
//   if (s === "rejected") return "Rechazado";
//   return status || "—";
// }

// /* ===== iconitos mínimos ===== */
// function FolderIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
//     </svg>
//   );
// }
// function BackIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M15 18l-6-6 6-6" />
//     </svg>
//   );
// }
// function XIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M6 6l12 12" />
//       <path d="M18 6L6 18" />
//     </svg>
//   );
// }
// function UserIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
//       <path d="M4 21a8 8 0 0 1 16 0" />
//     </svg>
//   );
// }

// type TabKey = "general" | "quotes" | "talents" | "ndas";

// export default function ProjectDetailPage() {
//   const params = useParams<{ id: string }>();
//   const router = useRouter();
//   const id = params?.id || "";
//   const validId = useMemo(() => isUuid(id), [id]);

//   const [tab, setTab] = useState<TabKey>("general");
//   const [project, setProject] = useState<Project | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);

//   const [talentsCount, setTalentsCount] = useState(0);

//   // ✅ setTab + actualiza URL (sin recargar)
//   const setTabAndUrl = (next: TabKey) => {
//     setTab(next);
//     router.replace(`/producer/projects/${id}?tab=${next}`);
//   };

//   // ✅ Lee ?tab= al entrar (si viene desde la lista)
//   useEffect(() => {
//     if (!validId) return;
//     if (typeof window === "undefined") return;
//     const sp = new URLSearchParams(window.location.search);
//     const t = sp.get("tab");
//     if (t === "general" || t === "quotes" || t === "talents" || t === "ndas") {
//       setTab(t);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [validId]);

//   const load = async () => {
//     setLoading(true);
//     setErr(null);
//     try {
//       const r = await api<{ ok: true; project: Project }>(`/projects/${id}`);
//       setProject(r.project);
//     } catch (e: any) {
//       setErr(String(e?.message || e));
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (!validId) return;
//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [validId, id]);

//   if (!validId) return <div className="p-6 text-rose-600">Proyecto inválido.</div>;

//   if (loading) {
//     return (
//       <div className="mx-auto max-w-[1100px] rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
//         Cargando...
//       </div>
//     );
//   }

//   if (err) {
//     return (
//       <div className="mx-auto max-w-[1100px] rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
//         {err}
//       </div>
//     );
//   }

//   if (!project) return null;

//   const st = normalizeStatus(project.status);
//   const pill = statusPill(st);
//   const created = project.created_at ? new Date(project.created_at).toLocaleDateString() : "—";

//   // ✅ returnTo para que el modal vuelva exactamente al tab quotes
//   const returnToQuotes = encodeURIComponent(`/producer/projects/${project.id}?tab=quotes`);

//   return (
//     <div className="w-full">
//       <div className="mx-auto max-w-[1100px]">
//         <button
//           type="button"
//           onClick={() => router.push("/producer/projects")}
//           className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
//         >
//           <BackIcon />
//           Volver
//         </button>

//         <div className="mt-4 rounded-3xl border border-slate-200 bg-white overflow-hidden">
//           <div className="px-5 sm:px-6 py-5 bg-[#f6f9fc] flex items-start justify-between gap-4">
//             <div className="flex items-start gap-4 min-w-0">
//               <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center">
//                 <FolderIcon />
//               </div>

//               <div className="min-w-0">
//                 <div className="text-xl sm:text-2xl font-black text-slate-900 truncate">{project.title}</div>
//                 <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
//                   <span className={pill.cls}>
//                     <span className="h-2 w-2 rounded-full bg-current opacity-70" />
//                     {pill.label}
//                   </span>
//                   {project.currency ? <span className="text-slate-300">•</span> : null}
//                   {project.currency ? <span className="font-semibold text-slate-600">{project.currency}</span> : null}
//                   <span className="text-slate-300">•</span>
//                   <span>{created}</span>
//                 </div>
//               </div>
//             </div>

//             <Link
//               href={`/producer/projects/${project.id}/quotes/new?returnTo=${returnToQuotes}`}
//               className="shrink-0 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-sm hover:opacity-95 active:opacity-90"
//               style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
//             >
//               Nueva cotización
//             </Link>
//           </div>

//           <div className="px-5 sm:px-6 py-4 border-t border-slate-200">
//             <div className="flex gap-2 overflow-x-auto">
//               <TabButton label="General" active={tab === "general"} onClick={() => setTabAndUrl("general")} />
//               <TabButton label="Cotizaciones" active={tab === "quotes"} onClick={() => setTabAndUrl("quotes")} />
//               <TabButton label="Talentos" active={tab === "talents"} onClick={() => setTabAndUrl("talents")} />
//               <TabButton label="NDAs" active={tab === "ndas"} onClick={() => setTabAndUrl("ndas")} />
//             </div>
//           </div>
//         </div>

//         {tab === "general" ? (
//           <div className="mt-4 rounded-3xl border border-slate-200 bg-white px-5 sm:px-6 py-6">
//             <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Acciones rápidas</div>

//             <div className="mt-3 flex flex-wrap gap-2">
//               <Link
//                 href={`/producer/projects/${project.id}?tab=quotes`}
//                 className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
//                 style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}
//               >
//                 Cotización
//               </Link>

//               <Link
//                 href={`/producer/negotiations`}
//                 className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
//                 style={{ background: "linear-gradient(135deg,#3b82f6,#60a5fa)" }}
//               >
//                 Acuerdo
//               </Link>

//               <button
//                 type="button"
//                 className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
//                 style={{ background: "linear-gradient(135deg,#a855f7,#6366f1)" }}
//               >
//                 NDA
//               </button>
//             </div>

//             <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
//               <MiniCountCard label="Cotizaciones" value={0} tone="green" />
//               <MiniCountCard label="Talentos" value={talentsCount} tone="blue" />
//               <MiniCountCard label="NDAs" value={0} tone="violet" />
//             </div>

//             <div className="mt-6">
//               <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Descripción</div>
//               <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 whitespace-pre-wrap">
//                 {project.brief || "Sin descripción."}
//               </div>
//             </div>

//             <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
//               <div className="text-xs text-slate-500">Creado: {created}</div>

//               <div className="flex gap-2 flex-wrap">
//                 <button type="button" className="rounded-xl px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700">
//                   Editar
//                 </button>
//                 <button type="button" className="rounded-xl px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700">
//                   Duplicar
//                 </button>
//                 <button type="button" className="rounded-xl px-4 py-2 text-xs font-bold bg-rose-50 text-rose-700">
//                   Eliminar
//                 </button>
//               </div>
//             </div>
//           </div>
//         ) : tab === "quotes" ? (
//           <div className="mt-4">
//             <QuotesTabMvp projectId={project.id} />
//           </div>
//         ) : tab === "talents" ? (
//           <div className="mt-4">
//             <TalentsTab projectId={project.id} onCountChange={(n) => setTalentsCount(n)} />
//           </div>
//         ) : (
//           <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
//             Sección "NDAs" pendiente de conectar.
//           </div>
//         )}
//       </div>
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

// /* ===== Quotes Tab (MVP look) ===== */
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

// function QuotesTabMvp({ projectId }: { projectId: string }) {
//   const [quotes, setQuotes] = useState<QuoteRow[]>([]);
//   const [error, setError] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);

//   const load = async () => {
//     setError(null);
//     setLoading(true);
//     try {
//       const r = await api<{ ok: true; quotes: QuoteRow[] }>(`/projects/${projectId}/quotes`);
//       setQuotes(r.quotes || []);
//     } catch (e: any) {
//       setError(String(e?.message || e));
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
//       <div className="px-5 sm:px-6 py-5 bg-[#f6f9fc] flex items-center justify-between gap-3">
//         <div>
//           <div className="text-sm font-extrabold text-slate-900">Historial de cotizaciones</div>
//           <div className="text-xs text-slate-500">Cotizaciones asociadas a este proyecto</div>
//         </div>

//         <Link
//           href={`/producer/projects/${projectId}/quotes/new?returnTo=${encodeURIComponent(
//             `/producer/projects/${projectId}?tab=quotes`
//           )}`}
//           className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
//           style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}
//         >
//           + Nueva
//         </Link>
//       </div>

//       <div className="px-5 sm:px-6 py-6">
//         {error ? (
//           <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
//             {error}
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
//               href={`/producer/projects/${projectId}/quotes/new?returnTo=${encodeURIComponent(
//                 `/producer/projects/${projectId}?tab=quotes`
//               )}`}
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

//                   {q.public_id ? (
//                     <div className="text-xs text-slate-600 mt-2">
//                       Público:{" "}
//                       <a className="underline" href={`/quote/${q.public_id}`} target="_blank">
//                         /quote/{q.public_id}
//                       </a>
//                     </div>
//                   ) : null}
//                 </div>

//                 <div className="flex gap-2 shrink-0">
//                   <Link
//                     className="rounded-xl px-3 py-2 text-sm border border-slate-300 bg-white"
//                     href={`/producer/quotes/${q.id}`}
//                   >
//                     Abrir
//                   </Link>

//                   <button
//                     className="rounded-xl px-3 py-2 text-sm font-bold text-white bg-slate-900"
//                     onClick={async () => {
//                       await api(`/quotes/${q.id}/publish`, { method: "POST" });
//                       await load();
//                     }}
//                     type="button"
//                   >
//                     Publicar
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// /* ===== Talentos Tab (conectado) ===== */
// function TalentsTab({
//   projectId,
//   onCountChange,
// }: {
//   projectId: string;
//   onCountChange: (n: number) => void;
// }) {
//   const [items, setItems] = useState<CreativeRow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);

//   const [inviteOpen, setInviteOpen] = useState(false);
//   const [inviteEmail, setInviteEmail] = useState("");
//   const [inviting, setInviting] = useState(false);
//   const [inviteErr, setInviteErr] = useState<string | null>(null);

//   const load = async () => {
//     setLoading(true);
//     setErr(null);
//     try {
//       const r = await api<{ ok: true; creatives: CreativeRow[] }>(`/projects/${projectId}/creatives`);
//       setItems(r.creatives || []);
//       onCountChange((r.creatives || []).length);
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

//   const invite = async () => {
//     const email = inviteEmail.trim();
//     if (!email) return;

//     setInviting(true);
//     setInviteErr(null);
//     try {
//       await api(`/projects/${projectId}/invite`, {
//         method: "POST",
//         body: JSON.stringify({ creativeEmail: email }),
//       });
//       setInviteEmail("");
//       setInviteOpen(false);
//       await load();
//     } catch (e: any) {
//       setInviteErr(String(e?.message || e));
//     } finally {
//       setInviting(false);
//     }
//   };

//   return (
//     <>
//       <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
//         <div className="px-5 sm:px-6 py-5 bg-[#f6f9fc] flex items-center justify-between gap-3">
//           <div>
//             <div className="text-sm font-extrabold text-slate-900">Talentos</div>
//             <div className="text-xs text-slate-500">Invita y administra talentos del proyecto</div>
//           </div>

//           <button
//             type="button"
//             onClick={() => setInviteOpen(true)}
//             className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
//             style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
//           >
//             Invitar talento
//           </button>
//         </div>

//         <div className="px-5 sm:px-6 py-6">
//           {err ? (
//             <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
//               {err}
//             </div>
//           ) : null}

//           {loading ? (
//             <div className="text-sm text-slate-500">Cargando...</div>
//           ) : items.length === 0 ? (
//             <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
//               Aún no hay talentos invitados.
//             </div>
//           ) : (
//             <div className="grid gap-3">
//               {items.map((c) => (
//                 <div
//                   key={c.creative_user_id}
//                   className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
//                 >
//                   <div className="flex items-start gap-3 min-w-0">
//                     <div className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
//                       <UserIcon />
//                     </div>

//                     <div className="min-w-0">
//                       <div className="text-sm font-extrabold text-slate-900 truncate">
//                         {c.display_name || c.email}
//                       </div>
//                       <div className="mt-1 text-xs text-slate-500 truncate">{c.email}</div>
//                       <div className="mt-2 text-xs text-slate-400">
//                         Invitado: {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
//                       </div>
//                     </div>
//                   </div>

//                   <div className="flex items-center justify-between sm:justify-end gap-3">
//                     <span className={badgeForCreativeStatus(c.status)}>{labelForCreativeStatus(c.status)}</span>

//                     {c.negotiation_id ? (
//                       <Link
//                         href={`/producer/negotiations/${c.negotiation_id}`}
//                         className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
//                       >
//                         Ver negociación
//                       </Link>
//                     ) : (
//                       <span className="text-xs text-slate-400">Sin negociación</span>
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>

//       {inviteOpen ? (
//         <div className="fixed inset-0 z-50">
//           <button
//             type="button"
//             className="absolute inset-0 bg-black/55"
//             aria-label="Cerrar"
//             onClick={() => setInviteOpen(false)}
//           />
//           <div className="absolute inset-0 flex items-center justify-center p-4">
//             <div className="w-full max-w-[520px] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
//               <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-3">
//                 <div className="text-lg font-black text-slate-900">Invitar talento</div>
//                 <button
//                   type="button"
//                   className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
//                   onClick={() => setInviteOpen(false)}
//                   aria-label="Cerrar modal"
//                 >
//                   <XIcon />
//                 </button>
//               </div>

//               <div className="px-6 py-6">
//                 {inviteErr ? (
//                   <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
//                     {inviteErr}
//                   </div>
//                 ) : null}

//                 <div className="text-xs font-bold text-slate-600">Email del talento</div>
//                 <input
//                   value={inviteEmail}
//                   onChange={(e) => setInviteEmail(e.target.value)}
//                   placeholder="talento@email.com"
//                   className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none
//                              focus:bg-white focus:ring-2 focus:ring-blue-200"
//                 />

//                 <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:justify-end">
//                   <button
//                     type="button"
//                     onClick={() => setInviteOpen(false)}
//                     className="w-full sm:w-auto rounded-2xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
//                     disabled={inviting}
//                   >
//                     Cancelar
//                   </button>

//                   <button
//                     type="button"
//                     onClick={invite}
//                     disabled={inviting || !inviteEmail.trim()}
//                     className="w-full sm:w-auto rounded-2xl px-6 py-3 text-sm font-black text-white disabled:opacity-60"
//                     style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
//                   >
//                     {inviting ? "Enviando..." : "Enviar invitación"}
//                   </button>
//                 </div>

//                 <div className="mt-3 text-xs text-slate-400">
//                   Se creará automáticamente una negociación para este talento en el proyecto.
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       ) : null}
//     </>
//   );
// }
