import { useEffect, useRef, useState } from "react";
import { Bell, Check, Clock, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Reminder {
  id: number;
  title: string;
  body: string;
  status: "unread" | "read" | "snoozed" | "done";
  deadlineLabel: string;
  deadlineDate: string;
  leadDays: number;
  category: string;
  priority: "critical" | "high" | "medium";
  url: string | null;
  createdAt: string;
}

interface FeedResponse {
  unread: number;
  reminders: Reminder[];
}

interface Props {
  profileId: number;
}

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-slate-400",
};

export default function NotificationBell({ profileId }: Props) {
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<FeedResponse>({ unread: 0, reminders: [] });
  const [busy, setBusy] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const r = await fetch(`/api/reminders/${profileId}`, { credentials: "include" });
      if (r.ok) setFeed(await r.json());
    } catch {/* ignore */}
  };

  useEffect(() => {
    void load();
    const i = setInterval(() => void load(), 60_000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const action = async (id: number, kind: "read" | "snooze" | "done") => {
    setBusy(id);
    try {
      await fetch(`/api/reminders/${id}/${kind}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: kind === "snooze" ? JSON.stringify({ days: 3 }) : undefined,
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const onToggle = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      // mark unread as read on open (best-effort, in parallel)
      const unread = feed.reminders.filter((r) => r.status === "unread");
      if (unread.length > 0) {
        await Promise.all(unread.map((r) =>
          fetch(`/api/reminders/${r.id}/read`, { method: "POST", credentials: "include" })
        ));
        void load();
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => void onToggle()}
        aria-label={feed.unread > 0 ? `Notifications, ${feed.unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative text-slate-700 hover:text-slate-900 p-1.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
        data-testid="notification-bell"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {feed.unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
            data-testid="notification-badge"
          >
            {feed.unread > 9 ? "9+" : feed.unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Reminders"
          className="absolute right-0 top-full mt-2 w-[360px] max-w-[90vw] bg-white border-2 border-slate-900 shadow-xl z-[60] max-h-[480px] flex flex-col"
        >
          <div className="px-4 py-3 border-b-2 border-slate-900 flex items-center justify-between">
            <span className="text-xs pwc-font-mono uppercase font-bold tracking-wider">Reminders</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-slate-600 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {feed.reminders.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No reminders yet. Enable deadline reminders in your profile to get personalized nudges.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {feed.reminders.map((r) => (
                  <li key={r.id} className="p-3" data-testid={`reminder-${r.id}`}>
                    <div className="flex items-start gap-2">
                      <span className={cn("mt-1.5 w-2 h-2 rounded-full flex-shrink-0", PRIORITY_DOT[r.priority] ?? "bg-slate-400")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 leading-snug">{r.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{r.body}</p>
                        <p className="text-[10px] text-slate-400 mt-1 pwc-font-mono uppercase tracking-wider">
                          {r.deadlineLabel} · due {r.deadlineDate}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {r.url && (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 border border-indigo-200 rounded"
                            >
                              Open <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => void action(r.id, "snooze")}
                            disabled={busy === r.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded disabled:opacity-50"
                            data-testid={`snooze-${r.id}`}
                          >
                            <Clock className="h-3 w-3" /> Snooze 3d
                          </button>
                          <button
                            type="button"
                            onClick={() => void action(r.id, "done")}
                            disabled={busy === r.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 border border-emerald-200 rounded disabled:opacity-50"
                            data-testid={`done-${r.id}`}
                          >
                            <Check className="h-3 w-3" /> Done
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
