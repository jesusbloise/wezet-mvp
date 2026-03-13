"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

type InvoiceStatus = "pending" | "paid" | "overdue";

type InvoiceRow = {
  id: string;
  client: string;
  amount: number;
  status: InvoiceStatus;
  date: string;

  currency?: string;
  number?: string;
  dueDate?: string;
  notes?: string;

  isAttached?: boolean;
  fileName?: string;

  quoteId?: string;
  projectId?: string;
  projectTitle?: string | null;
};

type ProjectLite = {
  id: string;
  title?: string | null;
};

type QuoteApiRow = {
  id: string;
  status: string;
  client_name: string | null;
  client_email: string | null;
  currency: string;
  total_amount: string | number;
  created_at: string;
};

type QuoteRow = {
  id: string;
  status: string;
  currency: string;
  amount: number;
  created_at: string;

  client: string | null;
  client_email: string | null;

  projectId: string;
  linkedProject: string | null;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function money(currency: string | null | undefined, amount: number) {
  const c = currency || "USD";
  return `${c} $${Math.round(amount || 0).toLocaleString()}`;
}

function Pill({
  tone,
  children,
}: {
  tone: "blue" | "amber" | "emerald" | "rose";
  children: React.ReactNode;
}) {
  const cls =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-200/60"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700 border-amber-200/60"
      : tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
      : "bg-rose-50 text-rose-700 border-rose-200/60";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl px-3 py-1 text-[11px] font-extrabold border",
        cls
      )}
    >
      {children}
    </span>
  );
}

function ModalShell({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}

function toNumber(v: string | number | null | undefined) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<
    "all" | InvoiceStatus
  >("all");

  // Crear documento (MVP)
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [invoiceAgreement, setInvoiceAgreement] = useState<QuoteRow | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  const [generatedInvoice, setGeneratedInvoice] = useState<InvoiceRow | null>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);

  // Adjuntar (MVP)
  const [showAttachModal, setShowAttachModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [attachedFileName, setAttachedFileName] = useState("");
  const [attachedFileClient, setAttachedFileClient] = useState("");
  const [attachedFileAmount, setAttachedFileAmount] = useState("");
  const [attachedFileDueDate, setAttachedFileDueDate] = useState("");

  // Quotes agregadas desde todos los proyectos
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [quotesLoaded, setQuotesLoaded] = useState(false);
  const [quotesLoading, setQuotesLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      // Cuando conectes invoices reales, cámbialo aquí.
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadQuotesFromAllProjects() {
    setQuotesLoading(true);
    setQuotesLoaded(false);

    try {
      const pr = await api<any>("/projects");

      const projects: ProjectLite[] =
        pr?.projects || pr?.items || pr?.data || (Array.isArray(pr) ? pr : []) || [];

      const results = await Promise.allSettled(
        (projects || []).map(async (p) => {
          const r = await api<{ ok: true; quotes: QuoteApiRow[] }>(
            `/projects/${p.id}/quotes`
          );
          const list = r?.quotes || [];

          return list.map((q) => ({
            id: q.id,
            status: q.status,
            currency: q.currency,
            amount: toNumber(q.total_amount),
            created_at: q.created_at,
            client: q.client_name,
            client_email: q.client_email,
            projectId: p.id,
            linkedProject: p.title ?? null,
          })) as QuoteRow[];
        })
      );

      const merged: QuoteRow[] = [];
      for (const res of results) {
        if (res.status === "fulfilled") merged.push(...res.value);
      }

      setQuotes(merged);
    } catch {
      setQuotes([]);
    } finally {
      setQuotesLoaded(true);
      setQuotesLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    loadQuotesFromAllProjects();
  }, []);

  const cobrableQuotes = useMemo(() => {
    const completed = quotes.filter(
      (q) => String(q.status).toLowerCase() === "completed"
    );
    return completed.filter((q) => !invoices.some((inv) => inv.quoteId === q.id));
  }, [quotes, invoices]);

  const stats = useMemo(() => {
    const all = invoices.length;
    const pending = invoices.filter((i) => i.status === "pending");
    const overdue = invoices.filter((i) => i.status === "overdue");
    const paid = invoices.filter((i) => i.status === "paid");
    return { all, pending: pending.length, overdue: overdue.length, paid: paid.length };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    if (invoiceStatusFilter === "all") return invoices;
    return invoices.filter((i) => i.status === invoiceStatusFilter);
  }, [invoiceStatusFilter, invoices]);

  function openCreate() {
    setInvoiceAgreement(null);
    setInvoiceNumber("");
    setInvoiceDueDate("");
    setInvoiceNotes("");
    setShowCreateInvoiceModal(true);
  }

  function openAttach() {
    setAttachedFileName("");
    setAttachedFileClient("");
    setAttachedFileAmount("");
    setAttachedFileDueDate("");
    setShowAttachModal(true);
  }

  function generateInvoiceFromAgreement() {
    if (!invoiceAgreement) return;

    const newInvoice: InvoiceRow = {
      id: String(Date.now()),
      client:
        invoiceAgreement.client || invoiceAgreement.client_email || "Cliente",
      amount: Number(invoiceAgreement.amount || 0),
      currency: invoiceAgreement.currency || "USD",
      status: "pending",
      date: invoiceDueDate || "Sin fecha",
      quoteId: invoiceAgreement.id,
      projectId: invoiceAgreement.projectId,
      projectTitle: invoiceAgreement.linkedProject,
      number: invoiceNumber.trim() || `DOC-${String(Date.now()).slice(-6)}`,
      dueDate: invoiceDueDate || "",
      notes: invoiceNotes || "",
    };

    setGeneratedInvoice(newInvoice);
    setShowInvoicePreview(true);
  }

  function saveGeneratedInvoice() {
    if (!generatedInvoice) return;
    setInvoices((prev) => [...prev, generatedInvoice]);
    setShowInvoicePreview(false);
    setGeneratedInvoice(null);
    setShowCreateInvoiceModal(false);
  }

  function saveAttachedInvoice() {
    if (!attachedFileName || !attachedFileClient || !attachedFileAmount) return;

    const amt = parseFloat(attachedFileAmount);
    const newInvoice: InvoiceRow = {
      id: String(Date.now()),
      client: attachedFileClient,
      amount: Number.isFinite(amt) ? amt : 0,
      status: "pending",
      date: attachedFileDueDate || "Sin fecha",
      isAttached: true,
      fileName: attachedFileName,
    };

    setInvoices((prev) => [...prev, newInvoice]);
    setShowAttachModal(false);
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-slate-800">
      <main className="px-5 sm:px-8 py-8">
        <div className="max-w-[900px]">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-[26px] font-black">Documentos de Cobro</h1>
              <p className="text-sm text-slate-500">Gestiona y rastrea tus cobros</p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap mb-6">
            <button
              type="button"
              onClick={openCreate}
              className="rounded-2xl px-5 py-3 text-sm font-extrabold text-white"
              style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
            >
              + Crear Documento
            </button>

            <button
              type="button"
              onClick={openAttach}
              className="rounded-2xl px-5 py-3 text-sm font-bold text-slate-800 bg-slate-200 hover:bg-slate-300/70 border border-white/30"
            >
              Adjuntar Documento
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setInvoiceStatusFilter("all")}
              className={cx(
                "rounded-2xl p-4 border text-left",
                invoiceStatusFilter === "all"
                  ? "text-white border-transparent"
                  : "bg-blue-50/60 border-blue-200/60"
              )}
              style={
                invoiceStatusFilter === "all"
                  ? { background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }
                  : undefined
              }
            >
              <div
                className={cx(
                  "text-xs font-extrabold",
                  invoiceStatusFilter === "all" ? "text-white/80" : "text-slate-500"
                )}
              >
                Todos
              </div>
              <div className="mt-1 text-2xl font-black">{stats.all}</div>
            </button>

            <button
              type="button"
              onClick={() => setInvoiceStatusFilter("pending")}
              className={cx(
                "rounded-2xl p-4 border text-left",
                invoiceStatusFilter === "pending"
                  ? "text-white border-transparent"
                  : "bg-amber-50/60 border-amber-200/60"
              )}
              style={
                invoiceStatusFilter === "pending"
                  ? { background: "linear-gradient(135deg,#f59e0b,#f97316)" }
                  : undefined
              }
            >
              <div
                className={cx(
                  "text-xs font-extrabold",
                  invoiceStatusFilter === "pending" ? "text-white/80" : "text-slate-500"
                )}
              >
                Pendiente
              </div>
              <div className="mt-1 text-2xl font-black">{stats.pending}</div>
            </button>

            <button
              type="button"
              onClick={() => setInvoiceStatusFilter("overdue")}
              className={cx(
                "rounded-2xl p-4 border text-left",
                invoiceStatusFilter === "overdue"
                  ? "text-white border-transparent"
                  : "bg-rose-50/60 border-rose-200/60"
              )}
              style={
                invoiceStatusFilter === "overdue"
                  ? { background: "linear-gradient(135deg,#e11d48,#ef4444)" }
                  : undefined
              }
            >
              <div
                className={cx(
                  "text-xs font-extrabold",
                  invoiceStatusFilter === "overdue" ? "text-white/80" : "text-slate-500"
                )}
              >
                Vencido
              </div>
              <div className="mt-1 text-2xl font-black">{stats.overdue}</div>
            </button>

            <button
              type="button"
              onClick={() => setInvoiceStatusFilter("paid")}
              className={cx(
                "rounded-2xl p-4 border text-left",
                invoiceStatusFilter === "paid"
                  ? "text-white border-transparent"
                  : "bg-emerald-50/60 border-emerald-200/60"
              )}
              style={
                invoiceStatusFilter === "paid"
                  ? { background: "linear-gradient(135deg,#10b981,#22c55e)" }
                  : undefined
              }
            >
              <div
                className={cx(
                  "text-xs font-extrabold",
                  invoiceStatusFilter === "paid" ? "text-white/80" : "text-slate-500"
                )}
              >
                Pagado
              </div>
              <div className="mt-1 text-2xl font-black">{stats.paid}</div>
            </button>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Cargando...
            </div>
          ) : invoices.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <div className="text-lg font-extrabold text-slate-900">
                No tienes documentos de cobro
              </div>
              <div className="text-sm text-slate-500 mt-2">
                Genera documentos desde cotizaciones completadas
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={openAttach}
                  className="rounded-2xl px-6 py-3 text-sm font-bold text-slate-800 bg-slate-200 hover:bg-slate-300/70"
                >
                  Adjuntar Documento
                </button>

                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-2xl px-6 py-3 text-sm font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
                >
                  Crear Documento
                </button>
              </div>

              <div className="mt-6 text-xs text-slate-500">
                {quotesLoading
                  ? "Cargando cotizaciones..."
                  : quotesLoaded
                  ? `Cotizaciones completadas cobrables: ${cobrableQuotes.length}`
                  : ""}
              </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <div className="text-sm text-slate-600">No hay documentos para este estado</div>
              <button
                type="button"
                onClick={() => setInvoiceStatusFilter("all")}
                className="mt-4 rounded-2xl px-5 py-2.5 text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
              >
                Ver todos
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredInvoices.map((inv) => (
                <div key={inv.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 truncate">
                        {inv.client}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {inv.isAttached ? `Adjunto: ${inv.fileName || "-"}` : `Cotización: ${inv.quoteId || "-"}`}
                      </div>
                      <div className="mt-2 text-xs text-slate-400">Fecha: {inv.date}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-slate-900">
                        {money(inv.currency, inv.amount)}
                      </div>
                      <div className="mt-1">
                        {inv.status === "pending" ? (
                          <Pill tone="amber">Pendiente</Pill>
                        ) : inv.status === "paid" ? (
                          <Pill tone="emerald">Pagado</Pill>
                        ) : (
                          <Pill tone="rose">Vencido</Pill>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Crear Documento */}
      <ModalShell open={showCreateInvoiceModal} onClose={() => setShowCreateInvoiceModal(false)}>
        <div className="bg-white rounded-[24px] w-[95%] max-w-[680px] border border-slate-200 shadow-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center">
                <span className="text-lg">💳</span>
              </div>
              <div>
                <div className="text-[20px] font-extrabold text-slate-900">Crear Documento de Cobro</div>
                <div className="text-sm text-slate-500">
                  Genera un documento de cobro a partir de una cotización aprobada
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-200/60 bg-blue-50 px-5 py-4 text-sm text-blue-700">
              <span className="font-bold">Nota:</span> Solo puedes generar documentos de cobro para cotizaciones{" "}
              <span className="font-bold">completadas</span>. Los acuerdos con talentos deben ser cobrados por ellos
              enviándote sus propios documentos.
            </div>

            <div className="mt-6">
              <div className="text-sm font-bold text-slate-700">Seleccionar Cotización *</div>

              {quotesLoading || !quotesLoaded ? (
                <div className="mt-4 text-sm text-slate-500">Cargando cotizaciones...</div>
              ) : cobrableQuotes.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
                  <div className="mx-auto mb-3 h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                    <span className="text-xl">📋</span>
                  </div>

                  <div className="text-sm font-semibold text-slate-700">
                    No tienes cotizaciones completadas para cobrar
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Crea una cotización primero</div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateInvoiceModal(false);
                      window.location.href = "/producer/projects";
                    }}
                    className="mt-5 inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-extrabold text-white"
                    style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
                  >
                    + Crear Cotización
                  </button>
                </div>
              ) : (
                <div className="mt-4 grid gap-2 max-h-[240px] overflow-y-auto pr-1">
                  {cobrableQuotes.map((q) => {
                    const selected = invoiceAgreement?.id === q.id;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setInvoiceAgreement(q)}
                        className={cx(
                          "w-full text-left rounded-2xl border p-4 transition",
                          selected
                            ? "bg-blue-50 border-blue-400"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-slate-900 truncate">
                              {q.linkedProject || "Cotización"}
                            </div>
                            {q.client ? (
                              <div className="mt-1 text-xs text-slate-500 truncate">
                                Cliente: {q.client}
                              </div>
                            ) : null}
                          </div>
                          <Pill tone="blue">Completada</Pill>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-[11px] text-slate-400 truncate">
                            Proyecto: {q.linkedProject || "-"}
                          </div>
                          <div className="text-sm font-extrabold text-blue-700">
                            {money(q.currency, q.amount)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {invoiceAgreement ? (
              <div className="mt-6 grid gap-4">
                <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50 px-5 py-4">
                  <div className="text-xs font-extrabold text-emerald-700 mb-1">Cotización seleccionada</div>
                  <div className="text-sm text-slate-900">
                    {invoiceAgreement.linkedProject || "Cotización"}{" "}
                    <strong>{money(invoiceAgreement.currency, invoiceAgreement.amount)}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-2 text-[13px] text-slate-600 font-semibold">
                      Número de Documento
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Ej: DOC-001"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-[13px] text-slate-600 font-semibold">
                      Fecha de Vencimiento
                    </label>
                    <input
                      type="date"
                      value={invoiceDueDate}
                      onChange={(e) => setInvoiceDueDate(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-[13px] text-slate-600 font-semibold">
                    Notas adicionales
                  </label>
                  <textarea
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    placeholder="Condiciones de pago, datos bancarios, etc."
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 resize-none"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="px-8 pb-8 pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setShowCreateInvoiceModal(false)}
              className="flex-1 rounded-2xl px-5 py-3 bg-slate-200 text-slate-900 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={generateInvoiceFromAgreement}
              disabled={!invoiceAgreement}
              className="flex-1 rounded-2xl px-5 py-3 text-white font-extrabold disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
            >
              Generar Documento
            </button>
          </div>
        </div>
      </ModalShell>

      {/* Modal Preview */}
      <ModalShell open={showInvoicePreview && !!generatedInvoice} onClose={() => setShowInvoicePreview(false)}>
        <div className="bg-white rounded-[20px] w-full max-w-[800px] max-h-[90vh] overflow-hidden border border-slate-200 shadow-2xl flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200">
            <div className="text-lg font-extrabold text-slate-900">Vista previa del documento</div>
            <div className="text-xs text-slate-500 mt-1">Revisa antes de guardar</div>
          </div>

          <div className="p-6 overflow-auto">
            {generatedInvoice ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {generatedInvoice.number || "Documento"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Cliente: {generatedInvoice.client}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900">
                      {money(generatedInvoice.currency, generatedInvoice.amount)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Vence: {generatedInvoice.dueDate || "Sin fecha"}
                    </div>
                  </div>
                </div>

                {generatedInvoice.notes ? (
                  <div className="mt-4 text-sm text-slate-700 whitespace-pre-wrap">
                    {generatedInvoice.notes}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="px-6 py-5 border-t border-slate-200 flex gap-3">
            <button
              type="button"
              onClick={() => setShowInvoicePreview(false)}
              className="flex-1 rounded-xl px-4 py-3 bg-slate-200 text-slate-900 font-semibold"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={saveGeneratedInvoice}
              className="flex-1 rounded-xl px-4 py-3 text-white font-extrabold"
              style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
            >
              Guardar Documento
            </button>
          </div>
        </div>
      </ModalShell>

      {/* Modal Adjuntar */}
      <ModalShell open={showAttachModal} onClose={() => setShowAttachModal(false)}>
        <div className="bg-white p-7 rounded-[20px] w-[90%] max-w-[480px] border border-slate-200 shadow-2xl">
          <h3 className="text-[20px] font-extrabold text-slate-900 mb-2">Adjuntar Documento</h3>
          <p className="text-sm text-slate-500 mb-6">Sube un documento de cobro existente</p>

          <div className="flex flex-col gap-4">
            <div
              className="p-8 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setAttachedFileName(file.name);
                }}
              />

              {attachedFileName ? (
                <div>
                  <div className="text-sm font-extrabold text-slate-900 mb-1">
                    Archivo seleccionado
                  </div>
                  <div className="text-emerald-700 font-semibold mb-1">{attachedFileName}</div>
                  <div className="text-xs text-slate-500">Click para cambiar archivo</div>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-extrabold text-slate-900 mb-1">Seleccionar archivo</div>
                  <div className="text-xs text-slate-500">PDF, PNG, JPG, DOC</div>
                </div>
              )}
            </div>

            <div>
              <label className="block mb-2 text-[13px] text-slate-600 font-semibold">
                Cliente <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={attachedFileClient}
                onChange={(e) => setAttachedFileClient(e.target.value)}
                placeholder="Nombre del cliente"
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-2 text-[13px] text-slate-600 font-semibold">
                  Monto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={attachedFileAmount}
                  onChange={(e) => setAttachedFileAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block mb-2 text-[13px] text-slate-600 font-semibold">
                  Vencimiento
                </label>
                <input
                  type="date"
                  value={attachedFileDueDate}
                  onChange={(e) => setAttachedFileDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setShowAttachModal(false)}
              className="flex-1 rounded-xl px-4 py-3 bg-slate-200 text-slate-900 font-semibold"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={saveAttachedInvoice}
              disabled={!attachedFileName || !attachedFileClient || !attachedFileAmount}
              className={cx(
                "flex-1 rounded-xl px-4 py-3 text-white font-extrabold",
                (!attachedFileName || !attachedFileClient || !attachedFileAmount) && "opacity-60 cursor-not-allowed"
              )}
              style={{
                background:
                  !attachedFileName || !attachedFileClient || !attachedFileAmount
                    ? "rgba(251,191,36,0.3)"
                    : "linear-gradient(135deg,#3b82f6,#0ea5e9)",
              }}
            >
              Guardar
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}