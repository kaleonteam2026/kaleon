import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useReducedMotion } from "framer-motion";
import { DUR, EASE_OUT } from "@/lib/motion";
import { KaleonLoader } from "@/components/ui/kaleon-loader";
import { MessageCircle, X, Send, Bot, User, MessagesSquare, Mic, Trophy, Sparkles, RotateCcw } from "lucide-react";
import { t } from "@/lib/copy";

type Mode = "ask" | "interview";
interface Message { role: "user" | "assistant"; content: string; kind?: "kickoff" }

const STORAGE_KEY = (userId: string | null) => `kaleon_chat_${userId ?? "guest"}`;

declare global {
  interface WindowEventMap {
    "dyp:start-interview": CustomEvent<{ target: string }>;
  }
}

function makeSessionId() {
  return `iv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// Locale-independent machine markers emitted by the backend prompt.
// Markers are always in English so this parser works regardless of the
// language the AI is responding in.
const MARKER_RE = /\[\[(?:SUMMARY|SCORE:[^\]]+|STRENGTHS|IMPROVE|END|Q:\d+\/\d+)\]\]/g;

// Detect closing summary message
function isSummary(text: string): boolean {
  return /\[\[SUMMARY\]\]/.test(text);
}

function parseSummary(text: string) {
  const scoreMatch = text.match(/\[\[SCORE:\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*10\s*\]\]/);
  const score = scoreMatch ? scoreMatch[1] : null;
  const strengthsBlock = text.match(/\[\[STRENGTHS\]\]([\s\S]*?)(?:\[\[IMPROVE\]\]|\[\[END\]\]|$)/);
  const improveBlock = text.match(/\[\[IMPROVE\]\]([\s\S]*?)(?:\[\[END\]\]|$)/);
  const toBullets = (s: string | undefined) => (s ?? "")
    .split("\n").map(l => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean).slice(0, 5);
  const endIdx = text.indexOf("[[END]]");
  const tail = endIdx >= 0 ? text.slice(endIdx + "[[END]]".length) : "";
  const closing = tail.split("\n").map(s => s.trim()).filter(Boolean).pop() ?? "";
  return {
    score,
    strengths: toBullets(strengthsBlock?.[1]),
    improvements: toBullets(improveBlock?.[1]),
    closing: closing.length > 200 ? "" : closing,
  };
}

function questionNumber(text: string): number | null {
  const m = text.match(/\[\[Q:(\d+)\/\d+\]\]/);
  return m ? parseInt(m[1], 10) : null;
}

// Strip machine markers from display text — they're for state parsing only.
function stripMarkers(text: string): string {
  return text.replace(MARKER_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

function formatMessage(text: string) {
  return stripMarkers(text).split("\n").map((line, i) => {
    const bolded = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={j}>{part.slice(2, -2)}</strong>
        : <span key={j}>{part}</span>
    );
    return <p key={i} className={line === "" ? "mt-1" : ""}>{bolded}</p>;
  });
}

function SummaryCard({ text, onRestart }: { text: string; onRestart: () => void }) {
  const { score, strengths, improvements, closing } = parseSummary(text);
  return (
    <div className="bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] p-3 max-w-[90%]">
      <div className="flex items-center gap-2 pb-2 border-b-2 border-slate-900">
        <div className="w-7 h-7 bg-amber-300 border-2 border-slate-900 flex items-center justify-center">
          <Trophy className="h-3.5 w-3.5 text-slate-900" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-widest font-bold text-slate-900" style={{ fontFamily: "JetBrains Mono, monospace" }}>// {t("chat.interviewSummary")}</p>
          {score && <p className="text-base font-bold text-slate-900 leading-none mt-0.5">{t("chat.scoreLabel", { score })}</p>}
        </div>
      </div>
      {strengths.length > 0 && (
        <div className="mt-2.5">
          <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 mb-1">{t("chat.strengths")}</p>
          <ul className="space-y-1">
            {strengths.map((s, i) => (
              <li key={i} className="text-[11px] text-slate-700 flex gap-1.5"><span className="text-emerald-600 font-bold">+</span><span>{s}</span></li>
            ))}
          </ul>
        </div>
      )}
      {improvements.length > 0 && (
        <div className="mt-2.5">
          <p className="text-[10px] uppercase tracking-wider font-bold text-rose-700 mb-1">{t("chat.improveNext")}</p>
          <ul className="space-y-1">
            {improvements.map((s, i) => (
              <li key={i} className="text-[11px] text-slate-700 flex gap-1.5"><span className="text-rose-600 font-bold">→</span><span>{s}</span></li>
            ))}
          </ul>
        </div>
      )}
      {closing && (
        <p className="text-[11px] text-slate-600 italic mt-2.5 pt-2 border-t border-slate-200">{closing}</p>
      )}
      <button
        onClick={onRestart}
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 border-2 border-slate-900 text-white text-[11px] uppercase tracking-wider font-bold hover:bg-slate-700"
      >
        <RotateCcw className="h-3 w-3" /> {t("chat.newSession")}
      </button>
    </div>
  );
}

export default function ChatBubble({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  useFocusTrap(dialogRef, open, () => setOpen(false));
  const [mode, setMode] = useState<Mode>("ask");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Interview state (not persisted across reloads — per task scope)
  const [interviewTarget, setInterviewTarget] = useState("");
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null);
  const [pendingTarget, setPendingTarget] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const uid = userId ?? null;

  useEffect(() => {
    // Remove legacy guest key when a real user is present to prevent stale data exposure
    if (uid) {
      localStorage.removeItem(STORAGE_KEY(null));
      localStorage.removeItem("pathwise_chat_guest");
    }
    const saved = localStorage.getItem(STORAGE_KEY(uid))
      ?? localStorage.getItem(`pathwise_chat_${uid ?? "guest"}`);
    if (saved) {
      try { setMessages(JSON.parse(saved) as Message[]); } catch { /* ignore */ }
    }
  }, [uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // External launch from scholarship cards (or anywhere)
  useEffect(() => {
    const handler = (ev: CustomEvent<{ target: string }>) => {
      const target = ev.detail?.target?.trim();
      if (!target) return;
      setOpen(true);
      setMode("interview");
      setPendingTarget(target);
      // Auto-start
      setTimeout(() => startInterview(target), 100);
    };
    window.addEventListener("dyp:start-interview", handler);
    return () => window.removeEventListener("dyp:start-interview", handler);
  }, [uid]);

  const persistAsk = (msgs: Message[]) => {
    if (mode !== "ask") return;
    localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(msgs.slice(-40)));
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setInput("");
    if (next === "interview") {
      setMessages([]);
      setInterviewSessionId(null);
      setPendingTarget("");
      setTimeout(() => targetInputRef.current?.focus(), 100);
    } else {
      // restore Ask history
      const saved = localStorage.getItem(STORAGE_KEY(uid));
      if (saved) {
        try { setMessages(JSON.parse(saved) as Message[]); } catch { setMessages([]); }
      } else {
        setMessages([]);
      }
      setInterviewSessionId(null);
    }
  };

  const callApi = async (next: Message[], session: { id: string; target: string; start?: boolean } | null) => {
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-12),
          interview: session
            ? { sessionId: session.id, target: session.target, start: session.start === true }
            : undefined,
        }),
      });
      const data = await r.json() as { message?: string; error?: string };
      const replyText = data.message ?? data.error ?? t("chat.defaultError");
      const reply: Message = { role: "assistant", content: replyText };
      const withReply = [...next, reply];
      setMessages(withReply);
      persistAsk(withReply);
    } catch {
      const errMsg: Message = { role: "assistant", content: t("chat.somethingWentWrong") };
      const withErr = [...next, errMsg];
      setMessages(withErr);
      persistAsk(withErr);
    } finally { setLoading(false); }
  };

  const startInterview = async (targetOverride?: string) => {
    const target = (targetOverride ?? pendingTarget).trim();
    if (!target || loading) return;
    const sessionId = makeSessionId();
    setInterviewSessionId(sessionId);
    setInterviewTarget(target);
    const kickoff: Message = {
      role: "user",
      content: t("chat.kickoffPrompt", { target }),
      kind: "kickoff",
    };
    setMessages([kickoff]);
    await callApi([kickoff], { id: sessionId, target, start: true });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    persistAsk(next);
    const session = mode === "interview" && interviewSessionId
      ? { id: interviewSessionId, target: interviewTarget }
      : null;
    await callApi(next, session);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  const restartInterview = () => {
    setMessages([]);
    setInterviewSessionId(null);
    setPendingTarget("");
    setInterviewTarget("");
    setTimeout(() => targetInputRef.current?.focus(), 100);
  };

  // For interview mode: figure out the latest question number to show progress.
  const currentQ = (() => {
    if (mode !== "interview") return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant") {
        if (isSummary(m.content)) return 5;
        const q = questionNumber(m.content);
        if (q) return q;
      }
    }
    return null;
  })();

  const interviewActive = mode === "interview" && !!interviewSessionId;
  const lastMsg = messages[messages.length - 1];
  const sessionCompleted = interviewActive && lastMsg?.role === "assistant" && isSummary(lastMsg.content);

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-2 pwc-font-sans" style={{ fontFamily: "Inter, sans-serif" }}>
      <AnimatePresence>
      {open && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("chat.title")}
          tabIndex={-1}
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: 4 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
          className="bg-white border-2 border-slate-900 flex flex-col overflow-hidden focus:outline-none origin-bottom-right"
          style={{
            width: "min(90vw, 380px)",
            height: "min(75vh, 560px)",
            boxShadow: "0 0 0 3px #ffffff, 6px 6px 0 0 #0f172a",
          }}
        >
          {/* Header */}
          <div className="bg-slate-900 px-4 py-3 flex items-center justify-between flex-shrink-0 border-b-2 border-slate-900">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/15 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm uppercase tracking-tight">{t("chat.title")}</p>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  {mode === "interview"
                    ? interviewActive ? `// ${t("chat.interviewLabel", { q: currentQ ?? 1 })}` : `// ${t("chat.practiceInterview")}`
                    : `// ${t("chat.ccTransferHelp")}`}
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-white" aria-label={t("chat.close")}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex border-b-2 border-slate-900 flex-shrink-0">
            <button
              onClick={() => switchMode("ask")}
              className={cn("flex-1 px-2 py-2 text-[11px] uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 transition-colors",
                mode === "ask" ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
              data-testid="chat-mode-ask"
            >
              <MessagesSquare className="h-3.5 w-3.5" /> {t("chat.askAnything")}
            </button>
            <button
              onClick={() => switchMode("interview")}
              className={cn("flex-1 px-2 py-2 text-[11px] uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 transition-colors border-l-2 border-slate-900",
                mode === "interview" ? "bg-amber-200 text-slate-900" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
              data-testid="chat-mode-interview"
            >
              <Mic className="h-3.5 w-3.5" /> {t("chat.practiceInterview")}
            </button>
          </div>

          {/* Messages */}
          <div aria-live="polite" aria-atomic="false" aria-label={t("chat.conversation")} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-[#f4f4f5]">
            {/* Empty / setup states */}
            {mode === "ask" && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-4">
                <div className="w-12 h-12 bg-slate-900 flex items-center justify-center mb-3">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">{t("chat.emptyTitle")}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t("chat.emptySubtitle")}</p>
                <div className="mt-4 space-y-1.5 w-full">
                  {[t("chat.sq_igetc"), t("chat.sq_tag"), t("chat.sq_gpa")].map(q => (
                    <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="w-full text-left text-xs px-3 py-2 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === "interview" && !interviewActive && (
              <div className="flex flex-col h-full px-1 pb-2">
                <div className="bg-white border-2 border-slate-900 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-amber-300 border-2 border-slate-900 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-slate-900" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">{t("chat.practiceInterview")}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest" style={{ fontFamily: "JetBrains Mono, monospace" }}>// {t("chat.interviewSubtitle")}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    {t("chat.interviewSetupBody")}
                  </p>
                  <label htmlFor="dyp-interview-target" className="text-[10px] uppercase tracking-widest font-bold text-slate-700">{t("chat.interviewTargetLabel")}</label>
                  <input
                    id="dyp-interview-target"
                    ref={targetInputRef}
                    value={pendingTarget}
                    onChange={e => setPendingTarget(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void startInterview(); } }}
                    placeholder={t("chat.interviewTargetPlaceholder")}
                    className="w-full mt-1 text-xs px-3 py-2 border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    data-testid="interview-target-input"
                  />
                  <button
                    onClick={() => void startInterview()}
                    disabled={!pendingTarget.trim() || loading}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 border-2 border-slate-900 text-white text-[11px] uppercase tracking-wider font-bold hover:bg-slate-700 disabled:opacity-50"
                    data-testid="interview-start-btn"
                  >
                    {loading ? <KaleonLoader size={14} /> : <Mic className="h-3.5 w-3.5" />}
                    {t("chat.startInterview")}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 px-1 leading-relaxed">
                  {t("chat.creditNote")}
                </p>
              </div>
            )}

            {/* Messages list */}
            {messages.map((m, i) => {
              // Hide synthetic kickoff from view in interview mode (locale-independent: tagged at creation).
              if (mode === "interview" && m.kind === "kickoff") {
                return null;
              }
              if (mode === "interview" && m.role === "assistant" && isSummary(m.content)) {
                return (
                  <div key={i} className="flex gap-2">
                    <div className="w-6 h-6 bg-white border-2 border-slate-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-slate-900" />
                    </div>
                    <SummaryCard text={m.content} onRestart={restartInterview} />
                  </div>
                );
              }
              return (
                <div key={i} className={cn("flex gap-2 max-w-full", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn("w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5",
                    m.role === "user" ? "bg-slate-900" : "bg-white border-2 border-slate-900")}>
                    {m.role === "user" ? <User className="h-3.5 w-3.5 text-white" /> : <Bot className="h-3.5 w-3.5 text-slate-900" />}
                  </div>
                  <div className={cn("border-2 border-slate-900 px-3 py-2 text-xs leading-relaxed max-w-[80%]",
                    m.role === "user" ? "bg-slate-900 text-white" : "bg-white text-slate-700")}>
                    {formatMessage(m.content)}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex gap-2" role="status" aria-label={t("chat.advisorResponding")}>
                <div className="w-6 h-6 bg-white border-2 border-slate-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-slate-900" aria-hidden="true" />
                </div>
                <div className="bg-white border-2 border-slate-900 px-3 py-2.5">
                  <KaleonLoader size={14} />
                  <span className="sr-only">{t("chat.loadingResponse")}</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input — hidden during setup screen and after summary */}
          {(mode === "ask" || (interviewActive && !sessionCompleted)) && (
            <div className="px-3 py-2.5 border-t-2 border-slate-900 bg-white flex gap-2 flex-shrink-0">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                aria-label={mode === "interview" ? t("chat.interviewPlaceholder") : t("chat.askPlaceholder")}
                placeholder={mode === "interview" ? t("chat.interviewPlaceholder") : t("chat.askPlaceholder")}
                disabled={loading}
                className="flex-1 text-xs px-3 py-2 border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
                data-testid="chat-input"
              />
              <button onClick={() => void send()} disabled={!input.trim() || loading}
                className="px-3 bg-slate-900 border-2 border-slate-900 text-white hover:bg-slate-700 disabled:opacity-40 transition flex-shrink-0"
                aria-label={t("chat.send")}>
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? t("chat.close") : t("chat.open")}
        className={cn(
          "border-2 border-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1),0_0_0_2px_#ffffff] flex items-center justify-center",
          reducedMotion
            ? ""
            : "transition-all duration-200 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]",
          open ? "bg-white text-slate-900" : "bg-slate-900 text-white"
        )}
        style={{ width: 52, height: 52 }}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
