"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("No se pudo leer el archivo."));
        return;
      }

      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };

    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function MoneyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 1v22" />
      <path d="M17 5.5c0-2-2.2-3.5-5-3.5S7 3.5 7 5.5 9.2 9 12 9s5 1.5 5 3.5S14.8 16 12 16s-5 1.5-5 3.5S9.2 23 12 23s5-1.5 5-3.5" />
    </svg>
  );
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

function currencySymbol(code: string) {
  if (code === "EUR") return "€";
  if (code === "USD") return "$";
  return "$";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatFileSize(bytes: number) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

type CartItem = {
  id: string;
  title: string;
  description?: string;
  qty: number;
  unit_price: number;
};

type QuoteCreatePayload = {
  client_name?: string;
  client_email?: string;
  currency?: string;
  discount?: number;
  tax_rate?: number;
  valid_until?: string;
  notes?: string;
  terms?: string;
  attachment_name?: string;
  attachment_url?: string;
  attachment_mime_type?: string;
};

type UploadedAttachmentResponse = {
  ok: true;
  file: {
    file_name: string;
    mime_type: string;
    url: string;
  };
};

type TaxPreset = { id: string; label: string; ratePct: number };

const TAX_PRESETS: TaxPreset[] = [
  { id: "cl", label: "Chile (IVA 19%)", ratePct: 19 },
  { id: "mx", label: "México (IVA 16%)", ratePct: 16 },
  { id: "ar", label: "Argentina (IVA 21%)", ratePct: 21 },
  { id: "none", label: "Exento / Sin impuesto", ratePct: 0 },
];

const darkInput =
  "w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-[#f2c94c]/10";

const yellowBtn =
  "rounded-2xl px-6 py-3 text-sm font-black text-[#0b0f17] transition hover:opacity-95 disabled:opacity-60";

export default function CreateQuoteMvpModalPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params?.id || "";
  const validId = useMemo(() => isUuid(projectId), [projectId]);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [currency, setCurrency] = useState("USD");

  const [validDays, setValidDays] = useState("15");
  const [validUntil, setValidUntil] = useState(addDaysISO(15));

  const [taxPreset, setTaxPreset] = useState<string>("cl");
  const [taxEnabled, setTaxEnabled] = useState(true);

  const [discountPct, setDiscountPct] = useState("0");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const close = () => router.push(`/producer/projects/${projectId}`);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectId]);

  useEffect(() => {
    const d = clamp(Number(validDays || 0), 0, 3650);
    setValidUntil(addDaysISO(d || 0));
  }, [validDays]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, it) => sum + it.qty * it.unit_price, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    const pct = clamp(Number(discountPct || 0), 0, 100);
    return subtotal * (pct / 100);
  }, [subtotal, discountPct]);

  const taxRatePct = useMemo(() => {
    const found = TAX_PRESETS.find((t) => t.id === taxPreset) || TAX_PRESETS[0];
    return taxEnabled ? found.ratePct : 0;
  }, [taxPreset, taxEnabled]);

  const taxAmount = useMemo(() => {
    const base = Math.max(0, subtotal - discountAmount);
    return base * (taxRatePct / 100);
  }, [subtotal, discountAmount, taxRatePct]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount) + taxAmount;
  }, [subtotal, discountAmount, taxAmount]);

  const addEmptyService = () => {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCart((prev) => [
      ...prev,
      {
        id,
        title: "",
        description: "",
        qty: 1,
        unit_price: 0,
      },
    ]);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  const updateItem = (id: string, patch: Partial<CartItem>) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, ...patch };
      })
    );
  };

  const setQty = (id: string, qty: number) => {
    const q2 = clamp(Number.isFinite(qty) ? qty : 1, 1, 9999);
    updateItem(id, { qty: q2 });
  };

  const setUnitPrice = (id: string, price: number) => {
    const p2 = Math.max(0, Number.isFinite(price) ? price : 0);
    updateItem(id, { unit_price: p2 });
  };

  const setTitle = (id: string, title: string) => {
    updateItem(id, { title });
  };

  const setDescription = (id: string, description: string) => {
    updateItem(id, { description });
  };

  const handleAttachmentChange = (file: File | null) => {
    setAttachmentError(null);

    if (!file) {
      setAttachmentFile(null);
      return;
    }

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      setAttachmentFile(null);
      setAttachmentError("El archivo supera el límite de 15 MB.");
      return;
    }

    setAttachmentFile(file);
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentError(null);
  };

  const saveQuote = async () => {
    if (saving) return;
    setSaving(true);
    setErr(null);

    try {
      const cleanedItems = cart
        .map((it) => ({
          ...it,
          title: it.title.trim(),
          description: (it.description || "").trim(),
          qty: clamp(Number(it.qty || 1), 1, 9999),
          unit_price: Math.max(0, Number(it.unit_price || 0)),
        }))
        .filter((it) => it.title && it.unit_price >= 0);

      if (!cleanedItems.length) {
        setErr("Agrega al menos un servicio personalizado válido antes de guardar.");
        setSaving(false);
        return;
      }

      const invalid = cleanedItems.some((it) => !it.title || it.qty <= 0);
      if (invalid) {
        setErr("Revisa los servicios. Todos deben tener nombre y cantidad válida.");
        setSaving(false);
        return;
      }

      const discountAbs = Math.round(discountAmount * 100) / 100;
      const taxRateDecimal = taxRatePct / 100;

      let uploadedAttachment:
        | {
            file_name: string;
            mime_type: string;
            url: string;
          }
        | null = null;

      if (attachmentFile) {
        const contentBase64 = await fileToBase64(attachmentFile);

        const uploadRes = await api<UploadedAttachmentResponse>("/quotes/upload-attachment", {
          method: "POST",
          body: JSON.stringify({
            file_name: attachmentFile.name,
            mime_type: attachmentFile.type || "application/octet-stream",
            content_base64: contentBase64,
          }),
        });

        uploadedAttachment = uploadRes.file;
      }

      const payload: QuoteCreatePayload = {
        client_name: clientName.trim() || undefined,
        client_email: clientEmail.trim() || undefined,
        currency: currency || undefined,
        discount: discountAbs,
        tax_rate: taxRateDecimal,
        valid_until: validUntil || undefined,
        notes: notes.trim() || undefined,
        terms: terms.trim() || undefined,
        attachment_name: uploadedAttachment?.file_name || undefined,
        attachment_mime_type: uploadedAttachment?.mime_type || undefined,
        attachment_url: uploadedAttachment?.url || undefined,
      };

      const created = await api<{ ok: true; quote: { id: string } }>(
        `/projects/${projectId}/quotes`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      const quoteId = created.quote.id;

      let sort = 0;
      for (const it of cleanedItems) {
        await api(`/quotes/${quoteId}/items`, {
          method: "POST",
          body: JSON.stringify({
            title: it.title,
            description: it.description || undefined,
            qty: it.qty,
            unit_price: it.unit_price,
            sort_order: sort++,
          }),
        });
      }

      router.push(`/producer/quotes/${quoteId}`);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  if (!validId) return <div className="p-6 text-rose-400">Proyecto inválido.</div>;

  const sym = currencySymbol(currency);

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-black/75" onClick={close} aria-label="Cerrar" />

      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div className="flex max-h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220] shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-lg font-black text-white">
                <span className="text-base">💰</span>
                <span>Crear Cotización</span>
              </div>
              <div className="mt-1 truncate text-xs text-slate-500">{projectId}</div>
            </div>

            <button
              type="button"
              onClick={close}
              className="shrink-0 rounded-2xl bg-white/[0.06] px-3 py-2 text-slate-300 hover:bg-white/[0.1]"
              aria-label="Cerrar modal"
            >
              <XIcon />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold text-white">Servicios personalizados</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Agrega manualmente los servicios que llevará esta cotización
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addEmptyService}
                    className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
                    style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                  >
                    + Agregar servicio
                  </button>
                </div>

                <div className="mt-4 rounded-3xl border border-white/10 bg-[#0d1320] p-4 max-h-[560px] overflow-auto">
                  {cart.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
                      <div className="text-sm font-semibold text-slate-300">
                        No hay servicios agregados
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Empieza agregando uno o varios servicios personalizados
                      </div>

                      <button
                        type="button"
                        onClick={addEmptyService}
                        className="mt-5 rounded-2xl px-5 py-3 text-sm font-bold text-[#0b0f17]"
                        style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                      >
                        + Agregar primer servicio
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((it, idx) => (
                        <div
                          key={it.id}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                        >
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="text-sm font-extrabold text-white">
                              Servicio {idx + 1}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(it.id)}
                              className="rounded-xl bg-rose-500/12 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/18"
                            >
                              Quitar
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field label="Nombre del servicio *">
                              <input
                                value={it.title}
                                onChange={(e) => setTitle(it.id, e.target.value)}
                                className={darkInput}
                                placeholder="Ej: Edición de video, diseño web, asesoría..."
                              />
                            </Field>

                            <Field label="Cantidad">
                              <input
                                value={String(it.qty)}
                                onChange={(e) => setQty(it.id, Number(e.target.value || 1))}
                                className={darkInput}
                                inputMode="numeric"
                                placeholder="1"
                              />
                            </Field>

                            <Field label="Valor unitario *">
                              <input
                                value={String(it.unit_price || "")}
                                onChange={(e) => setUnitPrice(it.id, Number(e.target.value || 0))}
                                className={darkInput}
                                inputMode="decimal"
                                placeholder="0"
                              />
                            </Field>

                            <Field label="Total">
                              <div className="flex h-[50px] items-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white">
                                {currency} {sym}
                                {Math.round(it.qty * it.unit_price).toLocaleString()}
                              </div>
                            </Field>
                          </div>

                          <div className="mt-3">
                            <Field label="Descripción (opcional)">
                              <textarea
                                value={it.description || ""}
                                onChange={(e) => setDescription(it.id, e.target.value)}
                                className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.07] focus:ring-2 focus:ring-[#f2c94c]/10"
                                placeholder="Detalle del servicio, alcance, entregables, revisiones, etc."
                              />
                            </Field>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addEmptyService}
                        className="w-full rounded-2xl border border-dashed border-[#f2c94c]/30 bg-[#f2c94c]/10 px-4 py-3 text-sm font-bold text-[#f2c94c] hover:bg-[#f2c94c]/15"
                      >
                        + Agregar otro servicio
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <span className="text-base">📋</span>
                  <span>Resumen de Cotización</span>
                </div>

                {err ? (
                  <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    {err}
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Cliente / Empresa">
                    <input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className={darkInput}
                      placeholder="Nombre del cliente"
                    />
                  </Field>

                  <Field label="Email del cliente">
                    <input
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className={darkInput}
                      placeholder="email@cliente.com"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Adjunto referencial (opcional)">
                    <div className="rounded-2xl border border-white/10 bg-[#0d1320] p-4">
                      {!attachmentFile ? (
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
                                <span className="truncate">{attachmentFile.name}</span>
                              </div>
                              <div className="mt-1 text-xs text-slate-300">
                                {formatFileSize(attachmentFile.size)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={removeAttachment}
                              className="rounded-xl bg-rose-500/12 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/18"
                            >
                              Quitar
                            </button>
                          </div>

                          <label className="mt-3 inline-flex cursor-pointer rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/[0.08]">
                            Cambiar archivo
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
                        El archivo seleccionado se subirá al guardar la cotización y quedará disponible para descarga pública.
                      </div>
                    </div>
                  </Field>
                </div>

                <div className="mt-4 rounded-3xl border border-white/10 bg-[#0d1320] p-4">
                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                      Agrega servicios personalizados para ver el resumen
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((it) => (
                        <div
                          key={it.id}
                          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-white">
                              {it.title || "Servicio sin nombre"}
                            </div>
                            {it.description ? (
                              <div className="mt-0.5 truncate text-xs text-slate-500">{it.description}</div>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-between gap-2 sm:justify-end">
                            <div className="text-xs text-slate-400">
                              {it.qty} × {sym}
                              {Math.round(it.unit_price).toLocaleString()}
                            </div>

                            <div className="w-[120px] text-right text-sm font-black text-white">
                              {sym}
                              {Math.round(it.qty * it.unit_price).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Moneda">
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={darkInput}>
                      <option value="USD">USD</option>
                      <option value="CLP">CLP</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </Field>

                  <Field label="Validez (días)">
                    <input
                      value={validDays}
                      onChange={(e) => setValidDays(e.target.value)}
                      className={darkInput}
                      inputMode="numeric"
                    />
                  </Field>

                  <Field label="País (Impuesto)">
                    <select value={taxPreset} onChange={(e) => setTaxPreset(e.target.value)} className={darkInput}>
                      {TAX_PRESETS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Aplicar impuesto">
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm">
                      <input
                        type="checkbox"
                        checked={taxEnabled}
                        onChange={(e) => setTaxEnabled(e.target.checked)}
                      />
                      <span className="font-semibold text-slate-200">
                        {taxEnabled ? `${taxRatePct}%` : "0%"}
                      </span>
                    </label>
                  </Field>

                  <Field label="Descuento (%)">
                    <input
                      value={discountPct}
                      onChange={(e) => setDiscountPct(e.target.value)}
                      className={darkInput}
                      inputMode="decimal"
                    />
                  </Field>

                  <Field label="Válido hasta">
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className={darkInput}
                    />
                  </Field>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Notas">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.07] focus:ring-2 focus:ring-[#f2c94c]/10"
                    />
                  </Field>

                  <Field label="Términos">
                    <textarea
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.07] focus:ring-2 focus:ring-[#f2c94c]/10"
                    />
                  </Field>
                </div>

                <div className="mt-4 rounded-3xl border border-[#f2c94c]/20 bg-[#f2c94c]/10 p-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
                    <span className="inline-flex items-center gap-2">
                      <MoneyIcon />
                      Subtotal
                    </span>
                    <span>
                      {currency} {sym}
                      {Math.round(subtotal).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
                    <span>Descuento ({clamp(Number(discountPct || 0), 0, 100)}%)</span>
                    <span>
                      - {sym}
                      {Math.round(discountAmount).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
                    <span>Impuesto ({taxRatePct}%)</span>
                    <span>
                      + {sym}
                      {Math.round(taxAmount).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-3 h-px bg-[#f2c94c]/20" />

                  <div className="mt-3 flex items-center justify-between text-sm font-black text-white">
                    <span>Total</span>
                    <span>
                      {currency} {sym}
                      {Math.round(total).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 bg-[#0b1220] px-6 py-5 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={close}
              className="w-full rounded-2xl bg-white/[0.06] px-6 py-3 text-sm font-bold text-slate-200 hover:bg-white/[0.1] sm:w-auto"
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="w-full rounded-2xl bg-white/[0.08] px-6 py-3 text-sm font-bold text-slate-200 hover:bg-white/[0.12] sm:w-auto"
              disabled={!cart.length}
              title={!cart.length ? "Agrega servicios para previsualizar" : "Ver vista previa"}
            >
              Vista Previa
            </button>

            <button
              type="button"
              onClick={saveQuote}
              disabled={saving || !cart.length}
              className={`${yellowBtn} w-full sm:w-auto`}
              style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
            >
              {saving ? "Guardando..." : "Guardar Cotización"}
            </button>
          </div>
        </div>
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/75"
            aria-label="Cerrar preview"
            onClick={() => setPreviewOpen(false)}
          />

          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
            <div className="flex max-h-[90vh] w-full max-w-[920px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220] shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
                <div>
                  <div className="text-lg font-black text-white">Vista Previa</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Cliente: <span className="font-semibold text-slate-300">{clientName || "—"}</span>{" "}
                    {clientEmail ? `• ${clientEmail}` : ""}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="shrink-0 rounded-2xl bg-white/[0.06] px-3 py-2 text-slate-300 hover:bg-white/[0.1]"
                  aria-label="Cerrar preview"
                >
                  <XIcon />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6">
                {attachmentFile ? (
                  <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-sm font-extrabold text-white">Adjunto referencial</div>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] text-[#f2c94c]">
                        <FileIcon />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">
                          {attachmentFile.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatFileSize(attachmentFile.size)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-3xl border border-white/10">
                  <div className="bg-white/[0.05] px-5 py-4 text-sm font-extrabold text-white">
                    Servicios personalizados
                  </div>

                  <div className="space-y-3 p-5">
                    {cart.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-white">
                            {it.title || "Servicio sin nombre"}
                          </div>
                          <div className="text-xs text-slate-500">
                            Qty: {it.qty} • Unit: {sym}
                            {Math.round(it.unit_price).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm font-black text-white">
                          {sym}
                          {Math.round(it.qty * it.unit_price).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-[#f2c94c]/20 bg-[#f2c94c]/10 p-5">
                  <div className="flex items-center justify-between text-sm text-slate-200">
                    <span className="font-semibold">Subtotal</span>
                    <span className="font-black">
                      {sym}
                      {Math.round(subtotal).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-200">
                    <span className="font-semibold">Descuento</span>
                    <span className="font-black">
                      - {sym}
                      {Math.round(discountAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-200">
                    <span className="font-semibold">Impuesto</span>
                    <span className="font-black">
                      + {sym}
                      {Math.round(taxAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-3 h-px bg-[#f2c94c]/20" />
                  <div className="mt-3 flex items-center justify-between text-base text-white">
                    <span className="font-black">Total</span>
                    <span className="font-black">
                      {sym}
                      {Math.round(total).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">
                    Válido hasta: <span className="font-semibold text-slate-200">{validUntil}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/10 bg-[#0b1220] px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="w-full rounded-2xl bg-white/[0.06] px-6 py-3 text-sm font-bold text-slate-200 hover:bg-white/[0.1] sm:w-auto"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={saveQuote}
                  disabled={saving}
                  className={`${yellowBtn} w-full sm:w-auto`}
                  style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                >
                  {saving ? "Guardando..." : "Guardar Cotización"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      {children}
    </div>
  );
}


// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { api } from "@/lib/api";

// function isUuid(v: string) {
//   return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
// }

// function XIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M6 6l12 12" />
//       <path d="M18 6L6 18" />
//     </svg>
//   );
// }

// function MoneyIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M12 1v22" />
//       <path d="M17 5.5c0-2-2.2-3.5-5-3.5S7 3.5 7 5.5 9.2 9 12 9s5 1.5 5 3.5S14.8 16 12 16s-5 1.5-5 3.5S9.2 23 12 23s5-1.5 5-3.5" />
//     </svg>
//   );
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

// function currencySymbol(code: string) {
//   if (code === "EUR") return "€";
//   if (code === "USD") return "$";
//   return "$";
// }

// function clamp(n: number, min: number, max: number) {
//   return Math.max(min, Math.min(max, n));
// }

// function addDaysISO(days: number) {
//   const d = new Date();
//   d.setDate(d.getDate() + days);
//   const yyyy = d.getFullYear();
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${yyyy}-${mm}-${dd}`;
// }

// function formatFileSize(bytes: number) {
//   if (!bytes && bytes !== 0) return "—";
//   if (bytes < 1024) return `${bytes} B`;
//   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
//   if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
//   return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
// }

// type CartItem = {
//   id: string;
//   title: string;
//   description?: string;
//   qty: number;
//   unit_price: number;
// };

// type QuoteCreatePayload = {
//   client_name?: string;
//   client_email?: string;
//   currency?: string;
//   discount?: number;
//   tax_rate?: number;
//   valid_until?: string;
//   notes?: string;
//   terms?: string;
//   attachment_name?: string;
//   attachment_url?: string;
//   attachment_mime_type?: string;
// };

// type TaxPreset = { id: string; label: string; ratePct: number };

// const TAX_PRESETS: TaxPreset[] = [
//   { id: "cl", label: "Chile (IVA 19%)", ratePct: 19 },
//   { id: "mx", label: "México (IVA 16%)", ratePct: 16 },
//   { id: "ar", label: "Argentina (IVA 21%)", ratePct: 21 },
//   { id: "none", label: "Exento / Sin impuesto", ratePct: 0 },
// ];

// const darkInput =
//   "w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-[#f2c94c]/10";

// const yellowBtn =
//   "rounded-2xl px-6 py-3 text-sm font-black text-[#0b0f17] transition hover:opacity-95 disabled:opacity-60";

// export default function CreateQuoteMvpModalPage() {
//   const router = useRouter();
//   const params = useParams<{ id: string }>();
//   const projectId = params?.id || "";
//   const validId = useMemo(() => isUuid(projectId), [projectId]);

//   const [cart, setCart] = useState<CartItem[]>([]);

//   const [clientName, setClientName] = useState("");
//   const [clientEmail, setClientEmail] = useState("");
//   const [currency, setCurrency] = useState("USD");

//   const [validDays, setValidDays] = useState("15");
//   const [validUntil, setValidUntil] = useState(addDaysISO(15));

//   const [taxPreset, setTaxPreset] = useState<string>("cl");
//   const [taxEnabled, setTaxEnabled] = useState(true);

//   const [discountPct, setDiscountPct] = useState("0");
//   const [notes, setNotes] = useState("");
//   const [terms, setTerms] = useState("");

//   const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
//   const [attachmentError, setAttachmentError] = useState<string | null>(null);

//   const [saving, setSaving] = useState(false);
//   const [err, setErr] = useState<string | null>(null);
//   const [previewOpen, setPreviewOpen] = useState(false);

//   const close = () => router.push(`/producer/projects/${projectId}`);

//   useEffect(() => {
//     const prev = document.body.style.overflow;
//     document.body.style.overflow = "hidden";
//     return () => {
//       document.body.style.overflow = prev;
//     };
//   }, []);

//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === "Escape") close();
//     };
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [projectId]);

//   useEffect(() => {
//     const d = clamp(Number(validDays || 0), 0, 3650);
//     setValidUntil(addDaysISO(d || 0));
//   }, [validDays]);

//   const subtotal = useMemo(() => {
//     return cart.reduce((sum, it) => sum + it.qty * it.unit_price, 0);
//   }, [cart]);

//   const discountAmount = useMemo(() => {
//     const pct = clamp(Number(discountPct || 0), 0, 100);
//     return subtotal * (pct / 100);
//   }, [subtotal, discountPct]);

//   const taxRatePct = useMemo(() => {
//     const found = TAX_PRESETS.find((t) => t.id === taxPreset) || TAX_PRESETS[0];
//     return taxEnabled ? found.ratePct : 0;
//   }, [taxPreset, taxEnabled]);

//   const taxAmount = useMemo(() => {
//     const base = Math.max(0, subtotal - discountAmount);
//     return base * (taxRatePct / 100);
//   }, [subtotal, discountAmount, taxRatePct]);

//   const total = useMemo(() => {
//     return Math.max(0, subtotal - discountAmount) + taxAmount;
//   }, [subtotal, discountAmount, taxAmount]);

//   const addEmptyService = () => {
//     const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
//     setCart((prev) => [
//       ...prev,
//       {
//         id,
//         title: "",
//         description: "",
//         qty: 1,
//         unit_price: 0,
//       },
//     ]);
//   };

//   const removeFromCart = (id: string) => {
//     setCart((prev) => prev.filter((p) => p.id !== id));
//   };

//   const updateItem = (id: string, patch: Partial<CartItem>) => {
//     setCart((prev) =>
//       prev.map((item) => {
//         if (item.id !== id) return item;
//         return { ...item, ...patch };
//       })
//     );
//   };

//   const setQty = (id: string, qty: number) => {
//     const q2 = clamp(Number.isFinite(qty) ? qty : 1, 1, 9999);
//     updateItem(id, { qty: q2 });
//   };

//   const setUnitPrice = (id: string, price: number) => {
//     const p2 = Math.max(0, Number.isFinite(price) ? price : 0);
//     updateItem(id, { unit_price: p2 });
//   };

//   const setTitle = (id: string, title: string) => {
//     updateItem(id, { title });
//   };

//   const setDescription = (id: string, description: string) => {
//     updateItem(id, { description });
//   };

//   const handleAttachmentChange = (file: File | null) => {
//     setAttachmentError(null);

//     if (!file) {
//       setAttachmentFile(null);
//       return;
//     }

//     const maxSize = 15 * 1024 * 1024;
//     if (file.size > maxSize) {
//       setAttachmentFile(null);
//       setAttachmentError("El archivo supera el límite de 15 MB.");
//       return;
//     }

//     setAttachmentFile(file);
//   };

//   const removeAttachment = () => {
//     setAttachmentFile(null);
//     setAttachmentError(null);
//   };

//   const saveQuote = async () => {
//   if (saving) return;
//   setSaving(true);
//   setErr(null);

//   try {
//     const cleanedItems = cart
//       .map((it) => ({
//         ...it,
//         title: it.title.trim(),
//         description: (it.description || "").trim(),
//         qty: clamp(Number(it.qty || 1), 1, 9999),
//         unit_price: Math.max(0, Number(it.unit_price || 0)),
//       }))
//       .filter((it) => it.title && it.unit_price >= 0);

//     if (!cleanedItems.length) {
//       setErr("Agrega al menos un servicio personalizado válido antes de guardar.");
//       setSaving(false);
//       return;
//     }

//     const invalid = cleanedItems.some((it) => !it.title || it.qty <= 0);
//     if (invalid) {
//       setErr("Revisa los servicios. Todos deben tener nombre y cantidad válida.");
//       setSaving(false);
//       return;
//     }

//     const discountAbs = Math.round(discountAmount * 100) / 100;
//     const taxRateDecimal = taxRatePct / 100;

//     const payload: QuoteCreatePayload = {
//       client_name: clientName.trim() || undefined,
//       client_email: clientEmail.trim() || undefined,
//       currency: currency || undefined,
//       discount: discountAbs,
//       tax_rate: taxRateDecimal,
//       valid_until: validUntil || undefined,
//       notes: notes.trim() || undefined,
//       terms: terms.trim() || undefined,
//       attachment_name: attachmentFile?.name || undefined,
//       attachment_mime_type: attachmentFile?.type || undefined,
//       attachment_url: undefined,
//     };

//     const created = await api<{ ok: true; quote: { id: string } }>(
//       `/projects/${projectId}/quotes`,
//       {
//         method: "POST",
//         body: JSON.stringify(payload),
//       }
//     );

//     const quoteId = created.quote.id;

//     let sort = 0;
//     for (const it of cleanedItems) {
//       await api(`/quotes/${quoteId}/items`, {
//         method: "POST",
//         body: JSON.stringify({
//           title: it.title,
//           description: it.description || undefined,
//           qty: it.qty,
//           unit_price: it.unit_price,
//           sort_order: sort++,
//         }),
//       });
//     }

//     router.push(`/producer/quotes/${quoteId}`);
//   } catch (e: any) {
//     setErr(String(e?.message || e));
//   } finally {
//     setSaving(false);
//   }
// };
//   // const saveQuote = async () => {
//   //   if (saving) return;
//   //   setSaving(true);
//   //   setErr(null);

//   //   try {
//   //     const cleanedItems = cart
//   //       .map((it) => ({
//   //         ...it,
//   //         title: it.title.trim(),
//   //         description: (it.description || "").trim(),
//   //         qty: clamp(Number(it.qty || 1), 1, 9999),
//   //         unit_price: Math.max(0, Number(it.unit_price || 0)),
//   //       }))
//   //       .filter((it) => it.title && it.unit_price >= 0);

//   //     if (!cleanedItems.length) {
//   //       setErr("Agrega al menos un servicio personalizado válido antes de guardar.");
//   //       setSaving(false);
//   //       return;
//   //     }

//   //     const invalid = cleanedItems.some((it) => !it.title || it.qty <= 0);
//   //     if (invalid) {
//   //       setErr("Revisa los servicios. Todos deben tener nombre y cantidad válida.");
//   //       setSaving(false);
//   //       return;
//   //     }

//   //     const discountAbs = Math.round(discountAmount * 100) / 100;
//   //     const taxRateDecimal = taxRatePct / 100;

//   //     const payload: QuoteCreatePayload = {
//   //       client_name: clientName.trim() || undefined,
//   //       client_email: clientEmail.trim() || undefined,
//   //       currency: currency || undefined,
//   //       discount: discountAbs,
//   //       tax_rate: taxRateDecimal,
//   //       valid_until: validUntil || undefined,
//   //       notes: notes.trim() || undefined,
//   //       terms: terms.trim() || undefined,
//   //       attachment_name: attachmentFile?.name || undefined,
//   //       attachment_url: undefined,
//   //       attachment_mime_type: attachmentFile?.type || undefined,
//   //     };

//   //     const created = await api<{ ok: true; quote: { id: string } }>(`/projects/${projectId}/quotes`, {
//   //       method: "POST",
//   //       body: JSON.stringify(payload),
//   //     });

//   //     const quoteId = created.quote.id;

//   //     let sort = 0;
//   //     for (const it of cleanedItems) {
//   //       await api(`/quotes/${quoteId}/items`, {
//   //         method: "POST",
//   //         body: JSON.stringify({
//   //           title: it.title,
//   //           description: it.description || undefined,
//   //           qty: it.qty,
//   //           unit_price: it.unit_price,
//   //           sort_order: sort++,
//   //         }),
//   //       });
//   //     }

//   //     router.push(`/producer/quotes/${quoteId}`);
//   //   } catch (e: any) {
//   //     setErr(String(e?.message || e));
//   //   } finally {
//   //     setSaving(false);
//   //   }
//   // };

//   if (!validId) return <div className="p-6 text-rose-400">Proyecto inválido.</div>;

//   const sym = currencySymbol(currency);

//   return (
//     <div className="fixed inset-0 z-50">
//       <button type="button" className="absolute inset-0 bg-black/75" onClick={close} aria-label="Cerrar" />

//       <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
//         <div className="flex max-h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220] shadow-2xl">
//           <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
//             <div className="min-w-0">
//               <div className="flex items-center gap-2 text-lg font-black text-white">
//                 <span className="text-base">💰</span>
//                 <span>Crear Cotización</span>
//               </div>
//               <div className="mt-1 truncate text-xs text-slate-500">{projectId}</div>
//             </div>

//             <button
//               type="button"
//               onClick={close}
//               className="shrink-0 rounded-2xl bg-white/[0.06] px-3 py-2 text-slate-300 hover:bg-white/[0.1]"
//               aria-label="Cerrar modal"
//             >
//               <XIcon />
//             </button>
//           </div>

//           <div className="flex-1 overflow-auto">
//             <div className="grid grid-cols-1 lg:grid-cols-2">
//               <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
//                 <div className="flex items-center justify-between gap-3">
//                   <div>
//                     <div className="text-sm font-extrabold text-white">Servicios personalizados</div>
//                     <div className="mt-1 text-xs text-slate-500">
//                       Agrega manualmente los servicios que llevará esta cotización
//                     </div>
//                   </div>

//                   <button
//                     type="button"
//                     onClick={addEmptyService}
//                     className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
//                     style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//                   >
//                     + Agregar servicio
//                   </button>
//                 </div>

//                 <div className="mt-4 rounded-3xl border border-white/10 bg-[#0d1320] p-4 max-h-[560px] overflow-auto">
//                   {cart.length === 0 ? (
//                     <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
//                       <div className="text-sm font-semibold text-slate-300">
//                         No hay servicios agregados
//                       </div>
//                       <div className="mt-1 text-xs text-slate-500">
//                         Empieza agregando uno o varios servicios personalizados
//                       </div>

//                       <button
//                         type="button"
//                         onClick={addEmptyService}
//                         className="mt-5 rounded-2xl px-5 py-3 text-sm font-bold text-[#0b0f17]"
//                         style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//                       >
//                         + Agregar primer servicio
//                       </button>
//                     </div>
//                   ) : (
//                     <div className="space-y-4">
//                       {cart.map((it, idx) => (
//                         <div
//                           key={it.id}
//                           className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
//                         >
//                           <div className="mb-4 flex items-center justify-between gap-3">
//                             <div className="text-sm font-extrabold text-white">
//                               Servicio {idx + 1}
//                             </div>

//                             <button
//                               type="button"
//                               onClick={() => removeFromCart(it.id)}
//                               className="rounded-xl bg-rose-500/12 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/18"
//                             >
//                               Quitar
//                             </button>
//                           </div>

//                           <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
//                             <Field label="Nombre del servicio *">
//                               <input
//                                 value={it.title}
//                                 onChange={(e) => setTitle(it.id, e.target.value)}
//                                 className={darkInput}
//                                 placeholder="Ej: Edición de video, diseño web, asesoría..."
//                               />
//                             </Field>

//                             <Field label="Cantidad">
//                               <input
//                                 value={String(it.qty)}
//                                 onChange={(e) => setQty(it.id, Number(e.target.value || 1))}
//                                 className={darkInput}
//                                 inputMode="numeric"
//                                 placeholder="1"
//                               />
//                             </Field>

//                             <Field label="Valor unitario *">
//                               <input
//                                 value={String(it.unit_price || "")}
//                                 onChange={(e) => setUnitPrice(it.id, Number(e.target.value || 0))}
//                                 className={darkInput}
//                                 inputMode="decimal"
//                                 placeholder="0"
//                               />
//                             </Field>

//                             <Field label="Total">
//                               <div className="flex h-[50px] items-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white">
//                                 {currency} {sym}
//                                 {Math.round(it.qty * it.unit_price).toLocaleString()}
//                               </div>
//                             </Field>
//                           </div>

//                           <div className="mt-3">
//                             <Field label="Descripción (opcional)">
//                               <textarea
//                                 value={it.description || ""}
//                                 onChange={(e) => setDescription(it.id, e.target.value)}
//                                 className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.07] focus:ring-2 focus:ring-[#f2c94c]/10"
//                                 placeholder="Detalle del servicio, alcance, entregables, revisiones, etc."
//                               />
//                             </Field>
//                           </div>
//                         </div>
//                       ))}

//                       <button
//                         type="button"
//                         onClick={addEmptyService}
//                         className="w-full rounded-2xl border border-dashed border-[#f2c94c]/30 bg-[#f2c94c]/10 px-4 py-3 text-sm font-bold text-[#f2c94c] hover:bg-[#f2c94c]/15"
//                       >
//                         + Agregar otro servicio
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               <div className="p-6">
//                 <div className="flex items-center gap-2 text-sm font-extrabold text-white">
//                   <span className="text-base">📋</span>
//                   <span>Resumen de Cotización</span>
//                 </div>

//                 {err ? (
//                   <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
//                     {err}
//                   </div>
//                 ) : null}

//                 <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
//                   <Field label="Cliente / Empresa">
//                     <input
//                       value={clientName}
//                       onChange={(e) => setClientName(e.target.value)}
//                       className={darkInput}
//                       placeholder="Nombre del cliente"
//                     />
//                   </Field>

//                   <Field label="Email del cliente">
//                     <input
//                       value={clientEmail}
//                       onChange={(e) => setClientEmail(e.target.value)}
//                       className={darkInput}
//                       placeholder="email@cliente.com"
//                     />
//                   </Field>
//                 </div>

//                 <div className="mt-4">
//                   <Field label="Adjunto referencial (opcional)">
//                     <div className="rounded-2xl border border-white/10 bg-[#0d1320] p-4">
//                       {!attachmentFile ? (
//                         <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center transition hover:bg-white/[0.05]">
//                           <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] text-[#f2c94c]">
//                             <PaperclipIcon />
//                           </span>
//                           <div>
//                             <div className="text-sm font-bold text-white">
//                               Seleccionar archivo
//                             </div>
//                             <div className="mt-1 text-xs text-slate-500">
//                               PDF, Word, Excel, imágenes u otro respaldo del detalle
//                             </div>
//                           </div>
//                           <input
//                             type="file"
//                             className="hidden"
//                             onChange={(e) => handleAttachmentChange(e.target.files?.[0] || null)}
//                           />
//                         </label>
//                       ) : (
//                         <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
//                           <div className="flex items-start justify-between gap-3">
//                             <div className="min-w-0">
//                               <div className="flex items-center gap-2 text-sm font-bold text-white">
//                                 <FileIcon />
//                                 <span className="truncate">{attachmentFile.name}</span>
//                               </div>
//                               <div className="mt-1 text-xs text-slate-300">
//                                 {formatFileSize(attachmentFile.size)}
//                               </div>
//                             </div>

//                             <button
//                               type="button"
//                               onClick={removeAttachment}
//                               className="rounded-xl bg-rose-500/12 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/18"
//                             >
//                               Quitar
//                             </button>
//                           </div>

//                           <label className="mt-3 inline-flex cursor-pointer rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/[0.08]">
//                             Cambiar archivo
//                             <input
//                               type="file"
//                               className="hidden"
//                               onChange={(e) => handleAttachmentChange(e.target.files?.[0] || null)}
//                             />
//                           </label>
//                         </div>
//                       )}

//                       {attachmentError ? (
//                         <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
//                           {attachmentError}
//                         </div>
//                       ) : null}

//                       <div className="mt-3 text-xs text-slate-500">
//                         El archivo ya queda preparado para enviarse como metadato de la cotización.
//                         El siguiente paso será conectarlo con subida real al backend/storage.
//                       </div>
//                     </div>
//                   </Field>
//                 </div>

//                 <div className="mt-4 rounded-3xl border border-white/10 bg-[#0d1320] p-4">
//                   {cart.length === 0 ? (
//                     <div className="py-8 text-center text-sm text-slate-500">
//                       Agrega servicios personalizados para ver el resumen
//                     </div>
//                   ) : (
//                     <div className="space-y-3">
//                       {cart.map((it) => (
//                         <div
//                           key={it.id}
//                           className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
//                         >
//                           <div className="min-w-0">
//                             <div className="truncate text-sm font-extrabold text-white">
//                               {it.title || "Servicio sin nombre"}
//                             </div>
//                             {it.description ? (
//                               <div className="mt-0.5 truncate text-xs text-slate-500">{it.description}</div>
//                             ) : null}
//                           </div>

//                           <div className="flex items-center justify-between gap-2 sm:justify-end">
//                             <div className="text-xs text-slate-400">
//                               {it.qty} × {sym}
//                               {Math.round(it.unit_price).toLocaleString()}
//                             </div>

//                             <div className="w-[120px] text-right text-sm font-black text-white">
//                               {sym}
//                               {Math.round(it.qty * it.unit_price).toLocaleString()}
//                             </div>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </div>

//                 <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
//                   <Field label="Moneda">
//                     <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={darkInput}>
//                       <option value="USD">USD</option>
//                       <option value="CLP">CLP</option>
//                       <option value="EUR">EUR</option>
//                     </select>
//                   </Field>

//                   <Field label="Validez (días)">
//                     <input
//                       value={validDays}
//                       onChange={(e) => setValidDays(e.target.value)}
//                       className={darkInput}
//                       inputMode="numeric"
//                     />
//                   </Field>

//                   <Field label="País (Impuesto)">
//                     <select value={taxPreset} onChange={(e) => setTaxPreset(e.target.value)} className={darkInput}>
//                       {TAX_PRESETS.map((t) => (
//                         <option key={t.id} value={t.id}>
//                           {t.label}
//                         </option>
//                       ))}
//                     </select>
//                   </Field>

//                   <Field label="Aplicar impuesto">
//                     <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm">
//                       <input
//                         type="checkbox"
//                         checked={taxEnabled}
//                         onChange={(e) => setTaxEnabled(e.target.checked)}
//                       />
//                       <span className="font-semibold text-slate-200">
//                         {taxEnabled ? `${taxRatePct}%` : "0%"}
//                       </span>
//                     </label>
//                   </Field>

//                   <Field label="Descuento (%)">
//                     <input
//                       value={discountPct}
//                       onChange={(e) => setDiscountPct(e.target.value)}
//                       className={darkInput}
//                       inputMode="decimal"
//                     />
//                   </Field>

//                   <Field label="Válido hasta">
//                     <input
//                       type="date"
//                       value={validUntil}
//                       onChange={(e) => setValidUntil(e.target.value)}
//                       className={darkInput}
//                     />
//                   </Field>
//                 </div>

//                 <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
//                   <Field label="Notas">
//                     <textarea
//                       value={notes}
//                       onChange={(e) => setNotes(e.target.value)}
//                       className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.07] focus:ring-2 focus:ring-[#f2c94c]/10"
//                     />
//                   </Field>

//                   <Field label="Términos">
//                     <textarea
//                       value={terms}
//                       onChange={(e) => setTerms(e.target.value)}
//                       className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.07] focus:ring-2 focus:ring-[#f2c94c]/10"
//                     />
//                   </Field>
//                 </div>

//                 <div className="mt-4 rounded-3xl border border-[#f2c94c]/20 bg-[#f2c94c]/10 p-4">
//                   <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
//                     <span className="inline-flex items-center gap-2">
//                       <MoneyIcon />
//                       Subtotal
//                     </span>
//                     <span>
//                       {currency} {sym}
//                       {Math.round(subtotal).toLocaleString()}
//                     </span>
//                   </div>

//                   <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
//                     <span>Descuento ({clamp(Number(discountPct || 0), 0, 100)}%)</span>
//                     <span>
//                       - {sym}
//                       {Math.round(discountAmount).toLocaleString()}
//                     </span>
//                   </div>

//                   <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
//                     <span>Impuesto ({taxRatePct}%)</span>
//                     <span>
//                       + {sym}
//                       {Math.round(taxAmount).toLocaleString()}
//                     </span>
//                   </div>

//                   <div className="mt-3 h-px bg-[#f2c94c]/20" />

//                   <div className="mt-3 flex items-center justify-between text-sm font-black text-white">
//                     <span>Total</span>
//                     <span>
//                       {currency} {sym}
//                       {Math.round(total).toLocaleString()}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="flex flex-col gap-3 border-t border-white/10 bg-[#0b1220] px-6 py-5 sm:flex-row sm:items-center sm:justify-end">
//             <button
//               type="button"
//               onClick={close}
//               className="w-full rounded-2xl bg-white/[0.06] px-6 py-3 text-sm font-bold text-slate-200 hover:bg-white/[0.1] sm:w-auto"
//               disabled={saving}
//             >
//               Cancelar
//             </button>

//             <button
//               type="button"
//               onClick={() => setPreviewOpen(true)}
//               className="w-full rounded-2xl bg-white/[0.08] px-6 py-3 text-sm font-bold text-slate-200 hover:bg-white/[0.12] sm:w-auto"
//               disabled={!cart.length}
//               title={!cart.length ? "Agrega servicios para previsualizar" : "Ver vista previa"}
//             >
//               Vista Previa
//             </button>

//             <button
//               type="button"
//               onClick={saveQuote}
//               disabled={saving || !cart.length}
//               className={`${yellowBtn} w-full sm:w-auto`}
//               style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//             >
//               {saving ? "Guardando..." : "Guardar Cotización"}
//             </button>
//           </div>
//         </div>
//       </div>

//       {previewOpen ? (
//         <div className="fixed inset-0 z-[60]">
//           <button
//             type="button"
//             className="absolute inset-0 bg-black/75"
//             aria-label="Cerrar preview"
//             onClick={() => setPreviewOpen(false)}
//           />

//           <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
//             <div className="flex max-h-[90vh] w-full max-w-[920px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220] shadow-2xl">
//               <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
//                 <div>
//                   <div className="text-lg font-black text-white">Vista Previa</div>
//                   <div className="mt-1 text-xs text-slate-500">
//                     Cliente: <span className="font-semibold text-slate-300">{clientName || "—"}</span>{" "}
//                     {clientEmail ? `• ${clientEmail}` : ""}
//                   </div>
//                 </div>

//                 <button
//                   type="button"
//                   onClick={() => setPreviewOpen(false)}
//                   className="shrink-0 rounded-2xl bg-white/[0.06] px-3 py-2 text-slate-300 hover:bg-white/[0.1]"
//                   aria-label="Cerrar preview"
//                 >
//                   <XIcon />
//                 </button>
//               </div>

//               <div className="flex-1 overflow-auto p-6">
//                 {attachmentFile ? (
//                   <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
//                     <div className="text-sm font-extrabold text-white">Adjunto referencial</div>
//                     <div className="mt-3 flex items-center gap-3">
//                       <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] text-[#f2c94c]">
//                         <FileIcon />
//                       </span>
//                       <div className="min-w-0">
//                         <div className="truncate text-sm font-semibold text-white">
//                           {attachmentFile.name}
//                         </div>
//                         <div className="text-xs text-slate-500">
//                           {formatFileSize(attachmentFile.size)}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ) : null}

//                 <div className="overflow-hidden rounded-3xl border border-white/10">
//                   <div className="bg-white/[0.05] px-5 py-4 text-sm font-extrabold text-white">
//                     Servicios personalizados
//                   </div>

//                   <div className="space-y-3 p-5">
//                     {cart.map((it) => (
//                       <div
//                         key={it.id}
//                         className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
//                       >
//                         <div className="min-w-0">
//                           <div className="truncate text-sm font-extrabold text-white">
//                             {it.title || "Servicio sin nombre"}
//                           </div>
//                           <div className="text-xs text-slate-500">
//                             Qty: {it.qty} • Unit: {sym}
//                             {Math.round(it.unit_price).toLocaleString()}
//                           </div>
//                         </div>
//                         <div className="text-sm font-black text-white">
//                           {sym}
//                           {Math.round(it.qty * it.unit_price).toLocaleString()}
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>

//                 <div className="mt-5 rounded-3xl border border-[#f2c94c]/20 bg-[#f2c94c]/10 p-5">
//                   <div className="flex items-center justify-between text-sm text-slate-200">
//                     <span className="font-semibold">Subtotal</span>
//                     <span className="font-black">
//                       {sym}
//                       {Math.round(subtotal).toLocaleString()}
//                     </span>
//                   </div>
//                   <div className="mt-2 flex items-center justify-between text-sm text-slate-200">
//                     <span className="font-semibold">Descuento</span>
//                     <span className="font-black">
//                       - {sym}
//                       {Math.round(discountAmount).toLocaleString()}
//                     </span>
//                   </div>
//                   <div className="mt-2 flex items-center justify-between text-sm text-slate-200">
//                     <span className="font-semibold">Impuesto</span>
//                     <span className="font-black">
//                       + {sym}
//                       {Math.round(taxAmount).toLocaleString()}
//                     </span>
//                   </div>
//                   <div className="mt-3 h-px bg-[#f2c94c]/20" />
//                   <div className="mt-3 flex items-center justify-between text-base text-white">
//                     <span className="font-black">Total</span>
//                     <span className="font-black">
//                       {sym}
//                       {Math.round(total).toLocaleString()}
//                     </span>
//                   </div>
//                   <div className="mt-3 text-xs text-slate-400">
//                     Válido hasta: <span className="font-semibold text-slate-200">{validUntil}</span>
//                   </div>
//                 </div>
//               </div>

//               <div className="flex flex-col gap-3 border-t border-white/10 bg-[#0b1220] px-6 py-5 sm:flex-row sm:justify-end">
//                 <button
//                   type="button"
//                   onClick={() => setPreviewOpen(false)}
//                   className="w-full rounded-2xl bg-white/[0.06] px-6 py-3 text-sm font-bold text-slate-200 hover:bg-white/[0.1] sm:w-auto"
//                 >
//                   Cerrar
//                 </button>
//                 <button
//                   type="button"
//                   onClick={saveQuote}
//                   disabled={saving}
//                   className={`${yellowBtn} w-full sm:w-auto`}
//                   style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//                 >
//                   {saving ? "Guardando..." : "Guardar Cotización"}
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// }

// function Field({ label, children }: { label: string; children: React.ReactNode }) {
//   return (
//     <div className="space-y-2">
//       <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</div>
//       {children}
//     </div>
//   );
// }

