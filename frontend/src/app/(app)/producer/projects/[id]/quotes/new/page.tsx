"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

/* ===================== helpers ===================== */
function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
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
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M21 21l-4.3-4.3" />
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
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

/* ===================== types ===================== */
type ServiceCategory =
  | "all"
  | "design"
  | "digital"
  | "audiovisual"
  | "content"
  | "marketing"
  | "audio"
  | "events"
  | "consulting";

type Service = {
  id: string;
  cat: ServiceCategory;
  title: string;
  desc: string;
  price: number;
  unit: string; // "/proyecto", "/pieza", etc
  emoji: string;
};

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
  discount?: number; // ABS amount (backend)
  tax_rate?: number; // decimal (0.19)
  valid_until?: string; // YYYY-MM-DD
  notes?: string;
  terms?: string;
};

const CATEGORIES: { id: ServiceCategory; label: string; emoji: string }[] = [
  { id: "all", label: "Todos", emoji: "📦" },
  { id: "design", label: "Diseño", emoji: "🎨" },
  { id: "digital", label: "Digital", emoji: "💻" },
  { id: "audiovisual", label: "Audiovisual", emoji: "🎬" },
  { id: "content", label: "Contenido", emoji: "✍️" },
  { id: "marketing", label: "Marketing", emoji: "📣" },
  { id: "audio", label: "Audio", emoji: "🎧" },
  { id: "events", label: "Eventos", emoji: "🎪" },
  { id: "consulting", label: "Consultoría", emoji: "💼" },
];

// Presets (puedes irlos cambiando, la lógica queda lista)
const SERVICES: Service[] = [
  { id: "logo", cat: "design", title: "Diseño de Logo", desc: "Incluye 3 propuestas y 2 revisiones", price: 500, unit: "/proyecto", emoji: "🎨" },
  { id: "brandbook", cat: "design", title: "Manual de Marca", desc: "Guía completa de identidad visual", price: 1500, unit: "/proyecto", emoji: "📘" },
  { id: "rrss", cat: "marketing", title: "Kit Redes Sociales", desc: "10 templates editables", price: 300, unit: "/paquete", emoji: "📱" },
  { id: "flyer", cat: "design", title: "Flyer / Afíche", desc: "Diseño digital o impreso", price: 100, unit: "/pieza", emoji: "🧾" },
  { id: "web", cat: "digital", title: "Landing Page", desc: "Diseño + implementación básica", price: 900, unit: "/proyecto", emoji: "💻" },
  { id: "video", cat: "audiovisual", title: "Edición de Video", desc: "Edición + música + subtítulos básicos", price: 650, unit: "/video", emoji: "🎬" },
  { id: "photo", cat: "audiovisual", title: "Sesión Fotográfica", desc: "20 fotos editadas", price: 400, unit: "/sesión", emoji: "📸" },
  { id: "copy", cat: "content", title: "Copywriting", desc: "Texto para campaña / anuncios", price: 180, unit: "/entrega", emoji: "✍️" },
];

type TaxPreset = { id: string; label: string; ratePct: number };
const TAX_PRESETS: TaxPreset[] = [
  { id: "cl", label: "Chile (IVA 19%)", ratePct: 19 },
  { id: "mx", label: "México (IVA 16%)", ratePct: 16 },
  { id: "ar", label: "Argentina (IVA 21%)", ratePct: 21 },
  { id: "none", label: "Exento / Sin impuesto", ratePct: 0 },
];

/* ===================== page ===================== */
export default function CreateQuoteMvpModalPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params?.id || "";
  const validId = useMemo(() => isUuid(projectId), [projectId]);

  // left side
  const [cat, setCat] = useState<ServiceCategory>("all");
  const [q, setQ] = useState("");

  // cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");

  // right side (quote fields)
  const [clientName, setClientName] = useState("jesus");
  const [clientEmail, setClientEmail] = useState("");
  const [currency, setCurrency] = useState("USD");

  const [validDays, setValidDays] = useState("15");
  const [validUntil, setValidUntil] = useState(addDaysISO(15));

  const [taxPreset, setTaxPreset] = useState<string>("cl");
  const [taxEnabled, setTaxEnabled] = useState(true);

  const [discountPct, setDiscountPct] = useState("0"); // MVP usa %
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // ui states
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const close = () => router.push(`/producer/projects/${projectId}`);

  // lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // valid days -> validUntil
  useEffect(() => {
    const d = clamp(Number(validDays || 0), 0, 3650);
    setValidUntil(addDaysISO(d || 0));
  }, [validDays]);

  const filteredServices = useMemo(() => {
    const text = q.trim().toLowerCase();
    return SERVICES.filter((s) => {
      const catOk = cat === "all" ? true : s.cat === cat;
      const textOk = !text
        ? true
        : (s.title + " " + s.desc).toLowerCase().includes(text);
      return catOk && textOk;
    });
  }, [cat, q]);

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

  const addServiceToCart = (s: Service) => {
    setCart((prev) => {
      const idx = prev.findIndex((p) => p.id === s.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [
        ...prev,
        { id: s.id, title: s.title, description: s.desc, qty: 1, unit_price: s.price },
      ];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  const setQty = (id: string, qty: number) => {
    const q2 = clamp(qty, 1, 9999);
    setCart((prev) => prev.map((p) => (p.id === id ? { ...p, qty: q2 } : p)));
  };

  const addCustom = () => {
    const name = customName.trim();
    const price = Number(customPrice || 0);
    const qty = Number(customQty || 1);

    if (!name || !Number.isFinite(price) || price <= 0) return;

    const id = `custom-${Date.now()}`;
    setCart((prev) => [
      ...prev,
      { id, title: name, description: "", qty: clamp(qty, 1, 9999), unit_price: price },
    ]);
    setCustomName("");
    setCustomPrice("");
    setCustomQty("1");
  };

  const saveQuote = async () => {
    if (saving) return;
    setSaving(true);
    setErr(null);

    try {
      if (!cart.length) {
        setErr("Agrega al menos un servicio antes de guardar.");
        setSaving(false);
        return;
      }

      const discountAbs = Math.round(discountAmount * 100) / 100;
      const taxRateDecimal = taxRatePct / 100;

      const payload: QuoteCreatePayload = {
        client_name: clientName.trim() || undefined,
        client_email: clientEmail.trim() || undefined,
        currency: currency || undefined,
        discount: discountAbs,
        tax_rate: taxRateDecimal,
        valid_until: validUntil || undefined,
        notes: notes.trim() || undefined,
        terms: terms.trim() || undefined,
      };

      const created = await api<{ ok: true; quote: { id: string } }>(`/projects/${projectId}/quotes`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const quoteId = created.quote.id;

      // create items
      let sort = 0;
      for (const it of cart) {
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

  if (!validId) return <div className="p-6 text-rose-600">Proyecto inválido.</div>;

  const sym = currencySymbol(currency);

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <button type="button" className="absolute inset-0 bg-black/55" onClick={close} aria-label="Cerrar" />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[1180px] max-h-[92vh] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          {/* header */}
          <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-lg font-black text-slate-900">
                <span className="text-base">💰</span>
                <span>Crear Cotización</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 truncate">{projectId}</div>
            </div>

            <button
              type="button"
              onClick={close}
              className="shrink-0 rounded-2xl bg-slate-100 px-3 py-2 text-slate-700 hover:bg-slate-200"
              aria-label="Cerrar modal"
            >
              <XIcon />
            </button>
          </div>

          {/* body */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* LEFT */}
              <div className="border-b lg:border-b-0 lg:border-r border-slate-200 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-extrabold text-slate-900">Agregar Servicios</div>
                  <div className="relative w-[220px] hidden sm:block">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      <SearchIcon />
                    </span>
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                {/* categories */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => {
                    const active = c.id === cat;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCat(c.id)}
                        className={[
                          "rounded-2xl px-3 py-2 text-xs font-bold border transition inline-flex items-center gap-2",
                          active
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <span>{c.emoji}</span>
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* services list */}
                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 max-h-[420px] overflow-auto">
                  {filteredServices.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => addServiceToCart(s)}
                      className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 mb-3 hover:bg-slate-50"
                      title="Click para agregar"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 inline-flex items-center gap-2">
                            <span>{s.emoji}</span>
                            <span>{s.title}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{s.desc}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-black text-blue-600">
                            {sym}
                            {Math.round(s.price).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400">{s.unit}</div>
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* custom */}
                  <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
                    <div className="text-xs font-bold text-slate-600">+ Servicio personalizado</div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-2">
                      <input
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                        placeholder="Nombre del servicio"
                      />
                      <input
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                        placeholder="Precio"
                        inputMode="decimal"
                      />
                      <input
                        value={customQty}
                        onChange={(e) => setCustomQty(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                        placeholder="Qty"
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        onClick={addCustom}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="p-6">
                <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <span>Resumen de Cotización</span>
                </div>

                {err ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {err}
                  </div>
                ) : null}

                {/* client */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Cliente / Empresa Creativa">
                    <input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                      placeholder="Nombre del cliente"
                    />
                  </Field>

                  <Field label="Email del cliente">
                    <input
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                      placeholder="email@cliente.com"
                    />
                  </Field>
                </div>

                {/* selected services */}
                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/40 p-4">
                  {cart.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-8">
                      Selecciona servicios de la izquierda
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((it) => (
                        <div
                          key={it.id}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-slate-900 truncate">{it.title}</div>
                            {it.description ? (
                              <div className="text-xs text-slate-500 mt-0.5 truncate">{it.description}</div>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setQty(it.id, it.qty - 1)}
                                className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-black"
                              >
                                −
                              </button>
                              <input
                                value={String(it.qty)}
                                onChange={(e) => setQty(it.id, Number(e.target.value || 1))}
                                className="w-14 h-9 rounded-xl border border-slate-200 bg-white text-center text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                                inputMode="numeric"
                              />
                              <button
                                type="button"
                                onClick={() => setQty(it.id, it.qty + 1)}
                                className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-black"
                              >
                                +
                              </button>
                            </div>

                            <div className="text-sm font-black text-slate-900 w-[110px] text-right">
                              {sym}
                              {Math.round(it.qty * it.unit_price).toLocaleString()}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(it.id)}
                              className="h-9 px-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* controls */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Moneda">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="USD">USD</option>
                      <option value="CLP">CLP</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </Field>

                  <Field label="Validez (días)">
                    <input
                      value={validDays}
                      onChange={(e) => setValidDays(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                      inputMode="numeric"
                    />
                  </Field>

                  <Field label="País (Impuesto)">
                    <select
                      value={taxPreset}
                      onChange={(e) => setTaxPreset(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                    >
                      {TAX_PRESETS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Aplicar impuesto">
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <input
                        type="checkbox"
                        checked={taxEnabled}
                        onChange={(e) => setTaxEnabled(e.target.checked)}
                      />
                      <span className="text-slate-700 font-semibold">
                        {taxEnabled ? `${taxRatePct}%` : "0%"}
                      </span>
                    </label>
                  </Field>

                  <Field label="Descuento (%)">
                    <input
                      value={discountPct}
                      onChange={(e) => setDiscountPct(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                      inputMode="decimal"
                    />
                  </Field>

                  <Field label="Válido hasta">
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                    />
                  </Field>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Notas">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full min-h-[120px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                    />
                  </Field>

                  <Field label="Términos">
                    <textarea
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      className="w-full min-h-[120px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                    />
                  </Field>
                </div>

                {/* totals */}
                <div className="mt-4 rounded-3xl border border-blue-200 bg-blue-50/50 p-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span className="inline-flex items-center gap-2">
                      <MoneyIcon />
                      Subtotal
                    </span>
                    <span>
                      {currency} {sym}
                      {Math.round(subtotal).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                    <span>Descuento ({clamp(Number(discountPct || 0), 0, 100)}%)</span>
                    <span>
                      - {sym}
                      {Math.round(discountAmount).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                    <span>Impuesto ({taxRatePct}%)</span>
                    <span>
                      + {sym}
                      {Math.round(taxAmount).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-3 h-px bg-blue-200/70" />

                  <div className="mt-3 flex items-center justify-between text-sm font-black text-slate-900">
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

          {/* footer */}
          <div className="px-6 py-5 border-t border-slate-200 bg-white flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={close}
              className="w-full sm:w-auto rounded-2xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="w-full sm:w-auto rounded-2xl bg-blue-100 px-6 py-3 text-sm font-bold text-blue-800 hover:bg-blue-200"
              disabled={!cart.length}
              title={!cart.length ? "Agrega servicios para previsualizar" : "Ver vista previa"}
            >
              👁 Vista Previa
            </button>

            <button
              type="button"
              onClick={saveQuote}
              disabled={saving || !cart.length}
              className="w-full sm:w-auto rounded-2xl px-6 py-3 text-sm font-black text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#f5d36a,#f0c44a)" }}
            >
              {saving ? "Guardando..." : "💾 Guardar Cotización"}
            </button>
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {previewOpen ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Cerrar preview"
            onClick={() => setPreviewOpen(false)}
          />

          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-[920px] max-h-[90vh] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-black text-slate-900">Vista Previa</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Cliente: <span className="font-semibold text-slate-700">{clientName || "—"}</span>{" "}
                    {clientEmail ? `• ${clientEmail}` : ""}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="shrink-0 rounded-2xl bg-slate-100 px-3 py-2 text-slate-700 hover:bg-slate-200"
                  aria-label="Cerrar preview"
                >
                  <XIcon />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6">
                <div className="rounded-3xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 bg-[#f6f9fc] text-sm font-extrabold text-slate-900">
                    Servicios
                  </div>

                  <div className="p-5 space-y-3">
                    {cart.map((it) => (
                      <div
                        key={it.id}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 truncate">{it.title}</div>
                          <div className="text-xs text-slate-500">
                            Qty: {it.qty} • Unit: {sym}{Math.round(it.unit_price).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm font-black text-slate-900">
                          {sym}{Math.round(it.qty * it.unit_price).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50/50 p-5">
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span className="font-semibold">Subtotal</span>
                    <span className="font-black">
                      {sym}{Math.round(subtotal).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-700">
                    <span className="font-semibold">Descuento</span>
                    <span className="font-black">
                      - {sym}{Math.round(discountAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-700">
                    <span className="font-semibold">Impuesto</span>
                    <span className="font-black">
                      + {sym}{Math.round(taxAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-3 h-px bg-blue-200/70" />
                  <div className="mt-3 flex items-center justify-between text-base text-slate-900">
                    <span className="font-black">Total</span>
                    <span className="font-black">
                      {sym}{Math.round(total).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Válido hasta: <span className="font-semibold text-slate-700">{validUntil}</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 border-t border-slate-200 bg-white flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="w-full sm:w-auto rounded-2xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={saveQuote}
                  disabled={saving}
                  className="w-full sm:w-auto rounded-2xl px-6 py-3 text-sm font-black text-white disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#f5d36a,#f0c44a)" }}
                >
                  {saving ? "Guardando..." : "💾 Guardar Cotización"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ===================== small UI ===================== */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-bold text-slate-600">{label}</div>
      {children}
    </div>
  );
}


// "use client";

// import { api } from "@/lib/api";
// import { useParams, useRouter } from "next/navigation";
// import { useState } from "react";

// export default function NewQuotePage() {
//   const params = useParams<{ id: string }>();
//   const projectId = params?.id || "";
//   const router = useRouter();

//   const [clientName, setClientName] = useState("");
//   const [clientEmail, setClientEmail] = useState("");
//   const [currency, setCurrency] = useState("CLP");
//   const [taxRate, setTaxRate] = useState("0");
//   const [discount, setDiscount] = useState("0");
//   const [validUntil, setValidUntil] = useState("");
//   const [notes, setNotes] = useState("");
//   const [terms, setTerms] = useState("");
//   const [error, setError] = useState<string | null>(null);

//   const create = async () => {
//     setError(null);
//     try {
//       const r = await api<{ ok: true; quote: { id: string } }>(`/projects/${projectId}/quotes`, {
//         method: "POST",
//         body: JSON.stringify({
//           client_name: clientName || undefined,
//           client_email: clientEmail || undefined,
//           currency: currency || undefined,
//           tax_rate: Number(taxRate || "0"),
//           discount: Number(discount || "0"),
//           valid_until: validUntil || undefined,
//           notes: notes || undefined,
//           terms: terms || undefined,
//         }),
//       });

//       router.push(`/producer/quotes/${r.quote.id}`);
//     } catch (e: any) {
//       setError(String(e.message || e));
//     }
//   };

//   return (
//     <div className="max-w-[900px]">
//       <div className="text-2xl font-extrabold">Nueva cotización</div>
//       <div className="text-sm text-slate-500 mt-1">Proyecto: {projectId}</div>

//       {error && <div className="mt-4 text-rose-600 text-sm">{error}</div>}

//       <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5">
//         <div className="grid sm:grid-cols-2 gap-3">
//           <div>
//             <div className="text-sm font-semibold">Cliente</div>
//             <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
//               value={clientName} onChange={(e) => setClientName(e.target.value)} />
//           </div>
//           <div>
//             <div className="text-sm font-semibold">Email cliente</div>
//             <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
//               value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
//           </div>
//         </div>

//         <div className="grid sm:grid-cols-3 gap-3">
//           <div>
//             <div className="text-sm font-semibold">Moneda</div>
//             <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
//               value={currency} onChange={(e) => setCurrency(e.target.value)} />
//           </div>
//           <div>
//             <div className="text-sm font-semibold">Impuesto (0.19)</div>
//             <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
//               value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
//           </div>
//           <div>
//             <div className="text-sm font-semibold">Descuento</div>
//             <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
//               value={discount} onChange={(e) => setDiscount(e.target.value)} />
//           </div>
//         </div>

//         <div>
//           <div className="text-sm font-semibold">Válido hasta</div>
//           <input type="date" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
//             value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
//         </div>

//         <div className="grid sm:grid-cols-2 gap-3">
//           <div>
//             <div className="text-sm font-semibold">Notas</div>
//             <textarea className="mt-1 w-full min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
//               value={notes} onChange={(e) => setNotes(e.target.value)} />
//           </div>
//           <div>
//             <div className="text-sm font-semibold">Términos</div>
//             <textarea className="mt-1 w-full min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
//               value={terms} onChange={(e) => setTerms(e.target.value)} />
//           </div>
//         </div>

//         <button
//           className="mt-2 rounded-xl px-4 py-3 text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-sky-500"
//           onClick={create}
//         >
//           Crear cotización
//         </button>
//       </div>
//     </div>
//   );
// }