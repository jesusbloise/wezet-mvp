"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type CreativeRow = {
  creative_user_id: string;
  status: string;
  created_at: string;
  email: string;
  display_name: string | null;
  negotiation_id: string | null;
};

type ContactRow = {
  id: string;
  type: "creativo" | "empresa";
  name: string;
  email: string;
  phone?: string | null;
  specialty?: string | null;
  company?: string | null;
  source?: "manual" | "talents" | "quotes";
  created_at?: string | null;
  updated_at?: string | null;
};

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M21 21l-4.3-4.3" />
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function badgeForCreativeStatus(status?: string) {
  const s = String(status || "").toLowerCase();
  const base =
    "inline-flex items-center rounded-xl px-3 py-1 text-[11px] font-bold border";

  if (s === "invited") {
    return `${base} bg-amber-500/12 text-amber-300 border-amber-500/20`;
  }
  if (s === "accepted") {
    return `${base} bg-emerald-500/12 text-emerald-300 border-emerald-500/20`;
  }
  if (s === "rejected") {
    return `${base} bg-rose-500/12 text-rose-300 border-rose-500/20`;
  }

  return `${base} bg-white/[0.05] text-slate-300 border-white/10`;
}

function labelForCreativeStatus(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s === "invited") return "Invitado";
  if (s === "accepted") return "Aceptado";
  if (s === "rejected") return "Rechazado";
  return status || "—";
}

function sourceLabel(source?: string) {
  if (source === "quotes") return "Cotizaciones";
  if (source === "talents") return "Talentos";
  if (source === "manual") return "Manual";
  return "Contacto";
}

export default function TalentsPanel({
  projectId,
  title = "Participantes del proyecto",
  description = "Agrega creativos o empresas para colaborar",
  buttonLabel = "+ Agregar",
  onCountChange,
}: {
  projectId: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
  onCountChange?: (n: number) => void;
}) {
  const [items, setItems] = useState<CreativeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsErr, setContactsErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [tabFilter, setTabFilter] = useState<"all" | "creativo" | "empresa">("all");

  const [addingContactId, setAddingContactId] = useState<string | null>(null);

  const [flowOpen, setFlowOpen] = useState(false);
  const [flowStep, setFlowStep] = useState<"choose" | "form">("choose");
  const [participantType, setParticipantType] = useState<"creative" | "company" | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");

  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const openFlow = () => {
    setFlowOpen(true);
    setFlowStep("choose");
    setParticipantType(null);
    setFormErr(null);
    setName("");
    setEmail("");
    setPhone("");
    setSpecialty("");
  };

  const closeFlow = () => {
    setFlowOpen(false);
    setFlowStep("choose");
    setParticipantType(null);
    setFormErr(null);
    setName("");
    setEmail("");
    setPhone("");
    setSpecialty("");
  };

  const loadProjectTalents = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api<{ ok: true; creatives: CreativeRow[] }>(
        `/projects/${projectId}/creatives`
      );
      const list = r.creatives || [];
      setItems(list);
      onCountChange?.(list.length);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    setContactsLoading(true);
    setContactsErr(null);
    try {
      const r = await api<{ ok: true; contacts: ContactRow[] }>("/contacts");
      setContacts(Array.isArray(r.contacts) ? r.contacts : []);
    } catch (e: any) {
      setContacts([]);
      setContactsErr(String(e?.message || e));
    } finally {
      setContactsLoading(false);
    }
  };

  const reloadAll = async () => {
    await Promise.all([loadProjectTalents(), loadContacts()]);
  };

  useEffect(() => {
    if (!projectId) return;
    reloadAll();
  }, [projectId]);

  const assignedEmailSet = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.email) set.add(String(item.email).trim().toLowerCase());
    }
    return set;
  }, [items]);

  const filteredContacts = useMemo(() => {
    let base = contacts;

    if (tabFilter !== "all") {
      base = base.filter((c) => c.type === tabFilter);
    }

    const q = search.trim().toLowerCase();
    if (!q) return base;

    return base.filter((c) => {
      const name = String(c.name || "").toLowerCase();
      const email = String(c.email || "").toLowerCase();
      const phone = String(c.phone || "").toLowerCase();
      const specialty = String(c.specialty || "").toLowerCase();
      const company = String(c.company || "").toLowerCase();
      const source = String(c.source || "").toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        specialty.includes(q) ||
        company.includes(q) ||
        source.includes(q)
      );
    });
  }, [contacts, search, tabFilter]);

  const assignExistingContact = async (contact: ContactRow) => {
    setAddingContactId(contact.id);
    try {
      await api(`/projects/${projectId}/invite`, {
        method: "POST",
        body: JSON.stringify({
          creativeEmail: contact.email,
          participantType: contact.type === "creativo" ? "creative" : "company",
          displayName: contact.name,
          phone: contact.phone || null,
          specialty: contact.specialty || contact.company || null,
        }),
      });

      await loadProjectTalents();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setAddingContactId(null);
    }
  };

  const submit = async () => {
    const n = name.trim();
    const em = email.trim();

    if (!participantType) {
      setFormErr("Debes elegir Creativo o Empresa.");
      return;
    }
    if (!n) {
      setFormErr("El nombre es obligatorio.");
      return;
    }
    if (!em) {
      setFormErr("El email es obligatorio.");
      return;
    }

    setSaving(true);
    setFormErr(null);

    try {
      await api(`/projects/${projectId}/invite`, {
        method: "POST",
        body: JSON.stringify({
          creativeEmail: em,
          participantType,
          displayName: n,
          phone: phone.trim() || null,
          specialty: specialty.trim() || null,
        }),
      });

      closeFlow();
      await reloadAll();
    } catch (e: any) {
      setFormErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const isCreative = participantType === "creative";

  const modalTitle = participantType
    ? participantType === "creative"
      ? "Agregar Creativo"
      : "Agregar Empresa"
    : "Agregar participante";

  const primaryLabel = participantType
    ? participantType === "creative"
      ? "Agregar Creativo"
      : "Agregar Empresa"
    : "Agregar";

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d1320]">
        <div className="flex items-center justify-between gap-3 bg-[#111827] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-white">👥 {title}</div>
            <div className="text-xs text-slate-500">{description}</div>
          </div>

          <button
            type="button"
            onClick={openFlow}
            className="shrink-0 rounded-2xl px-4 py-2 text-xs font-bold text-[#0b0f17] sm:text-sm"
            style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
          >
            {buttonLabel}
          </button>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-6">
          {err ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {err}
            </div>
          ) : null}

          <section className="rounded-3xl border border-white/8 bg-[#0a1425]">
            <div className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
              <div>
                <div className="text-sm font-extrabold text-white">
                  Participantes ya asignados al proyecto
                </div>
                <div className="text-xs text-slate-500">
                  Aquí ves quienes ya están dentro de este proyecto
                </div>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-300">
                {items.length} asignado{items.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="px-5 py-5">
              {loading ? (
                <div className="text-sm text-slate-400">Cargando participantes...</div>
              ) : items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[#f2c94c]">
                    <span className="text-xl">👥</span>
                  </div>

                  <div className="mt-4 text-sm font-semibold text-slate-300">
                    No hay participantes aún
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Puedes asignar uno desde tus contactos o agregar uno nuevo
                  </div>

                  <button
                    type="button"
                    onClick={openFlow}
                    className="mt-4 inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-bold text-[#0b0f17]"
                    style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                  >
                    + Agregar primer participante
                  </button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {items.map((c) => (
                    <div
                      key={c.creative_user_id}
                      className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] text-[#f2c94c]">
                          <UserIcon />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-white">
                            {c.display_name || c.email}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">{c.email}</div>
                          <div className="mt-2 text-xs text-slate-600">
                            Invitado:{" "}
                            {c.created_at
                              ? new Date(c.created_at).toLocaleDateString()
                              : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className={badgeForCreativeStatus(c.status)}>
                          {labelForCreativeStatus(c.status)}
                        </span>

                        {c.negotiation_id ? (
                          <Link
                            href={`/producer/negotiations/${c.negotiation_id}`}
                            className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08]"
                          >
                            Ver negociación
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-600">Sin negociación</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/8 bg-[#0a1425]">
            <div className="border-b border-white/8 px-5 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-extrabold text-white">
                    Contactos disponibles para asignar
                  </div>
                  <div className="text-xs text-slate-500">
                    Tus contactos creativos y empresas aparecen aquí para agregarlos
                    rápidamente al proyecto
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="inline-flex rounded-2xl border border-white/8 bg-white/[0.03] p-1">
                    <button
                      type="button"
                      onClick={() => setTabFilter("all")}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                        tabFilter === "all"
                          ? "bg-[#f2c94c] text-[#0b0f17]"
                          : "text-slate-300 hover:bg-white/[0.05]"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setTabFilter("creativo")}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                        tabFilter === "creativo"
                          ? "bg-[#f2c94c] text-[#0b0f17]"
                          : "text-slate-300 hover:bg-white/[0.05]"
                      }`}
                    >
                      Creativos
                    </button>
                    <button
                      type="button"
                      onClick={() => setTabFilter("empresa")}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                        tabFilter === "empresa"
                          ? "bg-[#f2c94c] text-[#0b0f17]"
                          : "text-slate-300 hover:bg-white/[0.05]"
                      }`}
                    >
                      Empresas
                    </button>
                  </div>

                  <div className="relative min-w-[240px]">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                      <SearchIcon />
                    </div>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar contactos..."
                      className="w-full rounded-2xl border border-white/8 bg-white/[0.04] py-2.5 pl-11 pr-4 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-5">
              {contactsLoading ? (
                <div className="text-sm text-slate-400">Cargando contactos...</div>
              ) : contactsErr ? (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {contactsErr}
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                  <div className="text-sm font-semibold text-slate-300">
                    No hay contactos disponibles
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Agrega uno nuevo con el botón superior
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredContacts.map((contact) => {
                    const assigned = assignedEmailSet.has(
                      String(contact.email || "").trim().toLowerCase()
                    );
                    const isBusy = addingContactId === contact.id;

                    return (
                      <div
                        key={contact.id}
                        className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] text-[#f2c94c]">
                              <UserIcon />
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-sm font-extrabold text-white">
                                {contact.name || contact.email}
                              </div>
                              <div className="mt-1 truncate text-xs text-slate-500">
                                {contact.email}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`inline-flex rounded-xl border px-2.5 py-1 text-[11px] font-bold ${
                              contact.type === "creativo"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                : "border-sky-500/20 bg-sky-500/10 text-sky-300"
                            }`}
                          >
                            {contact.type === "creativo" ? "Creativo" : "Empresa"}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-xs text-slate-400">
                          {contact.phone ? (
                            <div>
                              <span className="text-slate-500">Teléfono:</span> {contact.phone}
                            </div>
                          ) : null}

                          {contact.specialty ? (
                            <div>
                              <span className="text-slate-500">
                                {contact.type === "creativo" ? "Especialidad:" : "Rubro:"}
                              </span>{" "}
                              {contact.specialty}
                            </div>
                          ) : null}

                          {contact.company ? (
                            <div>
                              <span className="text-slate-500">Empresa:</span> {contact.company}
                            </div>
                          ) : null}

                          <div>
                            <span className="text-slate-500">Origen:</span>{" "}
                            {sourceLabel(contact.source)}
                          </div>
                        </div>

                        <div className="mt-4">
                          {assigned ? (
                            <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
                              <CheckIcon />
                              Ya agregado al proyecto
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => assignExistingContact(contact)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-2 rounded-2xl border border-[#f2c94c]/20 bg-[#f2c94c]/10 px-4 py-2 text-xs font-bold text-[#f2c94c] transition hover:bg-[#f2c94c]/15 disabled:opacity-60"
                            >
                              <PlusIcon />
                              {isBusy ? "Agregando..." : "Agregar al proyecto"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {flowOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Cerrar"
            onClick={closeFlow}
          />

          <div className="absolute inset-0 flex items-center justify-center p-4">
            {flowStep === "choose" ? (
              <div className="w-full max-w-[640px] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1320] shadow-2xl">
                <div className="px-6 py-8 text-center">
                  <div
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-[#0b0f17]"
                    style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                  >
                    <span className="text-2xl">📝</span>
                  </div>

                  <div className="text-xl font-black text-white">Nuevo participante</div>
                  <div className="mt-1 text-sm text-slate-500">Proyecto: {projectId}</div>

                  <div className="mt-5 text-sm text-slate-400">
                    ¿Qué tipo de participante deseas agregar?
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setParticipantType("creative")}
                      className={`rounded-2xl border px-5 py-6 text-left transition ${
                        participantType === "creative"
                          ? "border-[#f2c94c]/30 bg-[#f2c94c]/10"
                          : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="text-3xl">🎨</div>
                      <div className="mt-3 text-base font-extrabold text-white">
                        Creativo
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Freelancer o profesional independiente
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setParticipantType("company")}
                      className={`rounded-2xl border px-5 py-6 text-left transition ${
                        participantType === "company"
                          ? "border-[#f2c94c]/30 bg-[#f2c94c]/10"
                          : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="text-3xl">🏢</div>
                      <div className="mt-3 text-base font-extrabold text-white">
                        Empresa
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Agencia, estudio o empresa creativa
                      </div>
                    </button>
                  </div>

                  <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={closeFlow}
                      className="rounded-2xl bg-white/[0.06] px-6 py-3 text-sm font-bold text-slate-200 hover:bg-white/[0.1]"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      disabled={!participantType}
                      onClick={() => {
                        setFlowStep("form");
                        setFormErr(null);
                      }}
                      className="rounded-2xl px-6 py-3 text-sm font-black text-[#0b0f17] disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                    >
                      Continuar →
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {flowStep === "form" ? (
              <div className="w-full max-w-[640px] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1320] shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-white/8 px-6 py-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-2xl text-[#0b0f17]"
                        style={{
                          background: isCreative
                            ? "linear-gradient(135deg,#10b981,#22c55e)"
                            : "linear-gradient(135deg,#f2c94c,#d4a72c)",
                        }}
                      >
                        <span className="text-lg">{isCreative ? "🎨" : "🏢"}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="text-lg font-black text-white">{modalTitle}</div>
                        <div className="text-xs text-slate-500">Proyecto: {projectId}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-slate-300 hover:bg-white/[0.08]"
                    onClick={closeFlow}
                    aria-label="Cerrar modal"
                  >
                    <XIcon />
                  </button>
                </div>

                <div className="px-6 py-6">
                  {formErr ? (
                    <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                      {formErr}
                    </div>
                  ) : null}

                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-bold text-slate-400">
                        Nombre {isCreative ? "del creativo" : "de la empresa"}{" "}
                        <span className="text-rose-400">*</span>
                      </div>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nombre completo o razón social"
                        className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
                      />
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-400">
                        Email <span className="text-rose-400">*</span>
                      </div>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
                      />
                      <div className="mt-2 text-xs text-slate-500">
                        Si no existe en la plataforma, se guardará como contacto y podrás
                        enviarle invitación para que se registre.
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-400">Teléfono</div>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+56 9 1234 5678"
                        className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
                      />
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-400">
                        {isCreative ? "Especialidad" : "Rubro"}
                      </div>
                      <input
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder={
                          isCreative
                            ? "Ej: Diseño gráfico, Fotografía, Video..."
                            : "Ej: Agencia, Productora, Estudio..."
                        }
                        className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
                      />
                    </div>

                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <div className="text-xs font-extrabold text-emerald-300">
                        Al agregar este {isCreative ? "creativo" : "empresa"}:
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-emerald-200/80">
                        <li>Se asociará a este proyecto</li>
                        <li>Quedará guardado en tu lista de contactos</li>
                        <li>Si luego implementas email, podrá recibir invitación de registro</li>
                      </ul>
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setFlowStep("choose")}
                        disabled={saving}
                        className="rounded-2xl bg-white/[0.06] px-6 py-3 text-sm font-bold text-slate-200 hover:bg-white/[0.1]"
                      >
                        Volver
                      </button>

                      <button
                        type="button"
                        onClick={submit}
                        disabled={saving || !participantType || !name.trim() || !email.trim()}
                        className="rounded-2xl px-6 py-3 text-sm font-black text-[#0b0f17] disabled:opacity-60"
                        style={{
                          background: isCreative
                            ? "linear-gradient(135deg,#a7f3d0,#86efac)"
                            : "linear-gradient(135deg,#f2c94c,#d4a72c)",
                        }}
                      >
                        {saving ? "Agregando..." : primaryLabel}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
// "use client";

// import Link from "next/link";
// import { useEffect, useState } from "react";
// import { api } from "@/lib/api";

// type CreativeRow = {
//   creative_user_id: string;
//   status: string;
//   created_at: string;
//   email: string;
//   display_name: string | null;
//   negotiation_id: string | null;
// };

// function UserIcon() {
//   return (
//     <svg
//       viewBox="0 0 24 24"
//       className="h-5 w-5"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2.2"
//     >
//       <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
//       <path d="M4 21a8 8 0 0 1 16 0" />
//     </svg>
//   );
// }

// function XIcon() {
//   return (
//     <svg
//       viewBox="0 0 24 24"
//       className="h-5 w-5"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2.2"
//     >
//       <path d="M6 6l12 12" />
//       <path d="M18 6L6 18" />
//     </svg>
//   );
// }

// function badgeForCreativeStatus(status?: string) {
//   const s = String(status || "").toLowerCase();
//   const base =
//     "inline-flex items-center rounded-xl px-3 py-1 text-[11px] font-bold border";

//   if (s === "invited") return `${base} bg-amber-500/12 text-amber-300 border-amber-500/20`;
//   if (s === "accepted") return `${base} bg-emerald-500/12 text-emerald-300 border-emerald-500/20`;
//   if (s === "rejected") return `${base} bg-rose-500/12 text-rose-300 border-rose-500/20`;

//   return `${base} bg-white/[0.05] text-slate-300 border-white/10`;
// }

// function labelForCreativeStatus(status?: string) {
//   const s = String(status || "").toLowerCase();
//   if (s === "invited") return "Invitado";
//   if (s === "accepted") return "Aceptado";
//   if (s === "rejected") return "Rechazado";
//   return status || "—";
// }

// export default function TalentsPanel({
//   projectId,
//   title = "Participantes del proyecto",
//   description = "Agrega creativos para colaborar",
//   buttonLabel = "+ Agregar",
//   onCountChange,
// }: {
//   projectId: string;
//   title?: string;
//   description?: string;
//   buttonLabel?: string;
//   onCountChange?: (n: number) => void;
// }) {
//   const [items, setItems] = useState<CreativeRow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);

//   const [flowOpen, setFlowOpen] = useState(false);
//   const [flowStep, setFlowStep] = useState<"choose" | "form">("choose");
//   const [participantType, setParticipantType] = useState<"creative" | "company" | null>(null);

//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [phone, setPhone] = useState("");
//   const [specialty, setSpecialty] = useState("");

//   const [saving, setSaving] = useState(false);
//   const [formErr, setFormErr] = useState<string | null>(null);

//   const openFlow = () => {
//     setFlowOpen(true);
//     setFlowStep("choose");
//     setParticipantType(null);
//     setFormErr(null);
//   };

//   const closeFlow = () => {
//     setFlowOpen(false);
//     setFlowStep("choose");
//     setParticipantType(null);
//     setFormErr(null);
//     setName("");
//     setEmail("");
//     setPhone("");
//     setSpecialty("");
//   };

//   const load = async () => {
//     setLoading(true);
//     setErr(null);
//     try {
//       const r = await api<{ ok: true; creatives: CreativeRow[] }>(
//         `/projects/${projectId}/creatives`
//       );
//       const list = r.creatives || [];
//       setItems(list);
//       onCountChange?.(list.length);
//     } catch (e: any) {
//       setErr(String(e?.message || e));
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (!projectId) return;
//     load();
//   }, [projectId]);

//   const submit = async () => {
//     const n = name.trim();
//     const em = email.trim();

//     if (!participantType) {
//       setFormErr("Debes elegir Creativo o Empresa.");
//       return;
//     }
//     if (!n) {
//       setFormErr("El nombre es obligatorio.");
//       return;
//     }
//     if (!em) {
//       setFormErr("El email es obligatorio.");
//       return;
//     }

//     setSaving(true);
//     setFormErr(null);
//     try {
//       await api(`/projects/${projectId}/invite`, {
//         method: "POST",
//         body: JSON.stringify({
//           creativeEmail: em,
//           participantType,
//           displayName: n,
//           phone: phone.trim() || null,
//           specialty: specialty.trim() || null,
//         }),
//       });

//       closeFlow();
//       await load();
//     } catch (e: any) {
//       setFormErr(String(e?.message || e));
//     } finally {
//       setSaving(false);
//     }
//   };

//   const isCreative = participantType === "creative";
//   const modalTitle = participantType
//     ? participantType === "creative"
//       ? "Agregar Creativo"
//       : "Agregar Empresa"
//     : "Agregar participante";

//   const primaryLabel = participantType
//     ? participantType === "creative"
//       ? "Agregar Creativo"
//       : "Agregar Empresa"
//     : "Agregar";

//   return (
//     <>
//       <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d1320]">
//         <div className="flex items-center justify-between gap-3 bg-[#111827] px-5 py-5 sm:px-6">
//           <div className="min-w-0">
//             <div className="text-sm font-extrabold text-white">👥 {title}</div>
//             <div className="text-xs text-slate-500">{description}</div>
//           </div>

//           <button
//             type="button"
//             onClick={openFlow}
//             className="shrink-0 rounded-2xl px-4 py-2 text-xs font-bold text-[#0b0f17] sm:text-sm"
//             style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//           >
//             {buttonLabel}
//           </button>
//         </div>

//         <div className="px-5 py-6 sm:px-6">
//           {err ? (
//             <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
//               {err}
//             </div>
//           ) : null}

//           {loading ? (
//             <div className="text-sm text-slate-400">Cargando...</div>
//           ) : items.length === 0 ? (
//             <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
//               <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[#f2c94c]">
//                 <span className="text-xl">👥</span>
//               </div>
//               <div className="mt-4 text-sm font-semibold text-slate-300">
//                 No hay participantes aún
//               </div>
//               <div className="mt-1 text-xs text-slate-500">
//                 Agrega creativos o empresas para colaborar
//               </div>

//               <button
//                 type="button"
//                 onClick={openFlow}
//                 className="mt-4 inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-bold text-[#0b0f17]"
//                 style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//               >
//                 + Agregar primer participante
//               </button>
//             </div>
//           ) : (
//             <div className="grid gap-3">
//               {items.map((c) => (
//                 <div
//                   key={c.creative_user_id}
//                   className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between"
//                 >
//                   <div className="flex min-w-0 items-start gap-3">
//                     <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] text-[#f2c94c]">
//                       <UserIcon />
//                     </div>

//                     <div className="min-w-0">
//                       <div className="truncate text-sm font-extrabold text-white">
//                         {c.display_name || c.email}
//                       </div>
//                       <div className="mt-1 truncate text-xs text-slate-500">{c.email}</div>
//                       <div className="mt-2 text-xs text-slate-600">
//                         Invitado:{" "}
//                         {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
//                       </div>
//                     </div>
//                   </div>

//                   <div className="flex items-center justify-between gap-3 sm:justify-end">
//                     <span className={badgeForCreativeStatus(c.status)}>
//                       {labelForCreativeStatus(c.status)}
//                     </span>

//                     {c.negotiation_id ? (
//                       <Link
//                         href={`/producer/negotiations/${c.negotiation_id}`}
//                         className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08]"
//                       >
//                         Ver negociación
//                       </Link>
//                     ) : (
//                       <span className="text-xs text-slate-600">Sin negociación</span>
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>

//       {flowOpen ? (
//         <div className="fixed inset-0 z-50">
//           <button
//             type="button"
//             className="absolute inset-0 bg-black/70"
//             aria-label="Cerrar"
//             onClick={closeFlow}
//           />
//           <div className="absolute inset-0 flex items-center justify-center p-4">
//             {flowStep === "choose" ? (
//               <div className="w-full max-w-[640px] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1320] shadow-2xl">
//                 <div className="px-6 py-8 text-center">
//                   <div
//                     className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-[#0b0f17]"
//                     style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//                   >
//                     <span className="text-2xl">📝</span>
//                   </div>

//                   <div className="text-xl font-black text-white">Nuevo Acuerdo</div>
//                   <div className="mt-1 text-sm text-slate-500">Proyecto: {projectId}</div>

//                   <div className="mt-5 text-sm text-slate-400">
//                     ¿Con quién deseas crear el acuerdo?
//                   </div>

//                   <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
//                     <button
//                       type="button"
//                       onClick={() => setParticipantType("creative")}
//                       className={`rounded-2xl border px-5 py-6 text-left transition ${
//                         participantType === "creative"
//                           ? "border-[#f2c94c]/30 bg-[#f2c94c]/10"
//                           : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
//                       }`}
//                     >
//                       <div className="text-3xl">🎨</div>
//                       <div className="mt-3 text-base font-extrabold text-white">
//                         Creativo
//                       </div>
//                       <div className="mt-1 text-xs text-slate-500">
//                         Freelancer o profesional independiente
//                       </div>
//                     </button>

//                     <button
//                       type="button"
//                       onClick={() => setParticipantType("company")}
//                       className={`rounded-2xl border px-5 py-6 text-left transition ${
//                         participantType === "company"
//                           ? "border-[#f2c94c]/30 bg-[#f2c94c]/10"
//                           : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
//                       }`}
//                     >
//                       <div className="text-3xl">🏢</div>
//                       <div className="mt-3 text-base font-extrabold text-white">
//                         Empresa
//                       </div>
//                       <div className="mt-1 text-xs text-slate-500">
//                         Agencia, estudio o empresa creativa
//                       </div>
//                     </button>
//                   </div>

//                   <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
//                     <button
//                       type="button"
//                       onClick={closeFlow}
//                       className="rounded-2xl bg-white/[0.06] px-6 py-3 text-sm font-bold text-slate-200 hover:bg-white/[0.1]"
//                     >
//                       Cancelar
//                     </button>

//                     <button
//                       type="button"
//                       disabled={!participantType}
//                       onClick={() => {
//                         setFlowStep("form");
//                         setFormErr(null);
//                       }}
//                       className="rounded-2xl px-6 py-3 text-sm font-black text-[#0b0f17] disabled:opacity-50"
//                       style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//                     >
//                       Continuar →
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             ) : null}

//             {flowStep === "form" ? (
//               <div className="w-full max-w-[640px] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1320] shadow-2xl">
//                 <div className="flex items-start justify-between gap-3 border-b border-white/8 px-6 py-5">
//                   <div className="min-w-0">
//                     <div className="flex items-center gap-3">
//                       <div
//                         className="flex h-10 w-10 items-center justify-center rounded-2xl text-[#0b0f17]"
//                         style={{
//                           background: isCreative
//                             ? "linear-gradient(135deg,#10b981,#22c55e)"
//                             : "linear-gradient(135deg,#f2c94c,#d4a72c)",
//                         }}
//                       >
//                         <span className="text-lg">{isCreative ? "🎨" : "🏢"}</span>
//                       </div>

//                       <div className="min-w-0">
//                         <div className="text-lg font-black text-white">{modalTitle}</div>
//                         <div className="text-xs text-slate-500">Proyecto: {projectId}</div>
//                       </div>
//                     </div>
//                   </div>

//                   <button
//                     type="button"
//                     className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-slate-300 hover:bg-white/[0.08]"
//                     onClick={closeFlow}
//                     aria-label="Cerrar modal"
//                   >
//                     <XIcon />
//                   </button>
//                 </div>

//                 <div className="px-6 py-6">
//                   {formErr ? (
//                     <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
//                       {formErr}
//                     </div>
//                   ) : null}

//                   <div className="space-y-4">
//                     <div>
//                       <div className="text-xs font-bold text-slate-400">
//                         Nombre {isCreative ? "del creativo" : "de la empresa"}{" "}
//                         <span className="text-rose-400">*</span>
//                       </div>
//                       <input
//                         value={name}
//                         onChange={(e) => setName(e.target.value)}
//                         placeholder="Buscar en contactos o escribir nuevo..."
//                         className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
//                       />
//                     </div>

//                     <div>
//                       <div className="text-xs font-bold text-slate-400">
//                         Email <span className="text-rose-400">*</span>
//                       </div>
//                       <input
//                         value={email}
//                         onChange={(e) => setEmail(e.target.value)}
//                         placeholder="correo@ejemplo.com"
//                         className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
//                       />
//                       <div className="mt-2 text-xs text-slate-500">
//                         ✓ El acuerdo será enviado a este correo
//                       </div>
//                     </div>

//                     <div>
//                       <div className="text-xs font-bold text-slate-400">Teléfono</div>
//                       <input
//                         value={phone}
//                         onChange={(e) => setPhone(e.target.value)}
//                         placeholder="+56 9 1234 5678"
//                         className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
//                       />
//                     </div>

//                     <div>
//                       <div className="text-xs font-bold text-slate-400">
//                         {isCreative ? "Especialidad" : "Rubro"}
//                       </div>
//                       <input
//                         value={specialty}
//                         onChange={(e) => setSpecialty(e.target.value)}
//                         placeholder={
//                           isCreative
//                             ? "Ej: Diseño gráfico, Fotografía, Video..."
//                             : "Ej: Agencia, Productora, Estudio..."
//                         }
//                         className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20"
//                       />
//                     </div>

//                     <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
//                       <div className="text-xs font-extrabold text-emerald-300">
//                         ✨ Al agregar este {isCreative ? "creativo" : "empresa"}:
//                       </div>
//                       <ul className="mt-2 space-y-1 text-xs text-emerald-200/80">
//                         <li>Quedará asociado a este proyecto</li>
//                         <li>Se guardará en tu lista de contactos</li>
//                         <li>Podrás enviarle acuerdos por correo</li>
//                       </ul>
//                     </div>

//                     <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
//                       <button
//                         type="button"
//                         onClick={() => setFlowStep("choose")}
//                         disabled={saving}
//                         className="rounded-2xl bg-white/[0.06] px-6 py-3 text-sm font-bold text-slate-200 hover:bg-white/[0.1]"
//                       >
//                         Cancelar
//                       </button>

//                       <button
//                         type="button"
//                         onClick={submit}
//                         disabled={saving || !participantType || !name.trim() || !email.trim()}
//                         className="rounded-2xl px-6 py-3 text-sm font-black text-[#0b0f17] disabled:opacity-60"
//                         style={{
//                           background: isCreative
//                             ? "linear-gradient(135deg,#a7f3d0,#86efac)"
//                             : "linear-gradient(135deg,#f2c94c,#d4a72c)",
//                         }}
//                       >
//                         {saving ? "Agregando..." : primaryLabel}
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ) : null}
//           </div>
//         </div>
//       ) : null}
//     </>
//   );
// }

