"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [currency, setCurrency] = useState("CLP");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const r = await api<{ ok: true; project: { id: string } }>("/projects", {
        method: "POST",
        body: JSON.stringify({
          title,
          brief: brief || undefined,
          currency: currency || undefined,
          start_date: startDate || undefined,
          due_date: dueDate || undefined,
        }),
      });

      router.push(`/producer/projects/${r.project.id}`);
    } catch (e: any) {
      setError(String(e.message || e));
    }
  };

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-bold mb-4">Nuevo proyecto</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm">Título</label>
          <input className="w-full border rounded-lg p-2" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="text-sm">Brief</label>
          <textarea className="w-full border rounded-lg p-2" value={brief} onChange={(e) => setBrief(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Moneda</label>
            <input className="w-full border rounded-lg p-2" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
          <div />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Inicio</label>
            <input className="w-full border rounded-lg p-2" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Entrega</label>
            <input className="w-full border rounded-lg p-2" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button className="border rounded-lg px-3 py-2">Crear proyecto</button>
      </form>
    </div>
  );
}