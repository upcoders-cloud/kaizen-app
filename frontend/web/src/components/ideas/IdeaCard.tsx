"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, ImageIcon, PiggyBank } from "lucide-react";
import { cn, displayName, fmtDate, fmtPLN, fmtRelative } from "@/lib/utils";
import type { Post } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkButton, CommentsLink, LikeButton } from "./IdeaActions";

export interface IdeaCardProps {
  post: Post;
  /** Ukrywa nagłówek z autorem (np. "Moje pomysły"). */
  hideAuthor?: boolean;
  /** Ukrywa status (np. gdy lista jest już filtrowana po statusie). */
  hideStatus?: boolean;
  /** Dodatkowe przyciski w stopce po prawej (np. "Zgłoś ponownie"). */
  actions?: React.ReactNode;
  /** Treść pod opisem (np. powód odrzucenia). */
  children?: React.ReactNode;
  /** Zamiast nawigacji do /ideas/[id] (np. podgląd w Sheet). */
  onOpen?: (post: Post) => void;
  /** Ukrywa lajk/komentarze/zakładkę. */
  hideSocial?: boolean;
  /** Indeks na liście - opóźnienie animacji wejścia. */
  index?: number;
  className?: string;
}

function firstImage(post: Post) {
  return post.image_items?.[0]?.url ?? post.image_urls?.[0] ?? null;
}

export function IdeaCard({
  post,
  hideAuthor,
  hideStatus,
  actions,
  children,
  onOpen,
  hideSocial,
  index = 0,
  className,
}: IdeaCardProps) {
  const thumb = firstImage(post);
  const imageCount = post.image_items?.length ?? post.image_urls?.length ?? 0;
  const savings = Number(post.survey?.estimated_financial_savings ?? 0);
  const href = `/ideas/${post.id}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03, ease: "easeOut" }}
      className={cn(
        "group relative rounded-lg border border-border bg-surface p-4 shadow-card transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-pop",
        className,
      )}
    >
      {!hideAuthor || !hideStatus ? (
        <header className="mb-2.5 flex items-center gap-2">
          {!hideAuthor && (
            <>
              <Link
                href={`/profile/${post.author.id}`}
                className="relative z-10 shrink-0"
                aria-label={displayName(post.author)}
              >
                <Avatar user={post.author} size="sm" />
              </Link>
              <div className="flex min-w-0 items-center gap-1.5 text-xs">
                <Link
                  href={`/profile/${post.author.id}`}
                  className="relative z-10 truncate font-medium text-foreground hover:underline"
                >
                  {displayName(post.author)}
                </Link>
                {post.author.department_name && (
                  <>
                    <span className="text-subtle">·</span>
                    <span className="truncate text-muted">{post.author.department_name}</span>
                  </>
                )}
                <span className="text-subtle">·</span>
                <time dateTime={post.created_at} title={fmtDate(post.created_at)} className="shrink-0 text-subtle">
                  {fmtRelative(post.created_at)}
                </time>
              </div>
            </>
          )}
          {hideAuthor && (
            <time dateTime={post.created_at} className="text-xs text-subtle">
              {fmtRelative(post.created_at)}
            </time>
          )}
          {!hideStatus && <StatusBadge status={post.status} className="ml-auto" />}
        </header>
      ) : null}

      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
            {onOpen ? (
              <button
                type="button"
                onClick={() => onOpen(post)}
                className="text-left after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
              >
                <span className="line-clamp-2">{post.title}</span>
              </button>
            ) : (
              <Link href={href} className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none">
                <span className="line-clamp-2">{post.title}</span>
              </Link>
            )}
          </h3>
          {post.content && (
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">{post.content}</p>
          )}
        </div>
        {thumb && (
          <div className="relative size-[76px] shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            {imageCount > 1 && (
              <span className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded bg-black/60 px-1 text-[10px] font-medium text-white">
                <ImageIcon className="size-2.5" />
                {imageCount}
              </span>
            )}
          </div>
        )}
      </div>

      {(post.status === "IN_PROGRESS" || post.status === "IMPLEMENTED") && (
        <div className="mt-3 flex items-center gap-3">
          <Progress
            value={post.status === "IMPLEMENTED" ? 100 : post.progress_percent}
            tone={post.status === "IMPLEMENTED" ? "success" : "violet"}
            size="sm"
            showLabel
            className="flex-1"
          />
          {post.deadline && post.status === "IN_PROGRESS" && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
              <Clock className="size-3" /> {fmtDate(post.deadline)}
            </span>
          )}
        </div>
      )}

      {children && <div className="relative z-10 mt-3">{children}</div>}

      <footer className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {post.category_name && (
          <Badge tone="outline" className="mr-1 max-w-44 truncate">
            {post.category_name}
          </Badge>
        )}
        {savings > 0 && (
          <Badge tone="success" title="Szacowane oszczędności miesięcznie">
            <PiggyBank /> {fmtPLN(savings)}/mies.
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          {actions && <div className="relative z-10 mr-1 flex items-center gap-1">{actions}</div>}
          {!hideSocial && (
            <>
              <LikeButton post={post} />
              <CommentsLink post={post} />
              <BookmarkButton post={post} />
            </>
          )}
        </div>
      </footer>
    </motion.article>
  );
}

export function IdeaCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="ml-auto h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-2/3" />
      <div className="mt-4 flex items-center gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="ml-auto h-6 w-28" />
      </div>
    </div>
  );
}
