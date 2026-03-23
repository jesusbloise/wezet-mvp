
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type TeamMember = {
  id: string;
  email: string;
  role: string;
  org_id?: string | null;
  display_name?: string | null;
  profile_type?: string | null;
  phone?: string | null;
  country?: string | null;
  created_at?: string;
};

type TeamResponse = {
  items: TeamMember[];
};

type TeamTab = "members" | "branding";
type InviteRole = "producer_owner" | "producer" | "creative" | "company";

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

const roles = [
  {
    id: "producer_owner" as InviteRole,
    title: "Admin",
    subtitle: "Control total",
    icon: "👑",
    badge: "Admin",
    badgeClass: "bg-emerald-500/12 text-emerald-300",
  },
  {
    id: "producer" as InviteRole,
    title: "Editor",
    subtitle: "Crear y editar",
    icon: "🖍️",
    badge: "Editor",
    badgeClass: "bg-blue-500/12 text-blue-300",
  },
  {
    id: "creative" as InviteRole,
    title: "Viewer",
    subtitle: "Solo lectura",
    icon: "👁️",
    badge: "Viewer",
    badgeClass: "bg-white/10 text-slate-300",
  },
  {
    id: "company" as InviteRole,
    title: "Company",
    subtitle: "Acceso empresa",
    icon: "🏢",
    badge: "Company",
    badgeClass: "bg-violet-500/12 text-violet-300",
  },
];

function roleMeta(role: string) {
  return roles.find((r) => r.id === role) || roles[1];
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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function TeamPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState<TeamTab>("members");
  const [items, setItems] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [teamName, setTeamName] = useState("wezet");
  const [branding, setBranding] = useState<BrandingState>(defaultBranding);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("producer_owner");
  const [inviteSaving, setInviteSaving] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("wezet-team-name");
    const savedBranding = localStorage.getItem("wezet-team-branding");
    if (savedName) setTeamName(savedName);
    if (savedBranding) {
      try {
        setBranding(JSON.parse(savedBranding));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("wezet-team-name", teamName);
  }, [teamName]);

  useEffect(() => {
    localStorage.setItem("wezet-team-branding", JSON.stringify(branding));
  }, [branding]);

  async function loadTeam() {
    try {
      setLoading(true);
      setError("");
      const data = await api<TeamResponse>("/team");
      setItems(data.items || []);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el equipo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  const owner = useMemo(() => {
    return (
      items.find((m) => m.role === "producer_owner") ||
      items[0] || {
        id: "fallback",
        email: user?.email || "Sin email",
        role: "producer_owner",
        display_name: "Creativo",
      }
    );
  }, [items, user?.email]);

  const members = useMemo(() => {
    return items.filter((m) => m.id !== owner?.id);
  }, [items, owner]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    try {
      setInviteSaving(true);
      setError("");
      setSuccess("");

      await api("/team/add", {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      setSuccess("Miembro agregado al equipo.");
      setInviteEmail("");
      setInviteRole("producer_owner");
      setInviteOpen(false);
      await loadTeam();
    } catch (err: any) {
      setError(err?.message || "No se pudo agregar el miembro.");
    } finally {
      setInviteSaving(false);
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    try {
      setError("");
      setSuccess("");
      await api(`/team/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      setSuccess("Rol actualizado.");
      await loadTeam();
    } catch (err: any) {
      setError(err?.message || "No se pudo actualizar el rol.");
    }
  }

  async function handleRemove(userId: string) {
    const ok = window.confirm("¿Quitar este miembro del equipo?");
    if (!ok) return;

    try {
      setError("");
      setSuccess("");
      await api(`/team/${userId}`, { method: "DELETE" });
      setSuccess("Miembro eliminado.");
      await loadTeam();
    } catch (err: any) {
      setError(err?.message || "No se pudo eliminar el miembro.");
    }
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
                {items.length} miembros • Creado el {formatDate(owner?.created_at)}
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
                  : "bg-white/[0.06] text-slate-400 hover:bg-white/[0.1]"
              )}
            >
              👥 Miembros
            </button>

            <button
              type="button"
              onClick={() => setTab("branding")}
              className={cn(
                "rounded-2xl px-5 py-3 text-sm font-semibold transition",
                tab === "branding"
                  ? "bg-[#f2c94c] text-[#0b0f17] shadow-sm"
                  : "bg-white/[0.06] text-slate-400 hover:bg-white/[0.1]"
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
            <div className="space-y-6">
              <section>
                <div className="mb-4 font-ui text-sm uppercase tracking-[0.18em] text-slate-500">
                  👑 Propietario
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-lg font-extrabold text-white">
                      {initialOf(owner?.display_name, owner?.email)}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-[22px] font-bold leading-none text-white">
                        {owner?.display_name || "Creativo"}
                      </div>
                      <div className="mt-1 truncate text-sm text-slate-500">
                        {owner?.email || "Sin email"}
                      </div>
                    </div>

                    <div className="ml-auto">
                      <span className="rounded-xl bg-emerald-500/12 px-3 py-2 text-sm font-semibold text-emerald-300">
                        Admin
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="font-ui text-sm uppercase tracking-[0.18em] text-slate-500">
                    👥 Miembros ({members.length})
                  </div>

                  <button
                    type="button"
                    onClick={() => setInviteOpen(true)}
                    className="rounded-xl bg-[#f2c94c] px-4 py-2.5 text-sm font-semibold text-[#0b0f17] transition hover:opacity-95"
                  >
                    + Invitar
                  </button>
                </div>

                {loading ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center text-sm text-slate-500">
                    Cargando equipo...
                  </div>
                ) : members.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-14 text-center">
                    <div className="text-4xl">👋</div>
                    <div className="mt-4 text-2xl font-semibold text-slate-400">
                      Aún no hay miembros en tu equipo
                    </div>
                    <button
                      type="button"
                      onClick={() => setInviteOpen(true)}
                      className="mt-6 rounded-xl bg-[#f2c94c] px-6 py-3 text-sm font-bold text-[#0b0f17] transition hover:opacity-95"
                    >
                      Invitar al primer miembro
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => {
                      const meta = roleMeta(member.role);

                      return (
                        <div
                          key={member.id}
                          className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                            <div className="flex items-center gap-4">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500 text-lg font-extrabold text-white">
                                {initialOf(member.display_name, member.email)}
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-lg font-bold text-white">
                                  {member.display_name || member.email}
                                </div>
                                <div className="truncate text-sm text-slate-500">
                                  {member.email}
                                </div>
                              </div>
                            </div>

                            <div className="ml-auto flex flex-col gap-2 lg:min-w-[220px]">
                              <span className={cn("w-fit rounded-xl px-3 py-1.5 text-sm font-semibold", meta.badgeClass)}>
                                {meta.badge}
                              </span>

                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f2c94c]/30"
                              >
                                {roles.map((role) => (
                                  <option key={role.id} value={role.id}>
                                    {role.title}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => handleRemove(member.id)}
                                className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/15"
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <div className="mb-4 text-base font-bold text-white">📋 Permisos por Rol</div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="font-semibold text-emerald-300">👑 Admin</div>
                    <div className="mt-2 text-sm text-slate-500">✓ Gestionar equipo</div>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-300">🖍️ Editor</div>
                    <div className="mt-2 text-sm text-slate-500">✓ Crear proyectos</div>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-300">👁️ Viewer</div>
                    <div className="mt-2 text-sm text-slate-500">✓ Ver proyectos</div>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="text-center">
                <div className="text-2xl">🎨</div>
                <h2 className="mt-2 text-3xl font-bold text-white">
                  Personaliza tu marca
                </h2>
                <p className="mt-2 text-lg text-slate-500">
                  Configura los colores y logo que aparecerán en tus documentos
                </p>
              </section>

              <section className="space-y-6">
                <div>
                  <div className="mb-4 font-ui text-sm uppercase tracking-[0.18em] text-slate-500">
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

                      <div className="mt-3 text-sm text-slate-500">
                        PNG, JPG o SVG. Máx 2MB. Recomendado: 200x200px
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-4 font-ui text-sm uppercase tracking-[0.18em] text-slate-500">
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
                  <div className="mb-4 font-ui text-sm uppercase tracking-[0.18em] text-slate-500">
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
                        <div className="mt-1 text-sm text-slate-500">
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

        <div className="flex items-center justify-between border-t border-white/8 bg-[#0d1320] px-6 py-4">
          <button
            type="button"
            className="rounded-xl bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/15"
          >
            🗑️ Eliminar Equipo
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl bg-[#f2c94c] px-7 py-3 text-sm font-bold text-[#0b0f17] hover:opacity-95"
          >
            Cerrar
          </button>
        </div>
      </div>

      {inviteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-[560px] rounded-[28px] border border-white/10 bg-[#0d1320] p-7 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-r from-[#f2c94c] to-[#d4a72c] text-3xl text-[#0b0f17]">
              ✉️
            </div>

            <h2 className="mt-5 text-center text-4xl font-extrabold text-white">
              Invitar al Equipo
            </h2>
            <p className="mt-3 text-center text-xl text-slate-500">
              Envía una invitación por email
            </p>

            <form onSubmit={handleInvite} className="mt-8 space-y-6">
              <div>
                <label className="mb-3 block text-lg font-semibold text-slate-300">
                  Email del colaborador *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colaborador@email.com"
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-5 py-4 text-lg text-white outline-none focus:border-[#f2c94c]/30"
                  required
                />
              </div>

              <div>
                <div className="mb-3 block text-lg font-semibold text-slate-300">
                  Rol en el equipo
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {roles.slice(0, 3).map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setInviteRole(role.id)}
                      className={cn(
                        "rounded-2xl border px-4 py-6 text-center transition",
                        inviteRole === role.id
                          ? "border-[#f2c94c]/30 bg-[#f2c94c]/10 shadow-sm"
                          : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                      )}
                    >
                      <div className="text-3xl">{role.icon}</div>
                      <div className="mt-3 text-2xl font-bold text-white">{role.title}</div>
                      <div className="mt-1 text-sm text-slate-500">{role.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="rounded-2xl bg-white/[0.06] px-6 py-4 text-xl font-semibold text-slate-300 hover:bg-white/[0.1]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={inviteSaving}
                  className="rounded-2xl bg-[#f2c94c] px-6 py-4 text-xl font-bold text-[#0b0f17] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {inviteSaving ? "Enviando..." : "📨 Enviar Invitación"}
                </button>
              </div>
            </form>
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


// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { api } from "@/lib/api";
// import { useRouter } from "next/navigation";
// import { useAuth } from "@/context/AuthContext";

// type TeamMember = {
//   id: string;
//   email: string;
//   role: string;
//   org_id?: string | null;
//   display_name?: string | null;
//   profile_type?: string | null;
//   phone?: string | null;
//   country?: string | null;
//   created_at?: string;
// };

// type TeamResponse = {
//   items: TeamMember[];
// };

// type TeamTab = "members" | "branding";
// type InviteRole = "producer_owner" | "producer" | "creative" | "company";

// type BrandingState = {
//   logo: string | null;
//   primaryColor: string;
//   secondaryColor: string;
//   accentColor: string;
// };

// const defaultBranding: BrandingState = {
//   logo: null,
//   primaryColor: "#3b82f6",
//   secondaryColor: "#8b5cf6",
//   accentColor: "#10b981",
// };

// const palettes = [
//   { primary: "#3b82f6", secondary: "#8b5cf6", accent: "#10b981" },
//   { primary: "#2563eb", secondary: "#7c3aed", accent: "#06b6d4" },
//   { primary: "#0f172a", secondary: "#334155", accent: "#f43f5e" },
//   { primary: "#059669", secondary: "#0891b2", accent: "#f59e0b" },
// ];

// const roles = [
//   {
//     id: "producer_owner" as InviteRole,
//     title: "Admin",
//     subtitle: "Control total",
//     icon: "👑",
//     badge: "Admin",
//     badgeClass: "bg-emerald-100 text-emerald-700",
//   },
//   {
//     id: "producer" as InviteRole,
//     title: "Editor",
//     subtitle: "Crear y editar",
//     icon: "🖍️",
//     badge: "Editor",
//     badgeClass: "bg-blue-100 text-blue-700",
//   },
//   {
//     id: "creative" as InviteRole,
//     title: "Viewer",
//     subtitle: "Solo lectura",
//     icon: "👁️",
//     badge: "Viewer",
//     badgeClass: "bg-slate-200 text-slate-700",
//   },
//   {
//     id: "company" as InviteRole,
//     title: "Company",
//     subtitle: "Acceso empresa",
//     icon: "🏢",
//     badge: "Company",
//     badgeClass: "bg-violet-100 text-violet-700",
//   },
// ];

// function roleMeta(role: string) {
//   return roles.find((r) => r.id === role) || roles[1];
// }

// function initialOf(name?: string | null, email?: string | null) {
//   return (name || email || "U").trim().charAt(0).toUpperCase();
// }

// function formatDate(date?: string) {
//   if (!date) return "—";
//   const d = new Date(date);
//   if (Number.isNaN(d.getTime())) return "—";
//   return d.toLocaleDateString("es-CL");
// }

// function cn(...classes: Array<string | false | null | undefined>) {
//   return classes.filter(Boolean).join(" ");
// }

// export default function TeamPage() {
//   const router = useRouter();
//   const { user } = useAuth();

//   const [tab, setTab] = useState<TeamTab>("members");
//   const [items, setItems] = useState<TeamMember[]>([]);
//   const [loading, setLoading] = useState(true);

//   const [teamName, setTeamName] = useState("wezet");
//   const [branding, setBranding] = useState<BrandingState>(defaultBranding);

//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");

//   const [inviteOpen, setInviteOpen] = useState(false);
//   const [inviteEmail, setInviteEmail] = useState("");
//   const [inviteRole, setInviteRole] = useState<InviteRole>("producer_owner");
//   const [inviteSaving, setInviteSaving] = useState(false);

//   useEffect(() => {
//     const savedName = localStorage.getItem("wezet-team-name");
//     const savedBranding = localStorage.getItem("wezet-team-branding");
//     if (savedName) setTeamName(savedName);
//     if (savedBranding) {
//       try {
//         setBranding(JSON.parse(savedBranding));
//       } catch {}
//     }
//   }, []);

//   useEffect(() => {
//     localStorage.setItem("wezet-team-name", teamName);
//   }, [teamName]);

//   useEffect(() => {
//     localStorage.setItem("wezet-team-branding", JSON.stringify(branding));
//   }, [branding]);

//   async function loadTeam() {
//     try {
//       setLoading(true);
//       setError("");
//       const data = await api<TeamResponse>("/team");
//       setItems(data.items || []);
//     } catch (err: any) {
//       setError(err?.message || "No se pudo cargar el equipo.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     loadTeam();
//   }, []);

//   const owner = useMemo(() => {
//     return (
//       items.find((m) => m.role === "producer_owner") ||
//       items[0] || {
//         id: "fallback",
//         email: user?.email || "Sin email",
//         role: "producer_owner",
//         display_name: "Creativo",
//       }
//     );
//   }, [items, user?.email]);

//   const members = useMemo(() => {
//     return items.filter((m) => m.id !== owner?.id);
//   }, [items, owner]);

//   async function handleInvite(e: React.FormEvent) {
//     e.preventDefault();
//     try {
//       setInviteSaving(true);
//       setError("");
//       setSuccess("");

//       await api("/team/add", {
//         method: "POST",
//         body: JSON.stringify({
//           email: inviteEmail,
//           role: inviteRole,
//         }),
//       });

//       setSuccess("Miembro agregado al equipo.");
//       setInviteEmail("");
//       setInviteRole("producer_owner");
//       setInviteOpen(false);
//       await loadTeam();
//     } catch (err: any) {
//       setError(err?.message || "No se pudo agregar el miembro.");
//     } finally {
//       setInviteSaving(false);
//     }
//   }

//   async function handleRoleChange(userId: string, role: string) {
//     try {
//       setError("");
//       setSuccess("");
//       await api(`/team/${userId}/role`, {
//         method: "PATCH",
//         body: JSON.stringify({ role }),
//       });
//       setSuccess("Rol actualizado.");
//       await loadTeam();
//     } catch (err: any) {
//       setError(err?.message || "No se pudo actualizar el rol.");
//     }
//   }

//   async function handleRemove(userId: string) {
//     const ok = window.confirm("¿Quitar este miembro del equipo?");
//     if (!ok) return;

//     try {
//       setError("");
//       setSuccess("");
//       await api(`/team/${userId}`, { method: "DELETE" });
//       setSuccess("Miembro eliminado.");
//       await loadTeam();
//     } catch (err: any) {
//       setError(err?.message || "No se pudo eliminar el miembro.");
//     }
//   }

//   function handleLogoUpload(file: File | null) {
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onload = () => {
//       setBranding((prev) => ({
//         ...prev,
//         logo: typeof reader.result === "string" ? reader.result : null,
//       }));
//     };
//     reader.readAsDataURL(file);
//   }

//   return (
//     <div className="min-h-screen bg-black/20 p-4 md:p-6">
//       <div className="mx-auto max-w-[1120px] overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl">
//         <div
//           className="relative px-6 py-7 text-white"
//           style={{
//             background: `linear-gradient(90deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
//           }}
//         >
//           <div className="flex items-start justify-between gap-4">
//             <div>
//               <div className="flex items-center gap-2 text-[14px] font-extrabold">
//                 <span>👥</span>
//                 <span>{teamName}</span>
//               </div>
//               <div className="mt-2 text-sm text-white/90">
//                 {items.length} miembros • Creado el {formatDate(owner?.created_at)}
//               </div>
//             </div>

//             <button
//               type="button"
//               onClick={() => router.back()}
//               className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-xl text-white transition hover:bg-white/30"
//             >
//               ×
//             </button>
//           </div>
//         </div>

//         <div className="max-h-[78vh] overflow-y-auto px-6 py-5">
//           <div className="mb-5 flex items-center gap-3">
//             <button
//               type="button"
//               onClick={() => setTab("members")}
//               className={cn(
//                 "rounded-2xl px-5 py-3 text-sm font-semibold transition",
//                 tab === "members"
//                   ? "bg-sky-500 text-white shadow-sm"
//                   : "bg-slate-100 text-slate-500 hover:bg-slate-200"
//               )}
//             >
//               👥 Miembros
//             </button>

//             <button
//               type="button"
//               onClick={() => setTab("branding")}
//               className={cn(
//                 "rounded-2xl px-5 py-3 text-sm font-semibold transition",
//                 tab === "branding"
//                   ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-sm"
//                   : "bg-slate-100 text-slate-500 hover:bg-slate-200"
//               )}
//             >
//               🎨 Branding
//             </button>
//           </div>

//           <div className="mb-6 h-px bg-slate-200" />

//           {error ? (
//             <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
//               {error}
//             </div>
//           ) : null}

//           {success ? (
//             <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
//               {success}
//             </div>
//           ) : null}

//           {tab === "members" ? (
//             <div className="space-y-6">
//               <section>
//                 <div className="mb-4 text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
//                   👑 Propietario
//                 </div>

//                 <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
//                   <div className="flex items-center gap-4">
//                     <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-lg font-extrabold text-white">
//                       {initialOf(owner?.display_name, owner?.email)}
//                     </div>

//                     <div className="min-w-0">
//                       <div className="truncate text-[22px] font-bold leading-none text-slate-800">
//                         {owner?.display_name || "Creativo"}
//                       </div>
//                       <div className="mt-1 truncate text-sm text-slate-500">
//                         {owner?.email || "Sin email"}
//                       </div>
//                     </div>

//                     <div className="ml-auto">
//                       <span className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">
//                         Admin
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               </section>

//               <section>
//                 <div className="mb-4 flex items-center justify-between gap-3">
//                   <div className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
//                     👥 Miembros ({members.length})
//                   </div>

//                   <button
//                     type="button"
//                     onClick={() => setInviteOpen(true)}
//                     className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
//                   >
//                     + Invitar
//                   </button>
//                 </div>

//                 {loading ? (
//                   <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
//                     Cargando equipo...
//                   </div>
//                 ) : members.length === 0 ? (
//                   <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
//                     <div className="text-4xl">👋</div>
//                     <div className="mt-4 text-2xl font-semibold text-slate-500">
//                       Aún no hay miembros en tu equipo
//                     </div>
//                     <button
//                       type="button"
//                       onClick={() => setInviteOpen(true)}
//                       className="mt-6 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
//                     >
//                       Invitar al primer miembro
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="space-y-3">
//                     {members.map((member) => {
//                       const meta = roleMeta(member.role);

//                       return (
//                         <div
//                           key={member.id}
//                           className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
//                         >
//                           <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
//                             <div className="flex items-center gap-4">
//                               <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500 text-lg font-extrabold text-white">
//                                 {initialOf(member.display_name, member.email)}
//                               </div>

//                               <div className="min-w-0">
//                                 <div className="truncate text-lg font-bold text-slate-800">
//                                   {member.display_name || member.email}
//                                 </div>
//                                 <div className="truncate text-sm text-slate-500">
//                                   {member.email}
//                                 </div>
//                               </div>
//                             </div>

//                             <div className="ml-auto flex flex-col gap-2 lg:min-w-[220px]">
//                               <span className={cn("w-fit rounded-xl px-3 py-1.5 text-sm font-semibold", meta.badgeClass)}>
//                                 {meta.badge}
//                               </span>

//                               <select
//                                 value={member.role}
//                                 onChange={(e) => handleRoleChange(member.id, e.target.value)}
//                                 className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400"
//                               >
//                                 {roles.map((role) => (
//                                   <option key={role.id} value={role.id}>
//                                     {role.title}
//                                   </option>
//                                 ))}
//                               </select>

//                               <button
//                                 type="button"
//                                 onClick={() => handleRemove(member.id)}
//                                 className="rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
//                               >
//                                 Quitar
//                               </button>
//                             </div>
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 )}
//               </section>

//               <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
//                 <div className="mb-4 text-base font-bold text-slate-700">📋 Permisos por Rol</div>

//                 <div className="grid gap-4 md:grid-cols-3">
//                   <div>
//                     <div className="font-semibold text-emerald-600">👑 Admin</div>
//                     <div className="mt-2 text-sm text-slate-600">✓ Gestionar equipo</div>
//                   </div>
//                   <div>
//                     <div className="font-semibold text-blue-600">🖍️ Editor</div>
//                     <div className="mt-2 text-sm text-slate-600">✓ Crear proyectos</div>
//                   </div>
//                   <div>
//                     <div className="font-semibold text-slate-600">👁️ Viewer</div>
//                     <div className="mt-2 text-sm text-slate-600">✓ Ver proyectos</div>
//                   </div>
//                 </div>
//               </section>
//             </div>
//           ) : (
//             <div className="space-y-6">
//               <section className="text-center">
//                 <div className="text-2xl">🎨</div>
//                 <h2 className="mt-2 text-3xl font-bold text-slate-800">
//                   Personaliza tu marca
//                 </h2>
//                 <p className="mt-2 text-lg text-slate-500">
//                   Configura los colores y logo que aparecerán en tus documentos
//                 </p>
//               </section>

//               <section className="space-y-6">
//                 <div>
//                   <div className="mb-4 text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
//                     🖼️ Logo de la empresa
//                   </div>

//                   <div className="flex flex-col gap-4 md:flex-row md:items-center">
//                     <div
//                       className="flex h-28 w-28 items-center justify-center rounded-[26px] border-2 border-dashed text-5xl text-white"
//                       style={{
//                         background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
//                         borderColor: "#cbd5e1",
//                       }}
//                     >
//                       {branding.logo ? (
//                         <img
//                           src={branding.logo}
//                           alt="Logo"
//                           className="h-full w-full rounded-[24px] object-cover"
//                         />
//                       ) : (
//                         teamName.charAt(0).toUpperCase()
//                       )}
//                     </div>

//                     <div>
//                       <label className="inline-flex cursor-pointer items-center rounded-2xl bg-sky-500 px-6 py-4 text-base font-semibold text-white transition hover:bg-sky-600">
//                         📤 Subir Logo
//                         <input
//                           type="file"
//                           accept="image/*"
//                           className="hidden"
//                           onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
//                         />
//                       </label>

//                       <div className="mt-3 text-sm text-slate-400">
//                         PNG, JPG o SVG. Máx 2MB. Recomendado: 200x200px
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 <div>
//                   <div className="mb-4 text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
//                     🎨 Colores de marca
//                   </div>

//                   <div className="grid gap-4 md:grid-cols-3">
//                     <ColorField
//                       label="Color Primario"
//                       value={branding.primaryColor}
//                       onChange={(value) =>
//                         setBranding((prev) => ({ ...prev, primaryColor: value }))
//                       }
//                     />
//                     <ColorField
//                       label="Color Secundario"
//                       value={branding.secondaryColor}
//                       onChange={(value) =>
//                         setBranding((prev) => ({ ...prev, secondaryColor: value }))
//                       }
//                     />
//                     <ColorField
//                       label="Color Acento"
//                       value={branding.accentColor}
//                       onChange={(value) =>
//                         setBranding((prev) => ({ ...prev, accentColor: value }))
//                       }
//                     />
//                   </div>
//                 </div>

//                 <div>
//                   <div className="mb-4 text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
//                     👁️ Vista Previa
//                   </div>

//                   <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
//                     <div
//                       className="p-6 text-white"
//                       style={{
//                         background: `linear-gradient(90deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
//                       }}
//                     >
//                       <div className="flex items-center gap-4">
//                         <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl font-bold">
//                           {branding.logo ? (
//                             <img
//                               src={branding.logo}
//                               alt="Logo"
//                               className="h-12 w-12 rounded-xl object-cover bg-white"
//                             />
//                           ) : (
//                             teamName.charAt(0).toUpperCase()
//                           )}
//                         </div>

//                         <div>
//                           <div className="text-2xl font-bold">{teamName}</div>
//                           <div className="text-sm text-white/85">Documento de Ejemplo</div>
//                         </div>
//                       </div>
//                     </div>

//                     <div className="space-y-4 p-5">
//                       <div className="flex flex-wrap gap-3">
//                         {palettes.map((palette, idx) => (
//                           <button
//                             key={idx}
//                             type="button"
//                             onClick={() =>
//                               setBranding({
//                                 ...branding,
//                                 primaryColor: palette.primary,
//                                 secondaryColor: palette.secondary,
//                                 accentColor: palette.accent,
//                               })
//                             }
//                             className="rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100"
//                           >
//                             <div className="flex gap-2">
//                               <span className="h-6 w-6 rounded-full" style={{ background: palette.primary }} />
//                               <span className="h-6 w-6 rounded-full" style={{ background: palette.secondary }} />
//                               <span className="h-6 w-6 rounded-full" style={{ background: palette.accent }} />
//                             </div>
//                           </button>
//                         ))}
//                       </div>

//                       <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
//                         <div className="text-sm font-bold text-slate-800">Preview visual</div>
//                         <div className="mt-1 text-sm text-slate-500">
//                           Más adelante esto se usará también en acuerdos, quotes y branding general.
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </section>
//             </div>
//           )}
//         </div>

//         <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
//           <button
//             type="button"
//             className="rounded-xl bg-red-50 px-5 py-3 text-sm font-semibold text-red-500 hover:bg-red-100"
//           >
//             🗑️ Eliminar Equipo
//           </button>

//           <button
//             type="button"
//             onClick={() => router.back()}
//             className="rounded-xl bg-blue-500 px-7 py-3 text-sm font-bold text-white hover:bg-blue-600"
//           >
//             Cerrar
//           </button>
//         </div>
//       </div>

//       {inviteOpen ? (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
//           <div className="w-full max-w-[560px] rounded-[28px] bg-white p-7 shadow-2xl">
//             <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-r from-blue-500 to-violet-500 text-3xl text-white">
//               ✉️
//             </div>

//             <h2 className="mt-5 text-center text-4xl font-extrabold text-slate-900">
//               Invitar al Equipo
//             </h2>
//             <p className="mt-3 text-center text-xl text-slate-500">
//               Envía una invitación por email
//             </p>

//             <form onSubmit={handleInvite} className="mt-8 space-y-6">
//               <div>
//                 <label className="mb-3 block text-lg font-semibold text-slate-800">
//                   Email del colaborador *
//                 </label>
//                 <input
//                   type="email"
//                   value={inviteEmail}
//                   onChange={(e) => setInviteEmail(e.target.value)}
//                   placeholder="colaborador@email.com"
//                   className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg text-slate-700 outline-none focus:border-blue-400"
//                   required
//                 />
//               </div>

//               <div>
//                 <div className="mb-3 block text-lg font-semibold text-slate-800">
//                   Rol en el equipo
//                 </div>

//                 <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
//                   {roles.slice(0, 3).map((role) => (
//                     <button
//                       key={role.id}
//                       type="button"
//                       onClick={() => setInviteRole(role.id)}
//                       className={cn(
//                         "rounded-2xl border px-4 py-6 text-center transition",
//                         inviteRole === role.id
//                           ? "border-blue-500 bg-blue-50 shadow-sm"
//                           : "border-slate-200 bg-white hover:bg-slate-50"
//                       )}
//                     >
//                       <div className="text-3xl">{role.icon}</div>
//                       <div className="mt-3 text-2xl font-bold text-slate-900">{role.title}</div>
//                       <div className="mt-1 text-sm text-slate-500">{role.subtitle}</div>
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-4 pt-2">
//                 <button
//                   type="button"
//                   onClick={() => setInviteOpen(false)}
//                   className="rounded-2xl bg-slate-100 px-6 py-4 text-xl font-semibold text-slate-600 hover:bg-slate-200"
//                 >
//                   Cancelar
//                 </button>

//                 <button
//                   type="submit"
//                   disabled={inviteSaving}
//                   className="rounded-2xl bg-slate-200 px-6 py-4 text-xl font-bold text-slate-400 transition enabled:bg-blue-500 enabled:text-white hover:enabled:bg-blue-600 disabled:cursor-not-allowed"
//                 >
//                   {inviteSaving ? "Enviando..." : "📨 Enviar Invitación"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// }

// function ColorField({
//   label,
//   value,
//   onChange,
// }: {
//   label: string;
//   value: string;
//   onChange: (value: string) => void;
// }) {
//   return (
//     <label className="block">
//       <div className="mb-2 text-lg font-medium text-slate-700">{label}</div>
//       <div className="flex items-center gap-4">
//         <div className="rounded-xl border border-slate-200 bg-slate-50 p-1.5">
//           <input
//             type="color"
//             value={value}
//             onChange={(e) => onChange(e.target.value)}
//             className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
//           />
//         </div>

//         <input
//           value={value}
//           onChange={(e) => onChange(e.target.value)}
//           className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg text-slate-700 outline-none"
//         />
//       </div>
//     </label>
//   );
// }
