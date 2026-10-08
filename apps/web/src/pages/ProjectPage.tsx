import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText, Files, LayoutGrid, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CanvasView } from "@/features/canvas/CanvasView";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { FilesPanel } from "@/features/files/FilesPanel";
import { NotesPanel } from "@/features/notes/NotesPanel";
import { useProjectStore } from "@/store/useProjectStore";

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const projects = useProjectStore((s) => s.projects);
  const projectsLoaded = useProjectStore((s) => s.projectsLoaded);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  useEffect(() => {
    setActiveProject(projectId ?? null);
    return () => setActiveProject(null);
  }, [projectId, setActiveProject]);
  if (!projectId) return null;

  const project = projects.find((p) => p.id === projectId);

  // Don't mount CanvasView/ChatPanel (which immediately call the chat/canvas
  // API with `projectId`) until we've confirmed it's a real project id — while
  // projects are still loading, or if the id doesn't match any real project
  // (e.g. a stale link), those calls would 500 against Postgres's uuid column.
  if (!projectsLoaded) {
    return (
      <div className="grid h-full place-items-center text-sm text-muted-foreground">
        Loading project…
      </div>
    );
  }
  if (!project) {
    return (
      <div className="grid h-full place-items-center text-sm text-muted-foreground">
        <div className="text-center">
          <p>Project not found.</p>
          <Link to="/" className="mt-2 inline-block underline">
            Back to all projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <Tabs defaultValue="canvas" className="flex h-full min-h-0 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-[18px] border-b bg-background py-0 pl-6 pr-[76px]">
          <Link
            to="/"
            className="grid size-8 shrink-0 place-items-center rounded-sm bg-primary text-primary-foreground"
            aria-label="Scratchpad home"
          >
            <Layers className="size-5" />
          </Link>
          <div className="flex min-w-0 max-w-[260px] border-r pr-6 text-sm font-semibold">
            <span className="truncate">{project.name}</span>
          </div>
          <TabsList aria-label="Project views" className="gap-1 bg-transparent p-0">
            <TabsTrigger
              value="canvas"
              className="h-[34px] gap-1.5 rounded-sm px-3 text-[13px] data-[state=active]:bg-muted data-[state=active]:shadow-none"
            >
              <LayoutGrid className="size-3.5" />
              Canvas
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="h-[34px] gap-1.5 rounded-sm px-3 text-[13px] data-[state=active]:bg-muted data-[state=active]:shadow-none"
            >
              <Files className="size-3.5" />
              Files
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="h-[34px] gap-1.5 rounded-sm px-3 text-[13px] data-[state=active]:bg-muted data-[state=active]:shadow-none"
            >
              <FileText className="size-3.5" />
              Notes
            </TabsTrigger>
          </TabsList>
          <span className="ml-auto text-xs text-muted-foreground">Scratchpad</span>
        </header>
        <TabsContent
          value="canvas"
          forceMount
          className="relative mt-0 min-h-0 flex-1 data-[state=inactive]:hidden"
        >
          <CanvasView key={projectId} projectId={projectId} />
        </TabsContent>
        <TabsContent value="files" className="relative mt-0 min-h-0 flex-1 overflow-auto">
          <FilesPanel projectId={projectId} />
        </TabsContent>
        <TabsContent value="notes" className="relative mt-0 min-h-0 flex-1 overflow-auto">
          <NotesPanel projectId={projectId} />
        </TabsContent>
      </Tabs>
      <ChatPanel key={projectId} projectId={projectId} />
    </div>
  );
}
