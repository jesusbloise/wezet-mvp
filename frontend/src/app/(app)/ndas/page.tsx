"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type MyNdaRow = {
  id: string;
  project_id: string;
  creative_user_id: string | null;
  contact_id: string | null;
  participant_type: "creative" | "company";
  email: string;
  display_name: string | null;
  nda_title: string;
  nda_body: string;
  status: "pending" | "accepted" | "rejected";
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
  project_title: string;
};

function statusBadge(status?: string) {
  const s = String(status || "").toLowerCase();
  const base =
    "inline-flex items-center rounded-xl border px-3 py-1 text-[11px] font-bold";

  if (s === "pending") return `${base} border-amber-500/20 bg-amber-500/10 text-amber-300`;
  if (s === "accepted") return `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-300`;
  if (s === "rejected") return `${base} border-rose-500/20 bg-rose-500/10 text-rose-300`;

  return `${base} border-white/10 bg-white/[0.04] text-slate-300`;
}

function typeLabel(type?: string) {
  return type === "company" ? "Empresa" : "Creativo";
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export default function MyNdasPage() {
  const [items, setItems] = useState<MyNdaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<MyNdaRow | null>(null);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api<{ ok: true; ndas: MyNdaRow[] }>("/ndas/me/list");
      const list = r.ndas || [];
      setItems(list);

      if (selected) {
        const found = list.find((x) => x.id === selected.id) || null;
        setSelected(found);
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
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected]);

  const acceptNda = async (id: string) => {
    setActing(true);
    try {
      await api(`/ndas/me/${id}/accept`, { method: "POST" });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setActing(false);
    }
  };

  const rejectNda = async (id: string) => {
    setActing(true);
    try {
      await api(`/ndas/me/${id}/reject`, { method: "POST" });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setActing(false);
    }
  };

  return (
    <>
      <div className="w-full">
        <div className="min-h-[calc(100vh-56px)] rounded-3xl bg-[#070b14] p-4 sm:p-6 md:p-7">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-6">
              <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
                confidentiality
              </div>
              <h1 className="mt-2 text-[22px] font-black text-white sm:text-[28px]">
                Mis NDAs
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Revisa y acepta los acuerdos de confidencialidad asociados a los proyectos donde participas.
              </p>
            </div>

            {err ? (
              <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {err}
              </div>
            ) : null}

            <div className="rounded-3xl border border-white/8 bg-[#0d1320]">
              <div className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-5 sm:px-6">
                <div>
                  <div className="text-sm font-extrabold text-white">🔒 NDAs disponibles</div>
                  <div className="text-xs text-slate-500">
                    Selecciona uno para revisar el detalle y responder
                  </div>
                </div>

                <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-300">
                  {items.length} NDA{items.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="px-5 py-6 sm:px-6">
                {loading ? (
                  <div className="text-sm text-slate-400">Cargando NDAs...</div>
                ) : items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[#f2c94c]">
                      <span className="text-xl">🔒</span>
                    </div>

                    <div className="mt-4 text-sm font-semibold text-slate-300">
                      No tienes NDAs pendientes
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Cuando te inviten a proyectos aparecerán aquí
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((nda) => (
                      <button
                        key={nda.id}
                        type="button"
                        onClick={() => setSelected(nda)}
                        className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-left transition hover:border-[#f2c94c]/20 hover:bg-white/[0.05]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-white">
                              {nda.project_title}
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-500">
                              {nda.display_name || nda.email}
                            </div>
                          </div>

                          <span className={statusBadge(nda.status)}>{nda.status}</span>
                        </div>

                        <div className="mt-4 space-y-2 text-xs text-slate-400">
                          <div>
                            <span className="text-slate-500">Tipo:</span>{" "}
                            {typeLabel(nda.participant_type)}
                          </div>
                          <div>
                            <span className="text-slate-500">Correo:</span> {nda.email}
                          </div>
                          <div>
                            <span className="text-slate-500">Creado:</span>{" "}
                            {new Date(nda.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="mt-4 text-xs font-bold text-[#f2c94c]">
                          Ver NDA →
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/75"
            aria-label="Cerrar modal"
            onClick={() => setSelected(null)}
          />

          <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
            <div className="flex max-h-[94vh] w-full max-w-[760px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0d1320] shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-white/8 px-4 py-4 sm:px-5 sm:py-5">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[#0b0f17]"
                      style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                    >
                      <span className="text-base">🔒</span>
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-base font-black text-white sm:text-lg">
                        {selected.nda_title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Proyecto: {selected.project_title}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={statusBadge(selected.status)}>{selected.status}</span>
                    <span className="truncate text-xs text-slate-500">
                      {selected.email}
                    </span>
                    <span className="text-xs text-slate-600">•</span>
                    <span className="text-xs text-slate-500">
                      {typeLabel(selected.participant_type)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="shrink-0 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-slate-300 hover:bg-white/[0.08]"
                  onClick={() => setSelected(null)}
                  aria-label="Cerrar"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                <div className="whitespace-pre-wrap rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300 sm:p-5 sm:leading-7">
                  {selected.nda_body}
                </div>
              </div>

              <div className="border-t border-white/8 px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500 sm:max-w-[55%]">
                    Al aceptar este NDA podrás continuar con tu participación dentro del proyecto.
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                    {selected.status !== "rejected" ? (
                      <button
                        type="button"
                        onClick={() => rejectNda(selected.id)}
                        disabled={acting}
                        className="w-full rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-3 text-sm font-bold text-rose-300 disabled:opacity-60 sm:w-auto"
                      >
                        {acting ? "Procesando..." : "Rechazar"}
                      </button>
                    ) : null}

                    {selected.status !== "accepted" ? (
                      <button
                        type="button"
                        onClick={() => acceptNda(selected.id)}
                        disabled={acting}
                        className="w-full rounded-2xl px-5 py-3 text-sm font-black text-[#0b0f17] disabled:opacity-60 sm:w-auto"
                        style={{ background: "linear-gradient(135deg,#10b981,#34d399)" }}
                      >
                        {acting ? "Procesando..." : "Aceptar NDA"}
                      </button>
                    ) : (
                      <Link
                        href="/projects"
                        className="w-full rounded-2xl px-5 py-3 text-center text-sm font-black text-[#0b0f17] sm:w-auto"
                        style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                      >
                        Ir a proyectos
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}