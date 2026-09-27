"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AtSign,
  Bell,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  Heart,
  MessageSquare,
  Reply,
  XCircle,
} from "lucide-react";
import { cn, displayName, fmtRelative } from "@/lib/utils";
import { useMarkNotificationRead, useRecentNotifications, useUnreadCount } from "@/lib/ideas";
import type { Notification, NotificationType } from "@/lib/types";
import { Popover } from "@/components/ui/popover";
import { IconButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export const NOTIFICATION_META: Record<
  NotificationType,
  { icon: React.ComponentType<{ className?: string }>; text: string; tone: string }
> = {
  LIKE: { icon: Heart, text: "polubił(a) Twój pomysł", tone: "text-danger" },
  COMMENT: { icon: MessageSquare, text: "skomentował(a) Twój pomysł", tone: "text-info" },
  REPLY: { icon: Reply, text: "odpowiedział(a) na Twój komentarz", tone: "text-info" },
  MENTION: { icon: AtSign, text: "wspomniał(a) o Tobie", tone: "text-violet" },
  APPROVED: { icon: CheckCircle2, text: "zaakceptował(a) Twój pomysł", tone: "text-success" },
  REJECTED: { icon: XCircle, text: "odrzucił(a) Twój pomysł", tone: "text-danger" },
  ASSIGNED: { icon: ClipboardCheck, text: "przekazał(a) Ci pomysł do akceptacji", tone: "text-warning" },
};

function NotificationRow({ n, onOpen }: { n: Notification; onOpen: (n: Notification) => void }) {
  const meta = NOTIFICATION_META[n.type] ?? NOTIFICATION_META.COMMENT;
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent",
        !n.is_read && "bg-primary-soft/40",
      )}
    >
      <span className="relative shrink-0">
        <Avatar user={n.actor} size="md" />
        <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-elevated ring-1 ring-border">
          <Icon className={cn("size-2.5", meta.tone)} />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-snug text-foreground">
          <span className="font-medium">{displayName(n.actor)}</span>{" "}
          <span className="text-muted">{meta.text}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted">{n.post_title}</span>
        <span className="mt-0.5 block text-[11px] text-subtle">{fmtRelative(n.created_at)}</span>
      </span>
      {!n.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
    </button>
  );
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const unread = useUnreadCount();
  const recent = useRecentNotifications(open);
  const mark = useMarkNotificationRead();
  const count = unread.data ?? 0;

  const openNotification = (n: Notification) => {
    if (!n.is_read) mark.mutate(n.id);
    setOpen(false);
    router.push(`/ideas/${n.post_id}`);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      className="w-[22rem] p-0"
      trigger={
        <span className="relative inline-flex">
          <IconButton label="Powiadomienia" size="lg" active={open}>
            <Bell />
          </IconButton>
          {count > 0 && (
            <span className="pointer-events-none absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white ring-2 ring-surface tabular">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </span>
      }
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-sm font-semibold text-foreground">Powiadomienia</span>
        {count > 0 && (
          <button
            type="button"
            onClick={() => mark.mutate("all")}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <CheckCheck className="size-3.5" /> Oznacz wszystkie
          </button>
        )}
      </div>
      <div className="max-h-[26rem] overflow-y-auto p-1">
        {recent.isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-2.5">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : recent.data && recent.data.length > 0 ? (
          recent.data.map((n) => <NotificationRow key={n.id} n={n} onOpen={openNotification} />)
        ) : (
          <EmptyState size="sm" icon={<Bell />} title="Brak powiadomień" description="Tu pojawią się reakcje na Twoje pomysły." />
        )}
      </div>
      <div className="border-t border-border p-1">
        <Link
          href="/notifications"
          onClick={() => setOpen(false)}
          className="block rounded-md px-2 py-1.5 text-center text-[13px] font-medium text-muted transition-colors hover:bg-accent hover:text-foreground"
        >
          Zobacz wszystkie
        </Link>
      </div>
    </Popover>
  );
}
