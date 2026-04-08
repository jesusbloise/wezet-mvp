"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SharedProject = {
  id: string;
  title: string;
  status: string | null;
  currency?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  access_type: "owner" | "participant" | "nda_only";
  nda_status: "pending" | "accepted" | "rejected";
};

function FolderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function statusBadge(status?: string) {
  const s = String(status || "").toLowerCase();
  const base =
    "inline-flex items-center rounded-xl border px-3 py-1 text-[11px] font-bold";

  if (s === "pending") {
    return `${base} border-amber-500/20 bg-amber-500/10 text-amber-300`;
  }
  if (s === "accepted") {
    return `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-300`;
  }
  if (s === "rejected") {
    return `${base} border-rose-500/20 bg-rose-500/10 text-rose-300`;
  }

  return `${base} border-white/10 bg-white/[0.04] text-slate-300`;
}

function accessLabel(accessType?: string) {
  if (accessType === "owner") return "Proyecto propio";
  if (accessType === "participant") return "Participando";
  if (accessType === "nda_only") return "Pendiente por NDA";
  return "Proyecto";
}

function accessBadge(accessType?: string) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]";

  if (accessType === "owner") {
    return `${base} bg-[#f2c94c]/14 text-[#f2c94c] border border-[#f2c94c]/20`;
  }

  if (accessType === "participant") {
    return `${base} bg-emerald-500/14 text-emerald-300 border border-emerald-500/20`;
  }

  if (accessType === "nda_only") {
    return `${base} bg-violet-500/14 text-violet-300 border border-violet-500/20`;
  }

  return `${base} bg-white/[0.04] text-slate-300 border border-white/10`;
}

function projectHref(project: SharedProject) {
  if (project.access_type === "owner") {
    return `/producer/projects/${project.id}`;
  }
  return `/projects/${project.id}`;
}

function groupTitle(accessType: SharedProject["access_type"]) {
  if (accessType === "owner") return "Mis proyectos";
  if (accessType === "participant") return "Proyectos donde participo";
  return "Pendientes por NDA";
}

function groupDescription(accessType: SharedProject["access_type"]) {
  if (accessType === "owner") {
    return "Proyectos creados por ti y que puedes gestionar completamente.";
  }
  if (accessType === "participant") {
    return "Proyectos donde ya tienes acceso activo como talento o participante.";
  }
  return "Proyectos donde todavía dependes del flujo de NDA para el acceso completo.";
}

function cardAccent(accessType: SharedProject["access_type"]) {
  if (accessType === "owner") return "bg-[#f2c94c]";
  if (accessType === "participant") return "bg-emerald-400";
  return "bg-violet-400";
}

function SectionHeader({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-3">
        <h2
          className="text-base font-black sm:text-lg !text-white !opacity-100"
          style={{
            color: "#ffffff",
            WebkitTextFillColor: "#ffffff",
            textShadow: "0 1px 10px rgba(255,255,255,0.08)",
            opacity: 1,
          }}
        >
          {title}
        </h2>

        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-300">
          {count}
        </span>
      </div>

      <p className="mt-1 text-xs !text-slate-300 sm:text-sm">
        {description}
      </p>
    </div>
  );
}

function ProjectCard({
  project,
  deletingId,
  onDelete,
}: {
  project: SharedProject;
  deletingId: string | null;
  onDelete: (project: SharedProject) => void;
}) {
  const created = project.created_at
    ? new Date(project.created_at).toLocaleDateString()
    : "—";

  const isOwner = project.access_type === "owner";
  const isDeleting = deletingId === project.id;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#0d1320] shadow-sm">
      <div className={`absolute inset-y-0 left-0 w-1.5 ${cardAccent(project.access_type)}`} />

      <div className="p-5 pl-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold text-white">
              {project.title}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className={accessBadge(project.access_type)}>
                {accessLabel(project.access_type)}
              </span>

              <span className="text-slate-700">•</span>
              <span>{created}</span>

              <span className="text-slate-700">•</span>
              <span>{project.currency || "CLP"}</span>

              {project.status ? (
                <>
                  <span className="text-slate-700">•</span>
                  <span>{project.status}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={statusBadge(project.nda_status)}>
              NDA: {project.nda_status}
            </span>

            {project.access_type === "owner" || project.nda_status === "accepted" ? (
              <Link
                href={projectHref(project)}
                className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
                style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
              >
                Ver proyecto
              </Link>
            ) : (
              <span className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2 text-sm font-bold text-slate-300">
                Pendiente de NDA
              </span>
            )}

            {isOwner ? (
              <button
                type="button"
                onClick={() => onDelete(project)}
                disabled={isDeleting}
                className="rounded-md border border-rose-500/20 bg-rose-500/8 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-rose-300 transition hover:bg-rose-500/12 disabled:opacity-60"
              >
                {isDeleting ? "..." : "x"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { user, loading } = useAuth();

  const [projects, setProjects] = useState<SharedProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setProjectsLoading(true);
    setErr(null);
    try {
      const r = await api<{ ok: true; projects: SharedProject[] }>("/projects/shared");
      setProjects(r.projects || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    load();
  }, [loading, user]);

  const handleDeleteProject = async (project: SharedProject) => {
    if (project.access_type !== "owner") return;

    const ok = window.confirm(
      `¿Seguro que quieres eliminar el proyecto "${project.title}"?\n\nEsta acción borrará también cotizaciones, talentos, NDAs y negociaciones relacionadas.`
    );
    if (!ok) return;

    setDeletingId(project.id);
    setErr(null);

    try {
      await api(`/projects/${project.id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setDeletingId(null);
    }
  };

  const ownProjects = useMemo(
    () => projects.filter((p) => p.access_type === "owner"),
    [projects]
  );

  const participantProjects = useMemo(
    () => projects.filter((p) => p.access_type === "participant"),
    [projects]
  );

  const ndaProjects = useMemo(
    () => projects.filter((p) => p.access_type === "nda_only"),
    [projects]
  );

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/8 bg-[#0d1320] p-6 text-sm text-slate-400">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
        Debes iniciar sesión.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="min-h-[calc(100vh-56px)] rounded-3xl bg-[#070b14] p-4 sm:p-6 md:p-7">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
                collaborative workspace
              </div>

              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[#f2c94c] shadow-sm">
                  <FolderIcon />
                </span>
                <h1
  className="text-[22px] font-black sm:text-[28px] !text-white !opacity-100"
  style={{
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
    textShadow: "0 1px 10px rgba(255,255,255,0.08)",
    opacity: 1,
  }}
>
  Proyectos
</h1>
              </div>

              <p className="mt-2 text-sm text-slate-400">
                Aquí verás tus proyectos propios y también los proyectos compartidos contigo.
              </p>
            </div>

            <Link
              href="/producer/projects/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-[#0b0f17] shadow-sm hover:opacity-95 active:opacity-90"
              style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
            >
              <span className="text-base leading-none">+</span>
              <span>Nuevo Proyecto</span>
            </Link>
          </div>

          {err ? (
            <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {err}
            </div>
          ) : null}

          {projectsLoading ? (
            <div className="rounded-2xl border border-white/8 bg-[#0d1320] p-6 text-sm text-slate-400">
              Cargando proyectos...
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-3xl border border-white/8 bg-[#0d1320] p-10 text-center shadow-sm">
              <div className="mb-3 text-5xl">📁</div>
              <div className="text-lg font-bold text-white">
                No tienes proyectos aún
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Crea tu primer proyecto o espera una invitación para colaborar en uno.
              </div>

              <Link
                href="/producer/projects/new"
                className="mt-6 inline-flex rounded-2xl px-6 py-3 text-sm font-bold text-[#0b0f17] shadow-sm"
                style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
              >
                + Crear mi primer proyecto
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {ownProjects.length > 0 ? (
                <section>
                  <SectionHeader
                    title={groupTitle("owner")}
                    description={groupDescription("owner")}
                    count={ownProjects.length}
                  />
                  <div className="grid gap-4">
                    {ownProjects.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        deletingId={deletingId}
                        onDelete={handleDeleteProject}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {participantProjects.length > 0 ? (
                <section>
                  <SectionHeader
                    title={groupTitle("participant")}
                    description={groupDescription("participant")}
                    count={participantProjects.length}
                  />
                  <div className="grid gap-4">
                    {participantProjects.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        deletingId={deletingId}
                        onDelete={handleDeleteProject}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {ndaProjects.length > 0 ? (
                <section>
                  <SectionHeader
                    title={groupTitle("nda_only")}
                    description={groupDescription("nda_only")}
                    count={ndaProjects.length}
                  />
                  <div className="grid gap-4">
                    {ndaProjects.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        deletingId={deletingId}
                        onDelete={handleDeleteProject}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

