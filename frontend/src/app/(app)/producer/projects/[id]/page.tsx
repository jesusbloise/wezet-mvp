"use client";

import { useParams } from "next/navigation";
import ProjectTabs from "@/components/projects/ProjectTabs";

export default function OwnedProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";

  if (!id) {
    return <div className="p-6 text-slate-500">Cargando...</div>;
  }

  return (
    <div className="w-full">
      <div className="rounded-3xl bg-[#070b14] p-4 sm:p-6 md:p-7">
        <div className="mx-auto max-w-[1100px]">
          <ProjectTabs projectId={id} mode="page" initialTab="general" showHeader />
        </div>
      </div>
    </div>
  );
}

