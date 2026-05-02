import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";

interface Message { role: "user" | "assistant"; content: string; }

const STORAGE_KEY = (profileId: number | null) => `dyp_chat_${profileId ?? "guest"}`;

function formatMessage(text: string) {
  return text.split("\n").map((line, i) => <p key={i} className={line === "" ? "mt-1" : ""}>{line}</p>);
}

export default function ChatBubble({ profileId }: { profileId?: number }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pid = profileId ?? null;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY(pid))
      ?? localStorage.getItem(`pathwise_chat_${pid ?? "guest"}`); // backwards compat
    if (saved) {
      try { setMessages(JSON.parse(saved) as Message[]); } catch { /* ignore */ }
    }
  }, [pid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const persist = (msgs: Message[]) => {
    localStorage.setItem(STORAGE_KEY(pid), JSON.stringify(msgs.slice(-40)));
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    persist(next);
    try {
      const r = await fetch("/api/chat", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: pid, messages: next.slice(-10) }),
      });
      const data = await r.json() as { message: string };
      const reply: Message = { role: "assistant", content: data.message ?? "Sorry, I couldn't respond." };
      const withReply = [...next, reply];
      setMessages(withReply);
      persist(withReply);
    } catch {
      const errMsg: Message = { role: "assistant", content: "Something went wrong. Please try again." };
      const withErr = [...next, errMsg];
      setMessages(withErr);
      persist(withErr);
    } finally { setLoading(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-2 pwc-font-sans" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Chat panel */}
      {open && (
        <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col overflow-hidden"
          style={{ width: "min(90vw, 360px)", height: "min(70vh, 520px)" }}>
          {/* Header */}
          <div className="bg-slate-900 px-4 py-3 flex items-center justify-between flex-shrink-0 border-b-2 border-slate-900">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/15 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm uppercase tracking-tight">DYP Advisor</p>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest" style={{ fontFamily: "JetBrains Mono, monospace" }}>// CC Transfer Help</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-[#f4f4f5]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-4">
                <div className="w-12 h-12 bg-slate-900 flex items-center justify-center mb-3">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Ask me anything</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Transfer requirements, IGETC, TAG, scholarships, financial aid, majors.</p>
                <div className="mt-4 space-y-1.5 w-full">
                  {["What is IGETC and do I need it?", "How does the TAG program work?", "What GPA do I need to transfer to UC?"].map(q => (
                    <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="w-full text-left text-xs px-3 py-2 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
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
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 bg-white border-2 border-slate-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-slate-900" />
                </div>
                <div className="bg-white border-2 border-slate-900 px-3 py-2.5">
                  <Loader2 className="h-3.5 w-3.5 text-slate-900 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t-2 border-slate-900 bg-white flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about transfer, IGETC, TAG…"
              disabled={loading}
              className="flex-1 text-xs px-3 py-2 border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
            />
            <button onClick={() => void send()} disabled={!input.trim() || loading}
              className="px-3 bg-slate-900 border-2 border-slate-900 text-white hover:bg-slate-700 disabled:opacity-40 transition flex-shrink-0">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Bubble toggle button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close chat" : "Open chat"}
        className={cn(
          "border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center transition-all duration-200 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]",
          open ? "bg-white text-slate-900" : "bg-slate-900 text-white"
        )}
        style={{ width: 52, height: 52 }}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
