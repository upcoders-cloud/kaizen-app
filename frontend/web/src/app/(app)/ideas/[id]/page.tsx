"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Check,
  ClipboardCheck,
  Coins,
  Gauge,
  Link2,
  Pencil,
  PiggyBank,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { cn, displayName, errorMessage, fmtDate, fmtDateTime, fmtPLN, fmtRelative } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { STAGE_LABELS, deletePost, ideaKeys, useInvalidatePosts, usePost, useResubmit } from "@/lib/ideas";
import type { Post } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/misc";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { BookmarkButton, LikeButton } from "@/components/ideas";
import { ApprovalTimeline, ImageGallery, SurveySummary } from "@/components/ideas/IdeaDetailParts";
import { ApproveDialog, ProgressDialog, RejectDialog } from "@/components/ideas/DecisionDialogs";
import { CommentThread } from "@/components/comments/CommentThread";

const PROGRESS_STATUSES = ["SUBMITTED", "IN_PROGRESS", "IMPLEMENTED"];

function usePermissions(post: Post | undefined) {
  const { user, isAdmin } = useAuth();
  if (!post || !user) return { isAuthor: false, isCurrentApprover: false, canProgress: false, canEdit: false };
  const isAuthor = post.author.id === user.id;
  const isCurrentApprover = post.status === "TO_VERIFY" && post.current_stage?.approver?.id === user.id;
  // Uprawnienie z API; wdrożonego pomysłu nie da się cofnąć poniżej 100% (backend zwraca 400).
  const canProgress =
    post.status !== "IMPLEMENTED" &&
    (post.can_update_progress ??
      (PROGRESS_STATUSES.includes(post.status) &&
        (isAdmin || post.assigned_manager === user.id || post.assigned_director_detail?.id === user.id)));
  const canEdit = isAuthor && (post.status === "TO_VERIFY" || post.status === "CANCELLED");
  return { isAuthor, isCurrentApprover, canProgress, canEdit };
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-60" />
        <SkeletonText lines={6} className="pt-4" />
        <Skeleton className="aspect-[16/9] w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  );
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
      <span className="flex items-center gap-2 text-muted [&_svg]:size-3.5">
        {icon}
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-foreground">{children}</span>
    </div>
  );
}

export default function IdeaDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const query = usePost(Number.isFinite(id) ? id : undefined);
  const post = query.data;
  const perms = usePermissions(post);
  const resubmit = useResubmit();
  const invalidate = useInvalidatePosts();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<"approve" | "reject" | "progress" | "delete" | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (query.isLoading) return <DetailSkeleton />;
  if (query.isError || !post) {
    const status = (query.error as { response?: { status?: number } } | null)?.response?.status;
    return status === 404 || !Number.isFinite(id) ? (
      <EmptyState
        variant="card"
        icon={<AlertCircle />}
        title="Nie znaleziono pomysłu"
        description="Pomysł mógł zostać usunięty albo nie masz do niego dostępu."
        action={
          <Link href="/feed" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Wróć do feedu
          </Link>
        }
      />
    ) : (
      <ErrorState onRetry={() => query.refetch()} />
    );
  }

  const images = post.image_items?.length
    ? post.image_items
    : (post.image_urls ?? []).map((url, i) => ({ id: -i - 1, url }));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Skopiowano link");
    } catch {
      toast.error("Nie udało się skopiować linku");
    }
  };

  const doResubmit = () =>
    resubmit.mutate(
      { id: post.id },
      {
        onSuccess: () => toast.success("Zgłoszono ponownie", "Pomysł wrócił do weryfikacji."),
        onError: (err) => toast.error("Nie udało się zgłosić ponownie", errorMessage(err)),
      },
    );

  const doDelete = async () => {
    setDeleting(true);
    try {
      await deletePost(post.id);
      toast.success("Usunięto pomysł");
      // Usunięty post nie może być ponownie pobierany (404 na szczegóły/komentarze).
      qc.removeQueries({ queryKey: ideaKeys.detail(post.id) });
      qc.removeQueries({ queryKey: ideaKeys.comments(post.id) });
      invalidate();
      router.replace("/my-ideas");
    } catch (err) {
      toast.error("Nie udało się usunąć", errorMessage(err));
      setDeleting(false);
    }
  };

  const hasActions = perms.isCurrentApprover || perms.canProgress || perms.canEdit;
  const cost = post.estimated_cost !== null && post.estimated_cost !== undefined ? Number(post.estimated_cost) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* treść */}
      <article className="min-w-0">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/feed"))}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Wróć
        </button>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={post.status} size="md" />
          {post.category_name && (
            <Badge tone="outline" size="md">
              {post.category_name}
            </Badge>
          )}
          <span className="text-xs text-subtle">#{post.id}</span>
        </div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">{post.title}</h1>
        <div className="mt-3 flex items-center gap-2.5">
          <Link href={`/profile/${post.author.id}`}>
            <Avatar user={post.author} size="md" />
          </Link>
          <div className="text-[13px] leading-tight">
            <Link href={`/profile/${post.author.id}`} className="font-medium text-foreground hover:underline">
              {displayName(post.author)}
            </Link>
            <p className="text-xs text-muted">
              {post.author.department_name ? `${post.author.department_name} · ` : ""}
              <time title={fmtDateTime(post.created_at)}>{fmtRelative(post.created_at)}</time>
            </p>
          </div>
        </div>

        {post.status === "CANCELLED" && post.rejection_reason && (
          <div className="mt-5 flex gap-3 rounded-lg border border-danger/25 bg-danger-soft p-4">
            <X className="mt-0.5 size-4 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-danger">Pomysł został odrzucony</p>
              <p className="mt-1 whitespace-pre-wrap text-[13px] text-foreground">{post.rejection_reason}</p>
              {perms.isAuthor && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/ideas/${post.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    <Pencil /> Popraw
                  </Link>
                  <Button size="sm" onClick={doResubmit} loading={resubmit.isPending}>
                    {!resubmit.isPending && <RotateCcw />} Zgłoś ponownie
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {perms.isCurrentApprover && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-warning/30 bg-warning-soft p-4">
            <ClipboardCheck className="size-5 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground">Czeka na Twoją decyzję</p>
              <p className="text-xs text-muted">
                Etap: {post.current_stage ? STAGE_LABELS[post.current_stage.stage] : "-"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="danger-soft" size="sm" onClick={() => setDialog("reject")}>
                <X /> Odrzuć
              </Button>
              <Button variant="success" size="sm" onClick={() => setDialog("approve")}>
                <Check /> Akceptuj
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 whitespace-pre-wrap break-words text-[15px] leading-7 text-foreground">{post.content}</div>

        {images.length > 0 && (
          <div className="mt-6">
            <ImageGallery images={images} />
          </div>
        )}

        <div className="mt-6 flex items-center gap-1 border-y border-border py-2">
          <LikeButton post={post} size="md" />
          <BookmarkButton post={post} withLabel />
          <button
            type="button"
            onClick={copyLink}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-accent hover:text-foreground"
          >
            <Link2 className="size-4" /> Kopiuj link
          </button>
        </div>

        <div className="mt-8">
          <CommentThread postId={post.id} postAuthorId={post.author.id} />
        </div>
      </article>

      {/* panel boczny */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        {hasActions && (
          <Card>
            <CardHeader title="Akcje" />
            <CardContent className="flex flex-col gap-2">
              {perms.isCurrentApprover && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="danger-soft" size="sm" onClick={() => setDialog("reject")}>
                    <X /> Odrzuć
                  </Button>
                  <Button variant="success" size="sm" onClick={() => setDialog("approve")}>
                    <Check /> Akceptuj
                  </Button>
                </div>
              )}
              {perms.canProgress && (
                <Button variant="secondary" size="sm" onClick={() => setDialog("progress")}>
                  <Gauge /> Aktualizuj postęp
                </Button>
              )}
              {perms.canEdit && (
                <>
                  <Link href={`/ideas/${post.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    <Pencil /> Edytuj
                  </Link>
                  {post.status === "CANCELLED" && (
                    <Button size="sm" onClick={doResubmit} loading={resubmit.isPending}>
                      {!resubmit.isPending && <RotateCcw />} Zgłoś ponownie
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setDialog("delete")}>
                    <Trash2 /> Usuń
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {PROGRESS_STATUSES.includes(post.status) && (
          <Card>
            <CardHeader title="Wdrożenie" />
            <CardContent>
              <div className="mb-3">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-xs text-muted">Postęp</span>
                  <span className="text-lg font-semibold tabular text-foreground">
                    {post.status === "IMPLEMENTED" ? 100 : post.progress_percent}%
                  </span>
                </div>
                <Progress
                  value={post.status === "IMPLEMENTED" ? 100 : post.progress_percent}
                  tone={post.status === "IMPLEMENTED" ? "success" : "violet"}
                />
              </div>
              <div className="divide-y divide-border">
                <MetaRow icon={<CalendarClock />} label="Termin">
                  {post.deadline ? fmtDate(post.deadline) : "Nie ustalono"}
                </MetaRow>
                <MetaRow icon={<Coins />} label="Koszt">
                  {cost !== null ? fmtPLN(cost) : "-"}
                </MetaRow>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-1.5">
                <PiggyBank className="size-4 text-success" /> Oszczędności
              </span>
            }
          />
          <CardContent>
            {post.survey ? (
              <SurveySummary survey={post.survey} />
            ) : (
              <div className="text-[13px] text-muted">
                Brak ankiety oszczędności.
                {perms.canEdit && (
                  <Link href={`/ideas/${post.id}/edit#ankieta`} className="ml-1 font-medium text-primary hover:underline">
                    Dodaj
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Ścieżka akceptacji" />
          <CardContent>
            <ApprovalTimeline post={post} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Osoby" />
          <CardContent className="divide-y divide-border pt-0">
            {[
              ["Lider zespołu", post.assigned_team_lead_detail],
              ["Kierownik", post.assigned_manager_detail],
              ["Dyrektor", post.assigned_director_detail],
            ]
              .filter(([, u]) => !!u)
              .map(([label, u]) => (
                <div key={label as string} className="flex items-center justify-between gap-2 py-2 text-[13px]">
                  <span className="text-muted">{label as string}</span>
                  <Link
                    href={`/profile/${(u as Post["author"]).id}`}
                    className={cn("flex min-w-0 items-center gap-1.5 text-foreground hover:underline")}
                  >
                    <Avatar user={u as Post["author"]} size="xs" />
                    <span className="truncate">{displayName(u as Post["author"])}</span>
                  </Link>
                </div>
              ))}
            <div className="flex items-center justify-between gap-2 py-2 text-[13px]">
              <span className="text-muted">Zgłoszono</span>
              <span className="text-foreground">{fmtDate(post.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      </aside>

      <ApproveDialog post={post} open={dialog === "approve"} onOpenChange={(o) => setDialog(o ? "approve" : null)} />
      <RejectDialog post={post} open={dialog === "reject"} onOpenChange={(o) => setDialog(o ? "reject" : null)} />
      <ProgressDialog post={post} open={dialog === "progress"} onOpenChange={(o) => setDialog(o ? "progress" : null)} />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => setDialog(o ? "delete" : null)}
        title="Usunąć pomysł?"
        description="Pomysł, zdjęcia i komentarze zostaną trwale usunięte."
        tone="danger"
        confirmLabel="Usuń"
        loading={deleting}
        onConfirm={doDelete}
      />
    </div>
  );
}
