"use client";

import { api } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type QuoteRow = {
  id: string;
  status: string;
  client_name: string | null;
  client_email: string | null;
  currency: string;
  total_amount: string | number;
  valid_until: string | null;
  public_id: string | null;
  created_at: string;
};

export default function ProjectQuotesPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id || "";
  const validId = useMemo(() => isUuid(projectId), [projectId]);

  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const r = await api<{ ok: true; quotes: QuoteRow[] }>(`/projects/${projectId}/quotes`);
      setQuotes(r.quotes);
    } catch (e: any) {
      setError(String(e.message || e));
    }
  };

  useEffect(() => {
    if (!projectId || !validId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, validId]);

  if (!validId) return <div className="p-6 text-rose-600">Proyecto inválido.</div>;

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-extrabold">Cotizaciones</div>
          <div className="text-sm text-slate-500">Proyecto: {projectId}</div>
        </div>

        <Link
          className="rounded-xl px-4 py-2 text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-sky-500"
          href={`/producer/projects/${projectId}/quotes/new`}
        >
          Nueva cotización
        </Link>
      </div>

      {error && <div className="mt-4 text-rose-600 text-sm">{error}</div>}

      <div className="mt-6 grid gap-3">
        {quotes.map((q) => (
          <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex justify-between gap-4">
            <div>
              <div className="font-bold text-slate-900">
                {q.client_name || "Cliente sin nombre"} {q.client_email ? `• ${q.client_email}` : ""}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Estado: {q.status} • Total: {q.currency} {q.total_amount}
                {q.valid_until ? ` • Válido hasta: ${q.valid_until}` : ""}
              </div>

              {q.public_id ? (
                <div className="text-xs text-slate-600 mt-2">
                  Público:{" "}
                  <a className="underline" href={`/quote/${q.public_id}`} target="_blank">
                    /quote/{q.public_id}
                  </a>
                </div>
              ) : null}
            </div>

            <div className="flex gap-2">
              <Link className="rounded-xl px-3 py-2 text-sm border border-slate-300" href={`/producer/quotes/${q.id}`}>
                Abrir
              </Link>

              <button
                className="rounded-xl px-3 py-2 text-sm font-bold text-white bg-slate-900"
                onClick={async () => {
                  await api(`/quotes/${q.id}/publish`, { method: "POST" });
                  await load();
                }}
              >
                Publicar
              </button>
            </div>
          </div>
        ))}

        {quotes.length === 0 && !error && (
          <div className="mt-4 text-sm text-slate-500">Aún no hay cotizaciones.</div>
        )}
      </div>
    </div>
  );
}