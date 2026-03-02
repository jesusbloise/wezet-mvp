"use client";

import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function NewQuotePage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id || "";
  const router = useRouter();

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [currency, setCurrency] = useState("CLP");
  const [taxRate, setTaxRate] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setError(null);
    try {
      const r = await api<{ ok: true; quote: { id: string } }>(`/projects/${projectId}/quotes`, {
        method: "POST",
        body: JSON.stringify({
          client_name: clientName || undefined,
          client_email: clientEmail || undefined,
          currency: currency || undefined,
          tax_rate: Number(taxRate || "0"),
          discount: Number(discount || "0"),
          valid_until: validUntil || undefined,
          notes: notes || undefined,
          terms: terms || undefined,
        }),
      });

      router.push(`/producer/quotes/${r.quote.id}`);
    } catch (e: any) {
      setError(String(e.message || e));
    }
  };

  return (
    <div className="max-w-[900px]">
      <div className="text-2xl font-extrabold">Nueva cotización</div>
      <div className="text-sm text-slate-500 mt-1">Proyecto: {projectId}</div>

      {error && <div className="mt-4 text-rose-600 text-sm">{error}</div>}

      <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-sm font-semibold">Cliente</div>
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div>
            <div className="text-sm font-semibold">Email cliente</div>
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <div className="text-sm font-semibold">Moneda</div>
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
          <div>
            <div className="text-sm font-semibold">Impuesto (0.19)</div>
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </div>
          <div>
            <div className="text-sm font-semibold">Descuento</div>
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold">Válido hasta</div>
          <input type="date" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-sm font-semibold">Notas</div>
            <textarea className="mt-1 w-full min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <div className="text-sm font-semibold">Términos</div>
            <textarea className="mt-1 w-full min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>
        </div>

        <button
          className="mt-2 rounded-xl px-4 py-3 text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-sky-500"
          onClick={create}
        >
          Crear cotización
        </button>
      </div>
    </div>
  );
}