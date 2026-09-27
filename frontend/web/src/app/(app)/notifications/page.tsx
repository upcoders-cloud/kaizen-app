"use client";

import { useState } from "react";
import { isToday, isYesterday } from "date-fns";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";
import type { Notification } from "@/lib/types";

export default function NotificationsPage() {
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();
  const notifications = useInfiniteQuery({
    queryKey: ["notifications", "page"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getNotifications(pageParam),
    getNextPageParam: (lastPage, pages) => lastPage.next ? pages.length + 1 : undefined,
  });
  const unreadCount = useQuery({ queryKey: ["notifications", "unread-count"], queryFn: getUnreadNotificationCount });
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ["notifications"] }); };
  const markOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });
  const all = notifications.data?.pages.flatMap((page) => page.results) ?? [];
  const visible = filter === "unread" ? all.filter((item) => !item.is_read) : all;
  const groups = { "Dziś": [] as Notification[], "Wczoraj": [] as Notification[], "Wcześniej": [] as Notification[] };
  for (const item of visible) {
    const date = new Date(item.created_at);
    groups[isToday(date) ? "Dziś" : isYesterday(date) ? "Wczoraj" : "Wcześniej"].push(item);
  }
  const unread = all.filter((item) => !item.is_read).length;

  return <div className="mx-auto max-w-4xl">
    <PageHeader title="Powiadomienia" description="Wszystkie ważne informacje o Twoich pomysłach."
      actions={<Button variant="secondary" size="sm" loading={markAll.isPending} disabled={!all.length || notifications.isPending} onClick={() => markAll.mutate()}><CheckCheck className="size-4" /> Oznacz wszystkie jako przeczytane</Button>}>
      <Tabs value={filter} onValueChange={setFilter} items={[{ value: "all", label: "Wszystkie" }, { value: "unread", label: "Nieprzeczytane", count: unreadCount.data ?? unread }]} />
    </PageHeader>
    {(markOne.isError || markAll.isError) && <p role="alert" className="mb-4 text-sm text-danger">Nie udało się oznaczyć powiadomienia. Spróbuj ponownie.</p>}
    {notifications.isPending ? <div className="space-y-3" aria-label="Ładowanie powiadomień">{[1, 2, 3].map((id) => <Skeleton key={id} className="h-24" />)}</div>
      : notifications.isError ? <ErrorState onRetry={() => notifications.refetch()} />
      : visible.length === 0 ? <>
          <EmptyState variant="card" icon={<Bell />} title={filter === "unread" ? "Brak nieprzeczytanych na tej stronie" : "Brak powiadomień"} description="Nowe informacje pojawią się tutaj." />
          {notifications.hasNextPage && <Button variant="secondary" size="sm" className="mt-4" loading={notifications.isFetchingNextPage} onClick={() => notifications.fetchNextPage()}>Wczytaj więcej</Button>}
        </>
      : <div className="space-y-7">{Object.entries(groups).map(([label, items]) => items.length > 0 &&
          <section key={label} aria-label={label}>
            <h2 className="mb-3 text-sm font-semibold text-foreground">{label}</h2>
            <div className="space-y-2">{items.map((item) => <NotificationItem key={item.id} notification={item}
              marking={markOne.isPending && markOne.variables === item.id}
              onOpen={() => { if (!item.is_read) markOne.mutate(item.id); }}
              onMarkRead={() => markOne.mutate(item.id)} />)}</div>
          </section>)}
          {notifications.hasNextPage && <Button variant="secondary" size="sm" loading={notifications.isFetchingNextPage} onClick={() => notifications.fetchNextPage()}>Wczytaj więcej</Button>}
        </div>}
  </div>;
}
