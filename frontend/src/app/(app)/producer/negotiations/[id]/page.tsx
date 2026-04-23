"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

/* ================== utils ================== */
function isUuid(v: string) {
  return /^[0-9a-f-]{36}$/i.test(v);
}

function formatTime(v?: string) {
  if (!v) return "";
  return new Date(v).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(v?: string | null) {
  if (!v) return "No definido";
  return new Date(v).toLocaleDateString();
}

function normalizeStatus(status?: string | null) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "accepted") return "accepted";
  if (s === "rejected") return "rejected";
  if (s === "withdrawn") return "withdrawn";
  return "proposed";
}

function statusLabel(status?: string | null) {
  const s = normalizeStatus(status);
  if (s === "accepted") return "accepted";
  if (s === "rejected") return "rejected";
  if (s === "withdrawn") return "withdrawn";
  return "Activa";
}

/* ================== types ================== */
type Message = {
  id: string;
  body: string;
  created_at: string;
  email: string;
};

type Offer = {
  id: string;
  amount: string | number;
  currency: string;
  note?: string | null;
  payment_date?: string | null;
  payment_method?: string | null;
  status?: string | null;
  created_at: string;
  email: string;
};

type Meta = {
  negotiation?: {
    id?: string;
    status: string;
    project_title?: string;
  };
  counterpart?: { email?: string; display_name?: string };
  me?: { email?: string };
};

type TimelineItem =
  | { type: "msg"; time: number; data: Message }
  | { type: "offer"; time: number; data: Offer };

export default function NegotiationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [meta, setMeta] = useState<Meta | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [proposalOpen, setProposalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CLP");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [note, setNote] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [sendingOffer, setSendingOffer] = useState(false);
  const [actingOfferId, setActingOfferId] = useState<string | null>(null);

  const myEmail = String(meta?.me?.email || "").toLowerCase();

  const acceptedOffer = offers.find(
    (o) => normalizeStatus(o.status) === "accepted"
  );

  const isNegotiationAgreed =
    String(meta?.negotiation?.status || "").toLowerCase() === "agreed" ||
    !!acceptedOffer;

  const timeline = useMemo<TimelineItem[]>(() => {
    return [
      ...messages.map((m) => ({
        type: "msg" as const,
        time: new Date(m.created_at).getTime(),
        data: m,
      })),
      ...offers.map((o) => ({
        type: "offer" as const,
        time: new Date(o.created_at).getTime(),
        data: o,
      })),
    ].sort((a, b) => a.time - b.time);
  }, [messages, offers]);

  const load = async () => {
    try {
      setError(null);
      const m = await api<Meta>(`/negotiations/${id}`);
      const ms = await api<{ ok: true; messages: Message[] }>(
        `/negotiations/${id}/messages`
      );
      const of = await api<{ ok: true; offers: Offer[] }>(
        `/negotiations/${id}/offers`
      );

      setMeta(m);
      setMessages(ms.messages || []);
      setOffers(of.offers || []);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  useEffect(() => {
    if (id && isUuid(id)) load();
  }, [id]);

  const sendMessage = async () => {
    if (!msg.trim()) return;
    try {
      setSendingMsg(true);
      await api(`/negotiations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: msg }),
      });
      setMsg("");
      await load();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSendingMsg(false);
    }
  };

  const sendOffer = async () => {
    if (isNegotiationAgreed) {
      setError("La negociación ya tiene acuerdo y no admite nuevas ofertas");
      return;
    }

    const num = Number(amount);
    if (!num || num <= 0) return;

    try {
      setSendingOffer(true);
      await api(`/negotiations/${id}/offers`, {
        method: "POST",
        body: JSON.stringify({
          amount: num,
          currency: currency || "CLP",
          payment_method: paymentMethod || undefined,
          payment_date: paymentDate || undefined,
          note: note || undefined,
        }),
      });

      setAmount("");
      setCurrency("CLP");
      setPaymentMethod("");
      setPaymentDate("");
      setNote("");
      setProposalOpen(false);
      setError(null);
      await load();
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
    try {
      setActingOfferId(offerId);
      await api(`/negotiations/${id}/offers/${offerId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setActingOfferId(null);
    }
  };

  const openCounterOffer = (offer: Offer) => {
    setAmount(String(offer.amount || ""));
    setCurrency(offer.currency || "CLP");
    setPaymentMethod(offer.payment_method || "");
    setPaymentDate(offer.payment_date || "");
    setNote(offer.note || "");
    setProposalOpen(true);
  };

  const goToAgreement = () => {
  if (!isNegotiationAgreed) return;
  router.push(`/producer/agreements/from-negotiation/${id}`);
};

  return (
    <div className="w-full bg-[#f2f2f0] px-4 py-6">
      <div className="mx-auto max-w-[1100px]">
        <button
          onClick={() => router.back()}
          className="mb-4 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black shadow-sm"
        >
          ← Volver
        </button>

        <div className="overflow-hidden rounded-[20px] bg-white shadow">
          <div className="bg-black px-6 py-5 text-white">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-widest text-[#f2c94c]">
                  Negociación
                </div>
                <div className="truncate text-lg font-black">
                  {meta?.negotiation?.project_title || "Proyecto"}
                </div>
                <div className="mt-1 text-xs text-white/70">
                  {meta?.counterpart?.display_name ||
                    meta?.counterpart?.email ||
                    "Participante"}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-400">
                  ● En línea
                </span>
                <button
  onClick={goToAgreement}
  disabled={!isNegotiationAgreed}
  className="rounded-md bg-[#f2c94c] px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
>
  Cerrar negociación
</button>
              </div>
            </div>
          </div>

          <div className="bg-[#f7f7f5] px-6 py-6 h-[65vh] overflow-y-auto space-y-4">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {timeline.map((item, i) => {
              if (item.type === "msg") {
                const m = item.data;
                const mine = String(m.email || "").toLowerCase() === myEmail;

                return (
                  <div
                    key={`m-${m.id}-${i}`}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[60%]">
                      <div
                        className={[
                          "rounded-2xl border px-4 py-3 text-sm",
                          mine
                            ? "border-black bg-black text-white"
                            : "border-black/10 bg-white text-black",
                        ].join(" ")}
                      >
                        {m.body}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {formatTime(m.created_at)}
                      </div>
                    </div>
                  </div>
                );
              }

              const o = item.data;
              const mine = String(o.email || "").toLowerCase() === myEmail;
              const canRespond =
                !mine &&
                !isNegotiationAgreed &&
                normalizeStatus(o.status) === "proposed";

              return (
                <div
                  key={`o-${o.id}-${i}`}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[60%]">
                    <div className="overflow-hidden rounded-[16px] border border-black/10 bg-white">
                      <div className="flex items-center justify-between border-b border-black/10 bg-[#faf7ee] px-4 py-3">
                        <div className="text-xs font-bold text-black">
                          📄 {mine ? "Propuesta inicial" : "Contraoferta"}
                        </div>
                        <div className="text-[10px] font-bold text-[#8a6a00]">
                          {statusLabel(o.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 text-sm">
                        <div className="border-b border-r border-black/10 p-3">
                          <div className="text-[10px] font-bold uppercase text-gray-400">
                            Rol
                          </div>
                          <div className="font-semibold text-black">
                            Director de Fotografía
                          </div>
                        </div>

                        <div className="border-b border-black/10 p-3">
                          <div className="text-[10px] font-bold uppercase text-gray-400">
                            Fechas
                          </div>
                          <div className="font-semibold text-black">
                            {formatDate(o.payment_date)}
                          </div>
                        </div>

                        <div className="border-r border-black/10 p-3">
                          <div className="text-[10px] font-bold uppercase text-gray-400">
                            Monto
                          </div>
                          <div className="font-black text-[#d4a72c]">
                            {o.currency} {o.amount}
                          </div>
                        </div>

                        <div className="p-3">
                          <div className="text-[10px] font-bold uppercase text-gray-400">
                            Forma de pago
                          </div>
                          <div className="font-semibold text-black">
                            {o.payment_method || "Sin cambios"}
                          </div>
                        </div>
                      </div>

                      {canRespond ? (
                        <div className="flex gap-2 border-t border-black/10 px-4 py-3">
                          <button
                            onClick={() => respondToOffer(o.id, "accepted")}
                            disabled={actingOfferId === o.id}
                            className="rounded-md bg-green-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                          >
                            {actingOfferId === o.id ? "Procesando..." : "✔ Aceptar"}
                          </button>

                          <button
                            onClick={() => openCounterOffer(o)}
                            disabled={actingOfferId === o.id}
                            className="rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                          >
                            Contraofertar
                          </button>
                        </div>
                      ) : null}

                      {o.note ? (
                        <div className="border-t border-black/10 px-4 py-3 text-xs text-gray-600">
                          {o.note}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      {formatTime(o.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}

            {isNegotiationAgreed ? (
              <div className="rounded-[24px] border border-green-400 bg-green-100 p-4">
                <div className="text-sm font-bold text-green-800">
                  ✔ Condiciones acordadas — listo para generar el Acuerdo
                </div>
                <div className="mt-1 text-xs text-green-700">
                  Las condiciones quedaron registradas.
                </div>
                <div className="mt-3 flex justify-end">
                  <button
  onClick={goToAgreement}
  className="rounded-md bg-green-500 px-4 py-2 text-sm font-bold text-white"
>
  Generar acuerdo
</button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded-full border border-black px-4 py-3 text-sm text-black outline-none placeholder:text-gray-500"
                placeholder="Escribe un mensaje..."
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
              />

              <button
                onClick={() => {
                  if (isNegotiationAgreed) {
                    setError(
                      "La negociación ya tiene acuerdo y no admite nuevas ofertas"
                    );
                    return;
                  }
                  setError(null);
                  setProposalOpen(true);
                }}
                disabled={isNegotiationAgreed}
                className="rounded-full border border-black/15 bg-white px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Nueva propuesta
              </button>

              <button
                onClick={sendMessage}
                disabled={sendingMsg || !msg.trim()}
                className="rounded-full bg-black px-5 py-3 text-sm font-bold text-[#f2c94c] disabled:opacity-50"
              >
                {sendingMsg ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>

        {proposalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-[460px] rounded-2xl bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-lg font-black text-black">
                    Nueva propuesta
                  </div>
                  <div className="text-xs text-gray-500">
                    Define monto, fecha, forma de pago y nota.
                  </div>
                </div>

                <button
                  onClick={() => setProposalOpen(false)}
                  className="rounded-md border border-black/10 px-3 py-1.5 text-sm text-black"
                >
                  Cerrar
                </button>
              </div>

              {isNegotiationAgreed ? (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Esta negociación ya tiene acuerdo y no admite nuevas ofertas.
                </div>
              ) : null}

              <div className="space-y-3">
                <div>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Monto
                  </div>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="500000"
                    className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm text-black outline-none"
                  />
                </div>

                <div>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Moneda
                  </div>
                  <input
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="CLP"
                    className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm text-black outline-none"
                  />
                </div>

                <div>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Fecha
                  </div>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm text-black outline-none"
                  />
                </div>

                <div>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Forma de pago
                  </div>
                  <input
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder="50% inicio - 50% entrega"
                    className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm text-black outline-none"
                  />
                </div>

                <div>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Nota
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Detalle de la propuesta..."
                    className="min-h-[100px] w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm text-black outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setProposalOpen(false)}
                  className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-black"
                >
                  Cancelar
                </button>
                <button
                  onClick={sendOffer}
                  disabled={sendingOffer || !amount || isNegotiationAgreed}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-[#f2c94c] disabled:opacity-50"
                >
                  {sendingOffer ? "Enviando..." : "Enviar propuesta"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
