"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Send,
  SkipForward,
  X,
} from "lucide-react";
import { cn, displayName, fmtDateTime, fmtHours, fmtNum, fmtPLN, fmtRelative } from "@/lib/utils";
import { DECISION_LABELS, FREQUENCY_LABELS, STAGE_LABELS } from "@/lib/ideas";
import type { Post, PostApproval, PostImageItem, PostSurvey } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Portal, useEscape, useLockScroll } from "@/components/ui/overlay";

/* ------------------------------- galeria ------------------------------- */

const IMAGE_TYPE_LABEL: Record<string, string> = { BEFORE: "Przed", AFTER: "Po" };

export function ImageGallery({ images }: { images: PostImageItem[] }) {
  const [index, setIndex] = useState<number | null>(null);
  if (images.length === 0) return null;
  const before = images.filter((i) => i.type === "BEFORE");
  const after = images.filter((i) => i.type === "AFTER");
  const hasCompare = before.length > 0 && after.length > 0;

  const tile = (img: PostImageItem, i: number, className?: string) => (
    <button
      key={img.id}
      type="button"
      onClick={() => setIndex(images.indexOf(img))}
      className={cn(
        "group relative overflow-hidden rounded-md border border-border bg-surface-muted",
        className,
      )}
      aria-label={`Powiększ zdjęcie ${i + 1}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.url}
        alt=""
        loading="lazy"
        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
      {img.type && IMAGE_TYPE_LABEL[img.type] && (
        <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {IMAGE_TYPE_LABEL[img.type]}
        </span>
      )}
    </button>
  );

  return (
    <>
      {hasCompare ? (
        <div className="grid grid-cols-2 gap-2">
          {tile(before[0], 0, "aspect-[4/3]")}
          {tile(after[0], 1, "aspect-[4/3]")}
          {images
            .filter((i) => i !== before[0] && i !== after[0])
            .map((img, i) => tile(img, i + 2, "aspect-[4/3]"))}
        </div>
      ) : images.length === 1 ? (
        tile(images[0], 0, "aspect-[16/9] w-full")
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((img, i) => tile(img, i, i === 0 && images.length >= 3 ? "col-span-2 row-span-2 aspect-auto sm:aspect-auto" : "aspect-square"))}
        </div>
      )}
      <Lightbox images={images} index={index} onIndexChange={setIndex} />
    </>
  );
}

function Lightbox({
  images,
  index,
  onIndexChange,
}: {
  images: PostImageItem[];
  index: number | null;
  onIndexChange: (i: number | null) => void;
}) {
  const open = index !== null;
  useEscape(open, () => onIndexChange(null));
  useLockScroll(open);
  const step = (d: number) => index !== null && onIndexChange((index + d + images.length) % images.length);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onIndexChange((index + 1) % images.length);
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length, onIndexChange]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onIndexChange(null)}
            role="dialog"
            aria-label="Podgląd zdjęcia"
          >
            <motion.img
              key={images[index!].id}
              src={images[index!].url}
              alt=""
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-h-[88vh] max-w-full rounded-md object-contain shadow-dialog"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              aria-label="Zamknij"
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={() => onIndexChange(null)}
            >
              <X className="size-5" />
            </button>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Poprzednie"
                  className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Następne"
                  className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                >
                  <ChevronRight className="size-5" />
                </button>
                <span className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-xs text-white tabular">
                  {index! + 1} / {images.length}
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/* ---------------------------- oś akceptacji ---------------------------- */

const DECISION_STYLE: Record<string, { icon: React.ComponentType<{ className?: string }>; dot: string }> = {
  APPROVED: { icon: Check, dot: "bg-success text-white dark:text-background" },
  REJECTED: { icon: X, dot: "bg-danger text-white dark:text-background" },
  PENDING: { icon: Clock, dot: "bg-warning-soft text-warning ring-1 ring-warning/40" },
  SKIPPED: { icon: SkipForward, dot: "bg-accent text-subtle" },
};

export function ApprovalTimeline({ post }: { post: Post }) {
  const approvals = [...(post.approvals ?? [])].sort((a, b) => a.order - b.order);
  const currentId = post.current_stage?.id;

  const steps: {
    key: string;
    title: string;
    who?: PostApproval["approver"];
    decision?: string;
    comment?: string | null;
    date?: string | null;
    current?: boolean;
    icon: React.ComponentType<{ className?: string }>;
    dot: string;
  }[] = [
    {
      key: "created",
      title: "Zgłoszenie",
      who: post.author,
      date: post.created_at,
      icon: Send,
      dot: "bg-primary text-primary-fg",
    },
    ...approvals.map((a) => {
      const style = DECISION_STYLE[a.decision] ?? DECISION_STYLE.PENDING;
      return {
        key: `a${a.id}`,
        title: STAGE_LABELS[a.stage] ?? a.stage,
        who: a.approver,
        decision: a.decision,
        comment: a.comment,
        date: a.decided_at,
        current: a.id === currentId,
        icon: style.icon,
        dot: style.dot,
      };
    }),
  ];

  if (post.status === "IN_PROGRESS" || post.status === "IMPLEMENTED") {
    steps.push({
      key: "impl",
      title: post.status === "IMPLEMENTED" ? "Wdrożono" : `Wdrożenie w toku (${post.progress_percent}%)`,
      icon: post.status === "IMPLEMENTED" ? Check : Circle,
      dot: post.status === "IMPLEMENTED" ? "bg-success text-white dark:text-background" : "bg-violet-soft text-violet",
    });
  }

  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const last = i === steps.length - 1;
        return (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className="absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-px bg-border" aria-hidden />}
            <span className={cn("relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full", s.dot)}>
              <Icon className="size-3" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[13px] font-medium text-foreground">{s.title}</span>
                {s.decision && (
                  <span
                    className={cn(
                      "text-xs",
                      s.decision === "APPROVED" && "text-success",
                      s.decision === "REJECTED" && "text-danger",
                      s.decision === "PENDING" && "text-warning",
                      s.decision === "SKIPPED" && "text-subtle",
                    )}
                  >
                    {s.current ? "Oczekuje na decyzję" : DECISION_LABELS[s.decision]}
                  </span>
                )}
              </div>
              {(s.who || s.date) && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  {s.who && (
                    <>
                      <Avatar user={s.who} size="xs" />
                      {displayName(s.who)}
                    </>
                  )}
                  {s.who && s.date && <span className="text-subtle">·</span>}
                  {s.date && (
                    <time title={fmtDateTime(s.date)} className="text-subtle">
                      {fmtRelative(s.date)}
                    </time>
                  )}
                </p>
              )}
              {s.comment && (
                <p className="mt-1.5 rounded-md bg-surface-muted px-2.5 py-1.5 text-xs leading-relaxed text-foreground">
                  {s.comment}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------- ankieta ------------------------------- */

export function SurveySummary({ survey }: { survey: PostSurvey }) {
  const monthly = Number(survey.estimated_financial_savings ?? 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-success-soft px-3 py-2.5">
          <p className="text-[11px] font-medium text-success">Oszczędności / mies.</p>
          <p className="mt-0.5 text-lg font-semibold tabular text-foreground">{fmtPLN(monthly)}</p>
          <p className="text-[11px] text-muted tabular">{fmtPLN(monthly * 12)} rocznie</p>
        </div>
        <div className="rounded-md bg-info-soft px-3 py-2.5">
          <p className="text-[11px] font-medium text-info">Czas / mies.</p>
          <p className="mt-0.5 text-lg font-semibold tabular text-foreground">
            {fmtHours(survey.estimated_time_savings_hours)}
          </p>
          <p className="text-[11px] text-muted tabular">
            {fmtHours(Number(survey.estimated_time_savings_hours) * 12)} rocznie
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
        <dt className="text-muted">Częstotliwość</dt>
        <dd className="text-right text-foreground tabular">
          {fmtNum(survey.frequency_value)}× {FREQUENCY_LABELS[survey.frequency_unit] ?? survey.frequency_unit}
        </dd>
        <dt className="text-muted">Liczba osób</dt>
        <dd className="text-right text-foreground tabular">{fmtNum(survey.affected_people)}</dd>
        <dt className="text-muted">Strata czasu</dt>
        <dd className="text-right text-foreground tabular">{fmtNum(survey.time_lost_minutes)} min</dd>
      </dl>
    </div>
  );
}
