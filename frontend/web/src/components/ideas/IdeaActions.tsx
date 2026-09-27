"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Heart, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn, fmtNum } from "@/lib/utils";
import { useToggleBookmark, useToggleLike } from "@/lib/ideas";
import type { Post } from "@/lib/types";
import { toast } from "@/components/ui/toast";

type LikeTarget = Pick<Post, "id" | "likes_count" | "is_liked_by_me">;

const pill =
  "relative z-10 inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium tabular transition-colors";

/** Lajk z optymistyczną aktualizacją cache (listy + szczegóły). */
export function LikeButton({ post, size = "sm" }: { post: LikeTarget; size?: "sm" | "md" }) {
  const like = useToggleLike();
  const liked = post.is_liked_by_me;
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? "Cofnij polubienie" : "Polub"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        like.mutate(post, { onError: () => toast.error("Nie udało się zapisać polubienia") });
      }}
      className={cn(
        pill,
        size === "md" && "h-8 px-2.5 text-[13px]",
        liked ? "text-danger hover:bg-danger-soft" : "text-muted hover:bg-accent hover:text-foreground",
      )}
    >
      <motion.span
        key={liked ? "on" : "off"}
        initial={liked ? { scale: 0.6 } : false}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 600, damping: 15 }}
        className="inline-flex"
      >
        <Heart className={cn("size-4", liked && "fill-current")} />
      </motion.span>
      <span className="relative inline-flex overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={post.likes_count}
            initial={{ y: liked ? 8 : -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: liked ? -8 : 8, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {fmtNum(post.likes_count)}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}

export function CommentsLink({ post, size = "sm" }: { post: Pick<Post, "id" | "comments_count">; size?: "sm" | "md" }) {
  return (
    <Link
      href={`/ideas/${post.id}#komentarze`}
      aria-label={`Komentarze: ${post.comments_count}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(pill, size === "md" && "h-8 px-2.5 text-[13px]", "text-muted hover:bg-accent hover:text-foreground")}
    >
      <MessageSquare className="size-4" />
      {fmtNum(post.comments_count)}
    </Link>
  );
}

export function BookmarkButton({
  post,
  withLabel,
}: {
  post: Pick<Post, "id" | "is_bookmarked_by_me">;
  withLabel?: boolean;
}) {
  const bookmark = useToggleBookmark();
  const on = post.is_bookmarked_by_me;
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Usuń z zapisanych" : "Zapisz"}
      title={on ? "Usuń z zapisanych" : "Zapisz"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        bookmark.mutate(post, {
          onSuccess: (d) => toast.success(d.is_bookmarked_by_me ? "Zapisano pomysł" : "Usunięto z zapisanych"),
          onError: () => toast.error("Nie udało się zapisać"),
        });
      }}
      className={cn(
        pill,
        on ? "text-primary hover:bg-primary-soft" : "text-muted hover:bg-accent hover:text-foreground",
      )}
    >
      <Bookmark className={cn("size-4", on && "fill-current")} />
      {withLabel && (on ? "Zapisane" : "Zapisz")}
    </button>
  );
}
