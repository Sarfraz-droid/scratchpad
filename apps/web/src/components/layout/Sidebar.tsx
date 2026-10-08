import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowUpRight, Check, Folder, Lightbulb, Menu, Search, X } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { NewProjectForm } from "@/components/layout/NewProjectForm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const starterProjects = [
  { id: "startup-ideas", name: "Startup Ideas" },
  { id: "job-search-agent", name: "Job Search Agent" },
];

export function Sidebar() {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const { projectId } = useParams();
  const location = useLocation();
  const projects = useProjectStore((s) => s.projects);
  const projectsLoaded = useProjectStore((s) => s.projectsLoaded);
  const close = () => {
    setOpen(false);
    setPinned(false);
  };
  useEffect(() => {
    close();
  }, [location.pathname]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      ref={root}
      className="absolute right-5 top-3.5 z-[400]"
      onPointerEnter={(event) => {
        clearTimeout(timer.current);
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={() => {
        if (!pinned)
          timer.current = setTimeout(() => {
            if (!root.current?.contains(document.activeElement)) setOpen(false);
          }, 220);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <Button
        ref={trigger}
        variant="ghost"
        size="icon"
        aria-label="Open project sidebar"
        aria-expanded={open}
        aria-controls="project-sidebar"
        onClick={() => {
          if (pinned) close();
          else {
            setPinned(true);
            setOpen(true);
          }
        }}
      >
        <Menu />
      </Button>
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
            transition={{ duration: reducedMotion ? 0 : 0.16 }}
            id="project-sidebar"
            aria-label="Project sidebar"
            className="absolute right-0 top-10 w-[310px] rounded-xl bg-popover text-popover-foreground shadow-[0_12px_48px_rgb(0_0_0_/_12%),0_2px_6px_rgb(0_0_0_/_5%)]"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Your workspace</h2>
                <p className="mt-1 text-xs text-muted-foreground">Projects</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close project sidebar"
                onClick={() => {
                  close();
                  trigger.current?.focus();
                }}
              >
                <X />
              </Button>
            </div>
            <nav aria-label="Projects" className="flex flex-col gap-1 px-3 pb-5">
              {!projectsLoaded ? (
                <p className="px-3 py-4 text-[13px] text-muted-foreground">Loading projects…</p>
              ) : projects.length === 0 ? (
                <p className="px-3 py-4 text-[13px] text-muted-foreground">No projects yet.</p>
              ) : (
                projects.map((project, index) => {
                  const Icon = index === 0 ? Lightbulb : index === 1 ? Search : Folder;
                  return (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      aria-current={projectId === project.id ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-sm px-3 py-[13px] text-[13px] transition-colors hover:bg-muted",
                        projectId === project.id &&
                          "bg-primary text-primary-foreground hover:bg-primary",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="flex-1 truncate">{project.name}</span>
                      {projectId === project.id && <Check className="size-4" />}
                    </Link>
                  );
                })
              )}
              {projectsLoaded && <NewProjectForm />}
            </nav>
            <Link
              to="/"
              className="flex items-center justify-between border-t px-6 py-4 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              All projects <ArrowUpRight className="size-4" />
            </Link>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
