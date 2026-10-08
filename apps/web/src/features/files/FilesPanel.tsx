import { Files } from "lucide-react";

export function FilesPanel({ projectId: _projectId }: { projectId: string }) {
  return (
    <section className="max-w-[880px] p-10">
      <h1 className="text-[30px] font-medium tracking-[-0.03em]">Files</h1>
      <p className="mt-2 text-sm text-muted-foreground">Reference material for your next idea.</p>
      <div className="flex flex-col items-center gap-3 px-6 py-[100px] text-center text-muted-foreground">
        <Files className="size-7" strokeWidth={1.5} />
        <h2 className="text-base text-foreground">No files yet</h2>
        <p className="text-[13px] leading-relaxed">
          You can already drop images and documents onto your canvas.
          <br />A dedicated file library is coming next.
        </p>
      </div>
    </section>
  );
}
