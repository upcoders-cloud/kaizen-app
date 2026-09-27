"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { displayName, errorMessage, fmtPLN } from "@/lib/utils";
import {
  DIRECTOR_COST_THRESHOLD,
  STAGE_LABELS,
  useApprove,
  useApprovers,
  useReject,
  useUpdateProgress,
} from "@/lib/ideas";
import type { Post, PostLite } from "@/lib/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

type DecisionPost = Pick<Post, "id" | "title" | "current_stage">;

interface DecisionDialogProps {
  post: DecisionPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: (post: Post) => void;
}

/** Akceptacja bieżącego etapu. Na etapie MANAGER wymaga kosztu (i dyrektora powyżej progu). */
export function ApproveDialog({ post, open, onOpenChange, onDone }: DecisionDialogProps) {
  return (
    <Dialog
      open={open && !!post}
      onOpenChange={onOpenChange}
      title="Akceptuj pomysł"
      description={post?.title}
      size="md"
    >
      {post && <ApproveForm key={post.id} post={post} onCancel={() => onOpenChange(false)} onDone={onDone} close={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function ApproveForm({
  post,
  onCancel,
  onDone,
  close,
}: {
  post: DecisionPost;
  onCancel: () => void;
  onDone?: (p: Post) => void;
  close: () => void;
}) {
  const approve = useApprove();
  const isManagerStage = post.current_stage?.stage === "MANAGER";
  const directors = useApprovers(isManagerStage ? "DIRECTOR" : undefined);
  const [cost, setCost] = useState("");
  const [deadline, setDeadline] = useState("");
  const [director, setDirector] = useState("");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const costNum = Number(cost.replace(",", "."));
  const needsDirector = isManagerStage && costNum > DIRECTOR_COST_THRESHOLD;

  const submit = () => {
    const errs: Record<string, string> = {};
    if (isManagerStage) {
      if (cost.trim() === "" || Number.isNaN(costNum) || costNum < 0) errs.cost = "Podaj szacowany koszt (0 lub więcej).";
      if (needsDirector && !director) errs.director = "Wybierz dyrektora do akceptacji.";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    approve.mutate(
      {
        id: post.id,
        comment: comment.trim() || undefined,
        ...(isManagerStage
          ? {
              estimated_cost: costNum,
              deadline: deadline || null,
              assigned_director: needsDirector ? Number(director) : null,
            }
          : {}),
      },
      {
        onSuccess: (p) => {
          toast.success(
            p.status === "TO_VERIFY" ? "Zaakceptowano etap" : "Pomysł zaakceptowany",
            p.status === "TO_VERIFY" && p.current_stage
              ? `Przekazano do: ${STAGE_LABELS[p.current_stage.stage]}`
              : undefined,
          );
          close();
          onDone?.(p);
        },
        onError: (err) => toast.error("Nie udało się zaakceptować", errorMessage(err)),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {post.current_stage && (
        <p className="text-[13px] text-muted">
          Etap: <span className="font-medium text-foreground">{STAGE_LABELS[post.current_stage.stage]}</span>
        </p>
      )}
      {isManagerStage && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Szacowany koszt wdrożenia (zł)" required error={errors.cost}>
            <Input
              type="number"
              min={0}
              step="100"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="np. 2500"
              data-autofocus
            />
          </Field>
          <Field label="Termin wdrożenia">
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        </div>
      )}
      {needsDirector && (
        <div className="flex flex-col gap-3 rounded-md border border-warning/30 bg-warning-soft p-3">
          <p className="flex items-start gap-2 text-[13px] text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Koszt powyżej {fmtPLN(DIRECTOR_COST_THRESHOLD)} wymaga dodatkowej akceptacji dyrektora.
          </p>
          <Field label="Dyrektor" required error={errors.director}>
            <Select
              value={director}
              onValueChange={setDirector}
              placeholder={directors.isLoading ? "Wczytywanie..." : "Wybierz dyrektora"}
              options={(directors.data ?? []).map((d) => ({
                value: String(d.id),
                label: `${displayName(d)}${d.department_name ? ` (${d.department_name})` : ""}`,
              }))}
            />
          </Field>
        </div>
      )}
      <Field label="Komentarz" hint="Opcjonalnie - zobaczy go autor na osi akceptacji.">
        <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} data-autofocus={!isManagerStage || undefined} />
      </Field>
      <div className="-mx-5 -mb-4 mt-1 flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="ghost" onClick={onCancel} disabled={approve.isPending}>
          Anuluj
        </Button>
        <Button variant="success" onClick={submit} loading={approve.isPending}>
          Akceptuj
        </Button>
      </div>
    </div>
  );
}

export function RejectDialog({ post, open, onOpenChange, onDone }: DecisionDialogProps) {
  return (
    <Dialog open={open && !!post} onOpenChange={onOpenChange} title="Odrzuć pomysł" description={post?.title}>
      {post && <RejectForm key={post.id} post={post} close={() => onOpenChange(false)} onDone={onDone} />}
    </Dialog>
  );
}

function RejectForm({ post, close, onDone }: { post: DecisionPost; close: () => void; onDone?: (p: Post) => void }) {
  const reject = useReject();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    if (reason.trim().length < 5) {
      setError("Opisz powód (min. 5 znaków), autor zobaczy go przy pomyśle.");
      return;
    }
    reject.mutate(
      { id: post.id, rejection_reason: reason.trim() },
      {
        onSuccess: (p) => {
          toast.success("Pomysł odrzucony", "Autor może go poprawić i zgłosić ponownie.");
          close();
          onDone?.(p);
        },
        onError: (err) => toast.error("Nie udało się odrzucić", errorMessage(err)),
      },
    );
  };
  return (
    <div className="flex flex-col gap-4">
      <Field label="Powód odrzucenia" required error={error}>
        <Textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Np. podobne rozwiązanie jest już wdrażane w dziale X..."
          data-autofocus
        />
      </Field>
      <div className="-mx-5 -mb-4 mt-1 flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="ghost" onClick={close} disabled={reject.isPending}>
          Anuluj
        </Button>
        <Button variant="danger" onClick={submit} loading={reject.isPending}>
          Odrzuć
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ postęp ------------------------------ */

type ProgressPost = Pick<PostLite, "id" | "title" | "progress_percent" | "deadline">;

export function ProgressDialog({
  post,
  open,
  onOpenChange,
  onDone,
}: {
  post: ProgressPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: (post: Post) => void;
}) {
  return (
    <Dialog open={open && !!post} onOpenChange={onOpenChange} title="Aktualizuj postęp wdrożenia" description={post?.title} size="sm">
      {post && <ProgressForm key={post.id} post={post} close={() => onOpenChange(false)} onDone={onDone} />}
    </Dialog>
  );
}

function ProgressForm({ post, close, onDone }: { post: ProgressPost; close: () => void; onDone?: (p: Post) => void }) {
  const update = useUpdateProgress();
  const [value, setValue] = useState(post.progress_percent ?? 0);
  const [deadline, setDeadline] = useState(post.deadline ?? "");
  const submit = () => {
    update.mutate(
      { id: post.id, progress_percent: value, deadline: deadline || null },
      {
        onSuccess: (p) => {
          toast.success(p.status === "IMPLEMENTED" ? "Pomysł oznaczony jako wdrożony" : "Zapisano postęp");
          close();
          onDone?.(p);
        },
        onError: (err) => toast.error("Nie udało się zapisać postępu", errorMessage(err)),
      },
    );
  };
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-foreground">Postęp</span>
          <span className="text-2xl font-semibold tabular text-foreground">{value}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full accent-[var(--primary)]"
          aria-label="Postęp wdrożenia"
          data-autofocus
        />
        <div className="mt-2 flex gap-1">
          {[0, 25, 50, 75, 100].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setValue(v)}
              className={
                "h-6 flex-1 rounded text-xs tabular transition-colors " +
                (value === v ? "bg-primary-soft font-medium text-primary" : "bg-accent text-muted hover:text-foreground")
              }
            >
              {v}%
            </button>
          ))}
        </div>
        {value === 100 && (
          <p className="mt-2 text-xs text-success">Zapis 100% oznaczy pomysł jako wdrożony.</p>
        )}
      </div>
      <Field label="Termin wdrożenia">
        <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>
      <div className="-mx-5 -mb-4 flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="ghost" onClick={close} disabled={update.isPending}>
          Anuluj
        </Button>
        <Button onClick={submit} loading={update.isPending}>
          Zapisz
        </Button>
      </div>
    </div>
  );
}
