const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const raw = await res.text();
  const data = isJson && raw ? JSON.parse(raw) : raw;

  if (!res.ok) {
    // Si vino HTML, mostramos un error legible
    const msg =
      typeof data === "string"
        ? data.slice(0, 200)
        : data?.error
        ? JSON.stringify(data.error)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export type DashboardSummary = {
  period: { time: string; from: string | null; to: string };
  currency: string;
  counts: {
    projects: number;
    talentsAssociated: number;
    agreementsTotal: number;
    agreementsPending: number;
    agreementsSigned: number;
    quotesTotal: number;
    ndasTotal: number;
    ndasPending: number;
    ndasSigned: number;
  };
  finance: {
    quoted: number;
    inExecution: number;
    toCollect: number;
    collected: number;
    quotesInProgressCount: number;
    quotesCompletedCount: number;
    quotesPaidCount: number;
  };
  recentDocs: Array<{
    id: string;
    type: "quote" | "agreement" | "nda";
    title: string;
    status: string;
    createdAt: string;
    projectId?: string | null;
  }>;
  recentProjects: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
  talentPayments: Array<{
    id: string;
    talentName: string;
    amount: number;
    status: string;
    dueDate?: string | null;
    projectId?: string | null;
  }>;
};

export async function getDashboardSummary(params: {
  currency: string;
  time: string;
  project: string;
}): Promise<DashboardSummary> {
  const qs = new URLSearchParams({
    currency: params.currency,
    time: params.time,
    project: params.project,
  });

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/summary?${qs.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Error cargando dashboard");
  }

  return res.json();
}