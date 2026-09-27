"use client";
import { useId, useState } from "react";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { adjustUserPoints, type AdminUser } from "@/lib/admin";
import { cn, displayName, fmtNum } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { errorText } from "@/components/admin/Feedback";

type Vars = { id: number; points: number; reason: string };
type Mode = "add" | "subtract";

const MAX_POINTS = 100000;

/** Ręczna korekta punktów (`POST /admin/users/{id}/adjust_points/`, transakcja "Korekta ręczna"). */
export function PointsDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const formId = useId();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, points, reason }: Vars) => adjustUserPoints(id, points, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["gamification"] });
    },
  });
  return (
    <Dialog
      open={!!user}
      onOpenChange={(o) => !o && onClose()}
      title="Korekta punktów"
      description={user ? `${displayName(user)} · saldo ${fmtNum(user.points)} pkt` : undefined}
      size="sm"
      dismissible={!mutation.isPending}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Anuluj
          </Button>
          <Button type="submit" form={formId} loading={mutation.isPending}>
            Zapisz korektę
          </Button>
        </>
      }
    >
      {user && <PointsForm key={user.id} id={formId} user={user} mutation={mutation} onClose={onClose} />}
    </Dialog>
  );
}

function PointsForm({
  id,
  user,
  mutation,
  onClose,
}: {
  id: string;
  user: AdminUser;
  mutation: UseMutationResult<void, Error, Vars>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({});

  const value = Math.trunc(Number(amount) || 0);
  const delta = mode === "add" ? value : -value;
  const after = user.points + delta;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (value <= 0) errs.amount = "Podaj dodatnią liczbę punktów.";
    else if (value > MAX_POINTS) errs.amount = `Maksymalnie ${fmtNum(MAX_POINTS)} pkt naraz.`;
    if (!reason.trim()) errs.reason = "Podaj powód - użytkownik zobaczy go w historii punktów.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    mutation.mutate(
      { id: user.id, points: delta, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(
            delta > 0 ? `Dodano ${fmtNum(delta)} pkt` : `Odjęto ${fmtNum(-delta)} pkt`,
            `${displayName(user)}: saldo ${fmtNum(after)} pkt`,
          );
          onClose();
        },
        onError: (err) => toast.error("Nie udało się skorygować punktów", errorText(err)),
      },
    );
  };

  return (
    <form id={id} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Tabs
        variant="pills"
        size="sm"
        value={mode}
        onValueChange={(v) => setMode(v as Mode)}
        items={[
          { value: "add", label: "Dodaj", icon: <Plus /> },
          { value: "subtract", label: "Odejmij", icon: <Minus /> },
        ]}
      />
      <Field label="Liczba punktów" required error={errors.amount}>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_POINTS}
          className="tabular"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setErrors((x) => ({ ...x, amount: undefined }));
          }}
          data-autofocus
        />
      </Field>
      <Field label="Powód" required error={errors.reason} hint="Widoczny w historii punktów użytkownika.">
        <Input
          value={reason}
          maxLength={255}
          placeholder="np. Nagroda za prezentację wdrożenia"
          onChange={(e) => {
            setReason(e.target.value);
            setErrors((x) => ({ ...x, reason: undefined }));
          }}
        />
      </Field>
      <div className="flex items-center justify-between rounded-md bg-surface-muted px-3 py-2 text-sm">
        <span className="text-muted">Saldo po korekcie</span>
        <span className="tabular font-medium text-foreground">
          {fmtNum(user.points)}
          <span className={cn("mx-1.5", delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-subtle")}>
            {delta >= 0 ? "+" : "-"} {fmtNum(Math.abs(delta))}
          </span>
          = <span className={cn(after < 0 && "text-danger")}>{fmtNum(after)}</span> pkt
        </span>
      </div>
    </form>
  );
}
