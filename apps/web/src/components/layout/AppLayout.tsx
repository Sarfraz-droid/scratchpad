import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { useBootstrapProjects } from "@/hooks/useBootstrapProjects";

export function AppLayout() {
  useBootstrapProjects();

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      <main className="h-full min-w-0 overflow-hidden">
        <Outlet />
      </main>
      <Sidebar />
    </div>
  );
}
