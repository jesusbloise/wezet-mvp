"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

function isUuid(v: string) {
  return /^[0-9a-f-]{36}$/i.test(v);
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

type AgreementRow = {
  id: string;
  negotiation_id: string;
  project_id: string;
  nda_id: string | null;
  accepted_offer_id: string | null;

  producer_user_id: string;
  participant_user_id: string | null;

  producer_name: string | null;
  producer_email: string | null;
  participant_name: string | null;
  participant_email: string | null;

  role: string | null;
  scope_text: string | null;
  revisions: string | null;

  start_date: string | null;
  delivery_date: string | null;
  milestones_text: string | null;

  amount_total: string | number | null;
  currency: string | null;
  payment_structure: string | null;

  credits_text: string | null;
  cancellation_policy: string | null;
  confidentiality_text: string | null;

  status: "draft" | "sent" | "signed" | string;
  created_at: string;
  updated_at: string;
};

type AgreementPrefill = {
  negotiation_id: string;
  project_id: string;
  nda_id: string | null;
  accepted_offer_id: string | null;

  producer_user_id: string;
  participant_user_id: string | null;

  producer_name: string;
  producer_email: string;
  participant_name: string;
  participant_email: string;

  role: string;
  scope_text: string;
  revisions: string;

  start_date: string | null;
  delivery_date: string | null;
  milestones_text: string;

  amount_total: string | number | null;
  currency: string;
  payment_structure: string;

  credits_text: string;
  cancellation_policy: string;
  confidentiality_text: string;
  status: string;
};

type AgreementGetResponse =
  | {
      ok: true;
      source: "agreement";
      agreement: AgreementRow;
    }
  | {
      ok: true;
      source: "negotiation";
      prefill: AgreementPrefill;
    };

function SectionTitle({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <div className="mb-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {number}. {title}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea = false,
  green = false,
  disabled = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  green?: boolean;
  disabled?: boolean;
  type?: string;
}) {
  const cls = [
    "w-full rounded-xl border px-3 py-2.5 text-sm outline-none",
    green
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : "border-black/10 bg-white text-black",
    disabled ? "opacity-90" : "",
  ].join(" ");

  return (
    <div>
      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>

      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${cls} min-h-[92px]`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cls}
        />
      )}
    </div>
  );
}

export default function AgreementFromNegotiationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || "";

  const validId = useMemo(() => isUuid(id), [id]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [projectTitle, setProjectTitle] = useState("");
  const [producerName, setProducerName] = useState("");
  const [producerEmail, setProducerEmail] = useState("");
  const [talentName, setTalentName] = useState("");
  const [talentEmail, setTalentEmail] = useState("");

  const [role, setRole] = useState("");
  const [scopeText, setScopeText] = useState("");
  const [revisions, setRevisions] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [milestones, setMilestones] = useState("");
  const [amountTotal, setAmountTotal] = useState("");
  const [currency, setCurrency] = useState("CLP");
  const [paymentStructure, setPaymentStructure] = useState("");
  const [credits, setCredits] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("sin costo");
  const [confidentiality, setConfidentiality] = useState("");
  const [agreementStatus, setAgreementStatus] = useState<"draft" | "sent" | "signed">(
    "draft"
  );

  const [greenMap, setGreenMap] = useState({
    producer_name: false,
    producer_email: false,
    participant_name: false,
    participant_email: false,
    role: false,
    scope_text: false,
    start_date: false,
    delivery_date: false,
    amount_total: false,
    payment_structure: false,
    credits_text: false,
    confidentiality_text: false,
  });

  useEffect(() => {
    if (!validId) {
      setLoading(false);
      setError("Negotiation id inválido");
      return;
    }

    let alive = true;

    const loadAgreement = async () => {
      try {
        setLoading(true);
        setError(null);
        setSaveMessage(null);

        const data = await api<AgreementGetResponse>(
          `/agreements/from-negotiation/${id}`
        );
        if (!alive) return;

        if (data.source === "agreement") {
          const agreement = data.agreement;

          setProjectTitle("Acuerdo guardado");
          setProducerName(agreement.producer_name || "");
          setProducerEmail(agreement.producer_email || "");
          setTalentName(agreement.participant_name || "");
          setTalentEmail(agreement.participant_email || "");

          setRole(agreement.role || "");
          setScopeText(agreement.scope_text || "");
          setRevisions(agreement.revisions || "");
          setStartDate(agreement.start_date || "");
          setDeliveryDate(agreement.delivery_date || "");
          setMilestones(agreement.milestones_text || "");
          setAmountTotal(
            agreement.amount_total !== null && agreement.amount_total !== undefined
              ? String(agreement.amount_total)
              : ""
          );
          setCurrency(agreement.currency || "CLP");
          setPaymentStructure(agreement.payment_structure || "");
          setCredits(agreement.credits_text || "");
          setCancellationPolicy(agreement.cancellation_policy || "sin costo");
          setConfidentiality(agreement.confidentiality_text || "");
          setAgreementStatus(
            agreement.status === "signed" || agreement.status === "sent"
              ? agreement.status
              : "draft"
          );

          setGreenMap({
            producer_name: !!agreement.producer_name,
            producer_email: !!agreement.producer_email,
            participant_name: !!agreement.participant_name,
            participant_email: !!agreement.participant_email,
            role: !!agreement.role,
            scope_text: !!agreement.scope_text,
            start_date: !!agreement.start_date,
            delivery_date: !!agreement.delivery_date,
            amount_total:
              agreement.amount_total !== null && agreement.amount_total !== undefined,
            payment_structure: !!agreement.payment_structure,
            credits_text: !!agreement.credits_text,
            confidentiality_text: !!agreement.confidentiality_text,
          });
        } else {
          const prefill = data.prefill;

          setProjectTitle("Acuerdo generado desde negociación");
          setProducerName(prefill.producer_name || "");
          setProducerEmail(prefill.producer_email || "");
          setTalentName(prefill.participant_name || "");
          setTalentEmail(prefill.participant_email || "");

          setRole(prefill.role || "");
          setScopeText(prefill.scope_text || "");
          setRevisions(prefill.revisions || "");
          setStartDate(prefill.start_date || "");
          setDeliveryDate(prefill.delivery_date || "");
          setMilestones(prefill.milestones_text || "");
          setAmountTotal(
            prefill.amount_total !== null && prefill.amount_total !== undefined
              ? String(prefill.amount_total)
              : ""
          );
          setCurrency(prefill.currency || "CLP");
          setPaymentStructure(prefill.payment_structure || "");
          setCredits(prefill.credits_text || "");
          setCancellationPolicy(prefill.cancellation_policy || "sin costo");
          setConfidentiality(prefill.confidentiality_text || "");
          setAgreementStatus("draft");

          setGreenMap({
            producer_name: !!prefill.producer_name,
            producer_email: !!prefill.producer_email,
            participant_name: !!prefill.participant_name,
            participant_email: !!prefill.participant_email,
            role: !!prefill.role,
            scope_text: !!prefill.scope_text,
            start_date: !!prefill.start_date,
            delivery_date: !!prefill.delivery_date,
            amount_total:
              prefill.amount_total !== null && prefill.amount_total !== undefined,
            payment_structure: !!prefill.payment_structure,
            credits_text: !!prefill.credits_text,
            confidentiality_text: !!prefill.confidentiality_text,
          });
        }
      } catch (e: any) {
        if (!alive) return;
        setError(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadAgreement();

    return () => {
      alive = false;
    };
  }, [id, validId]);

  const saveAgreement = async (status: "draft" | "sent") => {
    try {
      setSaving(true);
      setError(null);
      setSaveMessage(null);

      await api(`/agreements/from-negotiation/${id}`, {
        method: "POST",
        body: JSON.stringify({
          producer_name: producerName,
          producer_email: producerEmail,
          participant_name: talentName,
          participant_email: talentEmail,

          role,
          scope_text: scopeText,
          revisions,

          start_date: startDate || undefined,
          delivery_date: deliveryDate || undefined,
          milestones_text: milestones,

          amount_total: amountTotal ? Number(amountTotal) : undefined,
          currency,
          payment_structure: paymentStructure,

          credits_text: credits,
          cancellation_policy: cancellationPolicy,
          confidentiality_text: confidentiality,

          status,
        }),
      });

      setAgreementStatus(status);
      setSaveMessage(
        status === "sent"
          ? "Acuerdo guardado y marcado como enviado."
          : "Acuerdo guardado correctamente."
      );
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  if (!validId) {
    return (
      <div className="p-6 text-sm text-rose-600">Negotiation id inválido.</div>
    );
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Cargando acuerdo...</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-rose-600">{error}</div>;
  }

  return (
    <div className="w-full bg-[#f2f2f0] px-4 py-6">
      <div className="mx-auto max-w-[1120px]">
        <button
          onClick={() => router.back()}
          className="mb-4 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black shadow-sm"
        >
          ← Volver
        </button>

        <div className="overflow-hidden rounded-[22px] border border-black/10 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <div className="bg-black px-6 py-4 text-white">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#f2c94c]">
              Acuerdo de participación
            </div>
            <div className="mt-1 text-xl font-black">
              {projectTitle || "Proyecto"} — generado desde negociación
            </div>
            <div className="mt-1 text-xs text-white/70">
              Los campos en verde vienen precompletados desde la negociación.
            </div>
          </div>

          <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-3 text-sm text-emerald-800">
            ✓ Parte de la información viene desde la oferta aceptada y el NDA firmado.
          </div>

          {saveMessage ? (
            <div className="border-b border-sky-200 bg-sky-50 px-6 py-3 text-sm text-sky-800">
              {saveMessage}
            </div>
          ) : null}

          <div className="px-6 py-6">
            <div className="space-y-7">
              <section>
                <SectionTitle number="1" title="Partes del acuerdo" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Productor"
                    value={producerName}
                    onChange={setProducerName}
                    green={greenMap.producer_name}
                  />
                  <Field
                    label="Talento"
                    value={talentName}
                    onChange={setTalentName}
                    green={greenMap.participant_name}
                  />
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Email productor"
                    value={producerEmail}
                    onChange={setProducerEmail}
                    green={greenMap.producer_email}
                  />
                  <Field
                    label="Email talento"
                    value={talentEmail}
                    onChange={setTalentEmail}
                    green={greenMap.participant_email}
                  />
                </div>
              </section>

              <section>
                <SectionTitle number="2" title="Alcance del trabajo" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Rol"
                    value={role}
                    onChange={setRole}
                    green={greenMap.role}
                  />
                  <Field
                    label="Revisiones incluidas"
                    value={revisions}
                    onChange={setRevisions}
                    placeholder="Ej: 2 rondas de cambios"
                  />
                </div>
                <div className="mt-4">
                  <Field
                    label="Descripción del trabajo"
                    value={scopeText}
                    onChange={setScopeText}
                    textarea
                    green={greenMap.scope_text}
                    placeholder="1 a 3 líneas sobre alcance del trabajo"
                  />
                </div>
              </section>

              <section>
                <SectionTitle number="3" title="Fechas y plazos" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Fecha de inicio"
                    value={startDate}
                    onChange={setStartDate}
                    green={greenMap.start_date}
                    type="date"
                  />
                  <Field
                    label="Fecha de entrega"
                    value={deliveryDate}
                    onChange={setDeliveryDate}
                    green={greenMap.delivery_date}
                    type="date"
                  />
                </div>
                <div className="mt-4">
                  <Field
                    label="Hitos intermedios"
                    value={milestones}
                    onChange={setMilestones}
                    placeholder="Ej: selección de material, revisión 1, entrega final"
                  />
                </div>
              </section>

              <section>
                <SectionTitle number="4" title="Monto y forma de pago" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Monto total acordado"
                    value={amountTotal}
                    onChange={setAmountTotal}
                    green={greenMap.amount_total}
                    placeholder="Ej: 850000"
                  />
                  <Field
                    label="Forma de pago"
                    value={paymentStructure}
                    onChange={setPaymentStructure}
                    green={greenMap.payment_structure}
                  />
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Moneda"
                    value={currency}
                    onChange={setCurrency}
                    placeholder="CLP"
                  />
                  <div className="flex items-end">
                    <div className="text-xs text-slate-500">
                      Fecha referencial:{" "}
                      {startDate ? formatDate(startDate) : "No definida"}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle number="5" title="Créditos" />
                <Field
                  label="¿Puede mostrar en portafolio?"
                  value={credits}
                  onChange={setCredits}
                  green={greenMap.credits_text}
                />
              </section>

              <section>
                <SectionTitle number="6" title="Cancelación" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Política de cancelación
                    </div>
                    <select
                      value={cancellationPolicy}
                      onChange={(e) => setCancellationPolicy(e.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-black outline-none"
                    >
                      <option value="sin costo">Sin costo</option>
                      <option value="50%">50%</option>
                      <option value="100%">100%</option>
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle number="7" title="Confidencialidad" />
                <Field
                  label="Referencia NDA"
                  value={confidentiality}
                  onChange={setConfidentiality}
                  green={greenMap.confidentiality_text}
                  textarea
                />
              </section>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-black/10 pt-5 sm:flex-row sm:justify-end">
              <div className="mr-auto flex items-center text-xs font-semibold text-slate-500">
                Estado actual: {agreementStatus}
              </div>

              <button
                type="button"
                onClick={() => saveAgreement("draft")}
                disabled={saving}
                className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar borrador"}
              </button>

              <button
                type="button"
                onClick={() => saveAgreement("sent")}
                disabled={saving}
                className="rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-[#f2c94c] disabled:opacity-50"
              >
                {saving ? "Enviando..." : "Firmar y enviar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}