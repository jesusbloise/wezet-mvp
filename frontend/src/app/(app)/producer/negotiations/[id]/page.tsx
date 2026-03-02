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
  created_at: string;
  created_by_user_id: string;
  email: string;
};

export default function NegotiationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || "";

  const validId = useMemo(() => isUuid(id), [id]);

  const [meta, setMeta] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [msgBody, setMsgBody] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CLP");
  const [note, setNote] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);

  const loadAll = async () => {
    setError(null);
    try {
      const m = await api(`/negotiations/${id}`);
      setMeta(m);

      const ms = await api<{ ok: true; messages: Message[] }>(`/negotiations/${id}/messages`);
      setMessages(ms.messages);

      const of = await api<{ ok: true; offers: Offer[] }>(`/negotiations/${id}/offers`);
      setOffers(of.offers);
    } catch (e: any) {
      setError(String(e.message || e));
    }
  };

  useEffect(() => {
    if (!id) return;
    if (!validId) {
      setError("ID de negociación inválido.");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setError(String(e.message || e));
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
        body: JSON.stringify({ amount: num, currency, note: note || undefined }),
      });
      setAmount("");
      setNote("");
      await loadAll();
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setSendingOffer(false);
    }
  };

  if (!id) return <div className="p-6">Cargando...</div>;

  return (
    <div className="max-w-[1100px]">
      <button className="text-sm underline text-slate-700" onClick={() => router.back()}>
        Volver
      </button>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-xl font-extrabold">Negociación</div>
        {meta?.creative && (
          <div className="text-sm text-slate-600 mt-1">
            Con: <span className="font-semibold">{meta.creative.display_name || meta.creative.email}</span>
          </div>
        )}
        <div className="text-xs text-slate-500 mt-1">ID: {id}</div>
      </div>

      {error && <div className="mt-4 text-rose-600 text-sm">{error}</div>}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Chat */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-lg font-extrabold">💬 Mensajes</div>
          <div className="text-sm text-slate-500">Conversación de negociación.</div>

          <div className="mt-4 h-[320px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">{m.email}</div>
                <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{m.body}</div>
                <div className="text-[11px] text-slate-400 mt-2">{new Date(m.created_at).toLocaleString()}</div>
              </div>
            ))}
            {messages.length === 0 && <div className="text-sm text-slate-500">Aún no hay mensajes.</div>}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 text-sm outline-none"
              placeholder="Escribe un mensaje…"
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
            />
            <button
              className="rounded-xl px-4 py-3 text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-sky-500 disabled:opacity-50"
              disabled={sendingMsg || !msgBody.trim()}
              onClick={sendMessage}
            >
              {sendingMsg ? "..." : "Enviar"}
            </button>
          </div>
        </div>

        {/* Offers */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-lg font-extrabold">💸 Ofertas</div>
          <div className="text-sm text-slate-500">Propuestas de precio dentro de la negociación.</div>

          <div className="mt-4 grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 text-sm outline-none"
                placeholder="Monto"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <input
                className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 text-sm outline-none"
                placeholder="Moneda (CLP)"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>

            <textarea
              className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 text-sm outline-none min-h-[90px]"
              placeholder="Nota / alcance de la oferta (opcional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <button
              className="rounded-xl px-4 py-3 text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-sky-500 disabled:opacity-50"
              disabled={sendingOffer || !amount}
              onClick={sendOffer}
            >
              {sendingOffer ? "Guardando..." : "Enviar oferta"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {offers.map((o) => (
              <div key={o.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between">
                  <div className="font-extrabold text-slate-900">
                    {o.currency} {o.amount}
                  </div>
                  <div className="text-xs text-slate-500">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                <div className="text-xs text-slate-500 mt-1">Por: {o.email}</div>
                {o.note ? <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{o.note}</div> : null}
              </div>
            ))}
            {offers.length === 0 && <div className="text-sm text-slate-500">Aún no hay ofertas.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
