"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type CreativeRow = {
  creative_user_id: string;
  status: string;
  created_at: string;
  email: string;
  display_name: string | null;
};

type NegotiationRow = {
  id: string;
  status: string;
  created_at: string;
  creative_user_id: string;
  email: string;
  display_name: string | null;
};

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

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || "";

  const [project, setProject] = useState<any>(null);
  const [creatives, setCreatives] = useState<CreativeRow[]>([]);
  const [negotiations, setNegotiations] = useState<NegotiationRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const validId = useMemo(() => isUuid(id), [id]);

  const loadAll = async () => {
    setError(null);
    try {
      const p = await api<{ ok: true; project: any }>(`/projects/${id}`);
      setProject(p.project);

      const c = await api<{ ok: true; creatives: CreativeRow[] }>(`/projects/${id}/creatives`);
      setCreatives(c.creatives);

      const n = await api<{ ok: true; negotiations: NegotiationRow[] }>(`/negotiations/project/${id}`);
      setNegotiations(n.negotiations);

      const q = await api<{ ok: true; quotes: QuoteRow[] }>(`/projects/${id}/quotes`);
      setQuotes(q.quotes);
    } catch (e: any) {
      setError(String(e.message || e));
    }
  };

  useEffect(() => {
    if (!id) return;
    if (!validId) {
      setError("ID de proyecto inválido.");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, validId]);

  const invite = async () => {
    setInviteMsg(null);
    setInviteLoading(true);
    try {
      await api(`/projects/${id}/invite`, {
        method: "POST",
        body: JSON.stringify({ creativeEmail: inviteEmail }),
      });
      setInviteEmail("");
      setInviteMsg("✅ Invitación enviada y negociación creada.");
      await loadAll();
    } catch (e: any) {
      setInviteMsg(`❌ ${String(e.message || e)}`);
    } finally {
      setInviteLoading(false);
    }
  };

  if (!id) return <div className="p-6">Cargando...</div>;

  if (error) {
    return (
      <div className="p-6">
        <div className="text-rose-600 text-sm">{error}</div>
        <button className="mt-4 underline text-sm" onClick={() => router.push("/producer/projects")}>
          Volver a proyectos
        </button>
      </div>
    );
  }

  if (!project) return <div className="p-6">Cargando proyecto...</div>;

  return (
    <div className="max-w-[1000px]">
      <button className="text-sm underline text-slate-700" onClick={() => router.push("/producer/projects")}>
        Volver
      </button>

      {/* Proyecto */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-xl font-extrabold">{project.title}</div>
        <div className="text-sm text-slate-500 mt-1">{project.status}</div>
        {project.brief ? (
          <p className="mt-4 text-slate-700">{project.brief}</p>
        ) : (
          <p className="mt-4 text-slate-400">Sin brief.</p>
        )}
      </div>

      {/* Creativos */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-extrabold">👤 Creativos invitados</div>
            <div className="text-sm text-slate-500">Invita por email (debe existir como usuario creative).</div>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 text-sm outline-none"
            placeholder="creative@test.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button
            className="rounded-xl px-4 py-3 text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-sky-500 disabled:opacity-50"
            disabled={!inviteEmail || inviteLoading}
            onClick={invite}
          >
            {inviteLoading ? "Invitando..." : "Invitar"}
          </button>
        </div>

        {inviteMsg && <div className="mt-3 text-sm text-slate-700">{inviteMsg}</div>}

        <div className="mt-5 grid gap-3">
          {creatives.map((c) => (
            <div key={c.creative_user_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-bold text-slate-900">{c.display_name || c.email}</div>
              <div className="text-sm text-slate-600">{c.email}</div>
              <div className="text-xs text-slate-500 mt-2">Estado: {c.status}</div>
            </div>
          ))}

          {creatives.length === 0 && <div className="text-sm text-slate-500">Aún no has invitado creativos.</div>}
        </div>
      </div>

      {/* Negociaciones */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-lg font-extrabold">🤝 Negociaciones</div>
        <div className="text-sm text-slate-500">Una negociación por cada creativo invitado.</div>

        <div className="mt-5 grid gap-3">
          {negotiations.map((n) => (
            <div
              key={n.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start justify-between gap-4"
            >
              <div>
                <div className="font-bold text-slate-900">{n.display_name || n.email}</div>
                <div className="text-sm text-slate-600">{n.email}</div>
                <div className="text-xs text-slate-500 mt-2">Estado: {n.status}</div>
              </div>

              <button
                className="rounded-xl px-4 py-2 text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-sky-500"
                onClick={() => router.push(`/producer/negotiations/${n.id}`)}
              >
                Abrir
              </button>
            </div>
          ))}

          {negotiations.length === 0 && (
            <div className="text-sm text-slate-500">
              Aún no hay negociaciones. Cuando invites un creativo, se crea automáticamente.
            </div>
          )}
        </div>
      </div>

      {/* Cotizaciones */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-extrabold">💰 Cotizaciones</div>
            <div className="text-sm text-slate-500">
              Crea y comparte presupuestos con el cliente (sin mostrar negociación interna).
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-xl px-3 py-2 text-sm border border-slate-300"
              onClick={() => router.push(`/producer/projects/${id}/quotes`)}
            >
              Ver módulo
            </button>

            <button
              className="rounded-xl px-4 py-2 text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-sky-500"
              onClick={() => router.push(`/producer/projects/${id}/quotes/new`)}
            >
              Nueva cotización
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {quotes.map((q) => (
            <div
              key={q.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start justify-between gap-4"
            >
              <div>
                <div className="font-bold text-slate-900">
                  {q.client_name || "Cliente sin nombre"} {q.client_email ? `• ${q.client_email}` : ""}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Estado: {q.status} • Total: {q.currency} {q.total_amount}
                  {q.valid_until ? ` • Válido hasta: ${q.valid_until}` : ""}
                </div>

                {q.public_id ? (
                  <div className="text-xs text-slate-600 mt-2">
                    Link público:{" "}
                    <a className="underline" href={`/quote/${q.public_id}`} target="_blank">
                      /quote/{q.public_id}
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2">
                <button
                  className="rounded-xl px-3 py-2 text-sm border border-slate-300"
                  onClick={() => router.push(`/producer/quotes/${q.id}`)}
                >
                  Abrir
                </button>

                <button
                  className="rounded-xl px-3 py-2 text-sm font-bold text-white bg-slate-900"
                  onClick={async () => {
                    await api(`/quotes/${q.id}/publish`, { method: "POST" });
                    await loadAll();
                  }}
                >
                  Publicar
                </button>
              </div>
            </div>
          ))}

          {quotes.length === 0 && (
            <div className="text-sm text-slate-500">
              Aún no hay cotizaciones. Crea una para compartir con el cliente.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { api } from "@/lib/api";
// import { useParams, useRouter } from "next/navigation";

// function isUuid(v: string) {
//   return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
// }

// type CreativeRow = {
//   creative_user_id: string;
//   status: string;
//   created_at: string;
//   email: string;
//   display_name: string | null;
// };

// type NegotiationRow = {
//   id: string;
//   status: string;
//   created_at: string;
//   creative_user_id: string;
//   email: string;
//   display_name: string | null;
// };

// export default function ProjectDetailPage() {
//   const params = useParams<{ id: string }>();
//   const router = useRouter();
//   const id = params?.id || "";

//   const [project, setProject] = useState<any>(null);
//   const [creatives, setCreatives] = useState<CreativeRow[]>([]);
//   const [negotiations, setNegotiations] = useState<NegotiationRow[]>([]);
//   const [error, setError] = useState<string | null>(null);

//   const [inviteEmail, setInviteEmail] = useState("");
//   const [inviteLoading, setInviteLoading] = useState(false);
//   const [inviteMsg, setInviteMsg] = useState<string | null>(null);

//   const validId = useMemo(() => isUuid(id), [id]);

//   const loadAll = async () => {
//     setError(null);
//     try {
//       const p = await api<{ ok: true; project: any }>(`/projects/${id}`);
//       setProject(p.project);

//       const c = await api<{ ok: true; creatives: CreativeRow[] }>(`/projects/${id}/creatives`);
//       setCreatives(c.creatives);

//       const n = await api<{ ok: true; negotiations: NegotiationRow[] }>(`/negotiations/project/${id}`);
//       setNegotiations(n.negotiations);
//     } catch (e: any) {
//       setError(String(e.message || e));
//     }
//   };

//   useEffect(() => {
//     if (!id) return;
//     if (!validId) {
//       setError("ID de proyecto inválido.");
//       return;
//     }
//     loadAll();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [id, validId]);

//   const invite = async () => {
//     setInviteMsg(null);
//     setInviteLoading(true);
//     try {
//       await api(`/projects/${id}/invite`, {
//         method: "POST",
//         body: JSON.stringify({ creativeEmail: inviteEmail }),
//       });
//       setInviteEmail("");
//       setInviteMsg("✅ Invitación enviada y negociación creada.");
//       await loadAll();
//     } catch (e: any) {
//       setInviteMsg(`❌ ${String(e.message || e)}`);
//     } finally {
//       setInviteLoading(false);
//     }
//   };

//   if (!id) return <div className="p-6">Cargando...</div>;

//   if (error) {
//     return (
//       <div className="p-6">
//         <div className="text-rose-600 text-sm">{error}</div>
//         <button className="mt-4 underline text-sm" onClick={() => router.push("/producer/projects")}>
//           Volver a proyectos
//         </button>
//       </div>
//     );
//   }

//   if (!project) return <div className="p-6">Cargando proyecto...</div>;

//   return (
//     <div className="max-w-[1000px]">
//       <button className="text-sm underline text-slate-700" onClick={() => router.push("/producer/projects")}>
//         Volver
//       </button>

//       <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
//         <div className="text-xl font-extrabold">{project.title}</div>
//         <div className="text-sm text-slate-500 mt-1">{project.status}</div>
//         {project.brief ? (
//           <p className="mt-4 text-slate-700">{project.brief}</p>
//         ) : (
//           <p className="mt-4 text-slate-400">Sin brief.</p>
//         )}
//       </div>

//       {/* Creativos */}
//       <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
//         <div className="flex items-start justify-between gap-4">
//           <div>
//             <div className="text-lg font-extrabold">👤 Creativos invitados</div>
//             <div className="text-sm text-slate-500">Invita por email (debe existir como usuario creative).</div>
//           </div>
//         </div>

//         <div className="mt-4 flex flex-col sm:flex-row gap-2">
//           <input
//             className="flex-1 rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 text-sm outline-none"
//             placeholder="creative@test.com"
//             value={inviteEmail}
//             onChange={(e) => setInviteEmail(e.target.value)}
//           />
//           <button
//             className="rounded-xl px-4 py-3 text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-sky-500 disabled:opacity-50"
//             disabled={!inviteEmail || inviteLoading}
//             onClick={invite}
//           >
//             {inviteLoading ? "Invitando..." : "Invitar"}
//           </button>
//         </div>

//         {inviteMsg && <div className="mt-3 text-sm text-slate-700">{inviteMsg}</div>}

//         <div className="mt-5 grid gap-3">
//           {creatives.map((c) => (
//             <div key={c.creative_user_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
//               <div className="font-bold text-slate-900">{c.display_name || c.email}</div>
//               <div className="text-sm text-slate-600">{c.email}</div>
//               <div className="text-xs text-slate-500 mt-2">Estado: {c.status}</div>
//             </div>
//           ))}

//           {creatives.length === 0 && <div className="text-sm text-slate-500">Aún no has invitado creativos.</div>}
//         </div>
//       </div>

//       {/* Negociaciones */}
//       <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
//         <div className="text-lg font-extrabold">🤝 Negociaciones</div>
//         <div className="text-sm text-slate-500">Una negociación por cada creativo invitado.</div>

//         <div className="mt-5 grid gap-3">
//           {negotiations.map((n) => (
//             <div key={n.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start justify-between gap-4">
//               <div>
//                 <div className="font-bold text-slate-900">{n.display_name || n.email}</div>
//                 <div className="text-sm text-slate-600">{n.email}</div>
//                 <div className="text-xs text-slate-500 mt-2">Estado: {n.status}</div>
//               </div>

//               <button
//                 className="rounded-xl px-4 py-2 text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-sky-500"
//                 onClick={() => router.push(`/producer/negotiations/${n.id}`)}
//               >
//                 Abrir
//               </button>
//             </div>
//           ))}

//           {negotiations.length === 0 && (
//             <div className="text-sm text-slate-500">
//               Aún no hay negociaciones. Cuando invites un creativo, se crea automáticamente.
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }