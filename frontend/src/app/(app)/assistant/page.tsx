"use client";

import { useState } from "react";
import { api } from "@/lib/api";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_PROMPTS = [
  "Ayúdame a redactar una invitación para un creativo.",
  "Dame ideas para organizar un proyecto audiovisual.",
  "Ayúdame a redactar un mensaje profesional para un cliente.",
  "¿Qué pasos debería seguir para cerrar una negociación?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hola, soy el asistente de WEZET. Puedo ayudarte a redactar mensajes, ordenar ideas, resumir proyectos y darte apoyo en negociaciones, talentos y cotizaciones.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sendMessage = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    setErr(null);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setLoading(true);

    try {
      const r = await api<{ ok: true; reply: string }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: r.reply || "No pude responder en este momento.",
        },
      ]);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Hubo un problema al conectar con el asistente. Revisa el backend, la API key o la ruta /ai/chat.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] rounded-[28px] border border-white/8 bg-[#0b1220] p-4 text-white sm:p-6">
      <div className="mb-6 flex flex-col gap-3 border-b border-white/8 pb-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-[#0b0f17]"
            style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
          >
            <span className="text-xl">✨</span>
          </div>

          <div>
            <h1 className="text-xl font-black sm:text-2xl">Asistente WEZET</h1>
            <p className="text-sm text-slate-400">
              Un apoyo rápido para proyectos, talentos, mensajes y negociaciones.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-[65vh] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={`${msg.role}-${idx}`}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                    isUser
                      ? "bg-[#f2c94c] text-[#0b0f17]"
                      : "border border-white/8 bg-white/[0.04] text-slate-100"
                  }`}
                >
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">
                    {isUser ? "Tú" : "WEZET AI"}
                  </div>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            );
          })}

          {loading ? (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-3xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                Pensando...
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 border-t border-white/8 pt-4">
          {err ? (
            <div className="mb-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {err}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe aquí lo que necesitas..."
              rows={3}
              className="min-h-[96px] flex-1 rounded-3xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
            />

            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="rounded-3xl px-6 py-3 text-sm font-black text-[#0b0f17] disabled:opacity-50 sm:self-end"
              style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
            >
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}