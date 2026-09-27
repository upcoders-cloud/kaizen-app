import Link from "next/link";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Check, MessageCircle, ThumbsUp, AtSign, ClipboardCheck, CircleCheck, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Notification } from "@/lib/types";

const icons = {
  LIKE: ThumbsUp,
  COMMENT: MessageCircle,
  REPLY: MessageCircle,
  MENTION: AtSign,
  APPROVED: CircleCheck,
  REJECTED: CircleX,
  ASSIGNED: ClipboardCheck,
};

const messages = {
  LIKE: "polubił(a) Twój pomysł",
  COMMENT: "skomentował(a) Twój pomysł",
  REPLY: "odpowiedział(a) na Twój komentarz",
  MENTION: "wspomniał(a) o Tobie w komentarzu",
  APPROVED: "zaakceptował(a) Twój pomysł",
  REJECTED: "odrzucił(a) Twój pomysł",
  ASSIGNED: "przypisał(a) Ci pomysł do oceny",
};

export function NotificationItem({ notification, onOpen, onMarkRead, marking }: {
  notification: Notification;
  onOpen: () => void;
  onMarkRead: () => void;
  marking: boolean;
}) {
  const Icon = icons[notification.type] ?? ClipboardCheck;
  const actor = notification.actor?.nickname || notification.actor?.username || "Użytkownik";
  return <Card className={`flex items-start gap-3 p-4 ${notification.is_read ? "" : "border-primary/30 bg-primary-soft/30"}`}>
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary"><Icon className="size-4" /></div>
    <div className="min-w-0 flex-1">
      <Link href={`/ideas/${notification.post_id}`} onClick={onOpen} className="block rounded-sm text-sm text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
        <strong>{actor}</strong> {messages[notification.type] ?? "wysłał(a) powiadomienie"} <strong>{notification.post_title}</strong>
        {notification.comment_text && <span className="mt-1 block truncate text-xs font-normal text-muted">{notification.comment_text}</span>}
      </Link>
      <time dateTime={notification.created_at} className="mt-1 block text-xs text-muted">{format(new Date(notification.created_at), "d MMMM, HH:mm", { locale: pl })}</time>
    </div>
    {!notification.is_read && <Button variant="ghost" size="xs" loading={marking} onClick={onMarkRead} aria-label="Oznacz jako przeczytane" title="Oznacz jako przeczytane"><Check className="size-4" /></Button>}
  </Card>;
}
