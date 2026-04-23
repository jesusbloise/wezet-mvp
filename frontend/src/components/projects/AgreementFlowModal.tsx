

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

type Step = "overview" | "choose" | "form";

type NegotiationRow = {
  id: string;
  project_id: string;
  status: string;
  created_at: string;
  creative_user_id: string | null;
  email: string | null;
  display_name: string | null;
  latest_offer_id?: string | null;
  latest_offer_amount?: string | number | null;
  latest_offer_currency?: string | null;
  latest_offer_status?: string | null;
  accepted_offer_id?: string | null;
  accepted_offer_amount?: string | number | null;
  accepted_offer_currency?: string | null;
  accepted_offer_status?: string | null;
  messages_count?: number;
  offers_count?: number;
};

function formatNegotiationStatus(status?: string | null) {
  const s = String(status || "").toLowerCase();

  if (s === "agreed") return "Acordado";
  if (s === "in_progress") return "En negociación";
  if (s === "open") return "Abierto";
  if (s === "closed") return "Cerrado";

  return status || "Abierto";
}

function statusTone(status?: string | null) {
  const s = String(status || "").toLowerCase();

  if (s === "agreed") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
  }

  if (s === "in_progress") {
    return "border-[#f2c94c]/20 bg-[#f2c94c]/10 text-[#fff1bf]";
  }

  if (s === "open") {
    return "border-sky-500/20 bg-sky-500/10 text-sky-200";
  }

  return "border-white/10 bg-white/[0.04] text-slate-200";
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
  const [step, setStep] = useState<Step>("overview");
  const [participantType, setParticipantType] = useState<"creative" | "company" | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [loadingNegotiations, setLoadingNegotiations] = useState(false);
  const [negotiations, setNegotiations] = useState<NegotiationRow[]>([]);

  const hasNegotiations = negotiations.length > 0;

  const resetForm = () => {
    setParticipantType(null);
    setName("");
    setEmail("");
    setPhone("");
    setSpecialty("");
    setErr(null);
    setSaving(false);
  };

  const resetAll = () => {
    setStep("overview");
    setNegotiations([]);
    resetForm();
  };

  const closeAll = () => {
    resetAll();
    onClose();
  };

  const loadNegotiations = async () => {
    setLoadingNegotiations(true);
    setErr(null);

    try {
      const r = await api<{
        ok: true;
        negotiations: NegotiationRow[];
      }>(`/negotiations/project/${projectId}`);

      const rows = r.negotiations || [];
      setNegotiations(rows);

      if (rows.length === 0) {
        setStep("choose");
      } else {
        setStep("overview");
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
      setNegotiations([]);
      setStep("choose");
    } finally {
      setLoadingNegotiations(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadNegotiations();
  }, [open, projectId]);

  const submit = async () => {
    const n = name.trim();
    const em = email.trim();

    if (!participantType) {
      setErr("Debes elegir Creativo o Empresa.");
      return;
    }
    if (!n) {
      setErr("El nombre es obligatorio.");
      return;
    }
    if (!em) {
      setErr("El email es obligatorio.");
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      await api(`/projects/${projectId}/invite`, {
        method: "POST",
        body: JSON.stringify({
          creativeEmail: em,
          participantType,
          displayName: n,
          phone: phone.trim() || null,
          specialty: specialty.trim() || null,
        }),
      });

      await loadNegotiations();
      resetForm();
      onDone?.();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const overviewTitle = useMemo(() => {
    if (loadingNegotiations) return "Cargando acuerdos";
    if (hasNegotiations) return "Acuerdos del proyecto";
    return "Nuevo acuerdo";
  }, [loadingNegotiations, hasNegotiations]);

  if (!open) return null;

  const isCreative = participantType === "creative";
  const modalTitle = participantType
    ? participantType === "creative"
      ? "Agregar Creativo"
      : "Agregar Empresa"
    : "Agregar participante";

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={closeAll}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        {step === "overview" ? (
          <div className="w-full max-w-[760px] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1320] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/8 px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl text-[#0b0f17]"
                    style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                  >
                    <span className="text-lg">🤝</span>
                  </div>

                  <div className="min-w-0">
                    <div className="text-lg font-black text-white">{overviewTitle}</div>
                    <div className="text-xs text-slate-400">
                      Proyecto: {projectTitle || projectId}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-slate-300 hover:bg-white/[0.08]"
                onClick={closeAll}
                aria-label="Cerrar modal"
              >
                <XIcon />
              </button>
            </div>

            <div className="px-6 py-6">
              {err ? (
                <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {err}
                </div>
              ) : null}

              {loadingNegotiations ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-6 text-sm text-slate-300">
                  Cargando acuerdos...
                </div>
              ) : hasNegotiations ? (
                <>
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-white">
                        Negociaciones activas o históricas
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        Aquí puedes entrar a un acuerdo existente o iniciar uno nuevo.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setErr(null);
                        setStep("choose");
                      }}
                      className="rounded-2xl px-4 py-3 text-sm font-black text-[#0b0f17]"
                      style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                    >
                      + Nuevo acuerdo
                    </button>
                  </div>

                  <div className="space-y-3">
                    {negotiations.map((n) => {
                      const created = n.created_at
                        ? new Date(n.created_at).toLocaleDateString()
                        : "—";

                      const lastOffer =
                        n.latest_offer_amount && n.latest_offer_currency
                          ? `${n.latest_offer_currency} ${n.latest_offer_amount}`
                          : null;

                      return (
                        <div
                          key={n.id}
                          className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="truncate text-sm font-extrabold text-white">
                                  {n.display_name || n.email || "Participante"}
                                </div>
                                <span
                                  className={[
                                    "inline-flex rounded-xl border px-2.5 py-1 text-[11px] font-bold",
                                    statusTone(n.status),
                                  ].join(" ")}
                                >
                                  {formatNegotiationStatus(n.status)}
                                </span>
                              </div>

                              <div className="mt-2 text-xs text-slate-400">
                                {n.email || "Sin email"} • Creado: {created}
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-300">
                                  Mensajes: {n.messages_count ?? 0}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-300">
                                  Ofertas: {n.offers_count ?? 0}
                                </span>
                                {lastOffer ? (
                                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
                                    Última oferta: {lastOffer}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              <Link
                                href={`/producer/negotiations/${n.id}`}
                                className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/[0.08]"
                              >
                                Abrir
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                  <div className="text-4xl">🤝</div>
                  <div className="mt-3 text-base font-extrabold text-white">
                    Aún no hay acuerdos para este proyecto
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    Comienza agregando un creativo o una empresa para abrir el flujo de acuerdo.
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep("choose")}
                    className="mt-5 rounded-2xl px-5 py-3 text-sm font-black text-[#0b0f17]"
                    style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                  >
                    Empezar acuerdo
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {step === "choose" ? (
          <div className="w-full max-w-[640px] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1320] shadow-2xl">
            <div className="px-6 py-8 text-center">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-[#0b0f17]"
                style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
              >
                <span className="text-2xl">📝</span>
              </div>

              <div className="text-xl font-black text-white">Nuevo Acuerdo</div>
              <div className="mt-1 text-sm text-slate-400">
                Proyecto: {projectTitle || projectId}
              </div>

              <div className="mt-5 text-sm text-slate-300">
                ¿Con quién deseas crear el acuerdo?
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setParticipantType("creative")}
                  className={`rounded-2xl border px-5 py-6 text-left transition ${
                    participantType === "creative"
                      ? "border-[#f2c94c]/30 bg-[#f2c94c]/10"
                      : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="text-3xl">🎨</div>
                  <div className="mt-3 text-base font-extrabold text-white">Creativo</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Freelancer o profesional independiente
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setParticipantType("company")}
                  className={`rounded-2xl border px-5 py-6 text-left transition ${
                    participantType === "company"
                      ? "border-[#f2c94c]/30 bg-[#f2c94c]/10"
                      : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="text-3xl">🏢</div>
                  <div className="mt-3 text-base font-extrabold text-white">Empresa</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Agencia, estudio o empresa creativa
                  </div>
                </button>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    if (hasNegotiations) setStep("overview");
                    else closeAll();
                  }}
                  className="rounded-2xl bg-white/[0.06] px-6 py-3 text-sm font-bold text-slate-200 hover:bg-white/[0.1]"
                >
                  {hasNegotiations ? "Volver" : "Cancelar"}
                </button>

                <button
                  type="button"
                  disabled={!participantType}
                  onClick={() => setStep("form")}
                  className="rounded-2xl px-6 py-3 text-sm font-black text-[#0b0f17] disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                >
                  Continuar →
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "form" ? (
          <div className="w-full max-w-[640px] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1320] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/8 px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl text-[#0b0f17]"
                    style={{
                      background: isCreative
                        ? "linear-gradient(135deg,#10b981,#22c55e)"
                        : "linear-gradient(135deg,#f2c94c,#d4a72c)",
                    }}
                  >
                    <span className="text-lg">{isCreative ? "🎨" : "🏢"}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="text-lg font-black text-white">{modalTitle}</div>
                    <div className="text-xs text-slate-400">
                      Proyecto: {projectTitle || projectId}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-slate-300 hover:bg-white/[0.08]"
                onClick={closeAll}
                aria-label="Cerrar modal"
              >
                <XIcon />
              </button>
            </div>

            <div className="px-6 py-6">
              {err ? (
                <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {err}
                </div>
              ) : null}

              <div className="space-y-4">
                <div>
                  <div className="text-xs font-bold text-slate-300">
                    Nombre {isCreative ? "del creativo" : "de la empresa"}{" "}
                    <span className="text-rose-400">*</span>
                  </div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Buscar en contactos o escribir nuevo..."
                    className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
                  />
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-300">
                    Email <span className="text-rose-400">*</span>
                  </div>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
                  />
                  <div className="mt-2 text-xs text-slate-400">
                    Se enviará la invitación y el flujo de acuerdo a este correo.
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-300">Teléfono</div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+56 9 1234 5678"
                    className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
                  />
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-300">
                    {isCreative ? "Especialidad" : "Rubro"}
                  </div>
                  <input
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder={
                      isCreative
                        ? "Ej: Diseño gráfico, Fotografía, Video..."
                        : "Ej: Agencia, Productora, Estudio..."
                    }
                    className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
                  />
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="text-xs font-extrabold text-emerald-300">
                    Al agregar este {isCreative ? "creativo" : "empresa"}:
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-emerald-200/90">
                    <li>Quedará asociado a este proyecto</li>
                    <li>Se guardará en tu lista de contactos</li>
                    <li>Se abrirá el flujo de acuerdo y negociación</li>
                  </ul>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setStep("choose")}
                    disabled={saving}
                    className="rounded-2xl bg-white/[0.06] px-6 py-3 text-sm font-bold text-slate-200 hover:bg-white/[0.1]"
                  >
                    Volver
                  </button>

                  <button
                    type="button"
                    onClick={submit}
                    disabled={saving || !participantType || !name.trim() || !email.trim()}
                    className="rounded-2xl px-6 py-3 text-sm font-black text-[#0b0f17] disabled:opacity-60"
                    style={{
                      background: isCreative
                        ? "linear-gradient(135deg,#a7f3d0,#86efac)"
                        : "linear-gradient(135deg,#f2c94c,#d4a72c)",
                    }}
                  >
                    {saving ? "Creando..." : isCreative ? "Crear acuerdo con creativo" : "Crear acuerdo con empresa"}
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