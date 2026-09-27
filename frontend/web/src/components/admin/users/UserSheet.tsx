"use client";
import { useState } from "react";
import type { AxiosError } from "axios";
import { KeyRound, Sparkles } from "lucide-react";
import { useAdminMutation, type AdminUser, type Role } from "@/lib/admin";
import { fmtDate, fmtNum, fmtRelative } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";
import { errorText } from "@/components/admin/Feedback";
import { ROLE_OPTIONS } from "./constants";

type FormState = {
  username: string;
  nickname: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: Role;
  department: number | null;
  is_active: boolean;
  is_staff: boolean;
};

type Errors = Partial<Record<keyof FormState, string>>;

type TextField = "username" | "nickname" | "first_name" | "last_name" | "email";

function initialForm(user: AdminUser | null): FormState {
  return {
    username: user?.username ?? "",
    nickname: user?.nickname ?? "",
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "EMPLOYEE",
    department: user?.department ?? null,
    is_active: user?.is_active ?? true,
    is_staff: user?.is_staff ?? false,
  };
}

/** Błędy pól z odpowiedzi DRF (400) przypięte do pól formularza. */
function fieldErrors(err: unknown): Errors {
  const data = (err as AxiosError<Record<string, unknown>>)?.response?.data;
  if (!data || typeof data !== "object") return {};
  const out: Errors = {};
  for (const [key, value] of Object.entries(data)) {
    const msg = Array.isArray(value) ? value[0] : value;
    if (typeof msg === "string") out[key as keyof FormState] = msg;
  }
  return out;
}

function validate(form: FormState, isNew: boolean): Errors {
  const errs: Errors = {};
  if (!form.username.trim()) errs.username = "Podaj login.";
  if (isNew && form.password.length < 6) errs.password = "Hasło musi mieć co najmniej 6 znaków.";
  if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Niepoprawny adres e-mail.";
  return errs;
}

/** Tworzenie i edycja konta w Sheet. Przy edycji wysyła tylko zmienione pola. */
export function UserSheet({
  open,
  onOpenChange,
  user,
  departments,
  currentUserId,
  onPassword,
  onPoints,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = nowe konto. */
  user: AdminUser | null;
  departments: { value: string; label: string }[];
  currentUserId?: number;
  onPassword: (user: AdminUser) => void;
  onPoints: (user: AdminUser) => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={user ? "Edycja konta" : "Nowe konto"}
      description={user ? `@${user.username}` : "Użytkownik zaloguje się loginem i podanym hasłem."}
      width="max-w-lg"
    >
      {open && (
        <UserForm
          key={user?.id ?? "new"}
          user={user}
          departments={departments}
          isSelf={!!user && user.id === currentUserId}
          close={() => onOpenChange(false)}
          onPassword={onPassword}
          onPoints={onPoints}
        />
      )}
    </Sheet>
  );
}

function UserForm({
  user,
  departments,
  isSelf,
  close,
  onPassword,
  onPoints,
}: {
  user: AdminUser | null;
  departments: { value: string; label: string }[];
  isSelf: boolean;
  close: () => void;
  onPassword: (user: AdminUser) => void;
  onPoints: (user: AdminUser) => void;
}) {
  const { create, update } = useAdminMutation<AdminUser & { password?: string }>("users");
  const [initial] = useState(() => initialForm(user));
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const saving = create.isPending || update.isPending;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form, !user);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const entries = Object.entries(form).filter(([key, value]) => {
      if (key === "password") return !user && value;
      if (!user) return value !== "";
      return initial[key as keyof FormState] !== value;
    });
    const payload = Object.fromEntries(
      entries.map(([key, value]) => [key, typeof value === "string" && key !== "password" ? value.trim() : value]),
    );
    if (user && !entries.length) return close();
    try {
      if (user) await update.mutateAsync({ id: user.id, payload });
      else await create.mutateAsync(payload);
      toast.success(user ? "Zapisano zmiany" : "Utworzono konto", user ? undefined : `Login: ${form.username.trim()}`);
      close();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error("Nie udało się zapisać", errorText(err));
    }
  };

  const text = (key: TextField) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value),
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {user && (
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-surface-muted p-3 text-xs">
          <div>
            <p className="text-subtle">Punkty</p>
            <p className="tabular text-sm font-semibold text-foreground">{fmtNum(user.points)}</p>
          </div>
          <div>
            <p className="text-subtle">Konto od</p>
            <p className="text-sm text-foreground">{fmtDate(user.date_joined)}</p>
          </div>
          <div>
            <p className="text-subtle">Ostatnie logowanie</p>
            <p className="text-sm text-foreground">{user.last_login ? fmtRelative(user.last_login) : "nigdy"}</p>
          </div>
          <div className="col-span-3 mt-1 flex flex-wrap gap-2">
            <Button type="button" size="xs" variant="secondary" onClick={() => onPassword(user)}>
              <KeyRound /> Ustaw hasło
            </Button>
            <Button type="button" size="xs" variant="secondary" onClick={() => onPoints(user)}>
              <Sparkles /> Koryguj punkty
            </Button>
          </div>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle sm:col-span-2">Dane</h3>
        <Field label="Login" required error={errors.username}>
          <Input {...text("username")} autoComplete="off" data-autofocus={!user || undefined} />
        </Field>
        <Field label="Nick" hint={user ? undefined : "Domyślnie taki jak login."} error={errors.nickname}>
          <Input {...text("nickname")} autoComplete="off" />
        </Field>
        <Field label="Imię" error={errors.first_name}>
          <Input {...text("first_name")} />
        </Field>
        <Field label="Nazwisko" error={errors.last_name}>
          <Input {...text("last_name")} />
        </Field>
        <Field label="E-mail" error={errors.email} className="sm:col-span-2">
          <Input {...text("email")} type="email" />
        </Field>
        {!user && (
          <Field label="Hasło" required hint="Min. 6 znaków." error={errors.password} className="sm:col-span-2">
            <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} />
          </Field>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle sm:col-span-2">Rola i dostęp</h3>
        <Field label="Rola" error={errors.role}>
          <Select value={form.role} onValueChange={(v) => set("role", v as Role)} options={ROLE_OPTIONS} />
        </Field>
        <Field label="Dział" error={errors.department}>
          <Select
            value={form.department === null ? "" : String(form.department)}
            onValueChange={(v) => set("department", v ? Number(v) : null)}
            placeholder="Bez działu"
            options={departments}
          />
        </Field>
        <Switch
          className="sm:col-span-2"
          label="Konto aktywne"
          description={isSelf ? "Nie możesz dezaktywować własnego konta." : "Nieaktywny użytkownik nie może się zalogować."}
          checked={form.is_active}
          disabled={isSelf}
          onCheckedChange={(v) => set("is_active", v)}
        />
        <Switch
          className="sm:col-span-2"
          label="Administrator"
          description={
            isSelf
              ? "Nie możesz odebrać sobie dostępu do panelu."
              : user?.is_superuser
                ? "Superużytkownik ma dostęp do panelu niezależnie od tej opcji."
                : "Dostęp do panelu administracji (użytkownicy, struktura, nagrody, gamifikacja)."
          }
          checked={form.is_staff}
          disabled={isSelf}
          onCheckedChange={(v) => set("is_staff", v)}
        />
      </section>

      <div className="-mx-5 mt-1 flex justify-end gap-2 border-t border-border px-5 pt-4">
        <Button type="button" variant="ghost" onClick={close} disabled={saving}>
          Anuluj
        </Button>
        <Button type="submit" loading={saving}>
          {user ? "Zapisz" : "Utwórz konto"}
        </Button>
      </div>
    </form>
  );
}
