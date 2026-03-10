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

  // ✅ este tab ahora “controla” ProjectTabs (para que no se desincronicen)
  const [expandedTab, setExpandedTab] = useState<TabKey>("general");

  // ✅ opcional: scroll suave al panel expandido (look MVP)
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

  // ✅ reabrir el mismo proyecto al volver desde modal: /producer/projects?open=<id>&tab=quotes
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

    // scroll suave al abrir
    setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div className="w-full">
      <div className="min-h-[calc(100vh-56px)] rounded-3xl bg-[#f0f4f8] p-4 sm:p-6 md:p-7">
        <div className="mx-auto max-w-[1100px]">
          {/* Header MVP */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm">
                  <FolderIcon />
                </span>
                <h1 className="text-[22px] sm:text-[28px] font-black text-slate-900">📁 Mis Proyectos</h1>
              </div>
              <p className="mt-2 text-sm text-slate-500">Todo tu trabajo organizado en un solo lugar</p>
            </div>

            <Link
              href="/producer/projects/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-sm hover:opacity-95 active:opacity-90"
              style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
            >
              <span className="text-base leading-none">+</span>
              <span>Nuevo Proyecto</span>
            </Link>
          </div>

          {/* Search */}
          <div className="mb-5 flex flex-col gap-3">
            <div className="relative w-full">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar proyectos..."
                className="w-full rounded-2xl border border-slate-200 bg-[#f1f5f9] px-4 py-3 pl-10 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {err ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="text-5xl mb-3">📁</div>
              <div className="text-lg font-bold text-slate-900">
                {search ? "No se encontraron proyectos" : "No tienes proyectos aún"}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {search ? "Prueba con otro término de búsqueda" : "Crea tu primer proyecto para comenzar"}
              </div>
              {!search ? (
                <Link
                  href="/producer/projects/new"
                  className="mt-6 inline-flex rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-sm"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
                >
                  + Crear mi primer proyecto
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((p) => {
                const isExpanded = expandedId === p.id;
                const created = p.created_at ? new Date(p.created_at).toLocaleDateString() : "—";

                return (
                  <div
                    key={p.id}
                    className={[
                      "rounded-2xl border overflow-hidden shadow-sm",
                      isExpanded ? "border-blue-300 bg-white" : "border-slate-200 bg-white/80",
                    ].join(" ")}
                  >
                    {/* Header del proyecto */}
                    <button
                      type="button"
                      onClick={() => openProject(p.id, "general")}
                      className={[
                        "w-full px-5 py-5 text-left flex items-center justify-between gap-4",
                        isExpanded ? "bg-white" : "bg-white/80 hover:bg-white",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-xl shrink-0"
                          style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
                        >
                          📁
                        </div>

                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-extrabold text-slate-900 truncate">{p.title}</div>
                          <div className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-600">jesus</span>
                            <span className="text-slate-300">•</span>
                            <span>{created}</span>
                            <span className="text-slate-300">•</span>
                            <span>{p.currency || "CLP"}</span>
                          </div>
                        </div>
                      </div>

                      <span className={["transition", isExpanded ? "rotate-180" : ""].join(" ")}>
                        <ChevronDown />
                      </span>
                    </button>

                    {/* Expanded */}
                    {isExpanded ? (
                      <div className="px-5 pb-5" ref={panelRef}>
                        <div className="mt-4">
                          <ProjectTabs
                            projectId={p.id}
                            mode="inline"
                            showHeader={false}
                            // ✅ CONTROLADO: esto arregla que “no se veía” lo que hacíamos
                            tab={expandedTab}
                            onTabChange={setExpandedTab}
                            // initialTab ya no es necesario si es controlado, pero lo dejamos safe:
                            initialTab={expandedTab}
                          />
                        </div>

                        {/* Acciones rápidas tipo MVP (sin “brinco”) */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedTab("quotes")}
                            className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
                            style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}
                          >
                            Cotizaciones
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedTab("talents")}
                            className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
                            style={{ background: "linear-gradient(135deg,#3b82f6,#60a5fa)" }}
                          >
                            Talentos
                          </button>

                          <Link
                            href={`/producer/projects/${p.id}?tab=general`}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
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
