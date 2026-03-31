

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import ProjectTabs from "@/components/projects/ProjectTabs";

type Project = {
  id: string;
  title: string;
  status: string | null;
  currency?: string | null;
  created_at?: string | null;
};

type TabKey = "general" | "quotes" | "talents" | "ndas";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M21 21l-4.3-4.3" />
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

export default function ProducerProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<TabKey>("general");

  const panelRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api<{ ok: true; projects: Project[] }>("/projects");
      setProjects(r.projects || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const open = sp.get("open");
    const tab = sp.get("tab");

    if (open) setExpandedId(open);
    if (tab === "general" || tab === "quotes" || tab === "talents" || tab === "ndas") {
      setExpandedTab(tab);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => (p.title || "").toLowerCase().includes(q));
  }, [projects, search]);

  const openProject = (id: string, nextTab: TabKey = "general") => {
    setExpandedId((cur) => (cur === id ? null : id));
    setExpandedTab(nextTab);

    setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div className="w-full">
      <div className="min-h-[calc(100vh-56px)] rounded-3xl bg-[#070b14] p-4 sm:p-6 md:p-7">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
                my workspace
              </div>

              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[#f2c94c] shadow-sm">
                  <FolderIcon />
                </span>
                <h1 className="text-[22px] font-black text-white sm:text-[28px]">
                  Mis Proyectos
                </h1>
              </div>

              <p className="mt-2 text-sm text-slate-400">
                Aquí gestionas los proyectos que has creado dentro de WEZET.
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

          <div className="mb-5 flex flex-col gap-3">
            <div className="relative w-full">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar proyectos..."
                className="w-full rounded-2xl border border-white/8 bg-[#0d1320] px-4 py-3 pl-10 text-sm text-slate-200 outline-none transition focus:border-[#f2c94c]/30 focus:ring-2 focus:ring-[#f2c94c]/10"
              />
            </div>
          </div>

          {err ? (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {err}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-white/8 bg-[#0d1320] p-6 text-sm text-slate-400 shadow-sm">
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-white/8 bg-[#0d1320] p-10 text-center shadow-sm">
              <div className="mb-3 text-5xl">📁</div>
              <div className="text-lg font-bold text-white">
                {search ? "No se encontraron proyectos" : "No tienes proyectos aún"}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {search ? "Prueba con otro término de búsqueda" : "Crea tu primer proyecto para comenzar"}
              </div>
              {!search ? (
                <Link
                  href="/producer/projects/new"
                  className="mt-6 inline-flex rounded-2xl px-6 py-3 text-sm font-bold text-[#0b0f17] shadow-sm"
                  style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                >
                  + Crear mi primer proyecto
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((p) => {
                const isExpanded = expandedId === p.id;
                const created = p.created_at ? new Date(p.created_at).toLocaleDateString() : "—";

                return (
                  <div
                    key={p.id}
                    className={[
                      "overflow-hidden rounded-2xl border shadow-sm transition-all",
                      isExpanded
                        ? "border-[#f2c94c]/30 bg-[#0d1320]"
                        : "border-white/8 bg-[#0d1320] hover:border-white/12 hover:bg-[#101827]",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => openProject(p.id, "general")}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl text-[#0b0f17]"
                          style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                        >
                          📁
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-base font-extrabold text-white sm:text-lg">
                            {p.title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{created}</span>
                            <span className="text-slate-700">•</span>
                            <span>{p.currency || "CLP"}</span>
                            {p.status ? (
                              <>
                                <span className="text-slate-700">•</span>
                                <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-slate-400">
                                  {p.status}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <span
                        className={[
                          "rounded-xl bg-white/[0.04] p-2 text-slate-400 transition",
                          isExpanded ? "rotate-180" : "",
                        ].join(" ")}
                      >
                        <ChevronDown />
                      </span>
                    </button>

                    {isExpanded ? (
                      <div className="border-t border-white/8 px-5 pb-5" ref={panelRef}>
                        <div className="mt-4">
                          <ProjectTabs
                            projectId={p.id}
                            mode="inline"
                            showHeader={false}
                            tab={expandedTab}
                            onTabChange={setExpandedTab}
                            initialTab={expandedTab}
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedTab("quotes")}
                            className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
                            style={{ background: "linear-gradient(135deg,#10b981,#34d399)" }}
                          >
                            Cotizaciones
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedTab("talents")}
                            className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
                            style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                          >
                            Talentos
                          </button>

                          <Link
                            href={`/producer/projects/${p.id}?tab=general`}
                            className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/[0.06]"
                          >
                            Abrir en página
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

