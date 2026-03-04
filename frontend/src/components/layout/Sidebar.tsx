"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

/* ====== SVGs mínimos (sin deps) ====== */
const I = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M3 13h8V3H3v10Z" />
      <path d="M13 21h8V11h-8v10Z" />
      <path d="M13 3h8v6h-8V3Z" />
      <path d="M3 17h8v4H3v-4Z" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M3 7h18v10H3V7Z" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  bot: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 2v3" />
      <path d="M7 6h10a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4Z" />
      <path d="M8 12h.01" />
      <path d="M16 12h.01" />
      <path d="M9 16h6" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M10 17l-1 0a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h1" />
      <path d="M15 7l5 5-5 5" />
      <path d="M20 12H10" />
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2.2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-6Z" />
      <path d="M14 2v6h6" />
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M3 21h18" />
      <path d="M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14" />
      <path d="M9 9h.01" />
      <path d="M9 13h.01" />
      <path d="M9 17h.01" />
      <path d="M15 9h.01" />
      <path d="M15 13h.01" />
      <path d="M15 17h.01" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  ),
};

function isRouteActive(pathname: string, href: string, exact?: boolean) {
  if (!pathname) return false;
  if (exact) return pathname === href;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  href,
  label,
  icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={[
        "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
        active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-200/60",
      ].join(" ")}
    >
      <span
        className={[
          "w-9 h-9 rounded-xl flex items-center justify-center transition",
          active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const sections: NavSection[] = [
    {
      title: "General",
      items: [{ href: "/dashboard", label: "Dashboard", icon: I.dashboard, exact: true }],
    },
    {
      title: "Producer",
      items: [
        { href: "/producer/projects", label: "Proyectos", icon: I.folder },
        { href: "/producer/negotiations", label: "Negociaciones", icon: I.list },
        { href: "/producer/quotes", label: "Cotizaciones", icon: I.file },
      ],
    },
    {
      title: "Gestión",
      items: [
        { href: "/billing", label: "Cobros", icon: I.card },
        { href: "/contacts", label: "Contactos", icon: I.building },
        { href: "/assistant", label: "Asistente IA", icon: I.bot },
        { href: "/team", label: "Equipo", icon: I.users },
        { href: "/profile", label: "Perfil", icon: I.user, exact: true },
      ],
    },
  ];

  return (
    <aside className="w-[260px] h-full border-r border-slate-200/80 bg-white/70 backdrop-blur flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
            style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
          >
            W
          </div>
          <div className="leading-tight">
            <div className="font-extrabold">wezet</div>
            <div className="text-xs text-slate-500">Producer Console</div>
          </div>
        </div>

        {/* Perfil */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white/70 p-3">
          <div className="text-xs text-slate-500">Perfil</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate">Soy Creativo</div>
              <div className="text-[11px] text-slate-500 truncate">{user?.email ? user.email : "—"}</div>
            </div>
            <button
              className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap inline-flex items-center gap-1"
              onClick={() => {
                router.push("/profile");
                onNavigate?.();
              }}
              type="button"
            >
              Cambiar perfil {I.chevronRight}
            </button>
          </div>
        </div>
      </div>

      {/* Menú */}
      <nav className="px-4 pb-4 space-y-4 overflow-auto">
        {sections.map((sec) => (
          <div key={sec.title || "no-title"}>
            {sec.title ? (
              <div className="px-2 pb-2 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                {sec.title}
              </div>
            ) : null}

            <div className="space-y-2">
              {sec.items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isRouteActive(pathname || "", item.href, item.exact)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="mt-auto px-4 pb-5 space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">{I.user}</div>
            <div className="min-w-0">
              <div className="text-sm font-bold">Completar perfil</div>
              <div className="text-xs text-amber-600 mt-1">Pendiente</div>
            </div>
          </div>
          <button
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white/70 px-3 py-2 text-sm font-semibold hover:bg-white"
            onClick={() => {
              router.push("/profile");
              onNavigate?.();
            }}
            type="button"
          >
            Ir a perfil
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">{I.users}</div>
            <div className="min-w-0">
              <div className="text-sm font-bold">Mi Equipo</div>
              <div className="text-xs text-slate-500 mt-1">Crear equipo</div>
            </div>
          </div>
          <button
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white/70 px-3 py-2 text-sm font-semibold hover:bg-white"
            onClick={() => {
              router.push("/team");
              onNavigate?.();
            }}
            type="button"
          >
            Gestionar equipo
          </button>
        </div>

        <button
          className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/60 flex items-center justify-start gap-3"
          onClick={async () => {
            await logout();
            router.push("/login");
            onNavigate?.();
          }}
          type="button"
        >
          <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            {I.logout}
          </span>
          <span>Salir</span>
        </button>

        <div className="px-2 text-xs text-slate-400">v0.1 local</div>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // cierra al cambiar de ruta
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // evita scroll del body cuando el drawer está abierto (mobile)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* ✅ Desktop sidebar fijo */}
      <div className="hidden lg:block">
        <SidebarInner />
      </div>

      {/* ✅ Mobile/Tablet: botón abrir */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 rounded-xl border border-slate-200 bg-white/80 backdrop-blur px-3 py-2 shadow-sm"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        {I.menu}
      </button>

      {/* ✅ Drawer */}
      {open ? (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* overlay */}
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          {/* panel */}
          <div className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] shadow-2xl">
            {/* header drawer */}
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white/90 backdrop-blur px-3 py-2 shadow-sm"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                {I.close}
              </button>
            </div>

            <SidebarInner onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

// "use client";

// import Link from "next/link";
// import { usePathname, useRouter } from "next/navigation";
// import { useAuth } from "@/context/AuthContext";

// type NavItem = { href: string; label: string; icon?: string };

// function NavLink({
//   href,
//   label,
//   icon,
//   active,
// }: NavItem & { active: boolean }) {
//   return (
//     <Link
//       href={href}
//       className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition
//       ${active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-200/60"}`}
//     >
//       <span className="w-5 text-center">{icon || "•"}</span>
//       <span>{label}</span>
//     </Link>
//   );
// }

// export default function Sidebar() {
//   const pathname = usePathname();
//   const router = useRouter();
//   const { user, logout } = useAuth();

//   // Menú tipo MVP (Producer)
//   const nav: NavItem[] = [
//     { href: "/dashboard", label: "Dashboard", icon: "📊" },
//     { href: "/producer/projects", label: "Proyectos", icon: "📁" },
//     { href: "/billing", label: "Cobros", icon: "💳" },
//     { href: "/contacts", label: "Contactos", icon: "👥" },
//     { href: "/assistant", label: "Asistente IA", icon: "🤖" },
//   ];

//   const isActive = (href: string) => {
//     // marca activo por prefijo (ej: /producer/projects y sus subrutas)
//     if (href === "/dashboard") return pathname === "/dashboard";
//     return pathname?.startsWith(href);
//   };

//   return (
//     <aside className="w-[260px] min-h-screen border-r border-slate-200/80 bg-white/40 backdrop-blur flex flex-col">
//       {/* Logo */}
//       <div className="p-6">
//         <div className="flex items-center gap-3">
//           <div
//             className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
//             style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)" }}
//           >
//             W
//           </div>
//           <div className="leading-tight">
//             <div className="font-extrabold">wezet</div>
//             <div className="text-xs text-slate-500">Producer Console</div>
//           </div>
//         </div>

//         {/* Perfil / cambiar perfil (tipo MVP) */}
//         <div className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-3">
//           <div className="text-xs text-slate-500">Perfil</div>
//           <div className="mt-1 flex items-center justify-between gap-2">
//             <div className="min-w-0">
//               <div className="text-sm font-bold text-slate-900 truncate">Empresa Creativa</div>
//               <div className="text-[11px] text-slate-500 truncate">
//                 {user?.email ? user.email : "—"}
//               </div>
//             </div>
//             <button
//               className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap"
//               onClick={() => router.push("/profile")}
//             >
//               Cambiar →
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Menú */}
//       <nav className="px-4 pb-4 space-y-2">
//         {nav.map((n) => (
//           <NavLink key={n.href} {...n} active={isActive(n.href)} />
//         ))}
//       </nav>

//       {/* Bottom area (cards como MVP) */}
//       <div className="mt-auto px-4 pb-5 space-y-3">
//         <div className="rounded-2xl border border-slate-200 bg-white/60 p-4">
//           <div className="flex items-start gap-3">
//             <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
//               👤
//             </div>
//             <div className="min-w-0">
//               <div className="text-sm font-bold">Completar perfil</div>
//               <div className="text-xs text-amber-600 mt-1">⚠ Pendiente</div>
//             </div>
//           </div>
//           <button
//             className="mt-3 w-full rounded-xl border border-slate-300 bg-white/70 px-3 py-2 text-sm font-semibold hover:bg-white"
//             onClick={() => router.push("/profile")}
//           >
//             Ir a perfil
//           </button>
//         </div>

//         <div className="rounded-2xl border border-slate-200 bg-white/60 p-4">
//           <div className="flex items-start gap-3">
//             <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
//               👥
//             </div>
//             <div className="min-w-0">
//               <div className="text-sm font-bold">Mi Equipo</div>
//               <div className="text-xs text-slate-500 mt-1">Crear equipo</div>
//             </div>
//           </div>
//           <button
//             className="mt-3 w-full rounded-xl border border-slate-300 bg-white/70 px-3 py-2 text-sm font-semibold hover:bg-white"
//             onClick={() => router.push("/team")}
//           >
//             Gestionar equipo
//           </button>
//         </div>

//         <button
//           className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/60 flex items-center justify-start gap-3"
//           onClick={async () => {
//             await logout();
//             router.push("/login");
//           }}
//         >
//           <span className="w-5 text-center">←</span>
//           <span>Salir</span>
//         </button>

//         <div className="px-2 text-xs text-slate-400">v0.1 local</div>
//       </div>
//     </aside>
//   );
// }
