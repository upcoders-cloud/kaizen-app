"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlarmClock, CalendarClock, CheckCircle2, Coins, Gauge, Hourglass, PiggyBank, Rocket } from "lucide-react";
import { cn, errorMessage, fmtDate, fmtNum, fmtPLN } from "@/lib/utils";
import { useCategories, useDepartmentOptions, usePipeline, useUpdateProgress, type Pipeline } from "@/lib/ideas";
import type { PostLite } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/checkbox";
import { StatCard } from "@/components/ui/stat-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, STATUS_META } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/empty-state";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { ProgressDialog } from "@/components/ideas/DecisionDialogs";

type Column = keyof Pipeline;
const COLUMNS: { key: Column; title: string; hint: string }[] = [
  { key: "SUBMITTED", title: "Zaakceptowane", hint: "Czekają na start wdrożenia" },
  { key: "IN_PROGRESS", title: "W realizacji", hint: "Trwa wdrażanie" },
  { key: "IMPLEMENTED", title: "Wdrożone", hint: "Zakończone" },
];

function isOverdue(p: PostLite) {
  if (!p.deadline || p.status === "IMPLEMENTED") return false;
  return new Date(p.deadline).getTime() < new Date().setHours(0, 0, 0, 0);
}

function KanbanCard({
  post,
  column,
  onProgress,
  index,
}: {
  post: PostLite;
  column: Column;
  onProgress: (p: PostLite) => void;
  index: number;
}) {
  const overdue = isOverdue(post);
  const canMove = !!post.can_update_progress && column !== "IMPLEMENTED";
  const savings = Number(post.savings ?? 0);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 10) * 0.02 }}
      draggable={canMove}
      onDragStartCapture={(e: React.DragEvent) => {
        e.dataTransfer.setData("text/plain", String(post.id));
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group relative rounded-md border border-border bg-surface p-3 shadow-xs transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-card",
        canMove && "cursor-grab active:cursor-grabbing",
      )}
    >
      <Link href={`/ideas/${post.id}`} draggable={false} className="absolute inset-0 rounded-md" aria-label={post.title} />
      <div className="flex items-start gap-2">
        <p className="line-clamp-2 flex-1 text-[13px] font-medium leading-snug text-foreground">{post.title}</p>
        {post.can_update_progress && column !== "IMPLEMENTED" && (
          <Tooltip content="Aktualizuj postęp">
            <IconButton
              label="Aktualizuj postęp"
              size="xs"
              className="relative z-10 -mr-1 -mt-0.5 opacity-60 group-hover:opacity-100"
              onClick={() => onProgress(post)}
            >
              <Gauge />
            </IconButton>
          </Tooltip>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
        {post.author && <Avatar user={post.author} size="xs" />}
        <span className="truncate">{post.author?.department_name ?? post.category_name}</span>
        {post.category_name && post.author?.department_name && (
          <Badge tone="outline" className="ml-auto max-w-[45%] truncate">
            {post.category_name}
          </Badge>
        )}
      </div>
      {column !== "SUBMITTED" && (
        <Progress
          value={column === "IMPLEMENTED" ? 100 : (post.progress_percent ?? 0)}
          tone={column === "IMPLEMENTED" ? "success" : "violet"}
          size="sm"
          showLabel
          className="mt-2.5"
        />
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        {post.deadline && (
          <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-danger")}>
            {overdue ? <AlarmClock className="size-3" /> : <CalendarClock className="size-3" />}
            {fmtDate(post.deadline)}
          </span>
        )}
        {post.estimated_cost !== null && post.estimated_cost !== undefined && (
          <span className="inline-flex items-center gap-1 tabular">
            <Coins className="size-3" /> {fmtPLN(post.estimated_cost)}
          </span>
        )}
        {savings > 0 && (
          <span className="inline-flex items-center gap-1 text-success tabular">
            <PiggyBank className="size-3" /> {fmtPLN(savings)}/mies.
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function ImplementationPage() {
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [progressFor, setProgressFor] = useState<PostLite | null>(null);
  const [dragOver, setDragOver] = useState<Column | null>(null);
  const pipeline = usePipeline({ department, category, mine_only: mineOnly });
  const departments = useDepartmentOptions(true); // strona tylko dla management
  const categories = useCategories();
  const update = useUpdateProgress();

  const data = pipeline.data;
  const stats = useMemo(() => {
    const all = data ? [...data.SUBMITTED, ...data.IN_PROGRESS] : [];
    return {
      submitted: data?.SUBMITTED.length ?? 0,
      inProgress: data?.IN_PROGRESS.length ?? 0,
      implemented: data?.IMPLEMENTED.length ?? 0,
      overdue: all.filter(isOverdue).length,
      savings: (data?.IMPLEMENTED ?? []).reduce((s, p) => s + Number(p.savings ?? 0), 0),
    };
  }, [data]);

  const findPost = (id: number) =>
    data ? [...data.SUBMITTED, ...data.IN_PROGRESS, ...data.IMPLEMENTED].find((p) => p.id === id) : undefined;

  const onDrop = (column: Column, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const post = findPost(Number(e.dataTransfer.getData("text/plain")));
    if (!post || post.status === column || !post.can_update_progress) return;
    if (column === "IMPLEMENTED") {
      update.mutate(
        { id: post.id, progress_percent: 100 },
        {
          onSuccess: () => toast.success("Oznaczono jako wdrożone", post.title),
          onError: (err) => toast.error("Nie udało się zmienić statusu", errorMessage(err)),
        },
      );
    } else if (column === "IN_PROGRESS") {
      setProgressFor({ ...post, progress_percent: Math.max(post.progress_percent ?? 0, 10) });
    } else {
      toast.info("Nie można cofnąć wdrożenia do kolumny „Zaakceptowane”.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Realizacja"
        description="Zaakceptowane pomysły w drodze do wdrożenia. Przeciągnij kartę, aby zmienić etap."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              selectSize="sm"
              value={department}
              onValueChange={setDepartment}
              placeholder="Wszystkie działy"
              options={(departments.data ?? []).map((d) => ({ value: String(d.id), label: d.name }))}
              className="w-44"
            />
            <Select
              selectSize="sm"
              value={category}
              onValueChange={setCategory}
              placeholder="Wszystkie kategorie"
              options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
              className="w-44"
            />
            <Switch size="sm" checked={mineOnly} onCheckedChange={setMineOnly} label={<span className="text-[13px]">Tylko moje</span>} className="items-center gap-2" />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Czeka na start" value={fmtNum(stats.submitted)} icon={<Hourglass />} loading={pipeline.isLoading} />
        <StatCard label="W realizacji" value={fmtNum(stats.inProgress)} icon={<Rocket />} loading={pipeline.isLoading} />
        <StatCard
          label="Po terminie"
          value={<span className={cn(stats.overdue > 0 && "text-danger")}>{fmtNum(stats.overdue)}</span>}
          icon={<AlarmClock />}
          loading={pipeline.isLoading}
        />
        <StatCard
          label="Wdrożone"
          value={fmtNum(stats.implemented)}
          icon={<CheckCircle2 />}
          hint={stats.savings > 0 ? `${fmtPLN(stats.savings)} oszczędności / mies.` : undefined}
          loading={pipeline.isLoading}
        />
      </div>

      {pipeline.isError ? (
        <ErrorState onRetry={() => pipeline.refetch()} />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
          <div className="grid min-w-[840px] grid-cols-3 gap-4">
            {COLUMNS.map((col) => {
              const items = data?.[col.key] ?? [];
              const meta = STATUS_META[col.key];
              return (
                <section
                  key={col.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOver !== col.key) setDragOver(col.key);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null);
                  }}
                  onDrop={(e) => onDrop(col.key, e)}
                  className={cn(
                    "flex min-h-[420px] flex-col rounded-lg border border-border bg-surface-muted/60 transition-colors",
                    dragOver === col.key && "border-primary/50 bg-primary-soft/40",
                  )}
                >
                  <header className="flex items-center gap-2 px-3 py-2.5">
                    <span className="size-2 rounded-full" style={{ background: meta.color }} />
                    <h2 className="text-[13px] font-semibold text-foreground">{col.title}</h2>
                    <span className="rounded-full bg-accent px-1.5 text-[11px] font-medium text-muted tabular">
                      {items.length}
                    </span>
                    <span className="ml-auto truncate text-[11px] text-subtle">{col.hint}</span>
                  </header>
                  <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
                    {pipeline.isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                    ) : items.length === 0 ? (
                      <p className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border px-4 py-10 text-center text-xs text-subtle">
                        Brak pomysłów
                      </p>
                    ) : (
                      items.map((p, i) => (
                        <KanbanCard key={p.id} post={p} column={col.key} index={i} onProgress={setProgressFor} />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <ProgressDialog
        post={progressFor ? { id: progressFor.id, title: progressFor.title, progress_percent: progressFor.progress_percent, deadline: progressFor.deadline } : null}
        open={!!progressFor}
        onOpenChange={(o) => !o && setProgressFor(null)}
      />
    </div>
  );
}
