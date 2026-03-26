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
  return <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{children}</div>;
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
      className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
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
      className="min-h-[120px] w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
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
    router.push("/projects");
  };

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
  }, []);

  const submit = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        title: form.title.trim(),
        brief: form.brief.trim() || undefined,
        currency: "CLP",
      };

      await api<{ ok: true; project: { id: string } }>("/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      router.push("/projects");
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={close}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nuevo Proyecto"
          className="w-full max-w-[680px] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1320] shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f2c94c] text-[#0b0f17]">
                <FolderIcon />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-black text-white">Nuevo Proyecto</div>
                <div className="mt-1 text-sm text-slate-500">
                  Crea un proyecto para organizar tu trabajo y colaborar con otros usuarios.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={close}
              className="shrink-0 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-slate-300 hover:bg-white/[0.08]"
              aria-label="Cerrar modal"
            >
              <XIcon />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-auto px-6 py-6">
            {error ? (
              <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
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

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-blue-300">
                  <InfoIcon />
                  <span>Después de crear el proyecto podrás:</span>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  <li>Invitar usuarios a colaborar contigo</li>
                  <li>Crear un NDA para proteger información</li>
                  <li>Gestionar talentos, acuerdos y documentos de cobro</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/8 bg-[#0d1320] px-6 py-5 sm:flex-row sm:justify-end">
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
              onClick={submit}
              disabled={!canSave || saving}
              className="w-full rounded-2xl px-6 py-3 text-sm font-black text-[#0b0f17] disabled:opacity-60 sm:w-auto"
              style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
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

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import { api } from "@/lib/api";

// type FormState = {
//   title: string;
//   client: string;
//   brief: string;
// };

// function FolderIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
//     </svg>
//   );
// }

// function XIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M6 6l12 12" />
//       <path d="M18 6L6 18" />
//     </svg>
//   );
// }

// function InfoIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
//       <path d="M12 9h.01" />
//       <path d="M11 12h1v6h-1" />
//       <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
//     </svg>
//   );
// }

// function Label({ children }: { children: React.ReactNode }) {
//   return <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{children}</div>;
// }

// function Input({
//   value,
//   onChange,
//   placeholder,
//   required,
// }: {
//   value: string;
//   onChange: (v: string) => void;
//   placeholder?: string;
//   required?: boolean;
// }) {
//   return (
//     <input
//       value={value}
//       onChange={(e) => onChange(e.target.value)}
//       placeholder={placeholder}
//       required={required}
//       className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
//     />
//   );
// }

// function Textarea({
//   value,
//   onChange,
//   placeholder,
// }: {
//   value: string;
//   onChange: (v: string) => void;
//   placeholder?: string;
// }) {
//   return (
//     <textarea
//       value={value}
//       onChange={(e) => onChange(e.target.value)}
//       placeholder={placeholder}
//       className="min-h-[120px] w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
//     />
//   );
// }

// export default function NewProjectModalPage() {
//   const router = useRouter();

//   const [form, setForm] = useState<FormState>({
//     title: "",
//     client: "",
//     brief: "",
//   });

//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const canSave = useMemo(() => form.title.trim().length >= 2, [form.title]);

//   const close = () => {
//     router.push("/producer/projects");
//   };

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
//   }, []);

//   const submit = async () => {
//     if (!canSave || saving) return;

//     setSaving(true);
//     setError(null);

//     try {
//       const payload: any = {
//         title: form.title.trim(),
//         brief: form.brief.trim() || undefined,
//         currency: "CLP",
//       };

//       const r = await api<{ ok: true; project: { id: string } }>("/projects", {
//         method: "POST",
//         body: JSON.stringify(payload),
//       });

//       router.push(`/producer/projects/${r.project.id}`);
//     } catch (e: any) {
//       setError(String(e?.message || e));
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50">
//       <button
//         type="button"
//         className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
//         aria-label="Cerrar"
//         onClick={close}
//       />

//       <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
//         <div
//           role="dialog"
//           aria-modal="true"
//           aria-label="Nuevo Proyecto"
//           className="w-full max-w-[680px] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1320] shadow-2xl"
//         >
//           <div className="flex items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
//             <div className="flex min-w-0 items-start gap-3">
//               <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f2c94c] text-[#0b0f17]">
//                 <FolderIcon />
//               </div>
//               <div className="min-w-0">
//                 <div className="text-xl font-black text-white">Nuevo Proyecto</div>
//                 <div className="mt-1 text-sm text-slate-500">
//                   Crea un proyecto para organizar tu trabajo
//                 </div>
//               </div>
//             </div>

//             <button
//               type="button"
//               onClick={close}
//               className="shrink-0 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-slate-300 hover:bg-white/[0.08]"
//               aria-label="Cerrar modal"
//             >
//               <XIcon />
//             </button>
//           </div>

//           <div className="max-h-[70vh] overflow-auto px-6 py-6">
//             {error ? (
//               <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
//                 {error}
//               </div>
//             ) : null}

//             <div className="space-y-4">
//               <div className="space-y-2">
//                 <Label>Nombre del proyecto *</Label>
//                 <Input
//                   value={form.title}
//                   onChange={(v) => setForm((p) => ({ ...p, title: v }))}
//                   placeholder="Ej: Rediseño web para empresa X"
//                   required
//                 />
//               </div>

//               <div className="space-y-2">
//                 <Label>Cliente (opcional)</Label>
//                 <Input
//                   value={form.client}
//                   onChange={(v) => setForm((p) => ({ ...p, client: v }))}
//                   placeholder="Nombre del cliente o empresa"
//                 />
//               </div>

//               <div className="space-y-2">
//                 <Label>Descripción (opcional)</Label>
//                 <Textarea
//                   value={form.brief}
//                   onChange={(v) => setForm((p) => ({ ...p, brief: v }))}
//                   placeholder="Breve descripción del proyecto..."
//                 />
//               </div>

//               <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
//                 <div className="flex items-center gap-2 text-sm font-bold text-blue-300">
//                   <InfoIcon />
//                   <span>Después de crear el proyecto podrás:</span>
//                 </div>
//                 <ul className="mt-2 space-y-1 text-sm text-slate-300">
//                   <li>Crear un NDA para proteger información</li>
//                   <li>Crear un acuerdo/contrato de servicios</li>
//                   <li>Generar documentos de cobro</li>
//                 </ul>
//               </div>
//             </div>
//           </div>

//           <div className="flex flex-col gap-3 border-t border-white/8 bg-[#0d1320] px-6 py-5 sm:flex-row sm:justify-end">
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
//               onClick={submit}
//               disabled={!canSave || saving}
//               className="w-full rounded-2xl px-6 py-3 text-sm font-black text-[#0b0f17] disabled:opacity-60 sm:w-auto"
//               style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//             >
//               {saving ? "Creando..." : "Crear Proyecto"}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

