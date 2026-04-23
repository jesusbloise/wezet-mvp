"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

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

type TeamTab = "members" | "branding";

type TeamGroup = {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
};

type BrandingState = {
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

const defaultBranding: BrandingState = {
  logo: null,
  primaryColor: "#f2c94c",
  secondaryColor: "#d4a72c",
  accentColor: "#10b981",
};

const palettes = [
  { primary: "#f2c94c", secondary: "#d4a72c", accent: "#10b981" },
  { primary: "#2563eb", secondary: "#7c3aed", accent: "#06b6d4" },
  { primary: "#111827", secondary: "#334155", accent: "#f43f5e" },
  { primary: "#059669", secondary: "#0891b2", accent: "#f59e0b" },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function initialOf(name?: string | null, email?: string | null) {
  return (name || email || "U").trim().charAt(0).toUpperCase();
}

function formatDate(date?: string) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL");
}

function typeBadge(type: ContactType) {
  if (type === "empresa") {
    return "bg-blue-500/12 text-blue-300 border border-blue-500/20";
  }
  return "bg-emerald-500/12 text-emerald-300 border border-emerald-500/20";
}

function sourceBadge(source?: string) {
  if (source === "talents") {
    return "bg-amber-500/12 text-amber-300 border border-amber-500/20";
  }
  if (source === "quotes") {
    return "bg-violet-500/12 text-violet-300 border border-violet-500/20";
  }
  return "bg-white/8 text-slate-300 border border-white/10";
}

export default function TeamPage() {
  const router = useRouter();

  const [tab, setTab] = useState<TeamTab>("members");

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);

  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState("");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const [teamName, setTeamName] = useState("WEZET");
  const [branding, setBranding] = useState<BrandingState>(defaultBranding);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const savedGroups = localStorage.getItem("wezet-contact-teams");
    const savedSelected = localStorage.getItem("wezet-contact-team-selected");
    const savedName = localStorage.getItem("wezet-team-name");
    const savedBranding = localStorage.getItem("wezet-team-branding");

    if (savedGroups) {
      try {
        const parsed = JSON.parse(savedGroups) as TeamGroup[];
        setGroups(parsed);
      } catch {}
    }

    if (savedSelected) {
      setSelectedGroupId(savedSelected);
    }

    if (savedName) {
      setTeamName(savedName);
    }

    if (savedBranding) {
      try {
        setBranding(JSON.parse(savedBranding));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("wezet-contact-teams", JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    if (selectedGroupId) {
      localStorage.setItem("wezet-contact-team-selected", selectedGroupId);
    } else {
      localStorage.removeItem("wezet-contact-team-selected");
    }
  }, [selectedGroupId]);

  useEffect(() => {
    localStorage.setItem("wezet-team-name", teamName);
  }, [teamName]);

  useEffect(() => {
    localStorage.setItem("wezet-team-branding", JSON.stringify(branding));
  }, [branding]);

  async function loadContacts() {
    try {
      setContactsLoading(true);
      setError("");
      const data = await api<{ ok: true; contacts: ContactRow[] }>("/contacts");
      setContacts(data.contacts || []);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar los contactos.");
    } finally {
      setContactsLoading(false);
    }
  }

  useEffect(() => {
    loadContacts();
  }, []);

  const selectedGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  const selectedMembers = useMemo(() => {
    if (!selectedGroup) return [];
    return contacts.filter((c) => selectedGroup.memberIds.includes(c.id));
  }, [contacts, selectedGroup]);

  const availableContacts = useMemo(() => {
    const currentIds = new Set(selectedGroup?.memberIds || []);
    const q = memberSearch.trim().toLowerCase();

    return contacts.filter((c) => {
      if (currentIds.has(c.id)) return false;
      if (!q) return true;
      const hay =
        `${c.name} ${c.email} ${c.phone || ""} ${c.specialty || ""} ${c.company || ""} ${c.type}`.toLowerCase();
      return hay.includes(q);
    });
  }, [contacts, selectedGroup, memberSearch]);

  function createGroup() {
    const name = newGroupName.trim();
    if (!name) return;

    const newGroup: TeamGroup = {
      id: crypto.randomUUID(),
      name,
      memberIds: [],
      createdAt: new Date().toISOString(),
    };

    const next = [newGroup, ...groups];
    setGroups(next);
    setSelectedGroupId(newGroup.id);
    setNewGroupName("");
    setCreateGroupOpen(false);
    setSuccess("Equipo creado.");
    setError("");
  }

  function deleteGroup(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    const ok = window.confirm(`¿Eliminar el equipo "${group?.name || "sin nombre"}"?`);
    if (!ok) return;

    const next = groups.filter((g) => g.id !== groupId);
    setGroups(next);

    if (selectedGroupId === groupId) {
      setSelectedGroupId(next[0]?.id || null);
    }

    setSuccess("Equipo eliminado.");
    setError("");
  }

  function addContactToGroup(contactId: string) {
    if (!selectedGroup) return;

    const next = groups.map((g) =>
      g.id === selectedGroup.id
        ? { ...g, memberIds: Array.from(new Set([...g.memberIds, contactId])) }
        : g
    );

    setGroups(next);
    setSuccess("Contacto agregado al equipo.");
    setError("");
  }

  function removeContactFromGroup(contactId: string) {
    if (!selectedGroup) return;

    const ok = window.confirm("¿Quitar este contacto del equipo?");
    if (!ok) return;

    const next = groups.map((g) =>
      g.id === selectedGroup.id
        ? { ...g, memberIds: g.memberIds.filter((id) => id !== contactId) }
        : g
    );

    setGroups(next);
    setSuccess("Contacto quitado del equipo.");
    setError("");
  }

  function handleLogoUpload(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBranding((prev) => ({
        ...prev,
        logo: typeof reader.result === "string" ? reader.result : null,
      }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="min-h-screen bg-[#070b14] p-4 text-white md:p-6">
      <div className="mx-auto max-w-[1120px] overflow-hidden rounded-[26px] border border-white/8 bg-[#0d1320] shadow-2xl">
        <div
          className="relative px-6 py-7 text-white"
          style={{
            background: `linear-gradient(90deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[14px] font-extrabold text-[#0b0f17]">
                <span>👥</span>
                <span>{teamName}</span>
              </div>
              <div className="mt-2 text-sm text-[#0b0f17]/80">
                {groups.length} equipos creados
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/10 text-xl text-[#0b0f17] transition hover:bg-black/20"
            >
              ×
            </button>
          </div>
        </div>

        <div className="max-h-[78vh] overflow-y-auto px-6 py-5">
          <div className="mb-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTab("members")}
              className={cn(
                "rounded-2xl px-5 py-3 text-sm font-semibold transition",
                tab === "members"
                  ? "bg-[#f2c94c] text-[#0b0f17] shadow-sm"
                  : "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]"
              )}
            >
              👥 Equipos
            </button>

            <button
              type="button"
              onClick={() => setTab("branding")}
              className={cn(
                "rounded-2xl px-5 py-3 text-sm font-semibold transition",
                tab === "branding"
                  ? "bg-[#f2c94c] text-[#0b0f17] shadow-sm"
                  : "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]"
              )}
            >
              🎨 Branding
            </button>
          </div>

          <div className="mb-6 h-px bg-white/8" />

          {error ? (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {success}
            </div>
          ) : null}

          {tab === "members" ? (
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-ui text-sm uppercase tracking-[0.18em] text-slate-300">
                    📁 Equipos
                  </div>

                  <button
                    type="button"
                    onClick={() => setCreateGroupOpen(true)}
                    className="rounded-xl bg-[#f2c94c] px-4 py-2.5 text-sm font-semibold text-[#0b0f17] transition hover:opacity-95"
                  >
                    + Nuevo
                  </button>
                </div>

                {groups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center">
                    <div className="text-4xl">👥</div>
                    <div className="mt-4 text-lg font-semibold text-slate-200">
                      Aún no tienes equipos
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreateGroupOpen(true)}
                      className="mt-5 rounded-xl bg-[#f2c94c] px-5 py-3 text-sm font-bold text-[#0b0f17]"
                    >
                      Crear primer equipo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groups.map((group) => {
                      const active = selectedGroupId === group.id;

                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setSelectedGroupId(group.id)}
                          className={cn(
                            "w-full rounded-2xl border p-4 text-left transition",
                            active
                              ? "border-[#f2c94c]/25 bg-[#f2c94c]/10"
                              : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-base font-bold text-white">
                                {group.name}
                              </div>
                              <div className="mt-1 text-xs text-slate-400">
                                {group.memberIds.length} integrantes
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Creado: {formatDate(group.createdAt)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteGroup(group.id);
                              }}
                              className="rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/15"
                            >
                              x
                            </button>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section>
                {!selectedGroup ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-14 text-center">
                    <div className="text-4xl">📂</div>
                    <div className="mt-4 text-xl font-semibold text-slate-200">
                      Selecciona un equipo
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      Aquí verás sus integrantes y podrás agregar contactos.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-300">
                            Equipo seleccionado
                          </div>
                          <div className="mt-2 text-2xl font-bold text-white">
                            {selectedGroup.name}
                          </div>
                          <div className="mt-1 text-sm text-slate-400">
                            {selectedMembers.length} integrantes
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setAddMembersOpen(true)}
                            className="rounded-xl bg-[#f2c94c] px-4 py-2.5 text-sm font-semibold text-[#0b0f17]"
                          >
                            + Agregar desde contactos
                          </button>
                        </div>
                      </div>
                    </div>

                    {contactsLoading ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center text-sm text-slate-400">
                        Cargando contactos...
                      </div>
                    ) : selectedMembers.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
                        <div className="text-4xl">🧩</div>
                        <div className="mt-4 text-lg font-semibold text-slate-200">
                          Este equipo aún no tiene integrantes
                        </div>
                        <div className="mt-2 text-sm text-slate-400">
                          Agrega personas desde tus contactos guardados.
                        </div>
                        <button
                          type="button"
                          onClick={() => setAddMembersOpen(true)}
                          className="mt-5 rounded-xl bg-[#f2c94c] px-5 py-3 text-sm font-bold text-[#0b0f17]"
                        >
                          Agregar integrantes
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedMembers.map((member) => (
                          <div
                            key={member.id}
                            className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                              <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-lg font-extrabold text-white">
                                  {initialOf(member.name, member.email)}
                                </div>

                                <div className="min-w-0">
                                  <div className="truncate text-lg font-bold text-white">
                                    {member.name}
                                  </div>
                                  <div className="truncate text-sm text-slate-400">
                                    {member.email}
                                  </div>
                                  {member.phone ? (
                                    <div className="mt-1 text-xs text-slate-500">
                                      {member.phone}
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <div className="ml-auto flex flex-col gap-2 lg:min-w-[220px]">
                                <div className="flex flex-wrap gap-2">
                                  <span className={cn("rounded-xl px-3 py-1.5 text-sm font-semibold", typeBadge(member.type))}>
                                    {member.type === "empresa" ? "Empresa" : "Creativo"}
                                  </span>

                                  {member.source ? (
                                    <span className={cn("rounded-xl px-3 py-1.5 text-sm font-semibold", sourceBadge(member.source))}>
                                      {member.source}
                                    </span>
                                  ) : null}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeContactFromGroup(member.id)}
                                  className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/15"
                                >
                                  Quitar del equipo
                                </button>
                              </div>
                            </div>

                            {member.specialty || member.company ? (
                              <div className="mt-4 rounded-xl border border-white/8 bg-[#0b1220] p-3 text-sm text-slate-300">
                                {member.specialty ? (
                                  <div>
                                    <span className="font-semibold text-slate-200">Especialidad:</span>{" "}
                                    {member.specialty}
                                  </div>
                                ) : null}
                                {member.company ? (
                                  <div>
                                    <span className="font-semibold text-slate-200">Empresa:</span>{" "}
                                    {member.company}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="text-center">
                <div className="text-2xl">🎨</div>
                <h2 className="mt-2 text-3xl font-bold text-white">
                  Personaliza tu marca
                </h2>
                <p className="mt-2 text-lg text-slate-400">
                  Configura los colores y logo que aparecerán en tus documentos
                </p>
              </section>

              <section className="space-y-6">
                <div>
                  <div className="mb-4 font-ui text-sm uppercase tracking-[0.18em] text-slate-300">
                    🖼️ Logo de la empresa
                  </div>

                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div
                      className="flex h-28 w-28 items-center justify-center rounded-[26px] border-2 border-dashed text-5xl text-white"
                      style={{
                        background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
                        borderColor: "rgba(255,255,255,0.12)",
                      }}
                    >
                      {branding.logo ? (
                        <img
                          src={branding.logo}
                          alt="Logo"
                          className="h-full w-full rounded-[24px] object-cover"
                        />
                      ) : (
                        teamName.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div>
                      <label className="inline-flex cursor-pointer items-center rounded-2xl bg-[#f2c94c] px-6 py-4 text-base font-semibold text-[#0b0f17] transition hover:opacity-95">
                        📤 Subir Logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
                        />
                      </label>

                      <div className="mt-3 text-sm text-slate-400">
                        PNG, JPG o SVG. Máx 2MB. Recomendado: 200x200px
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-4 font-ui text-sm uppercase tracking-[0.18em] text-slate-300">
                    🎨 Colores de marca
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <ColorField
                      label="Color Primario"
                      value={branding.primaryColor}
                      onChange={(value) =>
                        setBranding((prev) => ({ ...prev, primaryColor: value }))
                      }
                    />
                    <ColorField
                      label="Color Secundario"
                      value={branding.secondaryColor}
                      onChange={(value) =>
                        setBranding((prev) => ({ ...prev, secondaryColor: value }))
                      }
                    />
                    <ColorField
                      label="Color Acento"
                      value={branding.accentColor}
                      onChange={(value) =>
                        setBranding((prev) => ({ ...prev, accentColor: value }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-4 font-ui text-sm uppercase tracking-[0.18em] text-slate-300">
                    👁️ Vista Previa
                  </div>

                  <div className="overflow-hidden rounded-[26px] border border-white/8 bg-[#111827] shadow-sm">
                    <div
                      className="p-6 text-white"
                      style={{
                        background: `linear-gradient(90deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl font-bold">
                          {branding.logo ? (
                            <img
                              src={branding.logo}
                              alt="Logo"
                              className="h-12 w-12 rounded-xl object-cover bg-white"
                            />
                          ) : (
                            teamName.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div>
                          <div className="text-2xl font-bold">{teamName}</div>
                          <div className="text-sm text-white/85">Documento de Ejemplo</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-5">
                      <div className="flex flex-wrap gap-3">
                        {palettes.map((palette, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setBranding({
                                ...branding,
                                primaryColor: palette.primary,
                                secondaryColor: palette.secondary,
                                accentColor: palette.accent,
                              })
                            }
                            className="rounded-xl border border-white/8 bg-white/[0.03] p-3 hover:bg-white/[0.06]"
                          >
                            <div className="flex gap-2">
                              <span className="h-6 w-6 rounded-full" style={{ background: palette.primary }} />
                              <span className="h-6 w-6 rounded-full" style={{ background: palette.secondary }} />
                              <span className="h-6 w-6 rounded-full" style={{ background: palette.accent }} />
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <div className="text-sm font-bold text-white">Preview visual</div>
                        <div className="mt-1 text-sm text-slate-400">
                          Más adelante esto se usará también en acuerdos, quotes y branding general.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-white/8 bg-[#0d1320] px-6 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl bg-[#f2c94c] px-7 py-3 text-sm font-bold text-[#0b0f17] hover:opacity-95"
          >
            Cerrar
          </button>
        </div>
      </div>

      {createGroupOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-[520px] rounded-[28px] border border-white/10 bg-[#0d1320] p-7 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-r from-[#f2c94c] to-[#d4a72c] text-3xl text-[#0b0f17]">
              👥
            </div>

            <h2 className="mt-5 text-center text-3xl font-extrabold text-white">
              Nuevo equipo
            </h2>
            <p className="mt-3 text-center text-base text-slate-400">
              Crea un grupo para organizar contactos por área o proyecto
            </p>

            <div className="mt-8">
              <label className="mb-3 block text-base font-semibold text-slate-300">
                Nombre del equipo
              </label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ej: Publicidad, Post Lab, VFX..."
                className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-5 py-4 text-base text-white outline-none focus:border-[#f2c94c]/30"
              />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setCreateGroupOpen(false);
                  setNewGroupName("");
                }}
                className="rounded-2xl bg-white/[0.06] px-6 py-4 text-base font-semibold text-slate-300 hover:bg-white/[0.1]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={createGroup}
                disabled={!newGroupName.trim()}
                className="rounded-2xl bg-[#f2c94c] px-6 py-4 text-base font-bold text-[#0b0f17] disabled:opacity-60"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addMembersOpen && selectedGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-[760px] rounded-[28px] border border-white/10 bg-[#0d1320] p-7 shadow-2xl">
            <h2 className="text-2xl font-extrabold text-white">
              Agregar integrantes a {selectedGroup.name}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Selecciona contactos ya guardados para incluirlos en este equipo
            </p>

            <div className="mt-5">
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Buscar contacto..."
                className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              />
            </div>

            <div className="mt-5 max-h-[380px] space-y-3 overflow-y-auto pr-1">
              {availableContacts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center text-sm text-slate-400">
                  No hay contactos disponibles para agregar.
                </div>
              ) : (
                availableContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-lg font-extrabold text-white">
                        {initialOf(contact.name, contact.email)}
                      </div>

                      <div>
                        <div className="text-base font-bold text-white">{contact.name}</div>
                        <div className="text-sm text-slate-400">{contact.email}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-xl px-3 py-1.5 text-sm font-semibold", typeBadge(contact.type))}>
                        {contact.type === "empresa" ? "Empresa" : "Creativo"}
                      </span>

                      <button
                        type="button"
                        onClick={() => addContactToGroup(contact.id)}
                        className="rounded-xl bg-[#f2c94c] px-4 py-2 text-sm font-semibold text-[#0b0f17]"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setAddMembersOpen(false);
                  setMemberSearch("");
                }}
                className="rounded-2xl bg-white/[0.06] px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-white/[0.1]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-lg font-medium text-slate-300">{label}</div>
      <div className="flex items-center gap-4">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-1.5">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
          />
        </div>

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-lg text-white outline-none"
        />
      </div>
    </label>
  );
}