"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type ContactType = "creativo" | "empresa";

type ContactRow = {
  id: string;
  type: ContactType;
  name: string;
  email: string;
  phone?: string | null;
  specialty?: string | null;
  company?: string | null;
  source?: "manual" | "talents" | "quotes";
  created_at?: string | null;
  updated_at?: string | null;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Pill({
  tone,
  children,
}: {
  tone: "yellow" | "amber" | "emerald" | "rose" | "blue";
  children: React.ReactNode;
}) {
  const cls =
    tone === "yellow"
      ? "bg-[#f2c94c]/12 text-[#f2c94c] border-[#f2c94c]/20"
      : tone === "blue"
      ? "bg-blue-500/12 text-blue-300 border-blue-500/20"
      : tone === "amber"
      ? "bg-amber-500/12 text-amber-300 border-amber-500/20"
      : tone === "emerald"
      ? "bg-emerald-500/12 text-emerald-300 border-emerald-500/20"
      : "bg-rose-500/12 text-rose-300 border-rose-500/20";

  return (
    <span className={cx("inline-flex items-center rounded-xl px-3 py-1 text-[11px] font-extrabold border", cls)}>
      {children}
    </span>
  );
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[720px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1320] shadow-2xl">
          <div className="px-8 pb-5 pt-8">
            <div className="text-[20px] font-extrabold text-white">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
          </div>
          <div className="px-8 pb-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, type }: { name: string; type: ContactType }) {
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  const bg =
    type === "empresa"
      ? "bg-blue-500/12 text-blue-300 border-blue-500/20"
      : "bg-emerald-500/12 text-emerald-300 border-emerald-500/20";

  return (
    <div className={cx("flex h-11 w-11 items-center justify-center rounded-2xl border font-black", bg)}>
      {letter}
    </div>
  );
}

export default function ContactsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [type, setType] = useState<ContactType>("creativo");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<ContactRow | null>(null);

  async function loadContacts() {
    setLoading(true);
    setErr(null);
    try {
      const r = await api<{ ok: true; contacts: ContactRow[] }>("/contacts");
      setContacts(r.contacts || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContacts();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return contacts;
    return contacts.filter((c) => {
      const hay = `${c.name} ${c.email} ${c.phone || ""} ${c.specialty || ""} ${c.company || ""} ${c.type}`.toLowerCase();
      return hay.includes(s);
    });
  }, [contacts, q]);

  function resetCreate() {
    setType("creativo");
    setName("");
    setEmail("");
    setPhone("");
    setSpecialty("");
    setCompany("");
  }

  async function createContact() {
    if (!name.trim() || !email.trim()) return;

    setSaving(true);
    setErr(null);

    try {
      const payload = {
        type,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        specialty: type === "creativo" ? specialty.trim() || null : null,
        company: type === "empresa" ? company.trim() || null : null,
        source: "manual",
      };

      const r = await api<{ ok: true; contact: ContactRow }>("/contacts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await loadContacts();

      setCreateOpen(false);
      resetCreate();
      setSelected(r.contact || null);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact(id: string) {
    if (!confirm("¿Eliminar este contacto?")) return;
    setErr(null);
    try {
      await api<{ ok: true; deleted: boolean }>(`/contacts/${id}`, { method: "DELETE" });
      await loadContacts();
      setSelected(null);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <main className="px-5 py-8 sm:px-8">
        <div className="max-w-[980px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
                relationship management
              </div>
              <h1 className="mt-2 text-[26px] font-black text-white">Contactos</h1>
              <p className="mt-1 text-sm text-slate-500">Tus contactos guardados</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadContacts}
                className="rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/[0.1]"
              >
                Recargar
              </button>

              <button
                type="button"
                onClick={() => {
                  resetCreate();
                  setCreateOpen(true);
                }}
                className="rounded-2xl px-5 py-3 text-sm font-extrabold text-[#0b0f17]"
                style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
              >
                + Nuevo contacto
              </button>
            </div>
          </div>

          <div className="mt-6">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar en contactos..."
                className="w-full rounded-2xl border border-white/8 bg-[#0d1320] px-4 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-[#f2c94c]/15"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                {filtered.length}/{contacts.length}
              </div>
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {err}
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d1320]">
              <div className="border-b border-white/8 bg-[#111827] px-6 py-5">
                <div className="text-sm font-extrabold text-white">Lista</div>
                <div className="text-xs text-slate-500">Contactos persistidos en la BD</div>
              </div>

              <div className="px-6 py-6">
                {loading ? (
                  <div className="text-sm text-slate-400">Cargando...</div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                    <div className="text-sm font-semibold text-slate-300">No hay contactos</div>
                    <div className="mt-1 text-xs text-slate-500">Crea tu primer contacto</div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {filtered.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelected(c)}
                        className={cx(
                          "w-full rounded-2xl border p-4 text-left transition",
                          selected?.id === c.id
                            ? "border-[#f2c94c]/25 bg-[#f2c94c]/10"
                            : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <Avatar name={c.name} type={c.type} />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-extrabold text-white">{c.name}</div>
                              <div className="mt-1 truncate text-xs text-slate-500">{c.email}</div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <Pill tone={c.type === "empresa" ? "blue" : "emerald"}>
                                  {c.type === "empresa" ? "Empresa" : "Creativo"}
                                </Pill>
                                {c.source ? <Pill tone="amber">{c.source}</Pill> : null}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            {c.phone ? (
                              <div className="text-xs text-slate-500">{c.phone}</div>
                            ) : (
                              <div className="text-xs text-slate-700">—</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d1320]">
              <div className="border-b border-white/8 bg-[#111827] px-6 py-5">
                <div className="text-sm font-extrabold text-white">Detalle</div>
                <div className="text-xs text-slate-500">Acciones</div>
              </div>

              <div className="px-6 py-6">
                {!selected ? (
                  <div className="text-sm text-slate-500">Selecciona un contacto.</div>
                ) : (
                  <div>
                    <div className="flex items-start gap-3">
                      <Avatar name={selected.name} type={selected.type} />
                      <div className="min-w-0">
                        <div className="truncate text-lg font-black text-white">{selected.name}</div>
                        <div className="truncate text-xs text-slate-500">{selected.email}</div>
                        {selected.phone ? (
                          <div className="mt-1 text-xs text-slate-500">{selected.phone}</div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Pill tone={selected.type === "empresa" ? "blue" : "emerald"}>
                        {selected.type === "empresa" ? "Empresa" : "Creativo"}
                      </Pill>
                      {selected.source ? <Pill tone="amber">{selected.source}</Pill> : null}
                    </div>

                    {selected.specialty ? (
                      <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Especialidad
                        </div>
                        <div className="mt-2 text-sm text-slate-300">{selected.specialty}</div>
                      </div>
                    ) : null}

                    {selected.company ? (
                      <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Empresa
                        </div>
                        <div className="mt-2 text-sm text-slate-300">{selected.company}</div>
                      </div>
                    ) : null}

                    <div className="mt-5 grid gap-2">
                      <button
                        type="button"
                        className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-3 text-sm font-bold text-rose-300 hover:bg-rose-500/15"
                        onClick={() => deleteContact(selected.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nuevo contacto"
        subtitle="Se guarda en la base de datos"
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("creativo")}
              className={cx(
                "rounded-2xl border px-4 py-3 text-sm font-extrabold transition",
                type === "creativo"
                  ? "bg-[#f2c94c]/10 border-[#f2c94c]/30 text-[#f2c94c]"
                  : "bg-white/[0.03] border-white/8 text-slate-300 hover:bg-white/[0.06]"
              )}
            >
              Creativo
            </button>
            <button
              type="button"
              onClick={() => setType("empresa")}
              className={cx(
                "rounded-2xl border px-4 py-3 text-sm font-extrabold transition",
                type === "empresa"
                  ? "bg-[#f2c94c]/10 border-[#f2c94c]/30 text-[#f2c94c]"
                  : "bg-white/[0.03] border-white/8 text-slate-300 hover:bg-white/[0.06]"
              )}
            >
              Empresa
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-bold text-slate-400">Nombre *</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del contacto"
                className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
              />
            </div>

            <div>
              <div className="text-xs font-bold text-slate-400">Email *</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-bold text-slate-400">Teléfono</div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+56 9 1234 5678"
                className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
              />
            </div>

            {type === "creativo" ? (
              <div>
                <div className="text-xs font-bold text-slate-400">Especialidad</div>
                <input
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Ej: Diseño, Foto, Video..."
                  className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
                />
              </div>
            ) : (
              <div>
                <div className="text-xs font-bold text-slate-400">Empresa</div>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Ej: Agencia XYZ"
                  className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-2xl bg-white/[0.06] px-6 py-3 text-sm font-bold text-slate-200 hover:bg-white/[0.1]"
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={createContact}
              disabled={saving || !name.trim() || !email.trim()}
              className="rounded-2xl px-6 py-3 text-sm font-extrabold text-[#0b0f17] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
            >
              {saving ? "Guardando..." : "Guardar contacto"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { api } from "@/lib/api";

// type ContactType = "creativo" | "empresa";

// type ContactRow = {
//   id: string;
//   type: ContactType;
//   name: string;
//   email: string;
//   phone?: string | null;
//   specialty?: string | null;
//   company?: string | null;
//   source?: "manual" | "talents" | "quotes";
//   created_at?: string | null;
//   updated_at?: string | null;
// };

// function cx(...classes: Array<string | false | null | undefined>) {
//   return classes.filter(Boolean).join(" ");
// }

// function Pill({
//   tone,
//   children,
// }: {
//   tone: "blue" | "amber" | "emerald" | "rose";
//   children: React.ReactNode;
// }) {
//   const cls =
//     tone === "blue"
//       ? "bg-blue-50 text-blue-700 border-blue-200/60"
//       : tone === "amber"
//       ? "bg-amber-50 text-amber-700 border-amber-200/60"
//       : tone === "emerald"
//       ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
//       : "bg-rose-50 text-rose-700 border-rose-200/60";

//   return (
//     <span className={cx("inline-flex items-center rounded-xl px-3 py-1 text-[11px] font-extrabold border", cls)}>
//       {children}
//     </span>
//   );
// }

// function Modal({
//   open,
//   title,
//   subtitle,
//   onClose,
//   children,
// }: {
//   open: boolean;
//   title: string;
//   subtitle?: string;
//   onClose: () => void;
//   children: React.ReactNode;
// }) {
//   if (!open) return null;
//   return (
//     <div className="fixed inset-0 z-50">
//       <button type="button" className="absolute inset-0 bg-black/45" aria-label="Cerrar" onClick={onClose} />
//       <div className="absolute inset-0 flex items-center justify-center p-4">
//         <div className="w-full max-w-[720px] rounded-[28px] bg-white border border-slate-200 shadow-2xl overflow-hidden">
//           <div className="px-8 pt-8 pb-5">
//             <div className="text-[20px] font-extrabold text-slate-900">{title}</div>
//             {subtitle ? <div className="text-sm text-slate-500 mt-1">{subtitle}</div> : null}
//           </div>
//           <div className="px-8 pb-8">{children}</div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function Avatar({ name, type }: { name: string; type: ContactType }) {
//   const letter = (name || "?").trim().charAt(0).toUpperCase();
//   const bg =
//     type === "empresa"
//       ? "bg-indigo-50 text-indigo-700 border-indigo-200/60"
//       : "bg-emerald-50 text-emerald-700 border-emerald-200/60";

//   return <div className={cx("h-11 w-11 rounded-2xl border flex items-center justify-center font-black", bg)}>{letter}</div>;
// }

// export default function ContactsPage() {
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);

//   const [contacts, setContacts] = useState<ContactRow[]>([]);
//   const [q, setQ] = useState("");

//   const [createOpen, setCreateOpen] = useState(false);
//   const [type, setType] = useState<ContactType>("creativo");
//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [phone, setPhone] = useState("");
//   const [specialty, setSpecialty] = useState("");
//   const [company, setCompany] = useState("");
//   const [saving, setSaving] = useState(false);

//   const [selected, setSelected] = useState<ContactRow | null>(null);

//   async function loadContacts() {
//     setLoading(true);
//     setErr(null);
//     try {
//       const r = await api<{ ok: true; contacts: ContactRow[] }>("/contacts");
//       setContacts(r.contacts || []);
//     } catch (e: any) {
//       setErr(String(e?.message || e));
//       setContacts([]);
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     loadContacts();
//   }, []);

//   const filtered = useMemo(() => {
//     const s = q.trim().toLowerCase();
//     if (!s) return contacts;
//     return contacts.filter((c) => {
//       const hay = `${c.name} ${c.email} ${c.phone || ""} ${c.specialty || ""} ${c.company || ""} ${c.type}`.toLowerCase();
//       return hay.includes(s);
//     });
//   }, [contacts, q]);

//   function resetCreate() {
//     setType("creativo");
//     setName("");
//     setEmail("");
//     setPhone("");
//     setSpecialty("");
//     setCompany("");
//   }

//   async function createContact() {
//     if (!name.trim() || !email.trim()) return;

//     setSaving(true);
//     setErr(null);

//     try {
//       const payload = {
//         type,
//         name: name.trim(),
//         email: email.trim(),
//         phone: phone.trim() || null,
//         specialty: type === "creativo" ? specialty.trim() || null : null,
//         company: type === "empresa" ? company.trim() || null : null,
//         source: "manual",
//       };

//       const r = await api<{ ok: true; contact: ContactRow }>("/contacts", {
//         method: "POST",
//         body: JSON.stringify(payload),
//       });

//       // refresca lista (MVP)
//       await loadContacts();

//       setCreateOpen(false);
//       resetCreate();

//       // selecciona el creado si quieres
//       setSelected(r.contact || null);
//     } catch (e: any) {
//       setErr(String(e?.message || e));
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function deleteContact(id: string) {
//     if (!confirm("¿Eliminar este contacto?")) return;
//     setErr(null);
//     try {
//       await api<{ ok: true; deleted: boolean }>(`/contacts/${id}`, { method: "DELETE" });
//       await loadContacts();
//       setSelected(null);
//     } catch (e: any) {
//       setErr(String(e?.message || e));
//     }
//   }

//   return (
//     <div className="min-h-screen bg-[#f0f4f8] text-slate-800">
//       <main className="px-5 sm:px-8 py-8">
//         <div className="max-w-[980px]">
//           <div className="flex items-start justify-between gap-3">
//             <div>
//               <h1 className="text-[26px] font-black text-slate-900">Contactos</h1>
//               <p className="text-sm text-slate-500 mt-1">Tus contactos guardados</p>
//             </div>

//             <div className="flex gap-2">
//               <button
//                 type="button"
//                 onClick={loadContacts}
//                 className="rounded-2xl px-4 py-3 text-sm font-bold bg-slate-200 text-slate-800 hover:bg-slate-300/70"
//               >
//                 Recargar
//               </button>

//               <button
//                 type="button"
//                 onClick={() => {
//                   resetCreate();
//                   setCreateOpen(true);
//                 }}
//                 className="rounded-2xl px-5 py-3 text-sm font-extrabold text-white"
//                 style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
//               >
//                 + Nuevo contacto
//               </button>
//             </div>
//           </div>

//           <div className="mt-6">
//             <div className="relative">
//               <input
//                 value={q}
//                 onChange={(e) => setQ(e.target.value)}
//                 placeholder="Buscar en contactos..."
//                 className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
//               />
//               <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
//                 {filtered.length}/{contacts.length}
//               </div>
//             </div>
//           </div>

//           {err ? (
//             <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
//               {err}
//             </div>
//           ) : null}

//           <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
//             <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
//               <div className="px-6 py-5 bg-[#f6f9fc] border-b border-slate-200">
//                 <div className="text-sm font-extrabold text-slate-900">Lista</div>
//                 <div className="text-xs text-slate-500">Contactos persistidos en la BD</div>
//               </div>

//               <div className="px-6 py-6">
//                 {loading ? (
//                   <div className="text-sm text-slate-500">Cargando...</div>
//                 ) : filtered.length === 0 ? (
//                   <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
//                     <div className="text-sm font-semibold text-slate-700">No hay contactos</div>
//                     <div className="mt-1 text-xs text-slate-500">Crea tu primer contacto</div>
//                   </div>
//                 ) : (
//                   <div className="grid gap-2">
//                     {filtered.map((c) => (
//                       <button
//                         key={c.id}
//                         type="button"
//                         onClick={() => setSelected(c)}
//                         className={cx(
//                           "w-full text-left rounded-2xl border p-4 transition",
//                           selected?.id === c.id ? "bg-blue-50 border-blue-300" : "bg-white border-slate-200 hover:bg-slate-50"
//                         )}
//                       >
//                         <div className="flex items-start justify-between gap-4">
//                           <div className="flex items-start gap-3 min-w-0">
//                             <Avatar name={c.name} type={c.type} />
//                             <div className="min-w-0">
//                               <div className="text-sm font-extrabold text-slate-900 truncate">{c.name}</div>
//                               <div className="mt-1 text-xs text-slate-500 truncate">{c.email}</div>

//                               <div className="mt-2 flex flex-wrap gap-2">
//                                 <Pill tone={c.type === "empresa" ? "blue" : "emerald"}>
//                                   {c.type === "empresa" ? "Empresa" : "Creativo"}
//                                 </Pill>
//                                 {c.source ? <Pill tone="amber">{c.source}</Pill> : null}
//                               </div>
//                             </div>
//                           </div>

//                           <div className="text-right">
//                             {c.phone ? <div className="text-xs text-slate-500">{c.phone}</div> : <div className="text-xs text-slate-300">—</div>}
//                           </div>
//                         </div>
//                       </button>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </div>

//             <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
//               <div className="px-6 py-5 bg-[#f6f9fc] border-b border-slate-200">
//                 <div className="text-sm font-extrabold text-slate-900">Detalle</div>
//                 <div className="text-xs text-slate-500">Acciones</div>
//               </div>

//               <div className="px-6 py-6">
//                 {!selected ? (
//                   <div className="text-sm text-slate-500">Selecciona un contacto.</div>
//                 ) : (
//                   <div>
//                     <div className="flex items-start gap-3">
//                       <Avatar name={selected.name} type={selected.type} />
//                       <div className="min-w-0">
//                         <div className="text-lg font-black text-slate-900 truncate">{selected.name}</div>
//                         <div className="text-xs text-slate-500 truncate">{selected.email}</div>
//                         {selected.phone ? <div className="mt-1 text-xs text-slate-500">{selected.phone}</div> : null}
//                       </div>
//                     </div>

//                     <div className="mt-5 grid gap-2">
//                       <button
//                         type="button"
//                         className="rounded-2xl px-5 py-3 text-sm font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
//                         onClick={() => deleteContact(selected.id)}
//                       >
//                         Eliminar
//                       </button>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </main>

//       <Modal
//         open={createOpen}
//         onClose={() => setCreateOpen(false)}
//         title="Nuevo contacto"
//         subtitle="Se guarda en la base de datos"
//       >
//         <div className="grid gap-4">
//           <div className="grid grid-cols-2 gap-2">
//             <button
//               type="button"
//               onClick={() => setType("creativo")}
//               className={cx(
//                 "rounded-2xl border px-4 py-3 text-sm font-extrabold transition",
//                 type === "creativo" ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
//               )}
//             >
//               Creativo
//             </button>
//             <button
//               type="button"
//               onClick={() => setType("empresa")}
//               className={cx(
//                 "rounded-2xl border px-4 py-3 text-sm font-extrabold transition",
//                 type === "empresa" ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
//               )}
//             >
//               Empresa
//             </button>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//             <div>
//               <div className="text-xs font-bold text-slate-600">Nombre *</div>
//               <input
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 placeholder="Nombre del contacto"
//                 className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
//               />
//             </div>

//             <div>
//               <div className="text-xs font-bold text-slate-600">Email *</div>
//               <input
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 placeholder="correo@ejemplo.com"
//                 className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
//               />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//             <div>
//               <div className="text-xs font-bold text-slate-600">Teléfono</div>
//               <input
//                 value={phone}
//                 onChange={(e) => setPhone(e.target.value)}
//                 placeholder="+56 9 1234 5678"
//                 className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
//               />
//             </div>

//             {type === "creativo" ? (
//               <div>
//                 <div className="text-xs font-bold text-slate-600">Especialidad</div>
//                 <input
//                   value={specialty}
//                   onChange={(e) => setSpecialty(e.target.value)}
//                   placeholder="Ej: Diseño, Foto, Video..."
//                   className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
//                 />
//               </div>
//             ) : (
//               <div>
//                 <div className="text-xs font-bold text-slate-600">Empresa</div>
//                 <input
//                   value={company}
//                   onChange={(e) => setCompany(e.target.value)}
//                   placeholder="Ej: Agencia XYZ"
//                   className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
//                 />
//               </div>
//             )}
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
//             <button
//               type="button"
//               onClick={() => setCreateOpen(false)}
//               className="rounded-2xl bg-slate-200 px-6 py-3 text-sm font-bold text-slate-800 hover:bg-slate-300/70"
//               disabled={saving}
//             >
//               Cancelar
//             </button>

//             <button
//               type="button"
//               onClick={createContact}
//               disabled={saving || !name.trim() || !email.trim()}
//               className="rounded-2xl px-6 py-3 text-sm font-extrabold text-white disabled:opacity-60"
//               style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
//             >
//               {saving ? "Guardando..." : "Guardar contacto"}
//             </button>
//           </div>
//         </div>
//       </Modal>
//     </div>
//   );
// }