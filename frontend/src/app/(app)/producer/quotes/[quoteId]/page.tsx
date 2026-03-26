"use client";

import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M21.44 11.05l-8.49 8.49a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 1 1 5.66 5.65l-9.19 9.2a2 2 0 1 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5" />
    </svg>
  );
}

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function formatFileSize(bytes?: number | null) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

type Quote = {
  id: string;
  project_id: string;
  status: string;

  client_name: string | null;
  client_email: string | null;

  currency: string;
  subtotal: string | number;
  discount: string | number;
  tax_rate: string | number;
  tax_amount: string | number;
  total_amount: string | number;

  valid_until: string | null;
  notes: string | null;
  terms: string | null;

  public_id: string | null;

  attachment_name?: string | null;
  attachment_url?: string | null;
  attachment_mime_type?: string | null;

  created_at: string;
  updated_at: string;
};

type QuoteItem = {
  id: string;
  title: string;
  description: string | null;
  qty: string | number;
  unit_price: string | number;
  line_total: string | number;
  sort_order: number;
};

function statusBadge(status?: string) {
  const s = String(status || "").toLowerCase();
  const base =
    "inline-flex items-center rounded-xl border px-3 py-1 text-[11px] font-bold";

  if (s === "draft") {
    return `${base} border-violet-500/20 bg-violet-500/10 text-violet-300`;
  }
  if (s === "sent") {
    return `${base} border-sky-500/20 bg-sky-500/10 text-sky-300`;
  }
  if (s === "accepted") {
    return `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-300`;
  }
  if (s === "rejected") {
    return `${base} border-rose-500/20 bg-rose-500/10 text-rose-300`;
  }
  if (s === "archived") {
    return `${base} border-slate-500/20 bg-slate-500/10 text-slate-300`;
  }

  return `${base} border-white/10 bg-white/[0.04] text-slate-300`;
}

const darkInput =
  "mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-[#f2c94c]/10";

const card =
  "rounded-3xl border border-white/10 bg-[#101827]/95 shadow-[0_10px_40px_rgba(0,0,0,0.25)]";
const section =
  "rounded-2xl border border-white/10 bg-white/[0.04] p-5";
const softCard =
  "rounded-2xl border border-white/10 bg-white/[0.04] p-4";

export default function QuoteDetailPage() {
  const params = useParams<{ quoteId: string }>();
  const router = useRouter();
  const quoteId = params?.quoteId || "";

  const validId = useMemo(() => isUuid(quoteId), [quoteId]);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [currency, setCurrency] = useState("CLP");
  const [discount, setDiscount] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentMimeType, setAttachmentMimeType] = useState("");
  const [newAttachmentFile, setNewAttachmentFile] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemUnit, setItemUnit] = useState("0");

  const [saving, setSaving] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deletingQuote, setDeletingQuote] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const r = await api<{ ok: true; quote: Quote; items: QuoteItem[] }>(`/quotes/${quoteId}`);
      setQuote(r.quote);
      setItems(r.items || []);

      setClientName(r.quote.client_name || "");
      setClientEmail(r.quote.client_email || "");
      setCurrency(r.quote.currency || "CLP");
      setDiscount(String(r.quote.discount ?? 0));
      setTaxRate(String(r.quote.tax_rate ?? 0));
      setValidUntil(r.quote.valid_until || "");
      setNotes(r.quote.notes || "");
      setTerms(r.quote.terms || "");

      setAttachmentName(r.quote.attachment_name || "");
      setAttachmentUrl(r.quote.attachment_url || "");
      setAttachmentMimeType(r.quote.attachment_mime_type || "");
      setNewAttachmentFile(null);
      setAttachmentError(null);
    } catch (e: any) {
      setError(String(e.message || e));
    }
  };

  useEffect(() => {
    if (!quoteId) return;
    if (!validId) {
      setError("ID de cotización inválido.");
      return;
    }
    load();
  }, [quoteId, validId]);

  const handleAttachmentChange = (file: File | null) => {
    setAttachmentError(null);

    if (!file) {
      setNewAttachmentFile(null);
      return;
    }

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      setNewAttachmentFile(null);
      setAttachmentError("El archivo supera el límite de 15 MB.");
      return;
    }

    setNewAttachmentFile(file);
  };

  const clearLocalAttachmentSelection = () => {
    setNewAttachmentFile(null);
    setAttachmentError(null);
  };

  const removeStoredAttachment = () => {
    setAttachmentName("");
    setAttachmentUrl("");
    setAttachmentMimeType("");
    setNewAttachmentFile(null);
    setAttachmentError(null);
  };

  const saveQuote = async () => {
    if (!quote) return;
    setSaving(true);
    setError(null);

    try {
      const nextAttachmentName =
        newAttachmentFile?.name || attachmentName || undefined;

      const nextAttachmentMimeType =
        newAttachmentFile?.type || attachmentMimeType || undefined;

      const nextAttachmentUrl =
        newAttachmentFile ? attachmentUrl || undefined : attachmentUrl || undefined;

      const r = await api(`/quotes/${quoteId}`, {
        method: "PATCH",
        body: JSON.stringify({
          client_name: clientName || undefined,
          client_email: clientEmail || undefined,
          currency: currency || undefined,
          discount: Number(discount || "0"),
          tax_rate: Number(taxRate || "0"),
          valid_until: validUntil || undefined,
          notes: notes || undefined,
          terms: terms || undefined,
          attachment_name: nextAttachmentName,
          attachment_url: nextAttachmentUrl,
          attachment_mime_type: nextAttachmentMimeType,
        }),
      });

      await load();
      return r;
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const addItem = async () => {
    if (!itemTitle.trim()) return;
    setAddingItem(true);
    setError(null);
    try {
      await api(`/quotes/${quoteId}/items`, {
        method: "POST",
        body: JSON.stringify({
          title: itemTitle,
          description: itemDesc || undefined,
          qty: Number(itemQty || "1"),
          unit_price: Number(itemUnit || "0"),
          sort_order: items.length,
        }),
      });

      setItemTitle("");
      setItemDesc("");
      setItemQty("1");
      setItemUnit("0");

      await load();
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setAddingItem(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      await api(`/quotes/${quoteId}/publish`, { method: "POST" });
      await load();
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setPublishing(false);
    }
  };

  const deleteQuote = async () => {
    if (!quote) return;

    const ok = window.confirm(
      "¿Seguro que deseas eliminar esta cotización? Esta acción no se puede deshacer."
    );
    if (!ok) return;

    setDeletingQuote(true);
    setError(null);

    try {
      await api(`/quotes/${quoteId}`, { method: "DELETE" });
      router.push(`/producer/projects/${quote.project_id}?tab=quotes`);
    } catch (e: any) {
      setError(String(e.message || e));
      setDeletingQuote(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    const ok = window.confirm(
      "¿Seguro que deseas eliminar este servicio de la cotización?"
    );
    if (!ok) return;

    setDeletingItemId(itemId);
    setError(null);

    try {
      await api(`/quotes/${quoteId}/items/${itemId}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setDeletingItemId(null);
    }
  };

  if (!quoteId) return <div className="p-6 text-slate-300">Cargando...</div>;

  const currentAttachmentName =
    newAttachmentFile?.name || attachmentName || "";

  const currentAttachmentMimeType =
    newAttachmentFile?.type || attachmentMimeType || "";

  const hasAttachment =
    !!newAttachmentFile || !!attachmentName || !!attachmentUrl;

  return (
    <div className="w-full">
      <div className="mx-auto max-w-[980px]">
        <button
          className="mb-4 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.09]"
          onClick={() => router.back()}
        >
          ← Volver
        </button>

        <div className={`${card} overflow-hidden`}>
          <div className="border-b border-white/10 bg-[#0d1422] px-6 py-6 sm:px-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-[28px] font-black tracking-tight text-white">
                  Cotización
                </div>

                <div className="mt-2 text-sm text-slate-500">
                  ID: <span className="font-mono">{quoteId}</span>
                </div>

                {quote ? (
                  <div className="mt-3">
                    <span className={statusBadge(quote.status)}>{quote.status}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.1]"
                  onClick={saveQuote}
                  disabled={saving || !quote}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>

                <button
                  className="rounded-2xl px-4 py-3 text-sm font-bold text-[#0b0f17] disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                  onClick={publish}
                  disabled={publishing || !quote}
                >
                  {publishing ? "Publicando..." : "Publicar"}
                </button>

                <button
                  className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-50"
                  onClick={deleteQuote}
                  disabled={deletingQuote || !quote}
                >
                  {deletingQuote ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>

            {quote?.public_id ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-bold text-white">Link público</div>
                <div className="mt-1 text-xs text-slate-400">
                  <a className="text-[#f2c94c] underline" href={`/quote/${quote.public_id}`} target="_blank">
                    /quote/{quote.public_id}
                  </a>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Esta vista es para el cliente y no muestra información interna del proyecto.
                </div>
              </div>
            ) : (
              <div className="mt-5 text-xs text-slate-500">
                Aún no hay link público. Presiona <b className="text-slate-300">Publicar</b> para generarlo.
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            {!validId && <div className="mt-4 text-sm text-rose-300">ID inválido</div>}
            {!quote && validId && <div className="mt-4 text-sm text-slate-500">Cargando cotización…</div>}
          </div>

          {quote ? (
            <div className="space-y-5 px-6 py-6 sm:px-7">
              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div className={section}>
                  <div className="text-lg font-extrabold text-white">Cliente</div>

                  <div className="mt-4 grid gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-300">Nombre</div>
                      <input
                        className={darkInput}
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-slate-300">Email</div>
                      <input
                        className={darkInput}
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-300">Moneda</div>
                        <input
                          className={darkInput}
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                        />
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-slate-300">Válido hasta</div>
                        <input
                          type="date"
                          className={darkInput}
                          value={validUntil}
                          onChange={(e) => setValidUntil(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-300">Descuento</div>
                        <input
                          className={darkInput}
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                        />
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-slate-300">Impuesto (0.19)</div>
                        <input
                          className={darkInput}
                          value={taxRate}
                          onChange={(e) => setTaxRate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`${section} h-fit`}>
                  <div className="text-lg font-extrabold text-white">Totales</div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Subtotal</span>
                      <span className="font-bold text-white">
                        {currency} {n(quote.subtotal).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Descuento</span>
                      <span className="font-bold text-white">
                        - {currency} {n(quote.discount).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Impuesto</span>
                      <span className="font-bold text-white">
                        {currency} {n(quote.tax_amount).toFixed(2)}
                      </span>
                    </div>

                    <div className="border-t border-white/10 pt-3" />

                    <div className="flex justify-between text-base">
                      <span className="font-extrabold text-white">Total</span>
                      <span className="font-extrabold text-[#f2c94c]">
                        {currency} {n(quote.total_amount).toFixed(2)}
                      </span>
                    </div>

                    <div className="pt-1 text-xs text-slate-500">
                      Los totales se recalculan cuando guardas la cotización o agregas servicios.
                    </div>
                  </div>
                </div>
              </div>

              <div className={section}>
                <div className="text-lg font-extrabold text-white">Adjunto referencial</div>
                <div className="mt-1 text-sm text-slate-500">
                  Aquí puedes ver el archivo actual o preparar uno nuevo para reemplazarlo.
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-[#0d1320] p-4">
                  {!hasAttachment ? (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center transition hover:bg-white/[0.05]">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] text-[#f2c94c]">
                        <PaperclipIcon />
                      </span>
                      <div>
                        <div className="text-sm font-bold text-white">
                          Seleccionar archivo
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          PDF, Word, Excel, imágenes u otro respaldo del detalle
                        </div>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleAttachmentChange(e.target.files?.[0] || null)}
                      />
                    </label>
                  ) : (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-bold text-white">
                            <FileIcon />
                            <span className="truncate">{currentAttachmentName || "Archivo adjunto"}</span>
                          </div>

                          <div className="mt-1 text-xs text-slate-300">
                            {newAttachmentFile
                              ? formatFileSize(newAttachmentFile.size)
                              : currentAttachmentMimeType || "Archivo guardado"}
                          </div>

                          {!newAttachmentFile && attachmentUrl ? (
                            <a
                              href={attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-block text-xs font-semibold text-[#f2c94c] underline"
                            >
                              Ver archivo actual
                            </a>
                          ) : null}

                          {newAttachmentFile ? (
                            <div className="mt-2 text-xs text-emerald-200">
                              Hay un nuevo archivo seleccionado. Guarda la cotización para aplicar el cambio.
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-col gap-2">
                          {newAttachmentFile ? (
                            <button
                              type="button"
                              onClick={clearLocalAttachmentSelection}
                              className="rounded-xl bg-rose-500/12 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/18"
                            >
                              Quitar selección
                            </button>
                          ) : null}

                          {!newAttachmentFile && (attachmentName || attachmentUrl) ? (
                            <button
                              type="button"
                              onClick={removeStoredAttachment}
                              className="rounded-xl bg-rose-500/12 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/18"
                            >
                              Quitar adjunto
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <label className="mt-3 inline-flex cursor-pointer rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/[0.08]">
                        {newAttachmentFile || attachmentName ? "Cambiar archivo" : "Seleccionar archivo"}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleAttachmentChange(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  )}

                  {attachmentError ? (
                    <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                      {attachmentError}
                    </div>
                  ) : null}

                  <div className="mt-3 text-xs text-slate-500">
                    Por ahora el cambio del archivo queda como metadato visible. En el siguiente paso conectamos la subida real al storage para que también se reemplace la URL automáticamente.
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className={section}>
                  <div className="text-lg font-extrabold text-white">Notas</div>
                  <textarea
                    className="mt-3 min-h-[150px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:bg-white/[0.07] focus:ring-2 focus:ring-[#f2c94c]/10"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className={section}>
                  <div className="text-lg font-extrabold text-white">Términos</div>
                  <textarea
                    className="mt-3 min-h-[150px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:bg-white/[0.07] focus:ring-2 focus:ring-[#f2c94c]/10"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                  />
                </div>
              </div>

              <div className={section}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-lg font-extrabold text-white">Servicios personalizados</div>
                    <div className="text-sm text-slate-500">
                      Agrega manualmente los servicios o entregables de esta cotización.
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-300">Nombre del servicio</div>
                      <input
                        className={darkInput}
                        value={itemTitle}
                        onChange={(e) => setItemTitle(e.target.value)}
                        placeholder="Ej: Edición de video + color"
                      />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-slate-300">Descripción</div>
                      <input
                        className={darkInput}
                        value={itemDesc}
                        onChange={(e) => setItemDesc(e.target.value)}
                        placeholder="Detalle del servicio"
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-300">Cantidad</div>
                      <input
                        className={darkInput}
                        value={itemQty}
                        onChange={(e) => setItemQty(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-slate-300">Valor unitario</div>
                      <input
                        className={darkInput}
                        value={itemUnit}
                        onChange={(e) => setItemUnit(e.target.value)}
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-[#0b0f17] disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                        disabled={addingItem || !itemTitle.trim()}
                        onClick={addItem}
                      >
                        {addingItem ? "Agregando..." : "Agregar servicio"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {items.map((it) => (
                    <div key={it.id} className={softCard}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-extrabold text-white">{it.title}</div>
                          {it.description ? (
                            <div className="mt-1 text-sm text-slate-400">{it.description}</div>
                          ) : null}
                          <div className="mt-2 text-xs text-slate-500">
                            Qty: {it.qty} • Unit: {currency} {n(it.unit_price).toFixed(2)}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-xs text-slate-500">Total</div>
                          <div className="font-extrabold text-[#f2c94c]">
                            {currency} {n(it.line_total).toFixed(2)}
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteItem(it.id)}
                            disabled={deletingItemId === it.id}
                            className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-50"
                          >
                            {deletingItemId === it.id ? "Eliminando..." : "Eliminar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-slate-500">
                      Aún no hay servicios en esta cotización. Agrega el primero arriba.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}


// "use client";

// import { api } from "@/lib/api";
// import { useParams, useRouter } from "next/navigation";
// import { useEffect, useMemo, useState } from "react";

// function isUuid(v: string) {
//   return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
// }

// function PaperclipIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M21.44 11.05l-8.49 8.49a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 1 1 5.66 5.65l-9.19 9.2a2 2 0 1 1-2.83-2.83l8.49-8.48" />
//     </svg>
//   );
// }

// function FileIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
//       <path d="M14 2v5h5" />
//     </svg>
//   );
// }

// function n(v: any) {
//   const x = Number(v);
//   return Number.isFinite(x) ? x : 0;
// }

// function formatFileSize(bytes?: number | null) {
//   if (bytes == null) return "—";
//   if (bytes < 1024) return `${bytes} B`;
//   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
//   if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
//   return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
// }

// type Quote = {
//   id: string;
//   project_id: string;
//   status: string;

//   client_name: string | null;
//   client_email: string | null;

//   currency: string;
//   subtotal: string | number;
//   discount: string | number;
//   tax_rate: string | number;
//   tax_amount: string | number;
//   total_amount: string | number;

//   valid_until: string | null;
//   notes: string | null;
//   terms: string | null;

//   public_id: string | null;

//   attachment_name?: string | null;
//   attachment_url?: string | null;
//   attachment_mime_type?: string | null;

//   created_at: string;
//   updated_at: string;
// };

// type QuoteItem = {
//   id: string;
//   title: string;
//   description: string | null;
//   qty: string | number;
//   unit_price: string | number;
//   line_total: string | number;
//   sort_order: number;
// };

// function statusBadge(status?: string) {
//   const s = String(status || "").toLowerCase();
//   const base =
//     "inline-flex items-center rounded-xl border px-3 py-1 text-[11px] font-bold";

//   if (s === "draft") {
//     return `${base} border-violet-500/20 bg-violet-500/10 text-violet-300`;
//   }
//   if (s === "sent") {
//     return `${base} border-sky-500/20 bg-sky-500/10 text-sky-300`;
//   }
//   if (s === "accepted") {
//     return `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-300`;
//   }
//   if (s === "rejected") {
//     return `${base} border-rose-500/20 bg-rose-500/10 text-rose-300`;
//   }
//   if (s === "archived") {
//     return `${base} border-slate-500/20 bg-slate-500/10 text-slate-300`;
//   }

//   return `${base} border-white/10 bg-white/[0.04] text-slate-300`;
// }

// const darkInput =
//   "mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-[#f2c94c]/10";

// const card =
//   "rounded-3xl border border-white/10 bg-[#101827]/95 shadow-[0_10px_40px_rgba(0,0,0,0.25)]";
// const section =
//   "rounded-2xl border border-white/10 bg-white/[0.04] p-5";
// const softCard =
//   "rounded-2xl border border-white/10 bg-white/[0.04] p-4";

// export default function QuoteDetailPage() {
//   const params = useParams<{ quoteId: string }>();
//   const router = useRouter();
//   const quoteId = params?.quoteId || "";

//   const validId = useMemo(() => isUuid(quoteId), [quoteId]);

//   const [quote, setQuote] = useState<Quote | null>(null);
//   const [items, setItems] = useState<QuoteItem[]>([]);
//   const [error, setError] = useState<string | null>(null);

//   const [clientName, setClientName] = useState("");
//   const [clientEmail, setClientEmail] = useState("");
//   const [currency, setCurrency] = useState("CLP");
//   const [discount, setDiscount] = useState("0");
//   const [taxRate, setTaxRate] = useState("0");
//   const [validUntil, setValidUntil] = useState("");
//   const [notes, setNotes] = useState("");
//   const [terms, setTerms] = useState("");

//   const [attachmentName, setAttachmentName] = useState("");
//   const [attachmentUrl, setAttachmentUrl] = useState("");
//   const [attachmentMimeType, setAttachmentMimeType] = useState("");
//   const [newAttachmentFile, setNewAttachmentFile] = useState<File | null>(null);
//   const [attachmentError, setAttachmentError] = useState<string | null>(null);

//   const [itemTitle, setItemTitle] = useState("");
//   const [itemDesc, setItemDesc] = useState("");
//   const [itemQty, setItemQty] = useState("1");
//   const [itemUnit, setItemUnit] = useState("0");

//   const [saving, setSaving] = useState(false);
//   const [addingItem, setAddingItem] = useState(false);
//   const [publishing, setPublishing] = useState(false);
//   const [deletingQuote, setDeletingQuote] = useState(false);
//   const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

//   const load = async () => {
//     setError(null);
//     try {
//       const r = await api<{ ok: true; quote: Quote; items: QuoteItem[] }>(`/quotes/${quoteId}`);
//       setQuote(r.quote);
//       setItems(r.items || []);

//       setClientName(r.quote.client_name || "");
//       setClientEmail(r.quote.client_email || "");
//       setCurrency(r.quote.currency || "CLP");
//       setDiscount(String(r.quote.discount ?? 0));
//       setTaxRate(String(r.quote.tax_rate ?? 0));
//       setValidUntil(r.quote.valid_until || "");
//       setNotes(r.quote.notes || "");
//       setTerms(r.quote.terms || "");

//       setAttachmentName(r.quote.attachment_name || "");
//       setAttachmentUrl(r.quote.attachment_url || "");
//       setAttachmentMimeType(r.quote.attachment_mime_type || "");
//       setNewAttachmentFile(null);
//       setAttachmentError(null);
//     } catch (e: any) {
//       setError(String(e.message || e));
//     }
//   };

//   useEffect(() => {
//     if (!quoteId) return;
//     if (!validId) {
//       setError("ID de cotización inválido.");
//       return;
//     }
//     load();
//   }, [quoteId, validId]);

//   const handleAttachmentChange = (file: File | null) => {
//     setAttachmentError(null);

//     if (!file) {
//       setNewAttachmentFile(null);
//       return;
//     }

//     const maxSize = 15 * 1024 * 1024;
//     if (file.size > maxSize) {
//       setNewAttachmentFile(null);
//       setAttachmentError("El archivo supera el límite de 15 MB.");
//       return;
//     }

//     setNewAttachmentFile(file);
//   };

//   const clearLocalAttachmentSelection = () => {
//     setNewAttachmentFile(null);
//     setAttachmentError(null);
//   };

//   const saveQuote = async () => {
//     if (!quote) return;
//     setSaving(true);
//     setError(null);

//     try {
//       const nextAttachmentName =
//         newAttachmentFile?.name || attachmentName || undefined;

//       const nextAttachmentMimeType =
//         newAttachmentFile?.type || attachmentMimeType || undefined;

//       const nextAttachmentUrl =
//         newAttachmentFile ? undefined : attachmentUrl || undefined;

//       const r = await api(`/quotes/${quoteId}`, {
//         method: "PATCH",
//         body: JSON.stringify({
//           client_name: clientName || undefined,
//           client_email: clientEmail || undefined,
//           currency: currency || undefined,
//           discount: Number(discount || "0"),
//           tax_rate: Number(taxRate || "0"),
//           valid_until: validUntil || undefined,
//           notes: notes || undefined,
//           terms: terms || undefined,
//           attachment_name: nextAttachmentName,
//           attachment_url: nextAttachmentUrl,
//           attachment_mime_type: nextAttachmentMimeType,
//         }),
//       });

//       await load();
//       return r;
//     } catch (e: any) {
//       setError(String(e.message || e));
//     } finally {
//       setSaving(false);
//     }
//   };

//   const addItem = async () => {
//     if (!itemTitle.trim()) return;
//     setAddingItem(true);
//     setError(null);
//     try {
//       await api(`/quotes/${quoteId}/items`, {
//         method: "POST",
//         body: JSON.stringify({
//           title: itemTitle,
//           description: itemDesc || undefined,
//           qty: Number(itemQty || "1"),
//           unit_price: Number(itemUnit || "0"),
//           sort_order: items.length,
//         }),
//       });

//       setItemTitle("");
//       setItemDesc("");
//       setItemQty("1");
//       setItemUnit("0");

//       await load();
//     } catch (e: any) {
//       setError(String(e.message || e));
//     } finally {
//       setAddingItem(false);
//     }
//   };

//   const publish = async () => {
//     setPublishing(true);
//     setError(null);
//     try {
//       await api(`/quotes/${quoteId}/publish`, { method: "POST" });
//       await load();
//     } catch (e: any) {
//       setError(String(e.message || e));
//     } finally {
//       setPublishing(false);
//     }
//   };

//   const deleteQuote = async () => {
//     if (!quote) return;

//     const ok = window.confirm(
//       "¿Seguro que deseas eliminar esta cotización? Esta acción no se puede deshacer."
//     );
//     if (!ok) return;

//     setDeletingQuote(true);
//     setError(null);

//     try {
//       await api(`/quotes/${quoteId}`, { method: "DELETE" });
//       router.push(`/producer/projects/${quote.project_id}?tab=quotes`);
//     } catch (e: any) {
//       setError(String(e.message || e));
//       setDeletingQuote(false);
//     }
//   };

//   const deleteItem = async (itemId: string) => {
//     const ok = window.confirm(
//       "¿Seguro que deseas eliminar este servicio de la cotización?"
//     );
//     if (!ok) return;

//     setDeletingItemId(itemId);
//     setError(null);

//     try {
//       await api(`/quotes/${quoteId}/items/${itemId}`, { method: "DELETE" });
//       await load();
//     } catch (e: any) {
//       setError(String(e.message || e));
//     } finally {
//       setDeletingItemId(null);
//     }
//   };

//   if (!quoteId) return <div className="p-6 text-slate-300">Cargando...</div>;

//   const currentAttachmentName =
//     newAttachmentFile?.name || attachmentName || "";

//   const currentAttachmentMimeType =
//     newAttachmentFile?.type || attachmentMimeType || "";

//   const hasAttachment =
//     !!newAttachmentFile || !!attachmentName || !!attachmentUrl;

//   return (
//     <div className="w-full">
//       <div className="mx-auto max-w-[980px]">
//         <button
//           className="mb-4 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.09]"
//           onClick={() => router.back()}
//         >
//           ← Volver
//         </button>

//         <div className={`${card} overflow-hidden`}>
//           <div className="border-b border-white/10 bg-[#0d1422] px-6 py-6 sm:px-7">
//             <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
//               <div className="min-w-0">
//                 <div className="text-[28px] font-black tracking-tight text-white">
//                   Cotización
//                 </div>

//                 <div className="mt-2 text-sm text-slate-500">
//                   ID: <span className="font-mono">{quoteId}</span>
//                 </div>

//                 {quote ? (
//                   <div className="mt-3">
//                     <span className={statusBadge(quote.status)}>{quote.status}</span>
//                   </div>
//                 ) : null}
//               </div>

//               <div className="flex flex-wrap gap-2">
//                 <button
//                   className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.1]"
//                   onClick={saveQuote}
//                   disabled={saving || !quote}
//                 >
//                   {saving ? "Guardando..." : "Guardar"}
//                 </button>

//                 <button
//                   className="rounded-2xl px-4 py-3 text-sm font-bold text-[#0b0f17] disabled:opacity-50"
//                   style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//                   onClick={publish}
//                   disabled={publishing || !quote}
//                 >
//                   {publishing ? "Publicando..." : "Publicar"}
//                 </button>

//                 <button
//                   className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-50"
//                   onClick={deleteQuote}
//                   disabled={deletingQuote || !quote}
//                 >
//                   {deletingQuote ? "Eliminando..." : "Eliminar"}
//                 </button>
//               </div>
//             </div>

//             {quote?.public_id ? (
//               <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
//                 <div className="text-sm font-bold text-white">Link público</div>
//                 <div className="mt-1 text-xs text-slate-400">
//                   <a className="text-[#f2c94c] underline" href={`/quote/${quote.public_id}`} target="_blank">
//                     /quote/{quote.public_id}
//                   </a>
//                 </div>
//                 <div className="mt-1 text-xs text-slate-500">
//                   Esta vista es para el cliente y no muestra información interna del proyecto.
//                 </div>
//               </div>
//             ) : (
//               <div className="mt-5 text-xs text-slate-500">
//                 Aún no hay link público. Presiona <b className="text-slate-300">Publicar</b> para generarlo.
//               </div>
//             )}

//             {error && (
//               <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
//                 {error}
//               </div>
//             )}

//             {!validId && <div className="mt-4 text-sm text-rose-300">ID inválido</div>}
//             {!quote && validId && <div className="mt-4 text-sm text-slate-500">Cargando cotización…</div>}
//           </div>

//           {quote ? (
//             <div className="space-y-5 px-6 py-6 sm:px-7">
//               <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
//                 <div className={section}>
//                   <div className="text-lg font-extrabold text-white">Cliente</div>

//                   <div className="mt-4 grid gap-3">
//                     <div>
//                       <div className="text-sm font-semibold text-slate-300">Nombre</div>
//                       <input
//                         className={darkInput}
//                         value={clientName}
//                         onChange={(e) => setClientName(e.target.value)}
//                       />
//                     </div>

//                     <div>
//                       <div className="text-sm font-semibold text-slate-300">Email</div>
//                       <input
//                         className={darkInput}
//                         value={clientEmail}
//                         onChange={(e) => setClientEmail(e.target.value)}
//                       />
//                     </div>

//                     <div className="grid grid-cols-2 gap-3">
//                       <div>
//                         <div className="text-sm font-semibold text-slate-300">Moneda</div>
//                         <input
//                           className={darkInput}
//                           value={currency}
//                           onChange={(e) => setCurrency(e.target.value)}
//                         />
//                       </div>

//                       <div>
//                         <div className="text-sm font-semibold text-slate-300">Válido hasta</div>
//                         <input
//                           type="date"
//                           className={darkInput}
//                           value={validUntil}
//                           onChange={(e) => setValidUntil(e.target.value)}
//                         />
//                       </div>
//                     </div>

//                     <div className="grid grid-cols-2 gap-3">
//                       <div>
//                         <div className="text-sm font-semibold text-slate-300">Descuento</div>
//                         <input
//                           className={darkInput}
//                           value={discount}
//                           onChange={(e) => setDiscount(e.target.value)}
//                         />
//                       </div>

//                       <div>
//                         <div className="text-sm font-semibold text-slate-300">Impuesto (0.19)</div>
//                         <input
//                           className={darkInput}
//                           value={taxRate}
//                           onChange={(e) => setTaxRate(e.target.value)}
//                         />
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 <div className={`${section} h-fit`}>
//                   <div className="text-lg font-extrabold text-white">Totales</div>

//                   <div className="mt-5 space-y-3 text-sm">
//                     <div className="flex justify-between">
//                       <span className="text-slate-400">Subtotal</span>
//                       <span className="font-bold text-white">
//                         {currency} {n(quote.subtotal).toFixed(2)}
//                       </span>
//                     </div>

//                     <div className="flex justify-between">
//                       <span className="text-slate-400">Descuento</span>
//                       <span className="font-bold text-white">
//                         - {currency} {n(quote.discount).toFixed(2)}
//                       </span>
//                     </div>

//                     <div className="flex justify-between">
//                       <span className="text-slate-400">Impuesto</span>
//                       <span className="font-bold text-white">
//                         {currency} {n(quote.tax_amount).toFixed(2)}
//                       </span>
//                     </div>

//                     <div className="border-t border-white/10 pt-3" />

//                     <div className="flex justify-between text-base">
//                       <span className="font-extrabold text-white">Total</span>
//                       <span className="font-extrabold text-[#f2c94c]">
//                         {currency} {n(quote.total_amount).toFixed(2)}
//                       </span>
//                     </div>

//                     <div className="pt-1 text-xs text-slate-500">
//                       Los totales se recalculan cuando guardas la cotización o agregas servicios.
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               <div className={section}>
//                 <div className="text-lg font-extrabold text-white">Adjunto referencial</div>
//                 <div className="mt-1 text-sm text-slate-500">
//                   Aquí puedes ver el archivo actual o preparar uno nuevo para reemplazarlo.
//                 </div>

//                 <div className="mt-4 rounded-2xl border border-white/10 bg-[#0d1320] p-4">
//                   {!hasAttachment ? (
//                     <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center transition hover:bg-white/[0.05]">
//                       <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] text-[#f2c94c]">
//                         <PaperclipIcon />
//                       </span>
//                       <div>
//                         <div className="text-sm font-bold text-white">
//                           Seleccionar archivo
//                         </div>
//                         <div className="mt-1 text-xs text-slate-500">
//                           PDF, Word, Excel, imágenes u otro respaldo del detalle
//                         </div>
//                       </div>
//                       <input
//                         type="file"
//                         className="hidden"
//                         onChange={(e) => handleAttachmentChange(e.target.files?.[0] || null)}
//                       />
//                     </label>
//                   ) : (
//                     <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
//                       <div className="flex items-start justify-between gap-3">
//                         <div className="min-w-0">
//                           <div className="flex items-center gap-2 text-sm font-bold text-white">
//                             <FileIcon />
//                             <span className="truncate">{currentAttachmentName || "Archivo adjunto"}</span>
//                           </div>

//                           <div className="mt-1 text-xs text-slate-300">
//                             {newAttachmentFile
//                               ? formatFileSize(newAttachmentFile.size)
//                               : currentAttachmentMimeType || "Archivo guardado"}
//                           </div>

//                           {!newAttachmentFile && attachmentUrl ? (
//                             <a
//                               href={attachmentUrl}
//                               target="_blank"
//                               rel="noreferrer"
//                               className="mt-2 inline-block text-xs font-semibold text-[#f2c94c] underline"
//                             >
//                               Ver archivo actual
//                             </a>
//                           ) : null}

//                           {newAttachmentFile ? (
//                             <div className="mt-2 text-xs text-emerald-200">
//                               Hay un nuevo archivo seleccionado. Guarda la cotización para aplicar el cambio.
//                             </div>
//                           ) : null}
//                         </div>

//                         {newAttachmentFile ? (
//                           <button
//                             type="button"
//                             onClick={clearLocalAttachmentSelection}
//                             className="rounded-xl bg-rose-500/12 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/18"
//                           >
//                             Quitar selección
//                           </button>
//                         ) : null}
//                       </div>

//                       <label className="mt-3 inline-flex cursor-pointer rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/[0.08]">
//                         {newAttachmentFile || attachmentName ? "Cambiar archivo" : "Seleccionar archivo"}
//                         <input
//                           type="file"
//                           className="hidden"
//                           onChange={(e) => handleAttachmentChange(e.target.files?.[0] || null)}
//                         />
//                       </label>
//                     </div>
//                   )}

//                   {attachmentError ? (
//                     <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
//                       {attachmentError}
//                     </div>
//                   ) : null}

//                   <div className="mt-3 text-xs text-slate-500">
//                     Por ahora el cambio del archivo queda preparado como metadato. La subida real del archivo al storage la conectamos en el siguiente paso.
//                   </div>
//                 </div>
//               </div>

//               <div className="grid gap-5 lg:grid-cols-2">
//                 <div className={section}>
//                   <div className="text-lg font-extrabold text-white">Notas</div>
//                   <textarea
//                     className="mt-3 min-h-[150px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:bg-white/[0.07] focus:ring-2 focus:ring-[#f2c94c]/10"
//                     value={notes}
//                     onChange={(e) => setNotes(e.target.value)}
//                   />
//                 </div>

//                 <div className={section}>
//                   <div className="text-lg font-extrabold text-white">Términos</div>
//                   <textarea
//                     className="mt-3 min-h-[150px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:bg-white/[0.07] focus:ring-2 focus:ring-[#f2c94c]/10"
//                     value={terms}
//                     onChange={(e) => setTerms(e.target.value)}
//                   />
//                 </div>
//               </div>

//               <div className={section}>
//                 <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
//                   <div>
//                     <div className="text-lg font-extrabold text-white">Servicios personalizados</div>
//                     <div className="text-sm text-slate-500">
//                       Agrega manualmente los servicios o entregables de esta cotización.
//                     </div>
//                   </div>
//                 </div>

//                 <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
//                   <div className="grid gap-3 lg:grid-cols-2">
//                     <div>
//                       <div className="text-sm font-semibold text-slate-300">Nombre del servicio</div>
//                       <input
//                         className={darkInput}
//                         value={itemTitle}
//                         onChange={(e) => setItemTitle(e.target.value)}
//                         placeholder="Ej: Edición de video + color"
//                       />
//                     </div>

//                     <div>
//                       <div className="text-sm font-semibold text-slate-300">Descripción</div>
//                       <input
//                         className={darkInput}
//                         value={itemDesc}
//                         onChange={(e) => setItemDesc(e.target.value)}
//                         placeholder="Detalle del servicio"
//                       />
//                     </div>
//                   </div>

//                   <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
//                     <div>
//                       <div className="text-sm font-semibold text-slate-300">Cantidad</div>
//                       <input
//                         className={darkInput}
//                         value={itemQty}
//                         onChange={(e) => setItemQty(e.target.value)}
//                       />
//                     </div>

//                     <div>
//                       <div className="text-sm font-semibold text-slate-300">Valor unitario</div>
//                       <input
//                         className={darkInput}
//                         value={itemUnit}
//                         onChange={(e) => setItemUnit(e.target.value)}
//                       />
//                     </div>

//                     <div className="flex items-end">
//                       <button
//                         className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-[#0b0f17] disabled:opacity-50"
//                         style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//                         disabled={addingItem || !itemTitle.trim()}
//                         onClick={addItem}
//                       >
//                         {addingItem ? "Agregando..." : "Agregar servicio"}
//                       </button>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="mt-5 grid gap-3">
//                   {items.map((it) => (
//                     <div key={it.id} className={softCard}>
//                       <div className="flex items-start justify-between gap-3">
//                         <div className="min-w-0">
//                           <div className="font-extrabold text-white">{it.title}</div>
//                           {it.description ? (
//                             <div className="mt-1 text-sm text-slate-400">{it.description}</div>
//                           ) : null}
//                           <div className="mt-2 text-xs text-slate-500">
//                             Qty: {it.qty} • Unit: {currency} {n(it.unit_price).toFixed(2)}
//                           </div>
//                         </div>

//                         <div className="shrink-0 text-right">
//                           <div className="text-xs text-slate-500">Total</div>
//                           <div className="font-extrabold text-[#f2c94c]">
//                             {currency} {n(it.line_total).toFixed(2)}
//                           </div>

//                           <button
//                             type="button"
//                             onClick={() => deleteItem(it.id)}
//                             disabled={deletingItemId === it.id}
//                             className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-50"
//                           >
//                             {deletingItemId === it.id ? "Eliminando..." : "Eliminar"}
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   ))}

//                   {items.length === 0 && (
//                     <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-slate-500">
//                       Aún no hay servicios en esta cotización. Agrega el primero arriba.
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           ) : null}
//         </div>
//       </div>
//     </div>
//   );
// }
