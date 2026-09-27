"use client";
import { Fragment, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Reply, Send, Trash2 } from "lucide-react";
import { cn, displayName, errorMessage, fmtDateTime, fmtRelative } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useAddComment, useComments, useDeleteComment, useUserSearch } from "@/lib/ideas";
import type { Comment, UserPublic } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useDebouncedValue } from "@/components/ui/use-debounce";

interface Node extends Comment {
  children: Node[];
}

function buildTree(list: Comment[]): Node[] {
  const map = new Map<number, Node>();
  list.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: Node[] = [];
  map.forEach((node) => {
    const parent = node.parent ? map.get(node.parent) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

// Nick może zawierać kropkę (np. @jan.kowalski), ale nie na końcu (koniec zdania).
const MENTION_SPLIT = /(@[A-Za-z0-9_.-]{1,49}[A-Za-z0-9_-])/g;
const MENTION_FULL = /^@[A-Za-z0-9_.-]{1,49}[A-Za-z0-9_-]$/;

/** Podświetla @wzmianki w treści. */
function renderText(text: string) {
  const parts = text.split(MENTION_SPLIT);
  return parts.map((part, i) =>
    MENTION_FULL.test(part) ? (
      <span key={i} className="rounded bg-primary-soft px-0.5 font-medium text-primary">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/* ------------------------------ composer ------------------------------ */

function mentionHandle(u: UserPublic) {
  return u.nickname || u.username;
}

function Composer({
  postId,
  parent,
  autoFocus,
  placeholder = "Napisz komentarz... (@ aby oznaczyć osobę)",
  onDone,
  onCancel,
  initialText = "",
}: {
  postId: number;
  parent?: number | null;
  autoFocus?: boolean;
  placeholder?: string;
  onDone?: () => void;
  onCancel?: () => void;
  initialText?: string;
}) {
  const { user } = useAuth();
  const add = useAddComment(postId);
  const [text, setText] = useState(initialText);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);
  const q = useDebouncedValue(mention?.query ?? "", 200);
  const people = useUserSearch(q, !!mention && q.length >= 1);
  const suggestions = mention ? (people.data ?? []).slice(0, 6) : [];

  const detectMention = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const m = before.match(/(^|\s)@([A-Za-z0-9_.-]{0,30})$/);
    if (m) setMention({ query: m[2], start: caret - m[2].length - 1 });
    else setMention(null);
    setActive(0);
  };

  const insertMention = (u: UserPublic) => {
    if (!mention) return;
    const handle = mentionHandle(u);
    const caret = ref.current?.selectionStart ?? text.length;
    const next = `${text.slice(0, mention.start)}@${handle} ${text.slice(caret)}`;
    setText(next);
    setMention(null);
    requestAnimationFrame(() => {
      const pos = mention.start + handle.length + 2;
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
    });
  };

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    add.mutate(
      { text: value, parent: parent ?? null },
      {
        onSuccess: () => {
          setText("");
          onDone?.();
        },
        onError: (err) => toast.error("Nie udało się dodać komentarza", errorMessage(err)),
      },
    );
  };

  return (
    <div className="flex gap-2.5">
      <Avatar user={user} size="md" className="mt-0.5" />
      <div className="relative min-w-0 flex-1">
        <div className="rounded-lg border border-border bg-surface shadow-xs transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-3 focus-within:ring-ring/40">
          <textarea
            ref={ref}
            value={text}
            autoFocus={autoFocus}
            rows={parent ? 2 : 3}
            placeholder={placeholder}
            onChange={(e) => {
              setText(e.target.value);
              detectMention(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={(e) => {
              if (suggestions.length) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => (a + 1) % suggestions.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  insertMention(suggestions[active]);
                  return;
                }
              }
              if (e.key === "Escape") {
                if (mention) setMention(null);
                else onCancel?.();
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            className="block w-full resize-none bg-transparent px-3 py-2 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-subtle"
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <span className="pl-1 text-[11px] text-subtle">Ctrl + Enter, aby wysłać</span>
            <div className="flex items-center gap-1">
              {onCancel && (
                <Button variant="ghost" size="xs" onClick={onCancel}>
                  Anuluj
                </Button>
              )}
              <Button size="xs" onClick={submit} loading={add.isPending} disabled={!text.trim()}>
                {!add.isPending && <Send />}
                {parent ? "Odpowiedz" : "Wyślij"}
              </Button>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="listbox"
              className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-elevated p-1 shadow-pop"
            >
              {suggestions.map((u, i) => (
                <li key={u.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(u);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px]",
                      i === active ? "bg-accent" : "hover:bg-accent",
                    )}
                  >
                    <Avatar user={u} size="xs" />
                    <span className="min-w-0 flex-1 truncate text-foreground">{displayName(u)}</span>
                    <span className="truncate text-xs text-subtle">@{mentionHandle(u)}</span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------ komentarz ------------------------------ */

function CommentItem({
  node,
  postId,
  depth,
  postAuthorId,
  onDelete,
}: {
  node: Node;
  postId: number;
  depth: number;
  postAuthorId?: number;
  onDelete: (c: Comment) => void;
}) {
  const { user } = useAuth();
  const [replying, setReplying] = useState(false);
  const mine = user?.id === node.author.id;
  // Odpowiedzi głębiej niż 2 poziomy przypinamy do poziomu 2 (czytelność).
  const replyParent = node.id;

  return (
    <motion.li initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="group/comment">
      <div className="flex gap-2.5">
        <Link href={`/profile/${node.author.id}`} className="shrink-0">
          <Avatar user={node.author} size={depth > 0 ? "sm" : "md"} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Link href={`/profile/${node.author.id}`} className="text-[13px] font-medium text-foreground hover:underline">
              {displayName(node.author)}
            </Link>
            {node.author.id === postAuthorId && (
              <span className="rounded bg-primary-soft px-1 text-[10px] font-medium text-primary">Autor</span>
            )}
            <time title={fmtDateTime(node.created_at)} className="text-[11px] text-subtle">
              {fmtRelative(node.created_at)}
            </time>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground">
            {renderText(node.text)}
          </p>
          <div className="mt-1 flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setReplying((r) => !r)}
              className="inline-flex items-center gap-1 font-medium text-muted transition-colors hover:text-foreground"
            >
              <Reply className="size-3.5" /> Odpowiedz
            </button>
            {mine && (
              <button
                type="button"
                onClick={() => onDelete(node)}
                className="inline-flex items-center gap-1 text-muted opacity-0 transition-opacity hover:text-danger focus:opacity-100 group-hover/comment:opacity-100"
              >
                <Trash2 className="size-3.5" /> Usuń
              </button>
            )}
          </div>
          {replying && (
            <div className="mt-3">
              <Composer
                postId={postId}
                parent={replyParent}
                autoFocus
                initialText={!mine ? `@${node.author.nickname || node.author.username} ` : ""}
                placeholder="Twoja odpowiedź..."
                onDone={() => setReplying(false)}
                onCancel={() => setReplying(false)}
              />
            </div>
          )}
          {node.children.length > 0 && (
            <ul className={cn("mt-3 flex flex-col gap-4", depth < 2 && "border-l border-border pl-4")}>
              {node.children.map((child) => (
                <CommentItem
                  key={child.id}
                  node={child}
                  postId={postId}
                  depth={Math.min(depth + 1, 2)}
                  postAuthorId={postAuthorId}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.li>
  );
}

/* ------------------------------ wątek ------------------------------ */

export function CommentThread({ postId, postAuthorId }: { postId: number; postAuthorId?: number }) {
  const comments = useComments(postId);
  const del = useDeleteComment(postId);
  const [toDelete, setToDelete] = useState<Comment | null>(null);
  const tree = useMemo(() => buildTree(comments.data ?? []), [comments.data]);
  const count = comments.data?.length ?? 0;

  return (
    <section id="komentarze" className="scroll-mt-20">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquare className="size-4 text-muted" /> Komentarze
        {count > 0 && <span className="text-muted tabular">{count}</span>}
      </h2>
      <Composer postId={postId} />
      <div className="mt-6">
        {comments.isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-2.5">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.isError ? (
          <ErrorState size="sm" onRetry={() => comments.refetch()} />
        ) : tree.length === 0 ? (
          <EmptyState size="sm" icon={<MessageSquare />} title="Brak komentarzy" description="Rozpocznij dyskusję jako pierwsza osoba." />
        ) : (
          <ul className="flex flex-col gap-5">
            {tree.map((node) => (
              <CommentItem key={node.id} node={node} postId={postId} depth={0} postAuthorId={postAuthorId} onDelete={setToDelete} />
            ))}
          </ul>
        )}
      </div>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Usunąć komentarz?"
        description="Usunięte zostaną też odpowiedzi do tego komentarza."
        tone="danger"
        confirmLabel="Usuń"
        loading={del.isPending}
        onConfirm={() =>
          toDelete &&
          del.mutate(toDelete.id, {
            onSuccess: () => {
              setToDelete(null);
              toast.success("Usunięto komentarz");
            },
            onError: (err) => toast.error("Nie udało się usunąć", errorMessage(err)),
          })
        }
      />
    </section>
  );
}
