"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type CreativeRow = {
  creative_user_id: string;
  status: string;
  created_at: string;
  email: string;
  display_name: string | null;
  negotiation_id: string | null;
};

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function XIcon() {
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

function badgeForCreativeStatus(status?: string) {
  const s = String(status || "").toLowerCase();
  const base =
    "inline-flex items-center rounded-xl px-3 py-1 text-[11px] font-bold border";

  if (s === "invited") return `${base} bg-amber-50 text-amber-700 border-amber-200/60`;
  if (s === "accepted") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200/60`;
  if (s === "rejected") return `${base} bg-rose-50 text-rose-700 border-rose-200/60`;

  return `${base} bg-slate-100 text-slate-700 border-slate-200`;
}

function labelForCreativeStatus(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s === "invited") return "Invitado";
  if (s === "accepted") return "Aceptado";
  if (s === "rejected") return "Rechazado";
  return status || "—";
}

export default function TalentsPanel({
  projectId,
  title = "Participantes del proyecto",
  description = "Agrega creativos para colaborar",
  buttonLabel = "+ Agregar",
  onCountChange,
}: {
  projectId: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
  onCountChange?: (n: number) => void;
}) {
  const [items, setItems] = useState<CreativeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteErr, setInviteErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api<{ ok: true; creatives: CreativeRow[] }>(
        `/projects/${projectId}/creatives`
      );
      const list = r.creatives || [];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const invite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;

    setInviting(true);
    setInviteErr(null);
    try {
      await api(`/projects/${projectId}/invite`, {
        method: "POST",
        body: JSON.stringify({ creativeEmail: email }),
      });
      setInviteEmail("");
      setInviteOpen(false);
      await load();
    } catch (e: any) {
      setInviteErr(String(e?.message || e));
    } finally {
      setInviting(false);
    }
  };

  return (
    <>
      {/* Panel estilo MVP */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 sm:px-6 py-5 bg-[#f6f9fc] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-slate-900">👥 {title}</div>
            <div className="text-xs text-slate-500">{description}</div>
          </div>

          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="shrink-0 rounded-2xl px-4 py-2 text-xs sm:text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
          >
            {buttonLabel}
          </button>
        </div>

        <div className="px-5 sm:px-6 py-6">
          {err ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          ) : null}

          {loading ? (
            <div className="text-sm text-slate-500">Cargando...</div>
          ) : items.length === 0 ? (
            /* Empty state MVP */
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                <span className="text-xl">👥</span>
              </div>
              <div className="mt-4 text-sm font-semibold text-slate-700">
                No hay participantes aún
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Agrega creativos o empresas para colaborar
              </div>

              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="mt-4 inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
              >
                + Agregar primer participante
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((c) => (
                <div
                  key={c.creative_user_id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <UserIcon />
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 truncate">
                        {c.display_name || c.email}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 truncate">
                        {c.email}
                      </div>
                      <div className="mt-2 text-xs text-slate-400">
                        Invitado:{" "}
                        {c.created_at
                          ? new Date(c.created_at).toLocaleDateString()
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className={badgeForCreativeStatus(c.status)}>
                      {labelForCreativeStatus(c.status)}
                    </span>

                    {c.negotiation_id ? (
                      <Link
                        href={`/producer/negotiations/${c.negotiation_id}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                      >
                        Ver negociación
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">Sin negociación</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal invitar (MVP simple) */}
      {inviteOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Cerrar"
            onClick={() => setInviteOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-[520px] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-slate-900">
                    Agregar participante
                  </div>
                  <div className="text-xs text-slate-500">
                    Ingresa el email del creativo
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                  onClick={() => setInviteOpen(false)}
                  aria-label="Cerrar modal"
                >
                  <XIcon />
                </button>
              </div>

              <div className="px-6 py-6">
                {inviteErr ? (
                  <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {inviteErr}
                  </div>
                ) : null}

                <div className="text-xs font-bold text-slate-600">Email</div>
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="creativo@email.com"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none
                             focus:bg-white focus:ring-2 focus:ring-blue-200"
                />

                <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setInviteOpen(false)}
                    className="w-full sm:w-auto rounded-2xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                    disabled={inviting}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={invite}
                    disabled={inviting || !inviteEmail.trim()}
                    className="w-full sm:w-auto rounded-2xl px-6 py-3 text-sm font-black text-white disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
                  >
                    {inviting ? "Agregando..." : "Agregar"}
                  </button>
                </div>

                <div className="mt-3 text-xs text-slate-400">
                  Se creará automáticamente una negociación para este talento.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}