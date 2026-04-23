"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import TalentsPanel from "@/components/projects/TalentsPanel";
import AgreementFlowModal from "@/components/projects/AgreementFlowModal";
import NdasPanel from "@/components/projects/NdasPanel";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

type Project = {
  id: string;
  title: string;
  brief: string | null;
  status: string | null;
  currency: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  has_commercial_dimension?: boolean;
  has_team_dimension?: boolean;
  client_name?: string | null;
  client_email?: string | null;
  client_company?: string | null;
};

type TabKey = "general" | "quotes" | "talents" | "ndas" | "agreement";

type QuoteRow = {
  id: string;
  status: string;
  client_name: string | null;
  client_email: string | null;
  currency: string;
  total_amount: string | number;
  valid_until: string | null;
  public_id: string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
  attachment_mime_type?: string | null;
  created_at: string;
};

type CreativeRow = {
  creative_user_id: string;
  status: string;
  created_at: string;
  email: string;
  display_name: string | null;
  negotiation_id: string | null;
};

type AgreementSummary = {
  id: string;
  negotiation_id: string;
  project_id: string;
  participant_name: string | null;
  participant_email: string | null;
  role: string | null;
  amount_total: string | number | null;
  currency: string | null;
  payment_structure: string | null;
  status: string;
  updated_at: string;
};

type StatusKey =
  | "created"
  | "pending"
  | "sent"
  | "approved"
  | "in_progress"
  | "completed"
  | "paid"
  | "rejected";

type UpdateProjectPayload = {
  title?: string;
  brief?: string;
  currency?: string;
  start_date?: string;
  due_date?: string;
  has_commercial_dimension?: boolean;
  has_team_dimension?: boolean;
  client_name?: string;
  client_email?: string;
  client_company?: string;
};

type FlowState = "done" | "current" | "upcoming";

type FlowStep = {
  key: string;
  label: string;
  state: FlowState;
  hint: string;
};

type ContextBanner = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaTab: TabKey;
};

function normalizeStatus(s?: string | null): StatusKey {
  if (!s) return "created";
  const v = String(s).toLowerCase();
  if (v === "open") return "pending";
  if (v === "draft") return "created";
  if (
    v === "created" ||
    v === "pending" ||
    v === "sent" ||
    v === "approved" ||
    v === "in_progress" ||
    v === "completed" ||
    v === "paid" ||
    v === "rejected"
  ) {
    return v;
  }
  return "created";
}

function statusPill(status: StatusKey) {
  const base =
    "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold";
  switch (status) {
    case "created":
      return { cls: `${base} bg-violet-500/12 text-violet-200`, label: "Creado" };
    case "pending":
      return { cls: `${base} bg-amber-500/12 text-amber-200`, label: "Pendiente" };
    case "sent":
      return { cls: `${base} bg-indigo-500/12 text-indigo-200`, label: "Enviado" };
    case "approved":
      return { cls: `${base} bg-sky-500/12 text-sky-200`, label: "Aprobado" };
    case "in_progress":
      return {
        cls: `${base} bg-blue-500/12 text-blue-200`,
        label: "En ejecución",
      };
    case "completed":
      return {
        cls: `${base} bg-emerald-500/12 text-emerald-200`,
        label: "Terminado",
      };
    case "paid":
      return { cls: `${base} bg-teal-500/12 text-teal-200`, label: "Cobrado" };
    case "rejected":
      return { cls: `${base} bg-rose-500/12 text-rose-200`, label: "Rechazado" };
    default:
      return { cls: `${base} bg-white/8 text-slate-200`, label: "Creado" };
  }
}

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

function PaperclipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M21.44 11.05l-8.49 8.49a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 1 1 5.66 5.65l-9.19 9.2a2 2 0 1 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function ownerProjectHref(projectId: string, tab?: TabKey) {
  return tab
    ? `/producer/projects/${projectId}?tab=${tab}`
    : `/producer/projects/${projectId}`;
}

function newQuoteHref(projectId: string, returnTo: string) {
  return `/producer/projects/${projectId}/quotes/new?returnTo=${returnTo}`;
}

function quoteDetailHref(quoteId: string) {
  return `/producer/quotes/${quoteId}`;
}

function hasClientDefined(project?: Project | null) {
  if (!project) return false;
  return !!(
    project.client_name?.trim() ||
    project.client_email?.trim() ||
    project.client_company?.trim()
  );
}

function buildProjectFlow(params: {
  talentsCount: number;
  quotesCount: number;
  ndasCount: number;
  hasCommercial: boolean;
  hasTeam: boolean;
  clientDefined: boolean;
}): FlowStep[] {
  const { talentsCount, quotesCount, ndasCount, hasCommercial, hasTeam, clientDefined } =
    params;

  const hasTalents = talentsCount > 0;
  const hasQuotes = quotesCount > 0;
  const hasNdas = ndasCount > 0;

  if (!hasCommercial && !hasTeam) {
    return [
      { key: "created", label: "Creado", state: "current", hint: "Proyecto listo para iniciar" },
      { key: "participants", label: "Participantes", state: "upcoming", hint: "Aún no activado" },
      { key: "client", label: "Cliente", state: "upcoming", hint: "Aún no activado" },
      { key: "quote", label: "Cotización", state: "upcoming", hint: "Pendiente" },
      { key: "agreement", label: "Acuerdo", state: "upcoming", hint: "Pendiente" },
    ];
  }

  if (hasTeam && !hasCommercial) {
    return [
      { key: "created", label: "Creado", state: "done", hint: "Proyecto creado" },
      {
        key: "participants",
        label: "Participantes",
        state: hasTalents ? "done" : "current",
        hint: hasTalents ? `${talentsCount} participante${talentsCount === 1 ? "" : "s"}` : "Agrega participantes",
      },
      {
        key: "client",
        label: "Cliente",
        state: "upcoming",
        hint: "No aplica aún",
      },
      {
        key: "quote",
        label: "Cotización",
        state: "upcoming",
        hint: "Activa dimensión comercial para avanzar",
      },
      {
        key: "agreement",
        label: "Acuerdo",
        state: hasNdas ? "current" : "upcoming",
        hint: hasNdas ? "Hay NDAs para revisar" : "Pendiente",
      },
    ];
  }

  if (hasCommercial && !hasTeam) {
    return [
      { key: "created", label: "Creado", state: "done", hint: "Proyecto creado" },
      {
        key: "participants",
        label: "Participantes",
        state: "upcoming",
        hint: "Opcional en este flujo",
      },
      {
        key: "client",
        label: "Cliente",
        state: clientDefined ? "done" : "current",
        hint: clientDefined ? "Cliente definido" : "Define el cliente",
      },
      {
        key: "quote",
        label: "Cotización",
        state: !clientDefined ? "upcoming" : hasQuotes ? "done" : "current",
        hint: !clientDefined
          ? "Primero define cliente"
          : hasQuotes
          ? `${quotesCount} cotización${quotesCount === 1 ? "" : "es"}`
          : "Crear primera cotización",
      },
      {
        key: "agreement",
        label: "Acuerdo",
        state: hasQuotes ? "current" : "upcoming",
        hint: hasQuotes ? "Siguiente paso comercial" : "Pendiente",
      },
    ];
  }

  return [
    { key: "created", label: "Creado", state: "done", hint: "Proyecto creado" },
    {
      key: "participants",
      label: "Participantes",
      state: hasTalents ? "done" : "current",
      hint: hasTalents ? `${talentsCount} participante${talentsCount === 1 ? "" : "s"}` : "Agrega participantes",
    },
    {
      key: "client",
      label: "Cliente",
      state: clientDefined ? "done" : "current",
      hint: clientDefined ? "Cliente definido" : "Define el cliente",
    },
    {
      key: "quote",
      label: "Cotización",
      state: hasQuotes ? "done" : clientDefined ? "current" : "upcoming",
      hint: hasQuotes
        ? `${quotesCount} cotización${quotesCount === 1 ? "" : "es"}`
        : clientDefined
        ? "Crear primera cotización"
        : "Primero define cliente",
    },
    {
      key: "agreement",
      label: "Acuerdo",
      state: hasQuotes ? "current" : "upcoming",
      hint: hasNdas ? "Revisar NDAs y preparar acuerdo" : hasQuotes ? "Siguiente paso recomendado" : "Pendiente",
    },
  ];
}

function buildContextBanner(params: {
  talentsCount: number;
  quotesCount: number;
  ndasCount: number;
  hasCommercial: boolean;
  hasTeam: boolean;
  clientDefined: boolean;
}): ContextBanner {
  const { talentsCount, quotesCount, ndasCount, hasCommercial, hasTeam, clientDefined } =
    params;

  if (!hasCommercial && !hasTeam) {
    return {
      title: "Elige cómo quieres usar este proyecto",
      description:
        "Activa la dimensión comercial, la dimensión de equipo o ambas para empezar a trabajar el flujo real del proyecto.",
      ctaLabel: "Agregar participantes",
      ctaTab: "talents",
    };
  }

  if (hasCommercial && !clientDefined) {
    return {
      title: "Falta definir el cliente del proyecto",
      description:
        "La dimensión comercial ya está activa, pero antes de cotizar necesitas registrar el cliente.",
      ctaLabel: "Completar cliente",
      ctaTab: "general",
    };
  }

  if (hasCommercial && clientDefined && quotesCount === 0) {
    return {
      title: "Ya puedes crear la primera cotización",
      description:
        "El cliente ya está definido. El siguiente paso comercial es generar la cotización.",
      ctaLabel: "Ir a cotizaciones",
      ctaTab: "quotes",
    };
  }

  if (hasTeam && ndasCount > 0) {
    return {
      title: "Tienes NDAs por revisar",
      description:
        "Antes de cerrar el avance del equipo, revisa los NDAs pendientes del proyecto.",
      ctaLabel: "Ver NDAs",
      ctaTab: "ndas",
    };
  }

  if (hasTeam && talentsCount === 0) {
    return {
      title: "La dimensión de equipo está activa",
      description:
        "El siguiente paso es sumar participantes para empezar a mover el flujo del equipo.",
      ctaLabel: "Agregar participantes",
      ctaTab: "talents",
    };
  }

  if (hasCommercial && hasTeam && quotesCount > 0) {
    return {
      title: "El proyecto ya tiene avance real",
      description:
        "Ya existe avance comercial y/o de equipo. Ahora puedes revisar acuerdos y continuar el cierre del flujo.",
      ctaLabel: "Ver acuerdo",
      ctaTab: "agreement",
    };
  }

  if (hasCommercial && !hasTeam) {
    return {
      title: "La dimensión comercial está activa",
      description:
        "Puedes seguir avanzando por cliente, cotización y acuerdo. También puedes activar equipo después.",
      ctaLabel: clientDefined ? "Cotizaciones" : "General",
      ctaTab: clientDefined ? "quotes" : "general",
    };
  }

  if (hasTeam && !hasCommercial) {
    return {
      title: "La dimensión de equipo está activa",
      description:
        "Puedes invitar participantes, revisar NDAs y luego activar la dimensión comercial cuando la necesites.",
      ctaLabel: ndasCount > 0 ? "Revisar NDAs" : "Participantes",
      ctaTab: ndasCount > 0 ? "ndas" : "talents",
    };
  }

  return {
    title: "Continúa con el siguiente paso del proyecto",
    description:
      "Revisa los módulos activos y completa el flujo correspondiente para mantener el proyecto avanzando.",
    ctaLabel: "General",
    ctaTab: "general",
  };
}

export default function ProjectTabs({
  projectId,
  mode = "inline",
  initialTab = "general",
  showHeader = true,
  tab: controlledTab,
  onTabChange,
}: {
  projectId: string;
  mode?: "inline" | "page";
  initialTab?: TabKey;
  showHeader?: boolean;
  tab?: TabKey;
  onTabChange?: (t: TabKey) => void;
}) {
  const router = useRouter();

  const validProjectId = useMemo(() => isUuid(projectId), [projectId]);

  const [tabInternal, setTabInternal] = useState<TabKey>(initialTab);
  const tab = controlledTab ?? tabInternal;

  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [errProject, setErrProject] = useState<string | null>(null);

  const [talentsCount, setTalentsCount] = useState(0);
  const [quotesCount, setQuotesCount] = useState(0);
  const [ndasCount, setNdasCount] = useState(0);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [dimensionLoading, setDimensionLoading] = useState<
    "commercial" | "team" | "both" | null
  >(null);

  const [clientSaving, setClientSaving] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCompany, setClientCompany] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editBrief, setEditBrief] = useState("");
  const [editCurrency, setEditCurrency] = useState("CLP");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const [agreementSummary, setAgreementSummary] = useState<AgreementSummary | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);

  const hasCommercialDimension = !!project?.has_commercial_dimension;
  const hasTeamDimension = !!project?.has_team_dimension;
  const clientDefined = hasClientDefined(project);

    const visibleTabs = useMemo(() => {
    const tabs: TabKey[] = [];

    if (hasTeamDimension) {
      tabs.push("talents");
      tabs.push("ndas");
    }

    if (hasCommercialDimension) {
      tabs.push("quotes");
      tabs.push("agreement");
    }

    tabs.push("general");

    return tabs;
  }, [hasCommercialDimension, hasTeamDimension]);

  const firstAvailableTab = visibleTabs[0] || "general";

  const setTabSafe = (next: TabKey) => {
    if (!visibleTabs.includes(next) && next !== "general") {
      next = firstAvailableTab;
    }

    if (onTabChange) onTabChange(next);
    else setTabInternal(next);

    if (mode === "page") router.replace(ownerProjectHref(projectId, next));
  };

  useEffect(() => {
    if (mode !== "page") return;
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("tab");
    if (
      t === "general" ||
      t === "quotes" ||
      t === "talents" ||
      t === "ndas" ||
      t === "agreement"
    ) {
      if (onTabChange) onTabChange(t as TabKey);
      else setTabInternal(t as TabKey);
    }
  }, [mode, onTabChange]);

    useEffect(() => {
    let alive = true;

    if (!validProjectId || !hasTeamDimension) return;

    const loadAgreementSummary = async () => {
      setAgreementLoading(true);

      try {
        const negotiationsRes = await api<{ ok: true; negotiations: Array<{ id: string; status: string }> }>(
          `/negotiations/project/${projectId}`
        );

        const agreedNegotiation = (negotiationsRes.negotiations || []).find(
          (n) => String(n.status || "").toLowerCase() === "agreed"
        );

        if (!agreedNegotiation) {
          if (alive) setAgreementSummary(null);
          return;
        }

        const agreementRes = await api<{
          ok: true;
          source: "agreement" | "negotiation";
          agreement?: AgreementSummary;
        }>(`/agreements/from-negotiation/${agreedNegotiation.id}`);

        if (!alive) return;

        if (agreementRes.source === "agreement" && agreementRes.agreement) {
          setAgreementSummary(agreementRes.agreement);
        } else {
          setAgreementSummary(null);
        }
      } catch {
        if (!alive) return;
        setAgreementSummary(null);
      } finally {
        if (alive) setAgreementLoading(false);
      }
    };

    loadAgreementSummary();

    return () => {
      alive = false;
    };
  }, [projectId, validProjectId, hasTeamDimension]);

  useEffect(() => {
    if (controlledTab) return;
    setTabInternal(initialTab);
  }, [initialTab, controlledTab]);

  useEffect(() => {
    if (!visibleTabs.includes(tab) && tab !== "general") {
      if (onTabChange) onTabChange(firstAvailableTab);
      else setTabInternal(firstAvailableTab);
    }
  }, [visibleTabs, tab, firstAvailableTab, onTabChange]);

  useEffect(() => {
    let alive = true;

    if (!validProjectId) {
      setLoadingProject(false);
      setProject(null);
      setErrProject("Invalid project id");
      return;
    }

    setLoadingProject(true);
    setErrProject(null);

    api<{ ok: true; project: Project }>(`/projects/${projectId}`)
      .then((r) => {
        if (!alive) return;
        setProject(r.project);
        setLoadingProject(false);
      })
      .catch((e: any) => {
        if (!alive) return;
        setErrProject(String(e?.message || e));
        setLoadingProject(false);
      });

    return () => {
      alive = false;
    };
  }, [projectId, validProjectId]);

  useEffect(() => {
    let alive = true;

    if (!validProjectId) return;

    Promise.allSettled([
      api<{ ok: true; creatives: CreativeRow[] }>(`/projects/${projectId}/creatives`),
      api<{ ok: true; quotes: QuoteRow[] }>(`/projects/${projectId}/quotes`),
    ]).then((results) => {
      if (!alive) return;

      const creativesResult = results[0];
      const quotesResult = results[1];

      if (creativesResult.status === "fulfilled") {
        setTalentsCount((creativesResult.value.creatives || []).length);
      }

      if (quotesResult.status === "fulfilled") {
        setQuotesCount((quotesResult.value.quotes || []).length);
      }
    });

    return () => {
      alive = false;
    };
  }, [projectId, validProjectId]);

  useEffect(() => {
    if (!project) return;
    setEditTitle(project.title || "");
    setEditBrief(project.brief || "");
    setEditCurrency(project.currency || "CLP");
    setEditStartDate(project.start_date || "");
    setEditDueDate(project.due_date || "");

    setClientName(project.client_name || "");
    setClientEmail(project.client_email || "");
    setClientCompany(project.client_company || "");
  }, [project]);

  useEffect(() => {
    if (!project?.title) return;

    const previousTitle = document.title;
    document.title = `${project.title} | WEZET`;

    return () => {
      document.title = previousTitle;
    };
  }, [project?.title]);

  const openEditModal = () => {
    if (!project) return;
    setEditError(null);
    setEditTitle(project.title || "");
    setEditBrief(project.brief || "");
    setEditCurrency(project.currency || "CLP");
    setEditStartDate(project.start_date || "");
    setEditDueDate(project.due_date || "");
    setEditOpen(true);
  };

  const saveProjectEdit = async () => {
    if (!project || editSaving) return;

    const title = editTitle.trim();
    if (title.length < 2) {
      setEditError("El título debe tener al menos 2 caracteres.");
      return;
    }

    setEditSaving(true);
    setEditError(null);

    try {
      const payload: UpdateProjectPayload = {
        title,
        brief: editBrief.trim() || "",
        currency: editCurrency || "CLP",
        start_date: editStartDate || "",
        due_date: editDueDate || "",
      };

      const r = await api<{ ok: true; project: Project }>(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setProject(r.project);
      setEditOpen(false);
    } catch (e: any) {
      setEditError(String(e?.message || e));
    } finally {
      setEditSaving(false);
    }
  };

  const saveClientInfo = async () => {
    if (!project || clientSaving) return;

    setClientSaving(true);
    setClientError(null);

    try {
      const payload: UpdateProjectPayload = {
        client_name: clientName,
        client_email: clientEmail,
        client_company: clientCompany,
      };

      const r = await api<{ ok: true; project: Project }>(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setProject(r.project);
    } catch (e: any) {
      setClientError(String(e?.message || e));
    } finally {
      setClientSaving(false);
    }
  };

  const activateDimension = async (kind: "commercial" | "team" | "both") => {
    if (!project || dimensionLoading) return;

    setDimensionLoading(kind);

    try {
      const payload: UpdateProjectPayload =
        kind === "commercial"
          ? { has_commercial_dimension: true }
          : kind === "team"
          ? { has_team_dimension: true }
          : {
              has_commercial_dimension: true,
              has_team_dimension: true,
            };

      const r = await api<{ ok: true; project: Project }>(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setProject(r.project);

      if (kind === "commercial") {
        setTabSafe("general");
      } else if (kind === "team") {
        setTabSafe("talents");
      } else {
        setTabSafe("general");
      }
    } catch (e: any) {
      setErrProject(String(e?.message || e));
    } finally {
      setDimensionLoading(null);
    }
  };

  const created = project?.created_at
    ? new Date(project.created_at).toLocaleDateString()
    : "—";
  const st = normalizeStatus(project?.status);
  const pill = statusPill(st);

  const returnToQuotes =
    mode === "inline"
      ? encodeURIComponent(`/projects?open=${projectId}&tab=quotes`)
      : encodeURIComponent(ownerProjectHref(projectId, "quotes"));

  const flowSteps = buildProjectFlow({
    talentsCount,
    quotesCount,
    ndasCount,
    hasCommercial: hasCommercialDimension,
    hasTeam: hasTeamDimension,
    clientDefined,
  });

  const banner = buildContextBanner({
    talentsCount,
    quotesCount,
    ndasCount,
    hasCommercial: hasCommercialDimension,
    hasTeam: hasTeamDimension,
    clientDefined,
  });

    const tabDoneMap = useMemo<Record<TabKey, boolean>>(() => {
    return {
      talents: talentsCount > 0,
      ndas: hasTeamDimension ? ndasCount > 0 : false,
      quotes: hasCommercialDimension ? quotesCount > 0 : false,
      agreement:
        hasCommercialDimension &&
        (quotesCount > 0 || ndasCount > 0 || talentsCount > 0),
      general: hasClientDefined(project),
    };
  }, [
    talentsCount,
    ndasCount,
    quotesCount,
    hasCommercialDimension,
    hasTeamDimension,
    project,
  ]);

  const showActivationScreen =
    tab === "general" && !hasCommercialDimension && !hasTeamDimension;

  if (!validProjectId) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
        Invalid project id
      </div>
    );
  }

  if (loadingProject) {
    return (
      <div className="rounded-3xl border border-white/8 bg-[#0d1320] p-6 text-sm text-slate-300">
        Cargando...
      </div>
    );
  }

  if (errProject) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
        {errProject}
      </div>
    );
  }

  if (!project) return null;

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d1320]">
        {showHeader ? (
          <div className="flex items-start justify-between gap-4 bg-[#111827] px-5 py-5 sm:px-6">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2c94c] text-[#0b0f17] shadow-sm">
                <FolderIcon />
              </div>

              <div className="min-w-0">
                <div className="truncate text-xl font-black text-white sm:text-2xl">
                  {project.title}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className={pill.cls}>
                    <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                    {pill.label}
                  </span>
                  {project.currency ? <span className="text-slate-500">•</span> : null}
                  {project.currency ? (
                    <span className="font-semibold text-slate-200">{project.currency}</span>
                  ) : null}
                  <span className="text-slate-500">•</span>
                  <span>{created}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={openEditModal}
                className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-100 transition hover:bg-white/[0.08]"
              >
                Editar proyecto
              </button>

              {hasCommercialDimension && clientDefined ? (
                <Link
                  href={newQuoteHref(project.id, returnToQuotes)}
                  className="rounded-2xl px-4 py-3 text-sm font-bold text-[#0b0f17] shadow-sm hover:opacity-95 active:opacity-90"
                  style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                >
                  Nueva cotización
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          className={[
            "px-5 py-5 sm:px-6",
            showHeader ? "border-t border-white/8" : "border-t-0",
          ].join(" ")}
        >
          <ProjectFlowStepper steps={flowSteps} />
        </div>

        <div className="border-t border-white/8 px-5 py-4 sm:px-6">
          <ProjectContextBanner
            title={banner.title}
            description={banner.description}
            ctaLabel={banner.ctaLabel}
            onClick={() => setTabSafe(banner.ctaTab)}
          />
        </div>

                <div className="border-t border-white/8 px-5 py-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto">
            {hasTeamDimension ? (
              <TabButton
                label="Participantes"
                active={tab === "talents"}
                done={tabDoneMap.talents}
                onClick={() => setTabSafe("talents")}
              />
            ) : null}

            {hasTeamDimension ? (
              <TabButton
                label="NDAs"
                active={tab === "ndas"}
                done={tabDoneMap.ndas}
                onClick={() => setTabSafe("ndas")}
              />
            ) : null}

            {hasCommercialDimension ? (
              <TabButton
                label="Cotizaciones"
                active={tab === "quotes"}
                done={tabDoneMap.quotes}
                onClick={() => setTabSafe("quotes")}
              />
            ) : null}

            {hasCommercialDimension ? (
              <TabButton
                label="Acuerdo"
                active={tab === "agreement"}
                done={tabDoneMap.agreement}
                onClick={() => setTabSafe("agreement")}
              />
            ) : null}

            <TabButton
              label="General"
              active={tab === "general"}
              done={tabDoneMap.general}
              onClick={() => setTabSafe("general")}
            />
          </div>
        </div>

        <div className="px-5 pb-6 sm:px-6">
          {tab === "general" ? (
            <div className="mt-4">
              {showActivationScreen ? (
                <DimensionsActivationPanel
                  onCommercialClick={() => activateDimension("commercial")}
                  onTeamClick={() => activateDimension("team")}
                  onBothClick={() => activateDimension("both")}
                  commercialLoading={dimensionLoading === "commercial"}
                  teamLoading={dimensionLoading === "team"}
                  bothLoading={dimensionLoading === "both"}
                />
              ) : (
                <>
                  {hasCommercialDimension ? (
                    <ClientInfoCard
                      clientName={clientName}
                      setClientName={setClientName}
                      clientEmail={clientEmail}
                      setClientEmail={setClientEmail}
                      clientCompany={clientCompany}
                      setClientCompany={setClientCompany}
                      onSave={saveClientInfo}
                      saving={clientSaving}
                      error={clientError}
                      clientDefined={clientDefined}
                    />
                  ) : null}

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <MiniCountCard label="Cotizaciones" value={quotesCount} tone="green" />
                    <MiniCountCard label="Participantes" value={talentsCount} tone="yellow" />
                    <MiniCountCard label="NDAs" value={ndasCount} tone="violet" />
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoCard label="Moneda" value={project.currency || "CLP"} />
                    <InfoCard
                      label="Inicio"
                      value={
                        project.start_date
                          ? new Date(project.start_date).toLocaleDateString()
                          : "No definido"
                      }
                    />
                    <InfoCard
                      label="Entrega"
                      value={
                        project.due_date
                          ? new Date(project.due_date).toLocaleDateString()
                          : "No definida"
                      }
                    />
                    <InfoCard label="Estado" value={pill.label} />
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoCard
                      label="Dimensión comercial"
                      value={hasCommercialDimension ? "Activa" : "No activa"}
                    />
                    <InfoCard
                      label="Dimensión de equipo"
                      value={hasTeamDimension ? "Activa" : "No activa"}
                    />
                  </div>

                  <div className="mt-6">
                    <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      descripción
                    </div>
                    <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-100">
                      {project.brief || "Sin descripción."}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : tab === "quotes" ? (
            <div className="mt-4">
              <QuotesTabMvp
                projectId={project.id}
                returnTo={returnToQuotes}
                onCountChange={(n) => setQuotesCount(n)}
              />
            </div>
          ) : tab === "talents" ? (
            <div className="mt-4">
              <TalentsPanel
                projectId={project.id}
                title="Participantes del proyecto"
                description="Agrega usuarios o empresas para colaborar en este proyecto"
                buttonLabel="+ Agregar"
                onCountChange={(n) => setTalentsCount(n)}
              />
            </div>
          ) : tab === "ndas" ? (
            <div className="mt-4">
              <NdasPanel projectId={project.id} onCountChange={(n) => setNdasCount(n)} />
            </div>
          ) : (
            <div className="mt-4">
              <AgreementTab
                project={project}
                quotesCount={quotesCount}
                talentsCount={talentsCount}
                ndasCount={ndasCount}
                agreementSummary={agreementSummary}
                agreementLoading={agreementLoading}
                onOpenAgreement={() => setAgreementOpen(true)}
              />
            </div>
          )}
        </div>
      </div>

      <AgreementFlowModal
        open={agreementOpen}
        onClose={() => setAgreementOpen(false)}
        projectId={project.id}
        projectTitle={project.title}
        onDone={() => {
          setTabSafe("talents");
        }}
      />

      {editOpen ? (
        <EditProjectModal
          title={editTitle}
          setTitle={setEditTitle}
          brief={editBrief}
          setBrief={setEditBrief}
          currency={editCurrency}
          setCurrency={setEditCurrency}
          startDate={editStartDate}
          setStartDate={setEditStartDate}
          dueDate={editDueDate}
          setDueDate={setEditDueDate}
          error={editError}
          saving={editSaving}
          onCancel={() => {
            if (editSaving) return;
            setEditOpen(false);
          }}
          onSave={saveProjectEdit}
        />
      ) : null}
    </>
  );
}

function ClientInfoCard({
  clientName,
  setClientName,
  clientEmail,
  setClientEmail,
  clientCompany,
  setClientCompany,
  onSave,
  saving,
  error,
  clientDefined,
}: {
  clientName: string;
  setClientName: (v: string) => void;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  clientCompany: string;
  setClientCompany: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  clientDefined: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-[#f2c94c]/20 bg-[linear-gradient(180deg,rgba(242,201,76,0.10),rgba(255,255,255,0.02))] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-[700px]">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#fff1bf]">
            cliente del proyecto
          </div>
          <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            {clientDefined ? "Cliente definido" : "Define el cliente antes de cotizar"}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#fff8db]">
            Este paso corresponde a la dimensión comercial. Antes de avanzar con la
            cotización, registra los datos básicos del cliente del proyecto.
          </p>
        </div>

        <div className="rounded-2xl border border-[#f2c94c]/20 bg-[#f2c94c]/10 px-3 py-2 text-xs font-bold text-[#fff1bf]">
          Paso comercial 1
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre del cliente">
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full rounded-2xl border border-white/8 bg-[#0b111d] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f2c94c]/30 focus:ring-2 focus:ring-[#f2c94c]/10"
            placeholder="Ej: María Pérez"
          />
        </Field>

        <Field label="Email del cliente">
          <input
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            className="w-full rounded-2xl border border-white/8 bg-[#0b111d] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f2c94c]/30 focus:ring-2 focus:ring-[#f2c94c]/10"
            placeholder="cliente@empresa.com"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Empresa">
            <input
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              className="w-full rounded-2xl border border-white/8 bg-[#0b111d] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f2c94c]/30 focus:ring-2 focus:ring-[#f2c94c]/10"
              placeholder="Ej: Empresa X"
            />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-2xl bg-[#f2c94c] px-5 py-3 text-sm font-bold text-[#0b0f17] transition hover:opacity-95 disabled:opacity-60"
        >
          {saving ? "Guardando..." : clientDefined ? "Guardar cambios del cliente" : "Guardar cliente"}
        </button>

        {clientDefined ? (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
            Cliente listo para cotización
          </span>
        ) : (
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-200">
            Aún falta definir este paso
          </span>
        )}
      </div>
    </div>
  );
}

function AgreementTab({
  project,
  quotesCount,
  talentsCount,
  ndasCount,
  agreementSummary,
  agreementLoading,
  onOpenAgreement,
}: {
  project: Project;
  quotesCount: number;
  talentsCount: number;
  ndasCount: number;
  agreementSummary: AgreementSummary | null;
  agreementLoading: boolean;
  onOpenAgreement: () => void;
}) {
  const agreementHref = agreementSummary?.negotiation_id
    ? `/producer/agreements/from-negotiation/${agreementSummary.negotiation_id}`
    : null;

  const agreementStatus =
    agreementSummary?.status === "sent"
      ? "Enviado"
      : agreementSummary?.status === "signed"
      ? "Firmado"
      : agreementSummary?.status === "draft"
      ? "Borrador"
      : "Pendiente";

  return (
    <div className="rounded-3xl border border-white/8 bg-[#0a101a] p-5 sm:p-6">
      <div className="max-w-[840px]">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-200">
          acuerdo
        </div>
        <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">
          Formaliza el siguiente paso del proyecto
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-100">
          Esta sección ya muestra el acuerdo generado desde la negociación cuando exista.
          Si todavía no hay acuerdo creado, desde aquí puedes abrir el flujo y completarlo.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <InfoCard label="Cotizaciones activas" value={String(quotesCount)} />
        <InfoCard label="Participantes activos" value={String(talentsCount)} />
        <InfoCard label="NDAs" value={String(ndasCount)} />
      </div>

      <div className="mt-6 rounded-3xl border border-[#f2c94c]/20 bg-[#f2c94c]/10 p-5">
        <div className="text-sm font-extrabold text-[#fff1bf]">
          Estado actual del acuerdo
        </div>

        {agreementLoading ? (
          <div className="mt-3 text-sm text-[#fff8db]">
            Cargando acuerdo del proyecto...
          </div>
        ) : agreementSummary ? (
          <>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoCard
                label="Participante"
                value={
                  agreementSummary.participant_name ||
                  agreementSummary.participant_email ||
                  "No definido"
                }
              />
              <InfoCard label="Estado del acuerdo" value={agreementStatus} />
              <InfoCard
                label="Rol"
                value={agreementSummary.role || "No definido"}
              />
              <InfoCard
                label="Monto"
                value={
                  agreementSummary.amount_total !== null &&
                  agreementSummary.amount_total !== undefined
                    ? `${agreementSummary.currency || "CLP"} ${agreementSummary.amount_total}`
                    : "No definido"
                }
              />
            </div>

            <div className="mt-5 text-sm leading-6 text-[#fff8db]">
              Proyecto: <span className="font-bold">{project.title}</span>. Ya existe un
              acuerdo asociado a una negociación cerrada. Puedes abrirlo para editarlo o
              continuar con el siguiente paso.
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {agreementHref ? (
                <Link
                  href={agreementHref}
                  className="rounded-2xl bg-[#f2c94c] px-5 py-3 text-sm font-bold text-[#0b0f17] transition hover:opacity-95"
                >
                  Abrir acuerdo guardado
                </Link>
              ) : null}

              <button
                type="button"
                onClick={onOpenAgreement}
                className="rounded-2xl border border-[#f2c94c]/30 bg-transparent px-5 py-3 text-sm font-bold text-[#fff1bf] transition hover:bg-[#f2c94c]/10"
              >
                Crear otro flujo
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-2 text-sm leading-6 text-[#fff8db]">
              Proyecto: <span className="font-bold">{project.title}</span>. Aún no hay un
              acuerdo guardado desde negociación. Usa este paso para abrir el flujo y
              preparar la formalización según el avance comercial o del equipo.
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpenAgreement}
                className="rounded-2xl bg-[#f2c94c] px-5 py-3 text-sm font-bold text-[#0b0f17] transition hover:opacity-95"
              >
                Abrir acuerdo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DimensionsActivationPanel({
  onCommercialClick,
  onTeamClick,
  onBothClick,
  commercialLoading,
  teamLoading,
  bothLoading,
}: {
  onCommercialClick: () => void;
  onTeamClick: () => void;
  onBothClick: () => void;
  commercialLoading?: boolean;
  teamLoading?: boolean;
  bothLoading?: boolean;
}) {
  const disabled = commercialLoading || teamLoading || bothLoading;

  return (
    <div className="rounded-[28px] border border-white/8 bg-[#0a101a] p-5 sm:p-6">
      <div className="max-w-[820px]">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-200">
          activación de dimensiones
        </div>
        <h3
          className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl"
          style={{
            color: "#ffffff",
            WebkitTextFillColor: "#ffffff",
            textShadow: "0 1px 10px rgba(255,255,255,0.08)",
          }}
        >
          Elige cómo usar este proyecto
        </h3>
        <p className="mt-3 max-w-[760px] text-sm leading-6 text-slate-50">
          Un proyecto puede avanzar por una dimensión comercial, una dimensión de equipo,
          o ambas al mismo tiempo. Puedes activar una primero o dejar ambas listas desde ahora.
        </p>
      </div>

      <div className="mt-5 rounded-3xl border border-[#f2c94c]/20 bg-[#f2c94c]/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-[#fff1bf]">
              Activar ambas dimensiones
            </div>
            <div className="mt-1 text-sm text-[#fff8db]">
              Deja habilitado el flujo comercial y el flujo de equipo desde el inicio.
            </div>
          </div>

          <button
            type="button"
            onClick={onBothClick}
            disabled={!!disabled}
            className="shrink-0 rounded-2xl bg-[#f2c94c] px-4 py-3 text-sm font-bold text-[#0b0f17] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bothLoading ? "Activando..." : "Activar ambas"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DimensionCard
          eyebrow="Dimensión Comercial"
          title="Productor → Cliente externo"
          description="Gestiona la relación comercial con un cliente que probablemente no usa WEZET. Aquí el flujo principal es cliente, cotización, acuerdo y cobro."
          points={[
            "Definir cliente",
            "Crear cotización",
            "Aprobar y formalizar acuerdo",
            "Preparar siguiente etapa de cobro",
          ]}
          buttonLabel={commercialLoading ? "Activando..." : "Activar comercial"}
          onClick={onCommercialClick}
          tone="gold"
          disabled={!!disabled}
        />

        <DimensionCard
          eyebrow="Dimensión de Equipo"
          title="Productor → Talentos en WEZET"
          description="Organiza la colaboración con creativos, empresas o participantes del proyecto. Aquí el flujo parte con invitación, NDA y coordinación del equipo."
          points={[
            "Invitar participantes",
            "Revisar NDAs",
            "Abrir negociación",
            "Preparar acuerdo de participación",
          ]}
          buttonLabel={teamLoading ? "Activando..." : "Agregar participantes"}
          onClick={onTeamClick}
          tone="violet"
          disabled={!!disabled}
        />
      </div>
    </div>
  );
}

function DimensionCard({
  eyebrow,
  title,
  description,
  points,
  buttonLabel,
  onClick,
  tone,
  disabled = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  buttonLabel: string;
  onClick: () => void;
  tone: "gold" | "violet";
  disabled?: boolean;
}) {
  const toneCls =
    tone === "gold"
      ? {
          wrap: "border-[#f2c94c]/22 bg-[linear-gradient(180deg,rgba(242,201,76,0.10),rgba(255,255,255,0.02))]",
          eyebrow: "text-[#fff1bf]",
          icon: "bg-[#f2c94c]/16 text-[#fff1bf] border-[#f2c94c]/25",
          button: "bg-[#f2c94c] text-[#0b0f17]",
          dot: "bg-[#f2c94c]",
        }
      : {
          wrap: "border-violet-400/22 bg-[linear-gradient(180deg,rgba(167,139,250,0.10),rgba(255,255,255,0.02))]",
          eyebrow: "text-violet-100",
          icon: "bg-violet-400/14 text-violet-100 border-violet-400/25",
          button: "bg-violet-400 text-[#0b0f17]",
          dot: "bg-violet-300",
        };

  return (
    <div className={`rounded-[26px] border p-5 sm:p-6 ${toneCls.wrap}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`text-[11px] font-bold uppercase tracking-[0.18em] ${toneCls.eyebrow}`}>
            {eyebrow}
          </div>
          <div className="mt-2 text-xl font-black text-white">{title}</div>
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${toneCls.icon}`}>
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M4 7h16M7 4v6m10-6v6M5 11h14l-1 8H6l-1-8Z" />
          </svg>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-50">{description}</p>

      <div className="mt-5 space-y-3">
        {points.map((point) => (
          <div key={point} className="flex items-start gap-3">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneCls.dot}`} />
            <span className="text-sm text-white">{point}</span>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`rounded-2xl px-4 py-3 text-sm font-bold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 ${toneCls.button}`}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

function ProjectFlowStepper({ steps }: { steps: FlowStep[] }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-[#0b111d] px-4 py-4 sm:px-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-200">
            flujo del proyecto
          </div>
          <div className="mt-1 text-sm text-white">
            Vista inicial del avance comercial y operativo del proyecto
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {steps.map((step, index) => (
          <div key={step.key} className="relative">
            <div
              className={[
                "rounded-2xl border px-4 py-4 transition",
                step.state === "done"
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : step.state === "current"
                  ? "border-[#f2c94c]/30 bg-[#f2c94c]/10"
                  : "border-white/8 bg-white/[0.03]",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <StepBullet state={step.state} index={index + 1} />
                <div className="min-w-0">
                  <div
                    className={[
                      "text-sm font-extrabold",
                      step.state === "done"
                        ? "text-emerald-200"
                        : step.state === "current"
                        ? "text-[#fff1bf]"
                        : "text-white",
                    ].join(" ")}
                  >
                    {step.label}
                  </div>
                  <div className="mt-1 text-xs text-slate-100">{step.hint}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectContextBanner({
  title,
  description,
  ctaLabel,
  onClick,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-3xl border border-[#f2c94c]/30 bg-[#f2c94c]/12 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-[#fff1bf]">{title}</div>
          <div className="mt-1 text-sm text-[#fff8db]">{description}</div>
        </div>

        <button
          type="button"
          onClick={onClick}
          className="shrink-0 rounded-2xl bg-[#f2c94c] px-4 py-2.5 text-sm font-bold text-[#0b0f17] transition hover:opacity-95"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

function StepBullet({
  state,
  index,
}: {
  state: FlowState;
  index: number;
}) {
  if (state === "done") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  if (state === "current") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f2c94c] text-[#0b0f17] text-xs font-black">
        {index}
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-black text-white">
      {index}
    </div>
  );
}

function TabButton({
  label,
  active,
  done,
  onClick,
}: {
  label: string;
  active?: boolean;
  done?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "shrink-0 rounded-2xl border px-4 py-2 text-xs font-bold transition",
        active
          ? "border-[#f2c94c] bg-[#f2c94c] text-[#0b0f17]"
          : "border-white/8 bg-white/[0.03] text-white hover:bg-white/[0.06]",
      ].join(" ")}
    >
      <span className="flex items-center gap-2">
        <span>{label}</span>
        {done ? (
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white">
            ✓
          </span>
        ) : null}
      </span>
    </button>
  );
}

function MiniCountCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "yellow" | "violet";
}) {
  const style =
    tone === "green"
      ? "bg-emerald-500/10 text-emerald-100 border border-emerald-500/15"
      : tone === "yellow"
      ? "bg-[#f2c94c]/10 text-[#fff1bf] border border-[#f2c94c]/15"
      : "bg-violet-500/10 text-violet-100 border border-violet-500/15";

  return (
    <div className={["rounded-2xl p-6 text-center", style].join(" ")}>
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs font-semibold">{label}</div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="text-xs font-bold text-slate-200">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function QuotesTabMvp({
  projectId,
  returnTo,
  onCountChange,
}: {
  projectId: string;
  returnTo: string;
  onCountChange?: (n: number) => void;
}) {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<QuoteRow | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const r = await api<{ ok: true; quotes: QuoteRow[] }>(
        `/projects/${projectId}/quotes`
      );
      const nextQuotes = r.quotes || [];
      setQuotes(nextQuotes);
      onCountChange?.(nextQuotes.length);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isUuid(projectId)) return;
    load();
  }, [projectId]);

  const deleteQuote = async () => {
    if (!quoteToDelete) return;

    setDeletingQuoteId(quoteToDelete.id);
    setError(null);

    try {
      await api(`/quotes/${quoteToDelete.id}`, { method: "DELETE" });
      setQuoteToDelete(null);
      await load();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setDeletingQuoteId(null);
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d1320]">
        <div className="flex items-center justify-between gap-3 bg-[#111827] px-5 py-5 sm:px-6">
          <div>
            <div className="text-sm font-extrabold text-white">
              Historial de cotizaciones
            </div>
            <div className="text-xs text-slate-300">
              Cotizaciones asociadas a este proyecto
            </div>
          </div>

          <Link
            href={newQuoteHref(projectId, returnTo)}
            className="rounded-2xl px-4 py-2 text-sm font-bold text-[#0b0f17]"
            style={{ background: "linear-gradient(135deg,#10b981,#22c55e)" }}
          >
            + Nueva
          </Link>
        </div>

        <div className="px-5 py-6 sm:px-6">
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="text-sm text-slate-300">Cargando...</div>
          ) : quotes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
              <div className="text-sm font-semibold text-slate-100">
                No hay cotizaciones aún
              </div>
              <Link
                href={newQuoteHref(projectId, returnTo)}
                className="mt-4 inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-bold text-[#0b0f17]"
                style={{ background: "linear-gradient(135deg,#10b981,#22c55e)" }}
              >
                Crear primera cotización
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {quotes.map((q) => {
                const hasAttachment = !!q.attachment_name || !!q.attachment_url;

                return (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold text-white">
                          {q.client_name || "Cliente sin nombre"}{" "}
                          {q.client_email ? `• ${q.client_email}` : ""}
                        </div>

                        <div className="mt-1 truncate text-xs text-slate-300">
                          Estado: {q.status} • Total: {q.currency} {q.total_amount}
                          {q.valid_until ? ` • Válido hasta: ${q.valid_until}` : ""}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={quoteDetailHref(q.id)}
                          className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-white transition hover:bg-white/[0.08]"
                        >
                          Abrir
                        </Link>

                        <button
                          type="button"
                          onClick={() => setQuoteToDelete(q)}
                          disabled={deletingQuoteId === q.id}
                          className="rounded-md border border-rose-500/15 bg-rose-500/[0.08] px-2 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/[0.14] disabled:opacity-50"
                        >
                          {deletingQuoteId === q.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      {hasAttachment ? (
                        <div
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300"
                          title={q.attachment_name || "Archivo adjunto"}
                        >
                          <span className="shrink-0">
                            <PaperclipIcon />
                          </span>
                          <span>Adjunto</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">Sin adjunto</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {quoteToDelete ? (
        <ConfirmDeleteModal
          title="Eliminar cotización"
          message={`Vas a eliminar la cotización de ${
            quoteToDelete.client_name || "este cliente"
          }. Esta acción no se puede deshacer.`}
          confirmLabel={deletingQuoteId === quoteToDelete.id ? "Eliminando..." : "Sí, eliminar"}
          onCancel={() => {
            if (deletingQuoteId) return;
            setQuoteToDelete(null);
          }}
          onConfirm={deleteQuote}
          danger
          loading={deletingQuoteId === quoteToDelete.id}
        />
      ) : null}
    </>
  );
}

function ConfirmDeleteModal({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
  danger = false,
  loading = false,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onCancel}
        aria-label="Cerrar confirmación"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[460px] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1320] shadow-2xl">
          <div className="border-b border-white/8 px-6 py-5">
            <div className="text-lg font-black text-white">{title}</div>
            <div className="mt-2 text-sm text-slate-100">{message}</div>
          </div>

          <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-2xl bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.1] disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={[
                "rounded-2xl px-5 py-3 text-sm font-bold transition disabled:opacity-50",
                danger
                  ? "bg-rose-500/90 text-white hover:bg-rose-500"
                  : "bg-[#f2c94c] text-[#0b0f17] hover:opacity-95",
              ].join(" ")}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditProjectModal({
  title,
  setTitle,
  brief,
  setBrief,
  currency,
  setCurrency,
  startDate,
  setStartDate,
  dueDate,
  setDueDate,
  error,
  saving,
  onCancel,
  onSave,
}: {
  title: string;
  setTitle: (v: string) => void;
  brief: string;
  setBrief: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  error: string | null;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onCancel}
        aria-label="Cerrar edición"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[720px] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1320] shadow-2xl">
          <div className="border-b border-white/8 px-6 py-5">
            <div className="text-lg font-black text-white">Editar proyecto</div>
            <div className="mt-1 text-sm text-slate-100">
              Modifica los datos principales del proyecto.
            </div>
          </div>

          <div className="px-6 py-5">
            {error ? (
              <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Título">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f2c94c]/30 focus:ring-2 focus:ring-[#f2c94c]/10"
                  placeholder="Nombre del proyecto"
                />
              </Field>

              <Field label="Moneda">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f2c94c]/30 focus:ring-2 focus:ring-[#f2c94c]/10"
                >
                  <option value="CLP">CLP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </Field>

              <Field label="Fecha inicio">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f2c94c]/30 focus:ring-2 focus:ring-[#f2c94c]/10"
                />
              </Field>

              <Field label="Fecha entrega">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f2c94c]/30 focus:ring-2 focus:ring-[#f2c94c]/10"
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Descripción">
                <textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  className="min-h-[140px] w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f2c94c]/30 focus:ring-2 focus:ring-[#f2c94c]/10"
                  placeholder="Describe el proyecto..."
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/8 px-6 py-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-2xl bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.1] disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-2xl px-5 py-3 text-sm font-bold text-[#0b0f17] transition hover:opacity-95 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-bold uppercase tracking-[0.12em] text-white">
        {label}
      </div>
      {children}
    </div>
  );
}