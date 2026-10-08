import { FileText } from "lucide-react";

export function NotesPanel({ projectId: _projectId }: { projectId: string }) {
  return (
    <section className="max-w-[880px] p-10">
      <h1 className="text-[30px] font-medium tracking-[-0.03em]">Notes</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A home for the thoughts you want to keep.
      </p>
      <div className="flex flex-col items-center gap-3 px-6 py-[100px] text-center text-muted-foreground">
        <FileText className="size-7" strokeWidth={1.5} />
        <h2 className="text-base text-foreground">No notes yet</h2>
        <p className="text-[13px] leading-relaxed">
          Capture a thought with a sticky note on your canvas.
          <br />
          Your project notebook is coming next.
        </p>
      </div>
    </section>
  );
}
