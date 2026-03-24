"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type SharedProjectDetail = {
  id: string;
  title: string;
  brief: string | null;
  status: string | null;
  currency: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
};

type AccessInfo = {
  type: "owner" | "participant" | "nda_only";
  nda_status: "pending" | "accepted" | "rejected";
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function badge(status?: string) {
  const s = String(status || "").toLowerCase();
  const base =
    "inline-flex items-center rounded-xl border px-3 py-1 text-[11px] font-bold";

  if (s === "pending") return `${base} border-amber-500/20 bg-amber-500/10 text-amber-300`;
  if (s === "accepted") return `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-300`;
  if (s === "rejected") return `${base} border-rose-500/20 bg-rose-500/10 text-rose-300`;
  if (s === "draft") return `${base} border-white/10 bg-white/[0.04] text-slate-300`;

  return `${base} border-white/10 bg-white/[0.04] text-slate-300`;
}

function accessLabel(type?: string) {
  if (type === "owner") return "Propio";
  if (type === "participant") return "Participante";
  if (type === "nda_only") return "Acceso por NDA";
  return "Proyecto";
}

export default function SharedProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";

  const validId = useMemo(() => isUuid(id), [id]);

  const [project, setProject] = useState<SharedProjectDetail | null>(null);
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!validId) {
      setLoading(false);
      setErr("Invalid project id");
      return;
    }

    let alive = true;
    setLoading(true);
    setErr(null);

    api<{ ok: true; project: SharedProjectDetail; access: AccessInfo }>(
      `/projects/shared/${id}`
    )
      .then((r) => {
        if (!alive) return;
        setProject(r.project);
        setAccess(r.access);
        setLoading(false);
      })
      .catch((e: any) => {
        if (!alive) return;
        setErr(String(e?.message || e));
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id, validId]);

  if (!validId) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
        Invalid project id
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/8 bg-[#0d1320] p-6 text-sm text-slate-400">
        Cargando proyecto...
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
        {err}
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="w-full">
      <div className="mx-auto max-w-[1100px]">
        <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d1320]">
          <div className="flex flex-col gap-4 bg-[#111827] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  project access
                </div>

                <div className="mt-2 truncate text-xl font-black text-white sm:text-2xl">
                  {project.title}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className={badge(project.status || "draft")}>
                    {project.status || "draft"}
                  </span>
                  {access ? (
                    <span className={badge(access.nda_status)}>
                      NDA: {access.nda_status}
                    </span>
                  ) : null}
                  {access?.type ? (
                    <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-slate-300">
                      {accessLabel(access.type)}
                    </span>
                  ) : null}
                  {project.currency ? <span>• {project.currency}</span> : null}
                  {project.created_at ? (
                    <span>• {new Date(project.created_at).toLocaleDateString()}</span>
                  ) : null}
                </div>
              </div>

              <Link
                href="/projects"
                className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/[0.06]"
              >
                Volver
              </Link>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <div>
                  <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    descripción
                  </div>
                  <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
                    {project.brief || "Sin descripción."}
                  </div>
                </div>

                <div>
                  <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    estado del acceso
                  </div>
                  <div className="mt-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                    Tu acceso al proyecto está habilitado porque aceptaste el NDA correspondiente.
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-xs font-bold text-slate-400">Inicio</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {project.start_date
                      ? new Date(project.start_date).toLocaleDateString()
                      : "No definido"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-xs font-bold text-slate-400">Entrega</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {project.due_date
                      ? new Date(project.due_date).toLocaleDateString()
                      : "No definida"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-xs font-bold text-slate-400">Participación</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {accessLabel(access?.type)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 text-xs text-slate-500">
          En el siguiente paso conectaremos aquí negociación, cotizaciones y más secciones compartidas según permisos.
        </div>
      </div>
    </div>
  );
}