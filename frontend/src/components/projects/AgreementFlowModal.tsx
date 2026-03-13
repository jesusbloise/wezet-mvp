"use client";

import { useState } from "react";
import { api } from "@/lib/api";

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export default function AgreementFlowModal({
  open,
  onClose,
  projectId,
  projectTitle,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle?: string;
  onDone?: () => void;
}) {
  const [step, setStep] = useState<"choose" | "form">("choose");
  const [participantType, setParticipantType] = useState<"creative" | "company" | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setStep("choose");
    setParticipantType(null);
    setName("");
    setEmail("");
    setPhone("");
    setSpecialty("");
    setErr(null);
  };

  const closeAll = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    const n = name.trim();
    const em = email.trim();

    if (!participantType) return setErr("Debes elegir Creativo o Empresa.");
    if (!n) return setErr("El nombre es obligatorio.");
    if (!em) return setErr("El email es obligatorio.");

    setSaving(true);
    setErr(null);
    try {
      await api(`/projects/${projectId}/invite`, {
        method: "POST",
        body: JSON.stringify({
          creativeEmail: em,          // compat
          participantType,            // extra
          displayName: n,             // extra
          phone: phone.trim() || null,
          specialty: specialty.trim() || null,
        }),
      });

      closeAll();
      onDone?.();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const isCreative = participantType === "creative";
  const modalTitle = participantType
    ? participantType === "creative"
      ? "Agregar Creativo"
      : "Agregar Empresa"
    : "Agregar participante";

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-black/55" aria-label="Cerrar" onClick={closeAll} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        {/* STEP 1 */}
        {step === "choose" ? (
          <div className="w-full max-w-[640px] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-8 text-center">
              <div
                className="mx-auto mb-4 h-14 w-14 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
              >
                <span className="text-2xl">📝</span>
              </div>

              <div className="text-xl font-black text-slate-900">Nuevo Acuerdo</div>
              <div className="mt-1 text-sm text-slate-500">
                Proyecto: {projectTitle || projectId}
              </div>

              <div className="mt-5 text-sm text-slate-600">¿Con quién deseas crear el acuerdo?</div>

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
                  <div className="mt-3 text-base font-extrabold text-slate-900">Creativo</div>
                  <div className="mt-1 text-xs text-slate-500">Freelancer o profesional independiente</div>
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
                  <div className="mt-3 text-base font-extrabold text-slate-900">Empresa</div>
                  <div className="mt-1 text-xs text-slate-500">Agencia, estudio o empresa creativa</div>
                </button>
              </div>

              <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeAll}
                  className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={!participantType}
                  onClick={() => setStep("form")}
                  className="rounded-2xl px-6 py-3 text-sm font-black text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
                >
                  Continuar →
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* STEP 2 */}
        {step === "form" ? (
          <div className="w-full max-w-[640px] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-2xl flex items-center justify-center text-white"
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
                    <div className="text-xs text-slate-500">Proyecto: {projectTitle || projectId}</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                onClick={closeAll}
                aria-label="Cerrar modal"
              >
                <XIcon />
              </button>
            </div>

            <div className="px-6 py-6">
              {err ? (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {err}
                </div>
              ) : null}

              <div className="space-y-4">
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
                  <div className="mt-2 text-xs text-slate-500">✓ El acuerdo será enviado a este correo</div>
                </div>

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

                <div>
                  <div className="text-xs font-bold text-slate-600">{isCreative ? "Especialidad" : "Rubro"}</div>
                  <input
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder={isCreative ? "Ej: Diseño gráfico, Fotografía, Video..." : "Ej: Agencia, Productora, Estudio..."}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none
                               focus:bg-white focus:ring-2 focus:ring-emerald-200"
                  />
                </div>

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

                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("choose")}
                    disabled={saving}
                    className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={submit}
                    disabled={saving || !participantType || !name.trim() || !email.trim()}
                    className="rounded-2xl px-6 py-3 text-sm font-black text-slate-900 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#a7f3d0,#86efac)" }}
                  >
                    {saving ? "Agregando..." : isCreative ? "Agregar Creativo" : "Agregar Empresa"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}