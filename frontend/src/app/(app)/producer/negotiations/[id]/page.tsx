"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type Message = {
  id: string;
  body: string;
  created_at: string;
  sender_user_id: string;
  email: string;
};

type Offer = {
  id: string;
  amount: string | number;
  currency: string;
  note: string | null;
  payment_date?: string | null;
  payment_method?: string | null;
  status?: "proposed" | "accepted" | "rejected" | "withdrawn" | string | null;
  created_at: string;
  created_by_user_id: string;
  email: string;
};

type NegotiationMeta = {
  ok?: true;
  negotiation?: {
    id: string;
    status: string;
    project_id?: string;
    creative_user_id?: string;
    created_at?: string;
    project_title?: string | null;
    project_status?: string | null;
    project_currency?: string | null;
    project_start_date?: string | null;
    project_due_date?: string | null;
  };
  creative?: {
    id?: string;
    email?: string;
    display_name?: string | null;
  } | null;
  counterpart?: {
    id?: string;
    email?: string;
    display_name?: string | null;
  } | null;
  me?: {
    id?: string;
    email?: string;
    display_name?: string | null;
  } | null;
};

function normalizeOfferStatus(status?: string | null) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "accepted") return "accepted";
  if (s === "rejected") return "rejected";
  if (s === "withdrawn") return "withdrawn";
  if (s === "proposed") return "proposed";
  return "proposed";
}

function statusBadge(status?: string) {
  const s = normalizeOfferStatus(status);
  const base =
    "inline-flex items-center rounded-xl border px-3 py-1 text-[11px] font-bold";

  if (s === "accepted") {
    return `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-300`;
  }
  if (s === "rejected") {
    return `${base} border-rose-500/20 bg-rose-500/10 text-rose-300`;
  }
  if (s === "withdrawn") {
    return `${base} border-slate-500/20 bg-slate-500/10 text-slate-300`;
  }
  return `${base} border-amber-500/20 bg-amber-500/10 text-amber-300`;
}

function negotiationStatusBadge(status?: string) {
  const s = String(status || "").toLowerCase();
  const base =
    "inline-flex items-center rounded-xl border px-3 py-1 text-[11px] font-bold";

  if (s === "open") {
    return `${base} border-sky-500/20 bg-sky-500/10 text-sky-300`;
  }
  if (s === "pending") {
    return `${base} border-amber-500/20 bg-amber-500/10 text-amber-300`;
  }
  if (s === "accepted" || s === "agreed") {
    return `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-300`;
  }
  if (s === "rejected") {
    return `${base} border-rose-500/20 bg-rose-500/10 text-rose-300`;
  }
  if (s === "draft") {
    return `${base} border-white/10 bg-white/[0.04] text-slate-300`;
  }

  return `${base} border-white/10 bg-white/[0.04] text-slate-300`;
}

function formatStatus(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s === "open") return "Abierta";
  if (s === "pending") return "Pendiente";
  if (s === "accepted") return "Aceptada";
  if (s === "agreed") return "Acordada";
  if (s === "rejected") return "Rechazada";
  if (s === "draft") return "Borrador";
  if (s === "proposed") return "Propuesta";
  if (s === "withdrawn") return "Retirada";
  return status || "Propuesta";
}

function formatDate(value?: string | null) {
  if (!value) return "No definido";
  return new Date(value).toLocaleDateString();
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

export default function NegotiationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || "";

  const validId = useMemo(() => isUuid(id), [id]);

  const [meta, setMeta] = useState<NegotiationMeta | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [msgBody, setMsgBody] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CLP");
  const [note, setNote] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);
  const [actingOfferId, setActingOfferId] = useState<string | null>(null);

  const myEmail = String(meta?.me?.email || "").toLowerCase();

  const counterpartName =
    meta?.counterpart?.display_name ||
    meta?.counterpart?.email ||
    meta?.creative?.display_name ||
    meta?.creative?.email ||
    "Participante";

  const projectTitle =
    meta?.negotiation?.project_title || "Proyecto relacionado";

  const projectStatus = meta?.negotiation?.project_status || null;
  const projectCurrency = meta?.negotiation?.project_currency || null;
  const projectStartDate = meta?.negotiation?.project_start_date || null;
  const projectDueDate = meta?.negotiation?.project_due_date || null;

  const acceptedOfferExists = offers.some(
    (o) => normalizeOfferStatus(o.status) === "accepted"
  );

  const negotiationIsAgreed =
    String(meta?.negotiation?.status || "").toLowerCase() === "agreed";

  const loadAll = async () => {
    setError(null);
    try {
      const m = await api<NegotiationMeta>(`/negotiations/${id}`);
      setMeta(m);

      const ms = await api<{ ok: true; messages: Message[] }>(
        `/negotiations/${id}/messages`
      );
      setMessages(ms.messages || []);

      const of = await api<{ ok: true; offers: Offer[] }>(
        `/negotiations/${id}/offers`
      );
      setOffers(of.offers || []);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  useEffect(() => {
    if (!id) return;
    if (!validId) {
      setError("ID de negociación inválido.");
      return;
    }
    loadAll();
  }, [id, validId]);

  const sendMessage = async () => {
    if (!msgBody.trim()) return;
    setSendingMsg(true);
    try {
      await api(`/negotiations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: msgBody }),
      });
      setMsgBody("");
      await loadAll();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSendingMsg(false);
    }
  };

  const sendOffer = async () => {
    const num = Number(amount);
    if (!num || num <= 0) return;

    setSendingOffer(true);
    try {
      await api(`/negotiations/${id}/offers`, {
        method: "POST",
        body: JSON.stringify({
          amount: num,
          currency,
          note: note || undefined,
          payment_date: paymentDate || undefined,
          payment_method: paymentMethod || undefined,
        }),
      });

      setAmount("");
      setNote("");
      setPaymentDate("");
      setPaymentMethod("");
      await loadAll();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSendingOffer(false);
    }
  };

  const respondToOffer = async (
    offerId: string,
    action: "accepted" | "rejected"
  ) => {
    setActingOfferId(offerId);
    try {
      await api(`/negotiations/${id}/offers/${offerId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      await loadAll();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setActingOfferId(null);
    }
  };

  if (!id) {
    return <div className="p-6 text-slate-400">Cargando...</div>;
  }

  return (
    <div className="w-full">
      <div className="mx-auto max-w-[1180px]">
        <button
          className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08]"
          onClick={() => router.back()}
        >
          ← Volver
        </button>

        <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d1320]">
          <div className="border-b border-white/8 bg-[#111827] px-6 py-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-[28px] font-black text-white">
                    Negociación
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    ID: <span className="font-mono">{id}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                    <span>Con:</span>
                    <span className="rounded-xl bg-white/[0.05] px-3 py-1 font-semibold text-white">
                      {counterpartName}
                    </span>
                  </div>

                  {meta?.negotiation?.status ? (
                    <div className="mt-3">
                      <span className={negotiationStatusBadge(meta.negotiation.status)}>
                        {formatStatus(meta.negotiation.status)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-[#0b1220] p-4">
                <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Proyecto relacionado
                </div>

                <div className="mt-3 text-lg font-extrabold text-white">
                  {projectTitle}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-xs font-bold text-slate-400">
                      Estado del proyecto
                    </div>
                    <div className="mt-2">
                      <span className={negotiationStatusBadge(projectStatus || "draft")}>
                        {formatStatus(projectStatus || "draft")}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-xs font-bold text-slate-400">
                      Inicio
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {formatDate(projectStartDate)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-xs font-bold text-slate-400">
                      Entrega
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {formatDate(projectDueDate)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-xs font-bold text-slate-400">
                      Moneda
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {projectCurrency || "No definida"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}
          </div>

          <div className="grid gap-5 px-6 py-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
              <div className="text-lg font-extrabold text-white">Mensajes</div>
              <div className="text-sm text-slate-500">
                Conversación entre las partes de esta negociación
              </div>

              <div className="mt-4 h-[420px] overflow-auto rounded-2xl border border-white/8 bg-[#0b1220] p-3">
                <div className="space-y-3">
                  {messages.map((m) => {
                    const mine = myEmail && m.email?.toLowerCase() === myEmail;

                    return (
                      <div
                        key={m.id}
                        className={[
                          "rounded-2xl border p-4",
                          mine
                            ? "border-[#f2c94c]/20 bg-[#f2c94c]/10"
                            : "border-white/8 bg-white/[0.04]",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div
                            className={[
                              "truncate text-xs font-semibold",
                              mine ? "text-[#f2c94c]" : "text-sky-300",
                            ].join(" ")}
                          >
                            {mine ? "Tú" : m.email}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {new Date(m.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                          {m.body}
                        </div>
                      </div>
                    );
                  })}

                  {messages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
                      Aún no hay mensajes.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  className="flex-1 rounded-2xl border border-white/8 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#f2c94c]/10"
                  placeholder="Escribe un mensaje…"
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                />
                <button
                  className="rounded-2xl px-5 py-3 text-sm font-bold text-[#0b0f17] disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                  disabled={sendingMsg || !msgBody.trim()}
                  onClick={sendMessage}
                >
                  {sendingMsg ? "..." : "Enviar"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
              <div className="text-lg font-extrabold text-white">Ofertas</div>
              <div className="text-sm text-slate-500">
                Propuestas económicas y contraofertas
              </div>

              {acceptedOfferExists ? (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  Ya existe una oferta aceptada en esta negociación. No se pueden
                  enviar nuevas ofertas.
                </div>
              ) : null}

              <div className="mt-4 rounded-2xl border border-white/8 bg-[#0b1220] p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    className="rounded-2xl border border-white/8 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#f2c94c]/10"
                    placeholder="Monto"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={acceptedOfferExists}
                  />
                  <input
                    className="rounded-2xl border border-white/8 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#f2c94c]/10"
                    placeholder="Moneda"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    disabled={acceptedOfferExists}
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full rounded-2xl border border-white/8 bg-white/[0.05] px-4 py-3 pr-11 text-sm text-white outline-none focus:bg-white/[0.08] focus:ring-2 focus:ring-[#f2c94c]/10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                      style={{ colorScheme: "dark" }}
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      disabled={acceptedOfferExists}
                    />
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#f2c94c]">
                      <CalendarIcon />
                    </div>
                  </div>

                  <input
                    className="rounded-2xl border border-white/8 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#f2c94c]/10"
                    placeholder="Método de pago"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={acceptedOfferExists}
                  />
                </div>

                <textarea
                  className="mt-3 min-h-[110px] w-full rounded-2xl border border-white/8 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#f2c94c]/10"
                  placeholder="Nota / alcance de la oferta (opcional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={acceptedOfferExists}
                />

                <button
                  className="mt-3 w-full rounded-2xl px-5 py-3 text-sm font-bold text-[#0b0f17] disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#10b981,#34d399)" }}
                  disabled={sendingOffer || !amount || acceptedOfferExists}
                  onClick={sendOffer}
                >
                  {sendingOffer ? "Guardando..." : "Enviar oferta"}
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {offers.map((o) => {
                  const mine =
                    !!myEmail && String(o.email || "").toLowerCase() === myEmail;

                  const offerStatus = normalizeOfferStatus(o.status);
                  const canRespond =
                    !mine &&
                    offerStatus === "proposed" &&
                    !negotiationIsAgreed;

                  return (
                    <div
                      key={o.id}
                      className={[
                        "rounded-2xl border p-4",
                        offerStatus === "accepted"
                          ? "border-emerald-500/20 bg-emerald-500/10"
                          : offerStatus === "rejected"
                          ? "border-rose-500/20 bg-rose-500/10"
                          : mine
                          ? "border-emerald-500/20 bg-emerald-500/10"
                          : "border-white/8 bg-[#0b1220]",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-extrabold text-white">
                          {o.currency} {o.amount}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(o.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={statusBadge(offerStatus)}>
                          {formatStatus(offerStatus)}
                        </span>
                        <span className="text-xs text-slate-500">
                          Por: {mine ? "Tú" : o.email}
                        </span>
                      </div>

                      {(o.payment_date || o.payment_method) ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
                            <span className="font-bold text-slate-400">
                              Fecha de pago:
                            </span>{" "}
                            {o.payment_date
                              ? formatDate(o.payment_date)
                              : "No definida"}
                          </div>
                          <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
                            <span className="font-bold text-slate-400">
                              Método de pago:
                            </span>{" "}
                            {o.payment_method || "No definido"}
                          </div>
                        </div>
                      ) : null}

                      {o.note ? (
                        <div className="mt-3 whitespace-pre-wrap text-sm text-slate-200">
                          {o.note}
                        </div>
                      ) : null}

                      {canRespond ? (
                        <div className="mt-4">
                          <select
                            defaultValue=""
                            disabled={actingOfferId === o.id}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (!value) return;
                              if (value === "accepted" || value === "rejected") {
                                respondToOffer(o.id, value);
                              }
                              e.currentTarget.value = "";
                            }}
                            className="w-full rounded-2xl border border-white/8 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.08] focus:ring-2 focus:ring-[#f2c94c]/10"
                          >
                            <option value="" className="bg-[#0b1220] text-slate-300">
                              {actingOfferId === o.id
                                ? "Procesando..."
                                : "Responder oferta"}
                            </option>
                            <option
                              value="accepted"
                              className="bg-[#0b1220] text-emerald-300"
                            >
                              Aceptar oferta
                            </option>
                            <option
                              value="rejected"
                              className="bg-[#0b1220] text-rose-300"
                            >
                              Declinar oferta
                            </option>
                          </select>
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {offers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
                    Aún no hay ofertas.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}