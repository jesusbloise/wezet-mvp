"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getDashboardSummary, type DashboardSummary } from "@/lib/api";

type TimeFilter = "all" | "week" | "month" | "quarter" | "year";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [baseCurrency, setBaseCurrency] = useState("CLP");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [barometerExpanded, setBarometerExpanded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    getDashboardSummary({
      currency: baseCurrency,
      time: timeFilter,
      project: projectFilter,
    })
      .then((data) => {
        if (!alive) return;
        setSummary(data);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || "Error cargando dashboard");
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [baseCurrency, timeFilter, projectFilter]);

  const userName = (user as any)?.name || "Creativo";
  const hasUserProfile = false;

  // DATA real
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

  // Barómetro (visual)
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
    if (totalScore >= 90) return { label: "Excelente", color: "#10b981", bg: "rgba(16,185,129,0.10)", emoji: "🏆" };
    if (totalScore >= 75) return { label: "Muy Bueno", color: "#3b82f6", bg: "rgba(59,130,246,0.10)", emoji: "⭐" };
    if (totalScore >= 60) return { label: "Bueno", color: "#f59e0b", bg: "rgba(245,158,11,0.10)", emoji: "👍" };
    if (totalScore >= 40) return { label: "En Progreso", color: "#f97316", bg: "rgba(249,115,22,0.10)", emoji: "📈" };
    return { label: "Atención", color: "#ef4444", bg: "rgba(239,68,68,0.10)", emoji: "⚠️" };
  }, [totalScore]);

  const gradients = {
    primary: "linear-gradient(135deg,#3b82f6,#0ea5e9)",
    dark: "linear-gradient(135deg,#74829a,#5f6f86)",
    dark2: "linear-gradient(135deg,#7a889f,#62748c)",
    dark3: "linear-gradient(135deg,#6f7f97,#5b6b82)",
    dark4: "linear-gradient(135deg,#7887a0,#64768f)",
  };

  return (
    <div className="min-h-[100vh] bg-[#eef3f7] text-slate-800">
      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-7">
        <div className="mx-auto max-w-[1180px]">
          {/* Header */}
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-[22px] sm:text-[26px] lg:text-[28px] font-black leading-tight">
                ¡Hola, {userName}! <span className="inline-block">👋</span>
              </h1>
              <p className="mt-1 text-sm text-slate-500">Tu centro de control de proyectos y acuerdos</p>
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
                className="w-full lg:w-auto rounded-[12px] px-4 py-[10px] text-sm font-bold text-white shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-60"
                style={{ background: gradients.primary }}
                disabled={loading}
              >
                + Nuevo Proyecto
              </button>
            </div>
          </div>

          {error ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {/* Banner perfil */}
          {!hasUserProfile && (
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="mb-6 flex w-full items-center gap-4 rounded-[14px] border border-amber-200/70 bg-gradient-to-br from-amber-100/60 to-orange-100/40 px-5 py-4 text-left"
            >
              <span className="text-[22px]">⚠️</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">Completa tu perfil</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Necesario para generar acuerdos y cotizaciones personalizadas
                </div>
              </div>
              <span className="hidden sm:inline text-[13px] font-semibold text-amber-700">Completar →</span>
              <span className="sm:hidden text-[13px] font-semibold text-amber-700">→</span>
            </button>
          )}

          {/* Barómetro */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setBarometerExpanded((v) => !v)}
              className="flex w-full items-center justify-between gap-4 px-5 sm:px-6 py-5 text-left hover:bg-slate-50"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${scoreStyle.color}, ${scoreStyle.color}cc)` }}
                >
                  📊
                </div>

                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-slate-900">Barómetro de Comportamiento</div>
                  <div className="text-[11px] text-slate-500">Tu índice de cumplimiento profesional</div>
                </div>

                <div className="hidden items-center md:flex">
                  <div className="mx-6 w-[260px] lg:w-[320px] overflow-hidden rounded-full bg-slate-200">
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
                    <div key={m.id} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-[12px]">
                      {m.icon}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-3 rounded-2xl border px-3 sm:px-4 py-3"
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

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  {barometerExpanded ? "▲" : "▼"}
                </div>
              </div>
            </button>

            {barometerExpanded && (
              <div className="border-t border-slate-200 px-5 sm:px-6 pb-6">
                <div className="mt-5 mb-4">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Progreso General</span>
                    <span className="font-bold" style={{ color: scoreStyle.color }}>
                      {totalScore}/100
                    </span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-slate-200">
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
                    <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                      <div className="text-[18px]">{m.icon}</div>
                      <div className="mt-1 text-[20px] font-extrabold">{m.score}%</div>
                      <div className="mt-1 text-[11px] font-semibold text-slate-500">{m.label}</div>
                      <div className="mt-2 h-1 overflow-hidden rounded bg-slate-200">
                        <div className="h-full rounded" style={{ width: `${m.score}%`, background: scoreStyle.color }} />
                      </div>
                      <div className="mt-1 text-[9px] text-slate-400">Peso: {m.weight}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon="📁"
              tag="Proyectos"
              tagClass="bg-blue-50 text-blue-600"
              value={projectsCount}
              subtitle={`${totalParticipants} talentos asociados`}
              onClick={() => router.push("/producer/projects")}
            />
            <StatCard
              icon="📝"
              tag="Acuerdos"
              tagClass="bg-emerald-50 text-emerald-600"
              value={agreementsTotal}
              chips={[
                { text: `${pendingAgreements} pendientes`, active: pendingAgreements > 0, activeClass: "bg-amber-100 text-amber-700" },
                { text: `${signedAgreements} firmados`, active: signedAgreements > 0, activeClass: "bg-emerald-100 text-emerald-700" },
              ]}
              onClick={() => router.push("/producer/negotiations")}
            />
            <StatCard
              icon="💰"
              tag="Cotizaciones"
              tagClass="bg-violet-50 text-violet-600"
              value={quotesTotal}
              subtitle={
                totalQuotesValue > 0
                  ? `≈ ${baseCurrency} ${currencySymbol}${Math.round(totalQuotesValue).toLocaleString()}`
                  : "Sin cotizaciones"
              }
              onClick={() => router.push("/producer/projects")}
            />
            <StatCard
              icon="🔒"
              tag="NDAs"
              tagClass="bg-pink-50 text-pink-600"
              value={ndasTotal}
              chips={[
                { text: `${pendingNdas} pendientes`, active: pendingNdas > 0, activeClass: "bg-amber-100 text-amber-700" },
                { text: `${signedNdas} firmados`, active: signedNdas > 0, activeClass: "bg-emerald-100 text-emerald-700" },
              ]}
            />
          </div>

          {/* Resumen Financiero */}
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-[18px] font-bold">💰 Resumen Financiero</h2>
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

          {/* Pagos */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 sm:px-6 py-5">
              <div className="flex items-center gap-2">
                <span className="text-[18px]">🎨</span>
                <h3 className="text-[15px] font-bold">Pagos a Talentos</h3>
              </div>
              <span className="text-[12px] text-slate-500">{(summary?.talentPayments?.length ?? 0)} pagos</span>
            </div>

            <div className="p-5 sm:p-7">
              {loading ? (
                <div className="text-sm text-slate-400">Cargando…</div>
              ) : (summary?.talentPayments?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-pink-100">
                    <span className="text-xl">🎨</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-600">Sin pagos a talentos registrados</div>
                  <div className="mt-1 text-xs text-slate-500">Los acuerdos con talentos aparecerán aquí</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {summary!.talentPayments.slice(0, 6).map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{p.talentName}</div>
                        <div className="text-xs text-slate-500">
                          {p.status}
                          {p.dueDate ? ` • Vence: ${new Date(p.dueDate).toLocaleDateString()}` : ""}
                        </div>
                      </div>
                      <div className="text-sm font-black text-slate-800">
                        {currencySymbol}
                        {Math.round(p.amount).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ✅ Navegación conectada */}
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <RecentDocsCard
              docs={summary?.recentDocs ?? []}
              loading={loading}
              onOpenDoc={(doc) => {
                if (doc.type === "quote") {
                  // Preferimos ir al listado de cotizaciones del proyecto
                  if (doc.projectId) router.push(`/producer/projects/${doc.projectId}/quotes`);
                  else router.push("/producer/projects");
                  return;
                }
                if (doc.type === "agreement") {
                  router.push(`/producer/negotiations/${doc.id}`);
                  return;
                }
                // nda: aún sin pantalla
              }}
            />

            <ProjectsCard
              projects={summary?.recentProjects ?? []}
              loading={loading}
              onCreate={() => router.push("/producer/projects/new")}
              onViewAll={() => router.push("/producer/projects")}
              onOpenProject={(id) => router.push(`/producer/projects/${id}`)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

/* UI */
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
      className="w-full lg:w-auto cursor-pointer rounded-[12px] border border-slate-200 bg-white px-4 py-[10px] text-[13px] text-slate-800 shadow-sm outline-none hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition",
        onClick ? "cursor-pointer hover:shadow-md" : "",
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

      <div className="text-[34px] font-black text-slate-900">{value}</div>

      {subtitle ? <div className="mt-2 text-[12px] text-slate-500">{subtitle}</div> : null}

      {chips?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c.text}
              className={[
                "rounded-lg bg-slate-100 px-3 py-1 text-[11px] text-slate-400",
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

/* Bottom cards */
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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 sm:px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="text-[16px]">📄</span>
          <h3 className="text-[15px] font-bold">Documentos Recientes</h3>
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
                  active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
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
            <div className="text-sm font-semibold text-slate-600">No hay documentos aún</div>
            <div className="mt-1 text-xs text-slate-500">Crea tu primer proyecto para comenzar</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.slice(0, 6).map((d) => {
              const clickable = d.type !== "nda"; // nda por ahora sin pantalla
              return (
                <button
                  key={`${d.type}-${d.id}`}
                  type="button"
                  onClick={() => clickable && onOpenDoc(d)}
                  disabled={!clickable}
                  className={[
                    "w-full text-left flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-xl border px-4 py-3 transition",
                    clickable
                      ? "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      : "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed",
                  ].join(" ")}
                  title={!clickable ? "Pantalla NDA pendiente" : undefined}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{d.title}</div>
                    <div className="text-xs text-slate-500">
                      {d.type.toUpperCase()} • {d.status} • {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{clickable ? "→" : "Pronto"}</span>
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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 sm:px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="text-[16px]">📁</span>
          <h3 className="text-[15px] font-bold">Proyectos</h3>
        </div>

        <button type="button" onClick={onViewAll} className="text-xs font-semibold text-blue-600 hover:underline">
          Ver todos →
        </button>
      </div>

      <div className="p-5 sm:p-7">
        {loading ? (
          <div className="text-sm text-slate-400">Cargando…</div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 text-4xl">📁</div>
            <div className="text-sm font-semibold text-slate-600">No hay proyectos</div>

            <button
              type="button"
              onClick={onCreate}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
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
                className="w-full text-left flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100 transition"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.status} • {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-500">→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// "use client";

// import { useAuth } from "@/context/AuthContext";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useEffect } from "react";

// export default function DashboardPage() {
//   const { user, loading, logout } = useAuth();
//   const router = useRouter();

//   useEffect(() => {
//     if (!loading && !user) router.push("/login");
//   }, [loading, user, router]);

//   if (loading) return <div className="p-6">Cargando...</div>;
//   if (!user) return null;

//   return (
//     <div className="p-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-xl font-bold">Dashboard</h1>
//           <p className="text-sm text-gray-600">{user.email} — {user.role}</p>
//         </div>
//         <button
//           onClick={async () => {
//             await logout();
//             router.push("/login");
//           }}
//           className="border rounded-lg px-3 py-2"
//         >
//           Salir
//         </button>
//       </div>

//       <div className="mt-6 flex gap-3">
//         <Link className="border rounded-lg px-3 py-2" href="/login">Login</Link>
//         <Link className="border rounded-lg px-3 py-2" href="/register">Register</Link>
//       </div>
//     </div>
//   );
// }