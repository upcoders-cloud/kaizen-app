"use client";
import { useId, useState } from "react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { Eye, EyeOff, Wand2 } from "lucide-react";
import { setUserPassword, type AdminUser } from "@/lib/admin";
import { displayName } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { errorText } from "@/components/admin/Feedback";

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomPassword(length = 12) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Ustawienie nowego hasła użytkownikowi (`POST /admin/users/{id}/set_password/`). */
export function PasswordDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const formId = useId();
  const mutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => setUserPassword(id, password),
  });
  return (
    <Dialog
      open={!!user}
      onOpenChange={(o) => !o && onClose()}
      title="Ustaw nowe hasło"
      description={user ? `${displayName(user)} (@${user.username})` : undefined}
      size="sm"
      dismissible={!mutation.isPending}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Anuluj
          </Button>
          <Button type="submit" form={formId} loading={mutation.isPending}>
            Ustaw hasło
          </Button>
        </>
      }
    >
      {user && <PasswordForm key={user.id} id={formId} user={user} mutation={mutation} onClose={onClose} />}
    </Dialog>
  );
}

function PasswordForm({
  id,
  user,
  mutation,
  onClose,
}: {
  id: string;
  user: AdminUser;
  mutation: UseMutationResult<void, Error, { id: number; password: string }>;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setError("Hasło musi mieć co najmniej 6 znaków.");
    mutation.mutate(
      { id: user.id, password },
      {
        onSuccess: () => {
          toast.success("Hasło zostało zmienione", "Przekaż je użytkownikowi bezpiecznym kanałem.");
          onClose();
        },
        onError: (err) => setError(errorText(err)),
      },
    );
  };

  return (
    <form id={id} onSubmit={submit} noValidate className="flex flex-col gap-3">
      <Field
        label="Nowe hasło"
        required
        hint="Min. 6 znaków. Obecne sesje użytkownika pozostaną aktywne."
        error={error || undefined}
      >
        <Input
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          className="font-mono"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          data-autofocus
        />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="xs"
          variant="secondary"
          onClick={() => {
            setPassword(randomPassword());
            setVisible(true);
            setError("");
          }}
        >
          <Wand2 /> Wygeneruj
        </Button>
        <IconButton type="button" size="xs" variant="ghost" label={visible ? "Ukryj hasło" : "Pokaż hasło"} onClick={() => setVisible((v) => !v)}>
          {visible ? <EyeOff /> : <Eye />}
        </IconButton>
      </div>
    </form>
  );
}
