"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlarmClock, Check, ClipboardCheck, ExternalLink, Inbox, PiggyBank, X } from "lucide-react";
import { cn, displayName, fmtDate, fmtPLN, fmtRelative, plural } from "@/lib/utils";
import { STAGE_LABELS, useApprovalsQueue } from "@/lib/ideas";
import type { ApprovalStage, Post } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { SearchInput } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton, buttonVariants } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/misc";
import { ApprovalTimeline, ImageGallery, SurveySummary } from "@/components/ideas/IdeaDetailParts";
import { ApproveDialog, RejectDialog } from "@/components/ideas/DecisionDialogs";

type StageFilter = "" | ApprovalStage;
const OVERDUE_DAYS = 7;

function waitingSince(p: Post) {
  return p.current_stage?.created_at ?? p.created_at;
}

function daysWaiting(p: Post) {
  return Math.floor((Date.now() - new Date(waitingSince(p)).getTime()) / 86_400_000);
}

function QueueRow({
  post,
  selected,
  onOpen,
  onApprove,
  onReject,
}: {
  post: Post;
  selected: boolean;
  onOpen: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const days = daysWaiting(post);
  const overdue = days > OVERDUE_DAYS;
  const savings = Number(post.survey?.estimated_financial_savings ?? 0);
  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
      data-selected={selected || undefined}
      className="group relative flex items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-surface-muted data-[selected]:bg-primary-soft/40"
    >
      <button type="button" onClick={onOpen} className="absolute inset-0" aria-label={`Podgląd: ${post.title}`} />
      <Avatar user={post.author} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">{post.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
          <span className="truncate">{displayName(post.author)}</span>
          {post.author.department_name && (
            <>
              <span className="text-subtle">·</span>
              <span className="truncate">{post.author.department_name}</span>
            </>
          )}
          {post.category_name && (
            <>
              <span className="text-subtle">·</span>
              <span className="truncate">{post.category_name}</span>
            </>
          )}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-2 md:flex">
        {savings > 0 && (
          <Badge tone="success">
            <PiggyBank /> {fmtPLN(savings)}/mies.
          </Badge>
        )}
        {post.current_stage && <Badge tone="neutral">{STAGE_LABELS[post.current_stage.stage]}</Badge>}
      </div>
      <span
        className={cn(
          "hidden w-24 shrink-0 items-center justify-end gap-1 text-xs tabular sm:flex",
          overdue ? "font-medium text-danger" : "text-muted",
        )}
        title={`Oczekuje od ${fmtDate(waitingSince(post))}`}
      >
        {overdue && <AlarmClock className="size-3.5" />}
        {days < 1 ? "dziś" : `${days} ${plural(days, "dzień", "dni", "dni")}`}
      </span>
      <div className="relative z-10 flex shrink-0 items-center gap-1">
        <Tooltip content="Odrzuć">
          <IconButton label="Odrzuć" variant="danger" size="md" onClick={onReject}>
            <X />
          </IconButton>
        </Tooltip>
        <Tooltip content="Akceptuj">
          <IconButton
            label="Akceptuj"
            size="md"
            className="text-success hover:bg-success-soft hover:text-success"
            onClick={onApprove}
          >
            <Check />
          </IconButton>
        </Tooltip>
      </div>
    </motion.li>
  );
}

export default function ApprovalsPage() {
  const [stage, setStage] = useState<StageFilter>("");
  const [search, setSearch] = useState("");
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [cursor, setCursor] = useState(0);
  const [decision, setDecision] = useState<{ type: "approve" | "reject"; post: Post } | null>(null);
  const queue = useApprovalsQueue(stage);
  const all = useApprovalsQueue("");

  const posts = useMemo(() => {
    const list = queue.data?.results ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        displayName(p.author).toLowerCase().includes(q) ||
        (p.category_name ?? "").toLowerCase().includes(q),
    );
  }, [queue.data, search]);

  const preview = posts.find((p) => p.id === previewId) ?? null;
  const counts = useMemo(() => {
    const list = all.data?.results ?? [];
    const by = (s: ApprovalStage) => list.filter((p) => p.current_stage?.stage === s).length;
    return { all: all.data?.count ?? list.length, TEAM_LEAD: by("TEAM_LEAD"), MANAGER: by("MANAGER"), DIRECTOR: by("DIRECTOR") };
  }, [all.data]);
  const overdue = (all.data?.results ?? []).filter((p) => daysWaiting(p) > OVERDUE_DAYS).length;
  const safeCursor = Math.min(cursor, Math.max(0, posts.length - 1));

  // Skróty: j/k - ruch, Enter - podgląd, a - akceptuj, r - odrzuć.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (decision || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('[role="dialog"]') && !previewId) return;
      const current = posts[safeCursor];
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(posts.length - 1, safeCursor + 1);
        setCursor(next);
        if (previewId && posts[next]) setPreviewId(posts[next].id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.max(0, safeCursor - 1);
        setCursor(next);
        if (previewId && posts[next]) setPreviewId(posts[next].id);
      } else if (e.key === "Enter" && current && !previewId) {
        setPreviewId(current.id);
      } else if (e.key === "a" && current) {
        setDecision({ type: "approve", post: previewId ? (preview ?? current) : current });
      } else if (e.key === "r" && current) {
        setDecision({ type: "reject", post: previewId ? (preview ?? current) : current });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [posts, safeCursor, previewId, preview, decision]);

  const afterDecision = (p: Post) => {
    // Po decyzji przejdź do następnego elementu w podglądzie.
    if (previewId === p.id) {
      const idx = posts.findIndex((x) => x.id === p.id);
      const next = posts[idx + 1] ?? posts[idx - 1];
      setPreviewId(next && next.id !== p.id ? next.id : null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Do akceptacji"
        description={
          all.isLoading
            ? "Wczytywanie kolejki..."
            : counts.all === 0
              ? "Kolejka jest pusta."
              : `${counts.all} ${plural(counts.all, "pomysł czeka", "pomysły czekają", "pomysłów czeka")} na Twoją decyzję${
                  overdue ? `, ${overdue} ponad ${OVERDUE_DAYS} dni` : ""
                }.`
        }
        actions={
          <div className="hidden items-center gap-1.5 text-xs text-subtle lg:flex">
            <Kbd>J</Kbd>
            <Kbd>K</Kbd> ruch <Kbd>Enter</Kbd> podgląd <Kbd>A</Kbd> akceptuj <Kbd>R</Kbd> odrzuć
          </div>
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Tabs
            value={stage}
            onValueChange={(v) => {
              setStage(v);
              setCursor(0);
            }}
            items={[
              { value: "", label: "Wszystkie", count: counts.all },
              { value: "TEAM_LEAD", label: "Lider zespołu", count: counts.TEAM_LEAD },
              { value: "MANAGER", label: "Kierownik", count: counts.MANAGER },
              { value: "DIRECTOR", label: "Dyrektor", count: counts.DIRECTOR },
            ]}
            className="flex-1"
          />
          <SearchInput value={search} onValueChange={setSearch} placeholder="Filtruj..." inputSize="sm" className="w-full sm:w-60" />
        </div>
      </PageHeader>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        {queue.isError ? (
          <ErrorState onRetry={() => queue.refetch()} />
        ) : queue.isLoading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={search ? <Inbox /> : <ClipboardCheck />}
            title={search ? "Brak wyników" : "Wszystko załatwione"}
            description={search ? "Zmień frazę wyszukiwania." : "Nie masz pomysłów oczekujących na decyzję."}
          />
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {posts.map((p, i) => (
                <QueueRow
                  key={p.id}
                  post={p}
                  selected={i === safeCursor}
                  onOpen={() => {
                    setCursor(i);
                    setPreviewId(p.id);
                  }}
                  onApprove={() => setDecision({ type: "approve", post: p })}
                  onReject={() => setDecision({ type: "reject", post: p })}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <Sheet
        open={!!preview}
        onOpenChange={(o) => !o && setPreviewId(null)}
        title={preview?.title}
        description={
          preview
            ? `${displayName(preview.author)}${preview.author.department_name ? ` · ${preview.author.department_name}` : ""} · ${fmtRelative(preview.created_at)}`
            : undefined
        }
        width="max-w-2xl"
        headerActions={
          preview && (
            <Link
              href={`/ideas/${preview.id}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              title="Otwórz pełną stronę"
            >
              <ExternalLink /> Otwórz
            </Link>
          )
        }
        footer={
          preview && (
            <>
              <Button variant="danger-soft" onClick={() => setDecision({ type: "reject", post: preview })}>
                <X /> Odrzuć
              </Button>
              <Button variant="success" onClick={() => setDecision({ type: "approve", post: preview })}>
                <Check /> Akceptuj
              </Button>
            </>
          )
        }
      >
        {preview && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              {preview.category_name && <Badge tone="outline">{preview.category_name}</Badge>}
              {preview.current_stage && <Badge tone="warning">Etap: {STAGE_LABELS[preview.current_stage.stage]}</Badge>}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{preview.content}</p>
            {(preview.image_items?.length ?? 0) > 0 && <ImageGallery images={preview.image_items} />}
            {preview.survey && (
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">Oszczędności</h3>
                <SurveySummary survey={preview.survey} />
              </section>
            )}
            <section>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-subtle">Ścieżka akceptacji</h3>
              <ApprovalTimeline post={preview} />
            </section>
          </div>
        )}
      </Sheet>

      <ApproveDialog
        post={decision?.type === "approve" ? decision.post : null}
        open={decision?.type === "approve"}
        onOpenChange={(o) => !o && setDecision(null)}
        onDone={afterDecision}
      />
      <RejectDialog
        post={decision?.type === "reject" ? decision.post : null}
        open={decision?.type === "reject"}
        onOpenChange={(o) => !o && setDecision(null)}
        onDone={afterDecision}
      />
    </div>
  );
}
