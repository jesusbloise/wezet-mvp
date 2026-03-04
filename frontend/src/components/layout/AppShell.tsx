"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#eef3f7]">
      {/* Layout: mobile stack / desktop two columns */}
      <div className="flex min-h-screen">
        {/* Sidebar:
            - en desktop se muestra (lg:block) dentro del componente
            - en mobile el componente muestra el botón + drawer overlay
        */}
        <Sidebar />

        {/* Main area */}
        <div className="flex-1 min-w-0">
          {/* Topbar siempre arriba */}
          <Topbar />

          {/* Main padding responsive:
              - en mobile usamos px-4
              - en desktop px-7 como tenías
              - dejamos espacio para el botón hamburguesa (top-4 left-4) -> pt-4
          */}
          <main className="px-4 sm:px-6 lg:px-7 py-6 lg:py-7">
            <div className="mx-auto w-full max-w-[1100px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

// "use client";

// import { ReactNode } from "react";
// import Sidebar from "./Sidebar";
// import Topbar from "./Topbar";

// export default function AppShell({ children }: { children: ReactNode }) {
//   return (
//     <div className="min-h-screen">
//       <div className="flex">
//         <Sidebar />

//         <div className="flex-1">
//           <Topbar />
//           <main className="px-7 py-7">
//             <div className="max-w-[1100px]">{children}</div>
//           </main>
//         </div>
//       </div>
//     </div>
//   );
// }


