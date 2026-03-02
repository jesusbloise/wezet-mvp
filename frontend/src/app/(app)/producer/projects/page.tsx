"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  title: string;
  status: string;
  currency: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CL", { year: "numeric", month: "short", day: "2-digit" }).format(d);
}

function StatusPill({ status }: { status: string }) {
  const label = status || "draft";
  const pretty =
    label === "in_negotiation"
      ? "En negociación"
      : label === "shared"
      ? "Compartido"
      : label === "quoted"
      ? "Cotizado"
      : label === "won"
      ? "Ganado"
      : label === "lost"
      ? "Perdido"
      : label === "archived"
      ? "Archivado"
      : "Borrador";

  const cls =
    label === "draft"
      ? "bg-slate-100 text-slate-700 border-slate-200"
      : label === "in_negotiation"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : label === "quoted"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : label === "won"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : label === "lost"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>{pretty}</span>;
}

const FILTERS = [
  { id: "all", label: "Todos", icon: "📋" },
  { id: "draft", label: "Borrador", icon: "📝" },
  { id: "in_negotiation", label: "Negociación", icon: "🤝" },
  { id: "quoted", label: "Cotizados", icon: "💸" },
];

export default function ProducerProjectsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const run = async () => {
      setError(null);
      setListLoading(true);
      try {
        const r = await api<{ ok: true; projects: Project[] }>("/projects");
        setProjects(r.projects);
      } catch (e: any) {
        setError(String(e.message || e));
      } finally {
        setListLoading(false);
      }
    };
    if (user) run();
  }, [user]);

  const summary = useMemo(() => {
    const total = projects.length;
    const draft = projects.filter((p) => p.status === "draft").length;
    const negotiation = projects.filter((p) => p.status === "in_negotiation").length;
    const quoted = projects.filter((p) => p.status === "quoted").length;
    return { total, draft, negotiation, quoted };
  }, [projects]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return projects
      .filter((p) => (filter === "all" ? true : p.status === filter))
      .filter((p) => (s ? p.title.toLowerCase().includes(s) : true));
  }, [projects, search, filter]);

  if (loading) return <div className="p-6">Cargando sesión...</div>;
  if (!user) return null;

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="max-w-[1000px]">
        {/* Header (como TSX) */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight mb-1">📁 Mis Proyectos</h1>
            <p className="text-slate-500 text-sm">Todo tu trabajo organizado en un solo lugar</p>
          </div>

          <Link
            href="/producer/projects/new"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-sky-500 hover:opacity-95"
          >
            <span className="text-lg leading-none">+</span> Nuevo Proyecto
          </Link>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input
              className="w-full rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-sm outline-none px-10 py-3"
              placeholder="Buscar proyectos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl flex-wrap">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={[
                    "px-3 py-2 rounded-lg text-sm flex items-center gap-2",
                    active ? "bg-white border border-slate-200 font-semibold" : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <span>{f.icon}</span>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Total</div>
            <div className="text-2xl font-extrabold">{summary.total}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Borrador</div>
            <div className="text-2xl font-extrabold">{summary.draft}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Negociación</div>
            <div className="text-2xl font-extrabold">{summary.negotiation}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Cotizados</div>
            <div className="text-2xl font-extrabold">{summary.quoted}</div>
          </div>
        </div>

        {error && <div className="text-rose-600 text-sm mb-4">{error}</div>}
        {listLoading && <div className="text-sm text-slate-600">Cargando proyectos...</div>}

        {/* Cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-extrabold truncate">{p.title}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusPill status={p.status} />
                    {p.currency ? <span className="text-xs text-slate-500">{p.currency}</span> : null}
                  </div>
                </div>

                <Link className="text-sm font-semibold underline text-slate-900" href={`/producer/projects/${p.id}`}>
                  Ver
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Inicio</div>
                  <div className="text-slate-800">{formatDate(p.start_date)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Entrega</div>
                  <div className="text-slate-800">{formatDate(p.due_date)}</div>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-400">Creado: {formatDate(p.created_at)}</div>
            </div>
          ))}

          {!listLoading && filtered.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="font-bold">Sin resultados</div>
              <div className="text-sm text-slate-500 mt-1">Prueba otro filtro o cambia la búsqueda.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}