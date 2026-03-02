"use client";

import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
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

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function QuoteDetailPage() {
  const params = useParams<{ quoteId: string }>();
  const router = useRouter();
  const quoteId = params?.quoteId || "";

  const validId = useMemo(() => isUuid(quoteId), [quoteId]);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [currency, setCurrency] = useState("CLP");
  const [discount, setDiscount] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // New item fields
  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemUnit, setItemUnit] = useState("0");

  const [saving, setSaving] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [publishing, setPublishing] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId, validId]);

  const saveQuote = async () => {
    if (!quote) return;
    setSaving(true);
    setError(null);
    try {
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
        }),
      });

      // recarga para ver totals actualizados
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

  if (!quoteId) return <div className="p-6">Cargando...</div>;

  return (
    <div className="max-w-[1100px]">
      <button className="text-sm underline text-slate-700" onClick={() => router.back()}>
        Volver
      </button>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-extrabold">💰 Cotización</div>
            <div className="text-sm text-slate-500 mt-1">
              ID: <span className="font-mono">{quoteId}</span>
            </div>
            {quote ? (
              <div className="text-xs text-slate-500 mt-1">
                Estado: <span className="font-semibold text-slate-700">{quote.status}</span>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-xl px-3 py-2 text-sm border border-slate-300"
              onClick={saveQuote}
              disabled={saving || !quote}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>

            <button
              className="rounded-xl px-3 py-2 text-sm font-bold text-white bg-slate-900 disabled:opacity-50"
              onClick={publish}
              disabled={publishing || !quote}
            >
              {publishing ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </div>

        {error && <div className="mt-4 text-rose-600 text-sm">{error}</div>}

        {!validId && <div className="mt-4 text-rose-600 text-sm">ID inválido</div>}
        {!quote && validId && <div className="mt-4 text-sm text-slate-500">Cargando cotización…</div>}

        {quote ? (
          <>
            {/* Link público */}
            {quote.public_id ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold">Link público</div>
                <div className="text-xs text-slate-600 mt-1">
                  <a className="underline" href={`/quote/${quote.public_id}`} target="_blank">
                    /quote/{quote.public_id}
                  </a>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Esta vista es para el cliente y NO muestra negociaciones internas.
                </div>
              </div>
            ) : (
              <div className="mt-4 text-xs text-slate-500">
                Aún no hay link público. Presiona <b>Publicar</b> para generarlo.
              </div>
            )}

            {/* Form */}
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-lg font-extrabold">Cliente</div>

                <div className="mt-3 grid gap-3">
                  <div>
                    <div className="text-sm font-semibold">Nombre</div>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="text-sm font-semibold">Email</div>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm font-semibold">Moneda</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="text-sm font-semibold">Válido hasta</div>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm font-semibold">Descuento</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Impuesto (0.19)</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-lg font-extrabold">Totales</div>

                <div className="mt-4 grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-bold">{currency} {n(quote.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Descuento</span>
                    <span className="font-bold">- {currency} {n(quote.discount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Impuesto</span>
                    <span className="font-bold">{currency} {n(quote.tax_amount).toFixed(2)}</span>
                  </div>

                  <div className="border-t border-slate-200 my-2" />

                  <div className="flex justify-between text-base">
                    <span className="font-extrabold">Total</span>
                    <span className="font-extrabold">{currency} {n(quote.total_amount).toFixed(2)}</span>
                  </div>

                  <div className="text-xs text-slate-500 mt-2">
                    Los totales se recalculan cuando guardas o agregas ítems.
                  </div>
                </div>
              </div>
            </div>

            {/* Notes / Terms */}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-lg font-extrabold">Notas</div>
                <textarea
                  className="mt-2 w-full min-h-[140px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-lg font-extrabold">Términos</div>
                <textarea
                  className="mt-2 w-full min-h-[140px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                />
              </div>
            </div>

            {/* Items */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-extrabold">Ítems</div>
                  <div className="text-sm text-slate-500">Servicios, entregables o líneas del presupuesto.</div>
                </div>
              </div>

              {/* Add item */}
              <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid lg:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm font-semibold">Título</div>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                      value={itemTitle}
                      onChange={(e) => setItemTitle(e.target.value)}
                      placeholder="Edición video + color"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-semibold">Descripción</div>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                      value={itemDesc}
                      onChange={(e) => setItemDesc(e.target.value)}
                      placeholder="Incluye 2 revisiones"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <div className="text-sm font-semibold">Cantidad</div>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="text-sm font-semibold">Precio unitario</div>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                      value={itemUnit}
                      onChange={(e) => setItemUnit(e.target.value)}
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-sky-500 disabled:opacity-50"
                      disabled={addingItem || !itemTitle.trim()}
                      onClick={addItem}
                    >
                      {addingItem ? "Agregando..." : "Agregar ítem"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Items list */}
              <div className="mt-5 grid gap-3">
                {items.map((it) => (
                  <div key={it.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-extrabold text-slate-900">{it.title}</div>
                        {it.description ? <div className="text-sm text-slate-600 mt-1">{it.description}</div> : null}
                        <div className="text-xs text-slate-500 mt-2">
                          Qty: {it.qty} • Unit: {currency} {n(it.unit_price).toFixed(2)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-500">Total</div>
                        <div className="font-extrabold">{currency} {n(it.line_total).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="text-sm text-slate-500">Aún no hay ítems. Agrega el primero arriba.</div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}