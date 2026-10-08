import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, ArrowUpRight, MessageSquare, Minus, LoaderCircle, SquarePen } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { captureCanvasImage } from "@/lib/capture-canvas-image";
import { applyCanvasActions } from "@/lib/apply-canvas-actions";
import { useChatStore } from "@/store/useChatStore";
import type { Chat, ChatMessage, CanvasElementAction } from "@scratchpad/shared";

const EMPTY_MESSAGES: ReturnType<typeof useChatStore.getState>["messagesByProject"][string] = [];
const suggestions = [
  { label: "Untangle a thought", draft: "Help me untangle this thought: " },
  { label: "Explore an idea", draft: "I'd like to explore an idea: " },
  { label: "Figure out what's next", draft: "Help me figure out the next step for " },
];

export function ChatPanel({ projectId }: { projectId: string }) {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(true);
  const [sending, setSending] = useState(false);
  const [startingFresh, setStartingFresh] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const endOfMessages = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const messages = useChatStore((s) => s.messagesByProject[projectId] ?? EMPTY_MESSAGES);
  const setMessages = useChatStore((s) => s.setMessages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const expanded = messages.length > 0 || sending;

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ block: "end", behavior: "instant" });
  }, [messages.length, sending, open]);

  const startFresh = async () => {
    if (sending || loadingThread || startingFresh) return;
    setStartingFresh(true);
    setError(null);
    try {
      const thread = await api.post<Chat>(`/api/chat/${projectId}/thread`, {});
      setChatId(thread.id);
      setMessages(projectId, []);
      setDraft("");
    } catch {
      setError("Couldn't start a new chat. Your conversation is still here. Try again.");
    } finally {
      setStartingFresh(false);
    }
  };

  // Load (or create) this project's default chat thread, then its message history.
  useEffect(() => {
    let cancelled = false;
    setLoadingThread(true);
    setChatId(null);
    setError(null);

    (async () => {
      try {
        const thread = await api.get<Chat>(`/api/chat/${projectId}/thread`);
        const history = await api.get<ChatMessage[]>(`/api/chat/${projectId}/messages?chatId=${encodeURIComponent(thread.id)}`);
        if (cancelled) return;
        setChatId(thread.id);
        setMessages(projectId, history);
      } catch (err) {
        console.error("Failed to load chat thread", err);
        if (!cancelled) setError("Couldn't load this project's chat. Is the server running?");
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, setMessages]);

  const collapse = () => {
    restoreFocus.current = true;
    setOpen(false);
  };

  const send = async () => {
    const content = draft.trim();
    if (!content || !chatId || sending || startingFresh) return;
    setPendingMessage(content);
    setDraft("");
    setSending(true);
    setError(null);
    try {
      const canvasImage = await captureCanvasImage(projectId);
      const { userMessage, assistantMessage, canvasActions } = await api.post<{
        userMessage: ChatMessage;
        assistantMessage: ChatMessage;
        canvasActions?: CanvasElementAction[];
      }>(`/api/chat/${projectId}/messages`, { chatId, content, canvasImage });
      appendMessage(projectId, userMessage);
      appendMessage(projectId, assistantMessage);
      if (canvasActions?.length) {
        applyCanvasActions(projectId, canvasActions);
      }
    } catch (err) {
      console.error("Failed to send chat message", err);
      setError("That message didn't send. Your draft is restored below.");
      setDraft(content);
    } finally {
      setPendingMessage(null);
      setSending(false);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-16 top-20 z-[300] flex items-end justify-end sm:left-auto sm:right-6 sm:top-24">
      <AnimatePresence initial={false} mode="wait">
        {open && (
          <motion.section
            key="panel"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : 3 }}
            transition={{ duration: reducedMotion ? 0 : 0.14, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => {
              if (restoreFocus.current) {
                input.current?.focus();
                restoreFocus.current = false;
              }
            }}
            id="idea-copilot"
            aria-label="Talk it through"
            className={cn("pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-xl selection:bg-primary/40", expanded ? "max-h-[820px] sm:w-[min(640px,calc(100vw-3rem))]" : "max-h-[560px] sm:w-96")}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                collapse();
              }
            }}
          >
            <header className="flex shrink-0 items-center gap-3 border-b px-5 py-3">
              <MessageSquare className="size-5 text-foreground" aria-hidden="true" />
              <div className="flex-1">
                <h2 className="text-sm font-semibold">Talk it through</h2>
              </div>
              <Button variant="ghost" className="h-11 rounded-lg px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring" onClick={() => void startFresh()} disabled={loadingThread || sending || startingFresh || messages.length === 0} title="Start a fresh conversation; previous messages stay stored">
                <SquarePen aria-hidden="true" /> New chat
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Minimize conversation"
                onClick={collapse}
              >
                <Minus />
              </Button>
            </header>
            <ScrollArea className="min-h-0 flex-1">
              {loadingThread || startingFresh ? (
                <div role="status" className="flex min-h-64 flex-col justify-center gap-5 px-6 py-8">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" />{startingFresh ? "Starting fresh…" : "Opening your conversation…"}</div>
                  <div aria-hidden="true" className="space-y-3 animate-pulse motion-reduce:animate-none"><div className="ml-auto h-12 w-2/3 rounded-xl bg-muted" /><div className="h-3 w-3/4 rounded bg-muted" /><div className="h-3 w-full rounded bg-muted" /><div className="h-3 w-1/2 rounded bg-muted" /></div>
                </div>
              ) : messages.length === 0 && !sending ? (
                <div className="px-6 pb-5 pt-7">
                  <h3 className="text-2xl font-medium leading-tight tracking-tight">
                    What’s on your mind?
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    A messy thought, a half-formed idea, a question. Start wherever you are.
                  </p>
                  <div className="mt-6 flex flex-col gap-1">
                    {suggestions.map((suggestion) => (
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none disabled:opacity-50"
                        key={suggestion.label}
                        disabled={loadingThread || sending}
                        onClick={() => {
                          setDraft(suggestion.draft);
                          input.current?.focus();
                        }}
                      >
                        <span>{suggestion.label}</span>
                        <ArrowUpRight className="size-3.5 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6 px-8 py-7" aria-live="polite">
                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={cn(
                        "min-w-0 max-w-full text-sm leading-7",
                        message.role === "user" && "self-end rounded-[10px] bg-muted px-3.5 py-3",
                      )}
                    >
                      <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                        {message.role === "user" ? "You" : "Scratchpad"}
                      </p>
                      {message.role === "user" ? <p className="whitespace-pre-wrap break-words">{message.content}</p> : (
                        <div className="min-w-0 break-words [&_p]:my-3 [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_blockquote]:border-l [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs [&_a]:underline [&_a]:underline-offset-4 [&_th]:border [&_th]:p-2 [&_td]:border [&_td]:p-2 [&_hr]:my-5">
                          <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{ table: ({ children }) => <div className="my-4 overflow-x-auto"><table className="w-full border-collapse text-left">{children}</table></div>, a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>, img: ({ alt }) => <span>{alt}</span> }}>{message.content}</Markdown>
                        </div>
                      )}
                    </article>
                  ))}
                  {sending && (
                    <>
                    <article className="max-w-[88%] self-end rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed"><p className="mb-1 text-xs text-muted-foreground">You</p><p className="whitespace-pre-wrap break-words">{pendingMessage}</p></article>
                    <article role="status" className="text-sm leading-relaxed">
                      <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Scratchpad</p>
                      <div className="flex items-center gap-3 py-2 text-muted-foreground"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /><span>Thinking it through…</span></div>
                      <p className="text-xs text-muted-foreground">This can take a moment while I look at your canvas.</p>
                    </article>
                    </>
                  )}
                  <div ref={endOfMessages} />
                </div>
              )}
            </ScrollArea>
            <form
              className="relative m-4 mt-2 shrink-0 rounded-xl bg-muted p-3 focus-within:ring-1 focus-within:ring-ring"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <label htmlFor="copilot-draft" className="sr-only">
                Your thought
              </label>
              <Textarea
                ref={input}
                id="copilot-draft"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Put your thoughts into words…"
                rows={2}
                disabled={loadingThread || sending || startingFresh}
                className="min-h-16 resize-none border-0 bg-transparent px-1 py-1 text-base leading-relaxed shadow-none focus-visible:ring-0 sm:text-sm"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="max-w-[250px] text-[11px] leading-relaxed text-muted-foreground">
                  {error ?? (sending ? "Thinking…" : "Enter to send · Shift + Enter for a new line")}
                </span>
                <Button
                  size="icon"
                  className="size-11 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  type="submit"
                  aria-label="Send message"
                  disabled={!draft.trim() || !chatId || loadingThread || sending || startingFresh}
                >
                  <ArrowUp />
                </Button>
              </div>
            </form>
          </motion.section>
        )}
      {!open && (
        <motion.div
          key="launcher"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.1 }}
          onAnimationComplete={() => launcher.current?.focus()}
        >
        <Button
          ref={launcher}
          className="pointer-events-auto h-12 rounded-full px-5 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-expanded={false}
          aria-controls="idea-copilot"
          onClick={() => {
            restoreFocus.current = true;
            setOpen(true);
          }}
        >
          <MessageSquare data-icon="inline-start" />
          Talk it through
        </Button>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
