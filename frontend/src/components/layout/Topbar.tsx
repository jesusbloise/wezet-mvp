"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="h-14 border-b border-slate-200/80 bg-white/40 backdrop-blur flex items-center justify-between px-7">
      <div className="text-sm font-semibold text-slate-700">Panel</div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="text-xs text-slate-600">
            {user.email} • {user.role}
          </div>
        ) : null}

        <button
          className="mvp-btn border border-slate-300 px-3 py-1.5 text-sm bg-white/60 hover:bg-white"
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
        >
          Salir
        </button>
      </div>
    </div>
  );
}

// "use client";

// import { useAuth } from "@/context/AuthContext";
// import { useRouter } from "next/navigation";

// export default function Topbar() {
//   const { user, logout } = useAuth();
//   const router = useRouter();

//   return (
//     <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:ml-[220px]">
//       <div className="text-sm text-slate-700">Panel</div>

//       <div className="flex items-center gap-3">
//         <div className="text-xs text-slate-600 hidden sm:block">
//           {user?.email} • {user?.role}
//         </div>
//         <button
//           className="text-xs rounded-lg border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50"
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