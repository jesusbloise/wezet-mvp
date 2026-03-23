"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex-1 min-w-0 bg-[#070b14]">
          <Topbar />

          <main className="px-4 sm:px-6 lg:px-7 py-6 lg:py-7 bg-[#070b14]">
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


