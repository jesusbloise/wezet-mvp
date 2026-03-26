"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(dt);
}

function resolveAttachmentUrl(rawUrl?: string | null) {
  if (!rawUrl) return null;

  const value = rawUrl.trim();
  if (!value) return null;

  try {
    return new URL(value).toString();
  } catch {
    try {
      return new URL(value, API).toString();
    } catch {
      return null;
    }
  }
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5" />
    </svg>
  );
}

export default function PublicQuotePage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params?.publicId || "";

  const [data, setData] = useState<{ quote: Quote; items: QuoteItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicId) return;

    const run = async () => {
      setError(null);
      try {
        const res = await fetch(`${API}/public/quote/${publicId}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${await res.text()}`);
        }

        const r = (await res.json()) as {
          ok: true;
          quote: Quote;
          items: QuoteItem[];
        };

        setData({ quote: r.quote, items: r.items });
      } catch (e: any) {
        setError(String(e?.message || e));
      }
    };

    run();
  }, [publicId]);

  const attachmentHref = useMemo(
    () => resolveAttachmentUrl(data?.quote?.attachment_url),
    [data?.quote?.attachment_url]
  );

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-[900px] rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-2xl font-extrabold">Cotización no disponible</div>
          <div className="mt-2 text-sm text-slate-600">{error || "Cargando..."}</div>
          <div className="mt-4">
            <Link className="text-sm text-slate-700 underline" href="/">
              Volver
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { quote, items } = data;
  const hasAttachment = !!quote.attachment_name || !!attachmentHref;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-[900px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-2xl font-extrabold">Cotización</div>
              <div className="mt-1 text-sm text-slate-500">
                Para:{" "}
                <span className="font-semibold text-slate-700">
                  {quote.client_name || "Cliente"}
                </span>
                {quote.client_email ? ` • ${quote.client_email}` : ""}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Válido hasta:{" "}
                <span className="font-semibold">{fmtDate(quote.valid_until)}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500">Total</div>
              <div className="text-2xl font-extrabold">
                {quote.currency} {n(quote.total_amount).toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-slate-400">Estado: {quote.status}</div>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Esta vista es pública y <b>no muestra</b> negociaciones internas.
          </div>
        </div>

        {hasAttachment ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-lg font-extrabold">Archivo adjunto</div>

            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                  <FileIcon />
                </div>

                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">
                    {quote.attachment_name || "Archivo adjunto"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {quote.attachment_mime_type || "Archivo disponible para descarga"}
                  </div>
                </div>
              </div>

              {attachmentHref ? (
                <a
                  href={attachmentHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={quote.attachment_name || undefined}
                  className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Descargar
                </a>
              ) : (
                <span className="text-xs text-rose-500">Sin enlace disponible</span>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-extrabold">Detalle</div>

          <div className="mt-4 grid gap-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900">{it.title}</div>
                    {it.description ? (
                      <div className="mt-1 text-sm text-slate-600">{it.description}</div>
                    ) : null}
                    <div className="mt-2 text-xs text-slate-500">
                      Cantidad: {it.qty} • Unitario: {quote.currency}{" "}
                      {n(it.unit_price).toFixed(2)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-500">Total</div>
                    <div className="font-extrabold">
                      {quote.currency} {n(it.line_total).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {items.length === 0 ? (
              <div className="text-sm text-slate-500">
                No hay ítems en esta cotización.
              </div>
            ) : null}
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-bold">
                {quote.currency} {n(quote.subtotal).toFixed(2)}
              </span>
            </div>

            <div className="mt-1 flex justify-between text-sm">
              <span className="text-slate-600">Descuento</span>
              <span className="font-bold">
                - {quote.currency} {n(quote.discount).toFixed(2)}
              </span>
            </div>

            <div className="mt-1 flex justify-between text-sm">
              <span className="text-slate-600">
                Impuesto ({(n(quote.tax_rate) * 100).toFixed(1)}%)
              </span>
              <span className="font-bold">
                {quote.currency} {n(quote.tax_amount).toFixed(2)}
              </span>
            </div>

            <div className="my-3 border-t border-slate-200" />

            <div className="flex justify-between text-base">
              <span className="font-extrabold">Total</span>
              <span className="font-extrabold">
                {quote.currency} {n(quote.total_amount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {quote.notes || quote.terms ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-lg font-extrabold">Notas</div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {quote.notes || "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-lg font-extrabold">Términos</div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {quote.terms || "—"}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 text-xs text-slate-500">
          Generado por WEZET • {fmtDate(quote.created_at)}
        </div>
      </div>
    </div>
  );
}