"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="flex">
        <Sidebar />

        <div className="flex-1">
          <Topbar />
          <main className="px-7 py-7">
            <div className="max-w-[1100px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}


// import Sidebar from "./Sidebar";
// import Topbar from "./Topbar";

// export default function AppShell({ children }: { children: React.ReactNode }) {
//   return (
//     <div className="min-h-screen bg-slate-100 text-slate-900">
//       <Sidebar />
//       <div className="md:ml-[220px]">
//         <Topbar />
//         <main className="p-6">{children}</main>
//       </div>
//     </div>
//   );
// }