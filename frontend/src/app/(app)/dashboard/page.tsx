"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, getDashboardSummary, type DashboardSummary } from "@/lib/api";

type TimeFilter = "all" | "week" | "month" | "quarter" | "year";

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

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const isProducer = useMemo(() => {
    return user?.role === "producer_owner" || user?.role === "producer";
  }, [user?.role]);

  const [baseCurrency, setBaseCurrency] = useState("CLP");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [barometerExpanded, setBarometerExpanded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [sharedProjects, setSharedProjects] = useState<SharedProject[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    if (!user) {
      setLoading(false);
      return;
    }

    if (isProducer) {
      getDashboardSummary({
        currency: baseCurrency,
        time: timeFilter,
        project: projectFilter,
      })
        .then((data) => {
          if (!alive) return;
          setSummary(data);
          setSharedProjects([]);
          setLoading(false);
        })
        .catch((e) => {
          if (!alive) return;
          setError(e?.message || "Error cargando dashboard");
          setLoading(false);
        });
    } else {
      api<{ ok: true; projects: SharedProject[] }>("/projects/shared")
        .then((data) => {
          if (!alive) return;
          setSharedProjects(data.projects || []);
          setSummary(null);
          setLoading(false);
        })
        .catch((e) => {
          if (!alive) return;
          setError(e?.message || "Error cargando proyectos compartidos");
          setLoading(false);
        });
    }

    return () => {
      alive = false;
    };
  }, [user, isProducer, baseCurrency, timeFilter, projectFilter]);

  const userName =
    (user as any)?.name ||
    (user?.email ? user.email.split("@")[0] : "Usuario");

  const hasUserProfile = false;

  const projectsCount = summary?.counts.projects ?? 0;
  const totalParticipants = summary?.counts.talentsAssociated ?? 0;

  const agreementsTotal = summary?.counts.agreementsTotal ?? 0;
  const pendingAgreements = summary?.counts.agreementsPending ?? 0;
  const signedAgreements = summary?.counts.agreementsSigned ?? 0;

  const quotesTotal = summary?.counts.quotesTotal ?? 0;
  const totalQuotesValue = summary?.finance.quoted ?? 0;

  const ndasTotal = summary?.counts.ndasTotal ?? 0;
  const pendingNdas = summary?.counts.ndasPending ?? 0;
  const signedNdas = summary?.counts.ndasSigned ?? 0;

  const quotesInProgressCount = summary?.finance.quotesInProgressCount ?? 0;
  const quotesCompletedCount = summary?.finance.quotesCompletedCount ?? 0;
  const quotesPaidCount = summary?.finance.quotesPaidCount ?? 0;

  const totalQuotesInProgress = summary?.finance.inExecution ?? 0;
  const totalQuotesToCollect = summary?.finance.toCollect ?? 0;
  const totalQuotesCollected = summary?.finance.collected ?? 0;

  const currencySymbol = useMemo(() => {
    if (baseCurrency === "EUR") return "€";
    return "$";
  }, [baseCurrency]);

  const metricsData = useMemo(
    () => [
      { id: "profile", label: "Perfil", icon: "👤", score: hasUserProfile ? 85 : 25, weight: "Alta" },
      { id: "speed", label: "Velocidad", icon: "⚡", score: 60, weight: "Media" },
      { id: "payments", label: "Pagos", icon: "💳", score: 70, weight: "Alta" },
      { id: "docs", label: "Docs", icon: "📄", score: 55, weight: "Media" },
      { id: "rep", label: "Reputación", icon: "⭐", score: 75, weight: "Alta" },
    ],
    [hasUserProfile]
  );

  const totalScore = useMemo(() => {
    const avg = Math.round(metricsData.reduce((s, m) => s + m.score, 0) / metricsData.length);
    return Math.max(0, Math.min(100, avg));
  }, [metricsData]);

  const scoreStyle = useMemo(() => {
    if (totalScore >= 90) {
      return { label: "Excelente", color: "#10b981", bg: "rgba(16,185,129,0.10)", emoji: "🏆" };
    }
    if (totalScore >= 75) {
      return { label: "Muy Bueno", color: "#f2c94c", bg: "rgba(242,201,76,0.12)", emoji: "⭐" };
    }
    if (totalScore >= 60) {
      return { label: "Bueno", color: "#f59e0b", bg: "rgba(245,158,11,0.10)", emoji: "👍" };
    }
    if (totalScore >= 40) {
      return { label: "En Progreso", color: "#f97316", bg: "rgba(249,115,22,0.10)", emoji: "📈" };
    }
    return { label: "Atención", color: "#ef4444", bg: "rgba(239,68,68,0.10)", emoji: "⚠️" };
  }, [totalScore]);

  const gradients = {
    primary: "linear-gradient(135deg,#f2c94c,#d4a72c)",
    dark: "linear-gradient(135deg,#151c29,#1e293b)",
    dark2: "linear-gradient(135deg,#121926,#202a3a)",
    dark3: "linear-gradient(135deg,#161f2d,#233041)",
    dark4: "linear-gradient(135deg,#111827,#1f2937)",
  };

  const sharedAccepted = sharedProjects.filter((p) => p.nda_status === "accepted").length;
  const sharedPending = sharedProjects.filter((p) => p.nda_status === "pending").length;
  const sharedRejected = sharedProjects.filter((p) => p.nda_status === "rejected").length;

  if (!isProducer) {
    return (
      <div className="min-h-[100vh] bg-[#070b14] text-white">
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  overview
                </div>
                <h1 className="text-[22px] font-black leading-tight text-white sm:text-[26px] lg:text-[28px]">
                  ¡Hola, {userName}! <span className="inline-block">👋</span>
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Tu espacio de colaboración en proyectos compartidos
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => router.push("/projects")}
                  className="rounded-[14px] px-4 py-[11px] text-sm font-bold text-[#0b0f17] shadow-sm hover:opacity-95 active:opacity-90"
                  style={{ background: gradients.primary }}
                >
                  Ver proyectos
                </button>
                <button
                  onClick={() => router.push("/profile")}
                  className="rounded-[14px] border border-white/8 bg-[#0d1320] px-4 py-[11px] text-sm font-bold text-slate-200 hover:bg-white/[0.03]"
                >
                  Mi perfil
                </button>
              </div>
            </div>

            {error ? (
              <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            {!hasUserProfile && (
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="mb-6 flex w-full items-center gap-4 rounded-[16px] border border-[#f2c94c]/20 bg-[#f2c94c]/10 px-5 py-4 text-left"
              >
                <span className="text-[22px]">⚠️</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white">Completa tu perfil</div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    Esto te ayudará a participar mejor en proyectos, acuerdos y cotizaciones.
                  </div>
                </div>
                <span className="hidden text-[13px] font-semibold text-[#f2c94c] sm:inline">Completar →</span>
                <span className="text-[13px] font-semibold text-[#f2c94c] sm:hidden">→</span>
              </button>
            )}

            <div className="mb-6 overflow-hidden rounded-2xl border border-white/8 bg-[#0d1320] shadow-sm">
              <button
                type="button"
                onClick={() => setBarometerExpanded((v) => !v)}
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left hover:bg-white/[0.02] sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${scoreStyle.color}, ${scoreStyle.color}cc)` }}
                  >
                    📊
                  </div>

                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-white">Barómetro de Comportamiento</div>
                    <div className="text-[11px] text-slate-400">Tu índice de cumplimiento profesional</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center gap-3 rounded-2xl border px-3 py-3 sm:px-4"
                    style={{ background: scoreStyle.bg, borderColor: `${scoreStyle.color}30` }}
                  >
                    <span className="text-[18px]">{scoreStyle.emoji}</span>
                    <div className="leading-none">
                      <div className="text-[22px] font-black" style={{ color: scoreStyle.color }}>
                        {totalScore}
                      </div>
                      <div className="text-[10px] font-semibold" style={{ color: scoreStyle.color }}>
                        {scoreStyle.label}
                      </div>
                    </div>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400">
                    {barometerExpanded ? "▲" : "▼"}
                  </div>
                </div>
              </button>

              {barometerExpanded && (
                <div className="border-t border-white/8 px-5 pb-6 sm:px-6">
                  <div className="mb-4 mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-400">Progreso General</span>
                      <span className="font-bold" style={{ color: scoreStyle.color }}>
                        {totalScore}/100
                      </span>
                    </div>
                    <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${totalScore}%`,
                          background: `linear-gradient(90deg, ${scoreStyle.color}, ${scoreStyle.color}dd)`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {metricsData.map((m) => (
                      <div key={m.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-center">
                        <div className="text-[18px]">{m.icon}</div>
                        <div className="mt-1 text-[20px] font-extrabold text-white">{m.score}%</div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-400">{m.label}</div>
                        <div className="mt-2 h-1 overflow-hidden rounded bg-white/10">
                          <div className="h-full rounded" style={{ width: `${m.score}%`, background: scoreStyle.color }} />
                        </div>
                        <div className="mt-1 text-[9px] text-slate-500">Peso: {m.weight}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon="📁"
                tag="Proyectos"
                tagClass="bg-[#f2c94c]/12 text-[#f2c94c]"
                value={sharedProjects.length}
                subtitle={`${sharedAccepted} con acceso habilitado`}
                onClick={() => router.push("/projects")}
              />
              <StatCard
                icon="🔒"
                tag="NDAs"
                tagClass="bg-pink-500/10 text-pink-300"
                value={sharedProjects.length}
                chips={[
                  {
                    text: `${sharedPending} pendientes`,
                    active: sharedPending > 0,
                    activeClass: "bg-amber-500/15 text-amber-300",
                  },
                  {
                    text: `${sharedAccepted} aceptados`,
                    active: sharedAccepted > 0,
                    activeClass: "bg-emerald-500/15 text-emerald-300",
                  },
                  {
                    text: `${sharedRejected} rechazados`,
                    active: sharedRejected > 0,
                    activeClass: "bg-rose-500/15 text-rose-300",
                  },
                ]}
                onClick={() => router.push("/projects")}
              />
              <StatCard
                icon="💼"
                tag="Participación"
                tagClass="bg-sky-500/10 text-sky-300"
                value={sharedProjects.filter((p) => p.access_type === "participant").length}
                subtitle="Proyectos donde ya estás asociado"
                onClick={() => router.push("/projects")}
              />
              <StatCard
                icon="👤"
                tag="Perfil"
                tagClass="bg-violet-500/10 text-violet-300"
                value={hasUserProfile ? 1 : 0}
                subtitle={hasUserProfile ? "Perfil completado" : "Perfil pendiente"}
                onClick={() => router.push("/profile")}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1320] shadow-sm">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-5 sm:px-6">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">📁</span>
                  <h3 className="text-[15px] font-bold text-white">Mis proyectos compartidos</h3>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/projects")}
                  className="text-xs font-semibold text-[#f2c94c] hover:underline"
                >
                  Ver todos →
                </button>
              </div>

              <div className="p-5 sm:p-7">
                {loading ? (
                  <div className="text-sm text-slate-400">Cargando…</div>
                ) : sharedProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-3 text-4xl">📁</div>
                    <div className="text-sm font-semibold text-slate-300">No tienes proyectos compartidos</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Cuando te inviten a un proyecto, aparecerá aquí.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sharedProjects.slice(0, 6).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => router.push("/projects")}
                        className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06]"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">{p.title}</div>
                            <div className="text-xs text-slate-500">
                              {p.access_type} • NDA: {p.nda_status}
                              {p.created_at ? ` • ${new Date(p.created_at).toLocaleDateString()}` : ""}
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-slate-500">→</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100vh] bg-[#070b14] text-white">
      <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
                overview
              </div>
              <h1 className="text-[22px] font-black leading-tight text-white sm:text-[26px] lg:text-[28px]">
                ¡Hola, {userName}! <span className="inline-block">👋</span>
              </h1>
              <p className="mt-1 text-sm text-slate-400">Tu centro de control de proyectos y acuerdos</p>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap lg:items-center">
              <SelectPill value={baseCurrency} onChange={(v) => setBaseCurrency(v)} disabled={loading}>
                <option value="CLP">CLP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </SelectPill>

              <SelectPill value={timeFilter} onChange={(v) => setTimeFilter(v as TimeFilter)} disabled={loading}>
                <option value="all">📅 Todo el tiempo</option>
                <option value="week">📆 Última semana</option>
                <option value="month">🗓️ Último mes</option>
                <option value="quarter">📊 Último trimestre</option>
                <option value="year">📈 Último año</option>
              </SelectPill>

              <SelectPill value={projectFilter} onChange={(v) => setProjectFilter(v)} disabled={loading}>
                <option value="all">📁 Todos los proyectos</option>
                {(summary?.recentProjects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectPill>

              <button
                onClick={() => router.push("/producer/projects/new")}
                className="w-full rounded-[14px] px-4 py-[11px] text-sm font-bold text-[#0b0f17] shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-60 lg:w-auto"
                style={{ background: gradients.primary }}
                disabled={loading}
              >
                + Nuevo Proyecto
              </button>
            </div>
          </div>

          {error ? (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {!hasUserProfile && (
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="mb-6 flex w-full items-center gap-4 rounded-[16px] border border-[#f2c94c]/20 bg-[#f2c94c]/10 px-5 py-4 text-left"
            >
              <span className="text-[22px]">⚠️</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">Completa tu perfil</div>
                <div className="mt-0.5 text-xs text-slate-400">
                  Necesario para generar acuerdos y cotizaciones personalizadas
                </div>
              </div>
              <span className="hidden text-[13px] font-semibold text-[#f2c94c] sm:inline">Completar →</span>
              <span className="text-[13px] font-semibold text-[#f2c94c] sm:hidden">→</span>
            </button>
          )}

          <div className="mb-6 overflow-hidden rounded-2xl border border-white/8 bg-[#0d1320] shadow-sm">
            <button
              type="button"
              onClick={() => setBarometerExpanded((v) => !v)}
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left hover:bg-white/[0.02] sm:px-6"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${scoreStyle.color}, ${scoreStyle.color}cc)` }}
                >
                  📊
                </div>

                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-white">Barómetro de Comportamiento</div>
                  <div className="text-[11px] text-slate-400">Tu índice de cumplimiento profesional</div>
                </div>

                <div className="hidden items-center md:flex">
                  <div className="mx-6 w-[260px] overflow-hidden rounded-full bg-white/10 lg:w-[320px]">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${totalScore}%`,
                        background: `linear-gradient(90deg, ${scoreStyle.color}, ${scoreStyle.color}dd)`,
                      }}
                    />
                  </div>
                </div>

                <div className="hidden items-center gap-2 md:flex">
                  {metricsData.map((m) => (
                    <div key={m.id} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-[12px]">
                      {m.icon}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-3 rounded-2xl border px-3 py-3 sm:px-4"
                  style={{ background: scoreStyle.bg, borderColor: `${scoreStyle.color}30` }}
                >
                  <span className="text-[18px]">{scoreStyle.emoji}</span>
                  <div className="leading-none">
                    <div className="text-[22px] font-black" style={{ color: scoreStyle.color }}>
                      {totalScore}
                    </div>
                    <div className="text-[10px] font-semibold" style={{ color: scoreStyle.color }}>
                      {scoreStyle.label}
                    </div>
                  </div>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400">
                  {barometerExpanded ? "▲" : "▼"}
                </div>
              </div>
            </button>

            {barometerExpanded && (
              <div className="border-t border-white/8 px-5 pb-6 sm:px-6">
                <div className="mb-4 mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-400">Progreso General</span>
                    <span className="font-bold" style={{ color: scoreStyle.color }}>
                      {totalScore}/100
                    </span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${totalScore}%`,
                        background: `linear-gradient(90deg, ${scoreStyle.color}, ${scoreStyle.color}dd)`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {metricsData.map((m) => (
                    <div key={m.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-center">
                      <div className="text-[18px]">{m.icon}</div>
                      <div className="mt-1 text-[20px] font-extrabold text-white">{m.score}%</div>
                      <div className="mt-1 text-[11px] font-semibold text-slate-400">{m.label}</div>
                      <div className="mt-2 h-1 overflow-hidden rounded bg-white/10">
                        <div className="h-full rounded" style={{ width: `${m.score}%`, background: scoreStyle.color }} />
                      </div>
                      <div className="mt-1 text-[9px] text-slate-500">Peso: {m.weight}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon="📁"
              tag="Proyectos"
              tagClass="bg-[#f2c94c]/12 text-[#f2c94c]"
              value={projectsCount}
              subtitle={`${totalParticipants} talentos asociados`}
              onClick={() => router.push("/projects")}
            />
            <StatCard
              icon="📝"
              tag="Acuerdos"
              tagClass="bg-emerald-500/10 text-emerald-300"
              value={agreementsTotal}
              chips={[
                { text: `${pendingAgreements} pendientes`, active: pendingAgreements > 0, activeClass: "bg-amber-500/15 text-amber-300" },
                { text: `${signedAgreements} firmados`, active: signedAgreements > 0, activeClass: "bg-emerald-500/15 text-emerald-300" },
              ]}
              onClick={() => router.push("/producer/negotiations")}
            />
            <StatCard
              icon="💰"
              tag="Cotizaciones"
              tagClass="bg-violet-500/10 text-violet-300"
              value={quotesTotal}
              subtitle={
                totalQuotesValue > 0
                  ? `≈ ${baseCurrency} ${currencySymbol}${Math.round(totalQuotesValue).toLocaleString()}`
                  : "Sin cotizaciones"
              }
              onClick={() => router.push("/projects")}
            />
            <StatCard
              icon="🔒"
              tag="NDAs"
              tagClass="bg-pink-500/10 text-pink-300"
              value={ndasTotal}
              chips={[
                { text: `${pendingNdas} pendientes`, active: pendingNdas > 0, activeClass: "bg-amber-500/15 text-amber-300" },
                { text: `${signedNdas} firmados`, active: signedNdas > 0, activeClass: "bg-emerald-500/15 text-emerald-300" },
              ]}
            />
          </div>

          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-[18px] font-bold text-white">💰 Resumen Financiero</h2>
            <div className="text-[12px] text-slate-500">{quotesTotal} cotizaciones en el período</div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FinanceCard
              title="📊 Cotizado"
              value={`${currencySymbol}${Math.round(totalQuotesValue).toLocaleString()}`}
              subtitle={`${quotesTotal} cotizaciones totales`}
              bg={gradients.dark}
            />
            <FinanceCard
              title="⚡ En Ejecución"
              value={`${currencySymbol}${Math.round(totalQuotesInProgress).toLocaleString()}`}
              subtitle={`${quotesInProgressCount} proyectos activos`}
              bg={gradients.dark2}
            />
            <FinanceCard
              title="⏳ Por Cobrar"
              value={`${currencySymbol}${Math.round(totalQuotesToCollect).toLocaleString()}`}
              subtitle={`${quotesCompletedCount} proyectos terminados`}
              bg={gradients.dark3}
            />
            <FinanceCard
              title="💵 Cobrado"
              value={`${currencySymbol}${Math.round(totalQuotesCollected).toLocaleString()}`}
              subtitle={`${quotesPaidCount} cotizaciones cobradas`}
              bg={gradients.dark4}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1320] shadow-sm">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-2">
                <span className="text-[18px]">🎨</span>
                <h3 className="text-[15px] font-bold text-white">Pagos a Talentos</h3>
              </div>
              <span className="text-[12px] text-slate-500">{summary?.talentPayments?.length ?? 0} pagos</span>
            </div>

            <div className="p-5 sm:p-7">
              {loading ? (
                <div className="text-sm text-slate-400">Cargando…</div>
              ) : (summary?.talentPayments?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/10">
                    <span className="text-xl">🎨</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-300">Sin pagos a talentos registrados</div>
                  <div className="mt-1 text-xs text-slate-500">Los acuerdos con talentos aparecerán aquí</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {summary!.talentPayments.slice(0, 6).map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{p.talentName}</div>
                        <div className="text-xs text-slate-500">
                          {p.status}
                          {p.dueDate ? ` • Vence: ${new Date(p.dueDate).toLocaleDateString()}` : ""}
                        </div>
                      </div>
                      <div className="text-sm font-black text-[#f2c94c]">
                        {currencySymbol}
                        {Math.round(p.amount).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <RecentDocsCard
              docs={summary?.recentDocs ?? []}
              loading={loading}
              onOpenDoc={(doc) => {
                if (doc.type === "quote") {
                  if (doc.projectId) router.push(`/producer/projects/${doc.projectId}/quotes`);
                  else router.push("/projects");
                  return;
                }
                if (doc.type === "agreement") {
                  router.push(`/producer/negotiations/${doc.id}`);
                  return;
                }
              }}
            />

            <ProjectsCard
              projects={summary?.recentProjects ?? []}
              loading={loading}
              onCreate={() => router.push("/producer/projects/new")}
              onViewAll={() => router.push("/projects")}
              onOpenProject={(id) => router.push(`/producer/projects/${id}`)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function SelectPill({
  value,
  onChange,
  children,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full cursor-pointer rounded-[14px] border border-white/8 bg-[#0d1320] px-4 py-[11px] text-[13px] text-slate-200 shadow-sm outline-none hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
    >
      {children}
    </select>
  );
}

function StatCard({
  icon,
  tag,
  tagClass,
  value,
  subtitle,
  chips,
  onClick,
}: {
  icon: string;
  tag: string;
  tagClass: string;
  value: number;
  subtitle?: string;
  chips?: { text: string; active: boolean; activeClass: string }[];
  onClick?: () => void;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-white/8 bg-[#0d1320] p-6 shadow-sm transition",
        onClick ? "cursor-pointer hover:bg-white/[0.02] hover:shadow-md" : "",
      ].join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[26px]">{icon}</span>
        <span className={["rounded-lg px-3 py-1 text-[11px] font-semibold", tagClass].join(" ")}>
          {tag}
        </span>
      </div>

      <div className="text-[34px] font-black text-white">{value}</div>

      {subtitle ? <div className="mt-2 text-[12px] text-slate-400">{subtitle}</div> : null}

      {chips?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c.text}
              className={[
                "rounded-lg bg-white/5 px-3 py-1 text-[11px] text-slate-500",
                c.active ? c.activeClass : "",
              ].join(" ")}
            >
              {c.text}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FinanceCard({
  title,
  value,
  subtitle,
  bg,
}: {
  title: string;
  value: string;
  subtitle: string;
  bg: string;
}) {
  return (
    <div className="rounded-2xl p-6 text-white shadow-sm" style={{ background: bg }}>
      <div className="text-[13px] font-semibold opacity-95">{title}</div>
      <div className="mt-3 text-[28px] font-black">{value}</div>
      <div className="mt-2 text-[12px] opacity-90">{subtitle}</div>
    </div>
  );
}

function RecentDocsCard({
  docs,
  loading,
  onOpenDoc,
}: {
  docs: DashboardSummary["recentDocs"];
  loading: boolean;
  onOpenDoc: (doc: DashboardSummary["recentDocs"][number]) => void;
}) {
  const [tab, setTab] = useState<"all" | "quotes" | "agreements" | "ndas">("all");

  const tabs = [
    { id: "all", label: "Todos", icon: "📄" },
    { id: "quotes", label: "Cotizaciones", icon: "💰" },
    { id: "agreements", label: "Acuerdos", icon: "📝" },
    { id: "ndas", label: "NDAs", icon: "🔒" },
  ] as const;

  const filtered = useMemo(() => {
    if (tab === "all") return docs;
    if (tab === "quotes") return docs.filter((d) => d.type === "quote");
    if (tab === "ndas") return docs.filter((d) => d.type === "nda");
    return docs.filter((d) => d.type === "agreement");
  }, [docs, tab]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1320] shadow-sm">
      <div className="border-b border-white/8 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="text-[16px]">📄</span>
          <h3 className="text-[15px] font-bold text-white">Documentos Recientes</h3>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  "rounded-lg px-3 py-2 text-xs font-semibold transition",
                  active ? "bg-[#f2c94c] text-[#0b0f17]" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {loading ? (
          <div className="text-sm text-slate-400">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 text-3xl">📬</div>
            <div className="text-sm font-semibold text-slate-300">No hay documentos aún</div>
            <div className="mt-1 text-xs text-slate-500">Crea tu primer proyecto para comenzar</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.slice(0, 6).map((d) => {
              const clickable = d.type !== "nda";
              return (
                <button
                  key={`${d.type}-${d.id}`}
                  type="button"
                  onClick={() => clickable && onOpenDoc(d)}
                  disabled={!clickable}
                  className={[
                    "w-full rounded-xl border px-4 py-3 text-left transition",
                    clickable
                      ? "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                      : "cursor-not-allowed border-white/8 bg-white/[0.03] opacity-60",
                  ].join(" ")}
                  title={!clickable ? "Pantalla NDA pendiente" : undefined}
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{d.title}</div>
                      <div className="text-xs text-slate-500">
                        {d.type.toUpperCase()} • {d.status} • {new Date(d.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{clickable ? "→" : "Pronto"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectsCard({
  projects,
  loading,
  onCreate,
  onViewAll,
  onOpenProject,
}: {
  projects: DashboardSummary["recentProjects"];
  loading: boolean;
  onCreate: () => void;
  onViewAll: () => void;
  onOpenProject: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1320] shadow-sm">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="text-[16px]">📁</span>
          <h3 className="text-[15px] font-bold text-white">Proyectos</h3>
        </div>

        <button type="button" onClick={onViewAll} className="text-xs font-semibold text-[#f2c94c] hover:underline">
          Ver todos →
        </button>
      </div>

      <div className="p-5 sm:p-7">
        {loading ? (
          <div className="text-sm text-slate-400">Cargando…</div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 text-4xl">📁</div>
            <div className="text-sm font-semibold text-slate-300">No hay proyectos</div>

            <button
              type="button"
              onClick={onCreate}
              className="mt-4 rounded-xl bg-[#f2c94c] px-4 py-2 text-sm font-bold text-[#0b0f17] hover:opacity-95"
            >
              + Crear Proyecto
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.slice(0, 6).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenProject(p.id)}
                className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06]"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      {p.status} • {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}