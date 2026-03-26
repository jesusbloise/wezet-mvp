"use client";

import Link from "next/link";
import Image from "next/image";
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

const I = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M3 13h8V3H3v10Z" />
      <path d="M13 21h8V11h-8v10Z" />
      <path d="M13 3h8v6h-8V3Z" />
      <path d="M3 17h8v4H3v-4Z" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M3 7h18v10H3V7Z" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  bot: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 2v3" />
      <path d="M7 6h10a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4Z" />
      <path d="M8 12h.01" />
      <path d="M16 12h.01" />
      <path d="M9 16h6" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M10 17l-1 0a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h1" />
      <path d="M15 7l5 5-5 5" />
      <path d="M20 12H10" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
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

function formatRole(role?: string) {
  if (role === "producer_owner") return "Producer Admin";
  if (role === "producer_admin") return "Producer Admin";
  if (role === "producer_member") return "Producer Member";
  if (role === "producer_viewer") return "Producer Viewer";
  if (role === "producer") return "Producer";
  if (role === "creative") return "Creative";
  if (role === "client") return "Client";
  return "Usuario";
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
        "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200",
        active
          ? "bg-[#f2c94c] text-[#0b0f17] shadow-lg shadow-black/20"
          : "text-slate-300 hover:bg-white/6 hover:text-white",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200",
          active
            ? "bg-black/10 text-[#0b0f17]"
            : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white",
        ].join(" ")}
      >
        {icon}
      </span>

      <span className="truncate font-ui uppercase tracking-[0.08em]">{label}</span>
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
      title: "Workspace",
      items: [{ href: "/projects", label: "Proyectos", icon: I.folder }],
    },
    {
      title: "Gestión",
      items: [
        { href: "/ndas", label: "NDAs", icon: I.folder },
        { href: "/billing", label: "Cobros", icon: I.card },
        { href: "/contacts", label: "Contactos", icon: I.user },
        { href: "/assistant", label: "Asistente IA", icon: I.bot },
        { href: "/team", label: "Equipo", icon: I.users },
        { href: "/profile", label: "Perfil", icon: I.user, exact: true },
      ],
    },
  ];

  return (
    <aside className="flex h-full w-[280px] flex-col border-r border-white/8 bg-[#0a0d14] text-white backdrop-blur-2xl">
      <div className="p-6">
        <div className="flex items-center">
          <Image
            src="/WEZET.png"
            alt="Wezet"
            width={220}
            height={90}
            priority
            unoptimized
            className="h-auto w-[220px] object-contain"
          />
        </div>

        <div className="mt-6 rounded-[22px] border border-white/8 bg-white/[0.03] p-4 shadow-lg shadow-black/20">
          <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Sesión
          </div>

          <div className="mt-3">
            <div className="truncate text-sm font-bold text-white">{formatRole(user?.role)}</div>
            <div className="truncate text-[12px] text-slate-400">{user?.email || "—"}</div>
          </div>
        </div>
      </div>

      <nav className="space-y-5 overflow-auto px-4 pb-4">
        {sections.map((sec) => (
          <div key={sec.title || "no-title"}>
            {sec.title ? (
              <div className="px-2 pb-2 font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
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

      <div className="mt-auto space-y-3 px-4 pb-5">
        <button
          className="flex w-full items-center justify-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
          onClick={async () => {
            await logout();
            router.push("/login");
            onNavigate?.();
          }}
          type="button"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/6 text-slate-200">
            {I.logout}
          </span>
          <span className="font-ui uppercase tracking-[0.06em]">Salir</span>
        </button>

        <div className="px-2 font-ui text-[11px] uppercase tracking-[0.14em] text-slate-600">
          v0.1 local
        </div>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
      <div className="hidden lg:block">
        <SidebarInner />
      </div>

      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-2xl border border-white/10 bg-[#0a0d14]/95 px-3 py-2 text-white shadow-lg backdrop-blur-xl lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        {I.menu}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[300px] max-w-[86vw] shadow-2xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                className="rounded-2xl border border-white/10 bg-[#0a0d14]/95 px-3 py-2 text-white shadow-lg backdrop-blur-xl"
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
// import Image from "next/image";
// import { usePathname, useRouter } from "next/navigation";
// import { useAuth } from "@/context/AuthContext";
// import { useEffect, useState } from "react";

// type NavItem = {
//   href: string;
//   label: string;
//   icon: React.ReactNode;
//   exact?: boolean;
// };

// type NavSection = {
//   title?: string;
//   items: NavItem[];
// };

// const I = {
//   dashboard: (
//     <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
//       <path d="M3 13h8V3H3v10Z" />
//       <path d="M13 21h8V11h-8v10Z" />
//       <path d="M13 3h8v6h-8V3Z" />
//       <path d="M3 17h8v4H3v-4Z" />
//     </svg>
//   ),
//   folder: (
//     <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
//       <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
//     </svg>
//   ),
//   card: (
//     <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
//       <path d="M3 7h18v10H3V7Z" />
//       <path d="M3 10h18" />
//       <path d="M7 15h4" />
//     </svg>
//   ),
//   users: (
//     <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
//       <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" />
//       <path d="M4 21a8 8 0 0 1 16 0" />
//     </svg>
//   ),
//   bot: (
//     <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
//       <path d="M12 2v3" />
//       <path d="M7 6h10a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4Z" />
//       <path d="M8 12h.01" />
//       <path d="M16 12h.01" />
//       <path d="M9 16h6" />
//     </svg>
//   ),
//   user: (
//     <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
//       <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
//       <path d="M4 21a8 8 0 0 1 16 0" />
//     </svg>
//   ),
//   logout: (
//     <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
//       <path d="M10 17l-1 0a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h1" />
//       <path d="M15 7l5 5-5 5" />
//       <path d="M20 12H10" />
//     </svg>
//   ),
//   menu: (
//     <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
//       <path d="M4 6h16" />
//       <path d="M4 12h16" />
//       <path d="M4 18h16" />
//     </svg>
//   ),
//   close: (
//     <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2">
//       <path d="M6 6l12 12" />
//       <path d="M18 6L6 18" />
//     </svg>
//   ),
// };

// function isRouteActive(pathname: string, href: string, exact?: boolean) {
//   if (!pathname) return false;
//   if (exact) return pathname === href;
//   if (href === "/dashboard") return pathname === "/dashboard";
//   return pathname === href || pathname.startsWith(href + "/");
// }

// function formatRole(role?: string) {
//   if (role === "producer_owner") return "Admin";
//   if (role === "producer") return "Producer";
//   if (role === "creative") return "Creative";
//   if (role === "client") return "Client";
//   return "Usuario";
// }

// function NavLink({
//   href,
//   label,
//   icon,
//   active,
//   onNavigate,
// }: {
//   href: string;
//   label: string;
//   icon: React.ReactNode;
//   active: boolean;
//   onNavigate?: () => void;
// }) {
//   return (
//     <Link
//       href={href}
//       onClick={onNavigate}
//       className={[
//         "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200",
//         active
//           ? "bg-[#f2c94c] text-[#0b0f17] shadow-lg shadow-black/20"
//           : "text-slate-300 hover:bg-white/6 hover:text-white",
//       ].join(" ")}
//     >
//       <span
//         className={[
//           "flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200",
//           active
//             ? "bg-black/10 text-[#0b0f17]"
//             : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white",
//         ].join(" ")}
//       >
//         {icon}
//       </span>

//       <span className="truncate font-ui uppercase tracking-[0.08em]">{label}</span>
//     </Link>
//   );
// }

// function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
//   const pathname = usePathname();
//   const router = useRouter();
//   const { user, logout } = useAuth();

//   const sections: NavSection[] = [
//     {
//       title: "General",
//       items: [{ href: "/dashboard", label: "Dashboard", icon: I.dashboard, exact: true }],
//     },
//     {
//        title: "Workspace",
//       items: [{ href: "/projects", label: "Proyectos", icon: I.folder }],
//       // title: "Producer",
//       // items: [{ href: "/producer/projects", label: "Proyectos", icon: I.folder }],
//     },
//     {
//       title: "Gestión",
//       items: [
//         { href: "/ndas", label: "NDAs", icon: I.folder },
//         { href: "/billing", label: "Cobros", icon: I.card },
//         { href: "/contacts", label: "Contactos", icon: I.user },
//         { href: "/assistant", label: "Asistente IA", icon: I.bot },
//         { href: "/team", label: "Equipo", icon: I.users },
//         { href: "/profile", label: "Perfil", icon: I.user, exact: true },
//       ],
//     },
//   ];

//   return (
//     <aside className="flex h-full w-[280px] flex-col border-r border-white/8 bg-[#0a0d14] text-white backdrop-blur-2xl">
//       <div className="p-6">
//         <div className="flex items-center">
//           <Image
//             src="/WEZET.png"
//             alt="Wezet"
//             width={220}
//             height={90}
//             priority
//             unoptimized
//             className="h-auto w-[220px] object-contain"
//           />
//         </div>

//         <div className="mt-6 rounded-[22px] border border-white/8 bg-white/[0.03] p-4 shadow-lg shadow-black/20">
//           <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
//             Sesión
//           </div>

//           <div className="mt-3">
//             <div className="truncate text-sm font-bold text-white">{formatRole(user?.role)}</div>
//             <div className="truncate text-[12px] text-slate-400">{user?.email || "—"}</div>
//           </div>
//         </div>
//       </div>

//       <nav className="space-y-5 overflow-auto px-4 pb-4">
//         {sections.map((sec) => (
//           <div key={sec.title || "no-title"}>
//             {sec.title ? (
//               <div className="px-2 pb-2 font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
//                 {sec.title}
//               </div>
//             ) : null}

//             <div className="space-y-2">
//               {sec.items.map((item) => (
//                 <NavLink
//                   key={item.href}
//                   href={item.href}
//                   label={item.label}
//                   icon={item.icon}
//                   active={isRouteActive(pathname || "", item.href, item.exact)}
//                   onNavigate={onNavigate}
//                 />
//               ))}
//             </div>
//           </div>
//         ))}
//       </nav>

//       <div className="mt-auto space-y-3 px-4 pb-5">
//         <button
//           className="flex w-full items-center justify-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
//           onClick={async () => {
//             await logout();
//             router.push("/login");
//             onNavigate?.();
//           }}
//           type="button"
//         >
//           <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/6 text-slate-200">
//             {I.logout}
//           </span>
//           <span className="font-ui uppercase tracking-[0.06em]">Salir</span>
//         </button>

//         <div className="px-2 font-ui text-[11px] uppercase tracking-[0.14em] text-slate-600">
//           v0.1 local
//         </div>
//       </div>
//     </aside>
//   );
// }

// export default function Sidebar() {
//   const pathname = usePathname();
//   const [open, setOpen] = useState(false);

//   useEffect(() => {
//     setOpen(false);
//   }, [pathname]);

//   useEffect(() => {
//     if (!open) return;
//     const prev = document.body.style.overflow;
//     document.body.style.overflow = "hidden";
//     return () => {
//       document.body.style.overflow = prev;
//     };
//   }, [open]);

//   return (
//     <>
//       <div className="hidden lg:block">
//         <SidebarInner />
//       </div>

//       <button
//         type="button"
//         className="fixed left-4 top-4 z-50 rounded-2xl border border-white/10 bg-[#0a0d14]/95 px-3 py-2 text-white shadow-lg backdrop-blur-xl lg:hidden"
//         onClick={() => setOpen(true)}
//         aria-label="Abrir menú"
//       >
//         {I.menu}
//       </button>

//       {open ? (
//         <div className="fixed inset-0 z-50 lg:hidden">
//           <button
//             type="button"
//             className="absolute inset-0 bg-black/70"
//             aria-label="Cerrar menú"
//             onClick={() => setOpen(false)}
//           />
//           <div className="absolute left-0 top-0 h-full w-[300px] max-w-[86vw] shadow-2xl">
//             <div className="absolute right-3 top-3 z-10">
//               <button
//                 type="button"
//                 className="rounded-2xl border border-white/10 bg-[#0a0d14]/95 px-3 py-2 text-white shadow-lg backdrop-blur-xl"
//                 onClick={() => setOpen(false)}
//                 aria-label="Cerrar"
//               >
//                 {I.close}
//               </button>
//             </div>

//             <SidebarInner onNavigate={() => setOpen(false)} />
//           </div>
//         </div>
//       ) : null}
//     </>
//   );
// }

