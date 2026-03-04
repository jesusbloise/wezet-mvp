"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type FormState = {
  title: string;
  client: string;
  brief: string;
};

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 9h.01" />
      <path d="M11 12h1v6h-1" />
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
    </svg>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold text-slate-600">{children}</div>;
}

function Input({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none
                 focus:bg-white focus:ring-2 focus:ring-blue-200"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full min-h-[120px] rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none
                 focus:bg-white focus:ring-2 focus:ring-blue-200"
    />
  );
}

export default function NewProjectModalPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    title: "",
    client: "",
    brief: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => form.title.trim().length >= 2, [form.title]);

  const close = () => {
    // comportamiento MVP: vuelve a la lista
    router.push("/producer/projects");
  };

  useEffect(() => {
    // bloquear scroll del body mientras el modal está abierto
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    setError(null);

    try {
      // backend actual: { title, brief, currency?, start_date?, due_date? }
      // MVP tiene "client", por ahora lo dejamos solo visual (no lo enviamos)
      const payload: any = {
        title: form.title.trim(),
        brief: form.brief.trim() || undefined,
        currency: "CLP",
      };

      const r = await api<{ ok: true; project: { id: string } }>("/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      router.push(`/producer/projects/${r.project.id}`);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Cerrar"
        onClick={close}
      />

      {/* Modal wrapper (centro) */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nuevo Proyecto"
          className="w-full max-w-[680px] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <FolderIcon />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-black text-slate-900">Nuevo Proyecto</div>
                <div className="mt-1 text-sm text-slate-500">
                  Crea un proyecto para organizar tu trabajo
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={close}
              className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
              aria-label="Cerrar modal"
            >
              <XIcon />
            </button>
          </div>

          {/* Body (scroll si es necesario) */}
          <div className="px-6 py-6 max-h-[70vh] overflow-auto">
            {error ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del proyecto *</Label>
                <Input
                  value={form.title}
                  onChange={(v) => setForm((p) => ({ ...p, title: v }))}
                  placeholder="Ej: Rediseño web para empresa X"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Cliente (opcional)</Label>
                <Input
                  value={form.client}
                  onChange={(v) => setForm((p) => ({ ...p, client: v }))}
                  placeholder="Nombre del cliente o empresa"
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción (opcional)</Label>
                <Textarea
                  value={form.brief}
                  onChange={(v) => setForm((p) => ({ ...p, brief: v }))}
                  placeholder="Breve descripción del proyecto..."
                />
              </div>

              {/* Caja informativa como MVP */}
              <div className="rounded-2xl border border-blue-200/70 bg-blue-50/60 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
                  <InfoIcon />
                  <span>Después de crear el proyecto podrás:</span>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  <li>Crear un NDA para proteger información</li>
                  <li>Crear un acuerdo/contrato de servicios</li>
                  <li>Generar documentos de cobro</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-slate-200 bg-white flex flex-col sm:flex-row gap-3 sm:justify-end">
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
              onClick={submit}
              disabled={!canSave || saving}
              className="w-full sm:w-auto rounded-2xl px-6 py-3 text-sm font-black text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#f5d36a,#f0c44a)" }}
            >
              {saving ? "Creando..." : "Crear Proyecto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// "use client";

// import { useState } from "react";
// import { api } from "@/lib/api";
// import { useRouter } from "next/navigation";

// export default function NewProjectPage() {
//   const router = useRouter();
//   const [title, setTitle] = useState("");
//   const [brief, setBrief] = useState("");
//   const [currency, setCurrency] = useState("CLP");
//   const [startDate, setStartDate] = useState("");
//   const [dueDate, setDueDate] = useState("");
//   const [error, setError] = useState<string | null>(null);

//   const onSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError(null);
//     try {
//       const r = await api<{ ok: true; project: { id: string } }>("/projects", {
//         method: "POST",
//         body: JSON.stringify({
//           title,
//           brief: brief || undefined,
//           currency: currency || undefined,
//           start_date: startDate || undefined,
//           due_date: dueDate || undefined,
//         }),
//       });

//       router.push(`/producer/projects/${r.project.id}`);
//     } catch (e: any) {
//       setError(String(e.message || e));
//     }
//   };

//   return (
//     <div className="p-6 max-w-xl">
//       <h1 className="text-xl font-bold mb-4">Nuevo proyecto</h1>

//       <form onSubmit={onSubmit} className="space-y-3">
//         <div>
//           <label className="text-sm">Título</label>
//           <input className="w-full border rounded-lg p-2" value={title} onChange={(e) => setTitle(e.target.value)} />
//         </div>

//         <div>
//           <label className="text-sm">Brief</label>
//           <textarea className="w-full border rounded-lg p-2" value={brief} onChange={(e) => setBrief(e.target.value)} />
//         </div>

//         <div className="grid grid-cols-2 gap-3">
//           <div>
//             <label className="text-sm">Moneda</label>
//             <input className="w-full border rounded-lg p-2" value={currency} onChange={(e) => setCurrency(e.target.value)} />
//           </div>
//           <div />
//         </div>

//         <div className="grid grid-cols-2 gap-3">
//           <div>
//             <label className="text-sm">Inicio</label>
//             <input className="w-full border rounded-lg p-2" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
//           </div>
//           <div>
//             <label className="text-sm">Entrega</label>
//             <input className="w-full border rounded-lg p-2" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
//           </div>
//         </div>

//         {error && <div className="text-red-600 text-sm">{error}</div>}

//         <button className="border rounded-lg px-3 py-2">Crear proyecto</button>
//       </form>
//     </div>
//   );
// }