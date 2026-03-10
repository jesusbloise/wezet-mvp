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

  // ===== Flujo MVP 2 pasos: elegir tipo -> form completo =====
  const [flowOpen, setFlowOpen] = useState(false);
  const [flowStep, setFlowStep] = useState<"choose" | "form">("choose");
  const [participantType, setParticipantType] = useState<
    "creative" | "company" | null
  >(null);

  // Form MVP
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");

  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const openFlow = () => {
    setFlowOpen(true);
    setFlowStep("choose");
    setParticipantType(null);
    setFormErr(null);
  };

  const closeFlow = () => {
    setFlowOpen(false);
    setFlowStep("choose");
    setParticipantType(null);
    setFormErr(null);
    setName("");
    setEmail("");
    setPhone("");
    setSpecialty("");
  };

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

  const submit = async () => {
    const n = name.trim();
    const em = email.trim();

    if (!participantType) {
      setFormErr("Debes elegir Creativo o Empresa.");
      return;
    }
    if (!n) {
      setFormErr("El nombre es obligatorio.");
      return;
    }
    if (!em) {
      setFormErr("El email es obligatorio.");
      return;
    }

    setSaving(true);
    setFormErr(null);
    try {
      // Mantener compatibilidad: backend espera creativeEmail (no romper nada)
      await api(`/projects/${projectId}/invite`, {
        method: "POST",
        body: JSON.stringify({
          creativeEmail: em,
          participantType, // NUEVO: "creative" | "company" (si backend lo ignora, ok)
          displayName: n,
          phone: phone.trim() || null,
          specialty: specialty.trim() || null,
        }),
      });

      closeFlow();
      await load();
    } catch (e: any) {
      setFormErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const isCreative = participantType === "creative";
  const modalTitle = participantType
    ? participantType === "creative"
      ? "Agregar Creativo"
      : "Agregar Empresa"
    : "Agregar participante";

  const primaryLabel = participantType
    ? participantType === "creative"
      ? "Agregar Creativo"
      : "Agregar Empresa"
    : "Agregar";

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
            onClick={openFlow}
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
                onClick={openFlow}
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
                      <div className="mt-1 text-xs text-slate-500 truncate">{c.email}</div>
                      <div className="mt-2 text-xs text-slate-400">
                        Invitado:{" "}
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
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

      {/* Modal flujo 2 pasos */}
      {flowOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Cerrar"
            onClick={closeFlow}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            {/* STEP 1: Elegir tipo */}
            {flowStep === "choose" ? (
              <div className="w-full max-w-[640px] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-8 text-center">
                  <div
                    className="mx-auto mb-4 h-14 w-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
                  >
                    <span className="text-2xl">📝</span>
                  </div>

                  <div className="text-xl font-black text-slate-900">Nuevo Acuerdo</div>
                  <div className="mt-1 text-sm text-slate-500">Proyecto: {projectId}</div>

                  <div className="mt-5 text-sm text-slate-600">
                    ¿Con quién deseas crear el acuerdo?
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setParticipantType("creative")}
                      className={`rounded-2xl border px-5 py-6 text-left transition ${
                        participantType === "creative"
                          ? "border-blue-300 bg-blue-50/40"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-3xl">🎨</div>
                      <div className="mt-3 text-base font-extrabold text-slate-900">
                        Creativo
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Freelancer o profesional independiente
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setParticipantType("company")}
                      className={`rounded-2xl border px-5 py-6 text-left transition ${
                        participantType === "company"
                          ? "border-blue-300 bg-blue-50/40"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-3xl">🏢</div>
                      <div className="mt-3 text-base font-extrabold text-slate-900">
                        Empresa
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Agencia, estudio o empresa creativa
                      </div>
                    </button>
                  </div>

                  <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={closeFlow}
                      className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      disabled={!participantType}
                      onClick={() => {
                        setFlowStep("form");
                        setFormErr(null);
                      }}
                      className="rounded-2xl px-6 py-3 text-sm font-black text-white disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
                    >
                      Continuar →
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* STEP 2: Form completo estilo MVP */}
            {flowStep === "form" ? (
              <div className="w-full max-w-[640px] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl flex items-center justify-center text-white"
                           style={{
                             background: isCreative
                               ? "linear-gradient(135deg,#10b981,#22c55e)"
                               : "linear-gradient(135deg,#0ea5e9,#3b82f6)",
                           }}
                      >
                        <span className="text-lg">{isCreative ? "🎨" : "🏢"}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="text-lg font-black text-slate-900">{modalTitle}</div>
                        <div className="text-xs text-slate-500">Proyecto: {projectId}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                    onClick={closeFlow}
                    aria-label="Cerrar modal"
                  >
                    <XIcon />
                  </button>
                </div>

                <div className="px-6 py-6">
                  {formErr ? (
                    <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {formErr}
                    </div>
                  ) : null}

                  <div className="space-y-4">
                    {/* Nombre */}
                    <div>
                      <div className="text-xs font-bold text-slate-600">
                        Nombre {isCreative ? "del creativo" : "de la empresa"} <span className="text-rose-500">*</span>
                      </div>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Buscar en contactos o escribir nuevo..."
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none
                                   focus:bg-white focus:ring-2 focus:ring-emerald-200"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <div className="text-xs font-bold text-slate-600">
                        Email <span className="text-rose-500">*</span>
                      </div>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none
                                   focus:bg-white focus:ring-2 focus:ring-emerald-200"
                      />
                      <div className="mt-2 text-xs text-slate-500">
                        ✓ El acuerdo será enviado a este correo
                      </div>
                    </div>

                    {/* Teléfono */}
                    <div>
                      <div className="text-xs font-bold text-slate-600">Teléfono</div>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+56 9 1234 5678"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none
                                   focus:bg-white focus:ring-2 focus:ring-emerald-200"
                      />
                    </div>

                    {/* Especialidad / Rubro */}
                    <div>
                      <div className="text-xs font-bold text-slate-600">
                        {isCreative ? "Especialidad" : "Rubro"}
                      </div>
                      <input
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder={isCreative ? "Ej: Diseño gráfico, Fotografía, Video..." : "Ej: Agencia, Productora, Estudio..."}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none
                                   focus:bg-white focus:ring-2 focus:ring-emerald-200"
                      />
                    </div>

                    {/* Caja info verde */}
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <div className="text-xs font-extrabold text-emerald-800">
                        ✨ Al agregar este {isCreative ? "creativo" : "empresa"}:
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-emerald-900/80">
                        <li>Quedará asociado a este proyecto</li>
                        <li>Se guardará en tu lista de contactos</li>
                        <li>Podrás enviarle acuerdos por correo</li>
                      </ul>
                    </div>

                    {/* Botones */}
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFlowStep("choose")}
                        disabled={saving}
                        className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={submit}
                        disabled={
                          saving ||
                          !participantType ||
                          !name.trim() ||
                          !email.trim()
                        }
                        className="rounded-2xl px-6 py-3 text-sm font-black text-slate-900 disabled:opacity-60"
                        style={{
                          background: "linear-gradient(135deg,#a7f3d0,#86efac)",
                        }}
                      >
                        {saving ? "Agregando..." : primaryLabel}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}