import { Link } from "react-router-dom";
import { ArrowUpRight, Layers, Lightbulb, Search } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { NewProjectForm } from "@/components/layout/NewProjectForm";

export function HomePage() {
  const projects = useProjectStore((s) => s.projects);
  const projectsLoaded = useProjectStore((s) => s.projectsLoaded);

  return (
    <div className="h-full overflow-auto">
      <header className="flex h-16 shrink-0 items-center gap-[18px] border-b bg-background px-6">
        <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-primary text-primary-foreground">
          <Layers className="size-5" />
        </span>
        <span className="text-sm font-semibold">Scratchpad</span>
      </header>
      <div className="mx-auto w-full max-w-[540px] px-6 py-[100px]">
        <h1 className="text-[30px] font-medium tracking-[-0.03em]">A place to think.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick up a project and see where it takes you.
        </p>
        <nav aria-label="Your projects" className="mt-10 flex flex-col gap-2">
          {!projectsLoaded ? (
            <p className="px-3 py-5 text-sm text-muted-foreground">Loading your projects…</p>
          ) : (
            <>
              {projects.length === 0 && (
                <p className="px-3 py-5 text-sm text-muted-foreground">No projects yet.</p>
              )}
              {projects.map((project, index) => {
                const Icon = index === 0 ? Lightbulb : Search;
                return (
                  <Link
                    className="flex items-center gap-4 border-b px-3 py-5 text-sm transition-colors hover:bg-muted"
                    to={`/projects/${project.id}`}
                    key={project.id}
                  >
                    <Icon className="size-5" />
                    <span className="flex-1">{project.name}</span>
                    <ArrowUpRight className="size-4" />
                  </Link>
                );
              })}
              <NewProjectForm triggerClassName="border-b py-5" />
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
