import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateProject } from "@/hooks/useCreateProject";
import { cn } from "@/lib/utils";

interface NewProjectFormProps {
  triggerClassName?: string;
}

export function NewProjectForm({ triggerClassName }: NewProjectFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { creating, error, createProject } = useCreateProject();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-sm px-3 py-[13px] text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          triggerClassName,
        )}
      >
        <Plus className="size-4 shrink-0" />
        <span>New project</span>
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 px-3 py-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await createProject(name);
        setName("");
      }}
    >
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Project name"
          className="h-8 text-[13px]"
          disabled={creating}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setName("");
            }
          }}
        />
        <Button type="submit" size="sm" disabled={!name.trim() || creating}>
          {creating ? "Adding…" : "Add"}
        </Button>
      </div>
      {error && <p className="px-1 text-xs text-destructive">{error}</p>}
    </form>
  );
}
