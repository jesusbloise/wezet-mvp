"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

function initials(email?: string) {
  if (!email) return "U";
  const name = email.split("@")[0] || "U";
  return name.slice(0, 1).toUpperCase();
}

export default function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="h-14 border-b border-slate-200/80 bg-white/40 backdrop-blur flex items-center justify-between px-4 sm:px-6 lg:px-7">
      {/* Left: deja espacio en mobile para el botón del sidebar */}
      <div className="flex items-center gap-3 pl-14 lg:pl-0 min-w-0">
        <div className="text-sm font-semibold text-slate-700 truncate">Panel</div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {user ? (
          <>
            {/* Mobile: avatar + role corto */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                {initials(user.email)}
              </div>
              <div className="text-[11px] text-slate-600 font-semibold capitalize">
                {user.role}
              </div>
            </div>

            {/* Desktop: email + role */}
            <div className="hidden lg:block text-xs text-slate-600 max-w-[360px] truncate">
              {user.email} • {user.role}
            </div>
          </>
        ) : null}

        <button
          type="button"
          className="mvp-btn border border-slate-300 px-3 py-1.5 text-sm bg-white/60 hover:bg-white"
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
        >
          Salir
        </button>
      </div>
    </header>
  );
}


// "use client";

// import { useAuth } from "@/context/AuthContext";
// import { useRouter } from "next/navigation";

// export default function Topbar() {
//   const { user, logout } = useAuth();
//   const router = useRouter();

//   return (
//     <div className="h-14 border-b border-slate-200/80 bg-white/40 backdrop-blur flex items-center justify-between px-7">
//       <div className="text-sm font-semibold text-slate-700">Panel</div>

//       <div className="flex items-center gap-3">
//         {user ? (
//           <div className="text-xs text-slate-600">
//             {user.email} • {user.role}
//           </div>
//         ) : null}

//         <button
//           className="mvp-btn border border-slate-300 px-3 py-1.5 text-sm bg-white/60 hover:bg-white"
//           onClick={async () => {
//             await logout();
//             router.push("/login");
//           }}
//         >
//           Salir
//         </button>
//       </div>
//     </div>
//   );
// }

