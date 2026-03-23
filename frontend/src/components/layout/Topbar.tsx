"use client";

import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";

function initials(email?: string) {
  if (!email) return "U";
  const name = email.split("@")[0] || "U";
  return name.slice(0, 1).toUpperCase();
}

function formatRole(role?: string) {
  if (!role) return "Usuario";
  if (role === "producer_owner") return "Admin";
  if (role === "producer") return "Producer";
  if (role === "creative") return "Creative";
  if (role === "client") return "Client";
  return role;
}

function getSectionTitle(pathname: string) {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/producer/projects")) return "Projects";
  if (pathname.startsWith("/billing")) return "Billing";
  if (pathname.startsWith("/contacts")) return "Contacts";
  if (pathname.startsWith("/assistant")) return "Assistant";
  if (pathname.startsWith("/team")) return "Team";
  if (pathname.startsWith("/profile")) return "Profile";
  return "Panel";
}

export default function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const title = getSectionTitle(pathname || "");

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0a0d14]/88 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-7">
        <div className="min-w-0 flex items-center gap-3 pl-14 lg:pl-0">
          <div className="hidden md:inline-flex rounded-full border border-[#f2c94c]/25 bg-[#f2c94c]/10 px-4 py-2 font-ui text-[11px] uppercase tracking-[0.18em] text-[#f2c94c]">
            // workspace
          </div>

          <div className="hidden xl:block relative h-8 w-[92px]">
            <Image
              src="/WEZET.png"
              alt="Wezet"
              fill
              className="object-contain object-left"
              unoptimized
            />
          </div>

          <div className="min-w-0">
            <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Wezet Console
            </div>
            <div className="truncate text-lg font-extrabold tracking-tight text-white">
              {title}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2c94c] text-sm font-black text-[#0b0f17]">
                  {initials(user.email)}
                </div>

                <div className="hidden lg:block leading-tight">
                  <div className="max-w-[240px] truncate text-sm font-semibold text-white">
                    {user.email}
                  </div>
                  <div className="font-ui text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    {formatRole(user.role)}
                  </div>
                </div>
              </div>

              <div className="sm:hidden flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2c94c] text-sm font-black text-[#0b0f17]">
                  {initials(user.email)}
                </div>
              </div>
            </>
          ) : null}

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 font-ui text-sm uppercase tracking-[0.06em] text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
// "use client";

// import { useAuth } from "@/context/AuthContext";
// import { useRouter } from "next/navigation";

// function initials(email?: string) {
//   if (!email) return "U";
//   const name = email.split("@")[0] || "U";
//   return name.slice(0, 1).toUpperCase();
// }

// export default function Topbar() {
//   const { user, logout } = useAuth();
//   const router = useRouter();

//   return (
//     <header className="h-14 border-b border-slate-200/80 bg-white/40 backdrop-blur flex items-center justify-between px-4 sm:px-6 lg:px-7">
//       {/* Left: deja espacio en mobile para el botón del sidebar */}
//       <div className="flex items-center gap-3 pl-14 lg:pl-0 min-w-0">
//         <div className="text-sm font-semibold text-slate-700 truncate">Panel</div>
//       </div>

//       {/* Right */}
//       <div className="flex items-center gap-3">
//         {user ? (
//           <>
//             {/* Mobile: avatar + role corto */}
//             <div className="flex items-center gap-2 lg:hidden">
//               <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
//                 {initials(user.email)}
//               </div>
//               <div className="text-[11px] text-slate-600 font-semibold capitalize">
//                 {user.role}
//               </div>
//             </div>

//             {/* Desktop: email + role */}
//             <div className="hidden lg:block text-xs text-slate-600 max-w-[360px] truncate">
//               {user.email} • {user.role}
//             </div>
//           </>
//         ) : null}

//         <button
//           type="button"
//           className="mvp-btn border border-slate-300 px-3 py-1.5 text-sm bg-white/60 hover:bg-white"
//           onClick={async () => {
//             await logout();
//             router.push("/login");
//           }}
//         >
//           Salir
//         </button>
//       </div>
//     </header>
//   );
// }

