"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  Award,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Heart,
  Lightbulb,
  Pencil,
  PiggyBank,
  Star,
  UserX,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, displayName, errorMessage, fmtDate, fmtNum, fmtPLN, plural } from "@/lib/utils";
import { fileToDataUrl, usePosts, useUserProfile } from "@/lib/ideas";
import type { UserProfile } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge, roleLabel } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Pagination } from "@/components/ui/pagination";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { IdeaCard, IdeaCardSkeleton } from "@/components/ideas";

const TIER_TONE: Record<string, "warning" | "neutral" | "secondary" | "violet" | "primary"> = {
  BRONZE: "warning",
  SILVER: "neutral",
  GOLD: "warning",
  PLATINUM: "secondary",
  DIAMOND: "violet",
};

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

function EditProfileDialog({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: UserProfile;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Edytuj profil" size="md">
      {open && <EditProfileForm profile={profile} close={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function EditProfileForm({ profile, close }: { profile: UserProfile; close: () => void }) {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState(profile.first_name ?? "");
  const [lastName, setLastName] = useState(profile.last_name ?? "");
  const [nickname, setNickname] = useState(profile.nickname ?? "");
  const [gender, setGender] = useState(user?.gender ?? "unspecified");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (!nickname.trim()) {
      setError("Pseudonim jest wymagany (służy do @wzmianek).");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/users/me/", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        nickname: nickname.trim(),
        gender,
        ...(avatar ? { avatar } : {}),
      });
      await Promise.all([refreshUser(), qc.invalidateQueries({ queryKey: ["users", "profile"] })]);
      toast.success("Zapisano profil");
      close();
    } catch (err) {
      toast.error("Nie udało się zapisać profilu", errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar src={avatar ?? profile.avatar_url} user={profile} size="xl" />
          <button
            type="button"
            aria-label="Zmień zdjęcie"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border border-border bg-elevated text-muted shadow-xs hover:text-foreground"
          >
            <Camera className="size-3.5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setAvatar(await fileToDataUrl(f, 512));
              e.target.value = "";
            }}
          />
        </div>
        <p className="text-xs text-muted">Zdjęcie profilowe (JPG lub PNG). Zostanie zmniejszone do 512 px.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Imię">
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Nazwisko">
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
        <Field label="Pseudonim" required error={error} hint="Używany w @wzmiankach.">
          <Input value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </Field>
        <Field label="Płeć">
          <Select
            value={gender}
            onValueChange={setGender}
            options={[
              { value: "unspecified", label: "Nie podano" },
              { value: "female", label: "Kobieta" },
              { value: "male", label: "Mężczyzna" },
              { value: "other", label: "Inna" },
            ]}
          />
        </Field>
      </div>
      <div className="-mx-5 -mb-4 mt-1 flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="ghost" onClick={close} disabled={saving}>
          Anuluj
        </Button>
        <Button onClick={save} loading={saving}>
          Zapisz
        </Button>
      </div>
    </div>
  );
}

export function ProfileView({ userId, isMe }: { userId: number; isMe?: boolean }) {
  const profile = useUserProfile(userId);
  const [page, setPage] = useState(1);
  const ideas = usePosts({ author: userId, page, page_size: 10 });
  const [editing, setEditing] = useState(false);
  const p = profile.data;

  if (profile.isLoading) return <ProfileSkeleton />;
  if (profile.isError || !p) {
    const status = (profile.error as { response?: { status?: number } } | null)?.response?.status;
    return status === 404 ? (
      <EmptyState variant="card" icon={<UserX />} title="Nie znaleziono użytkownika" />
    ) : (
      <ErrorState onRetry={() => profile.refetch()} />
    );
  }

  const g = p.gamification;
  const stats = p.stats;
  const total = ideas.data?.count ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        <Card className="overflow-hidden">
          <div aria-hidden className="h-20 bg-gradient-to-r from-primary-soft via-secondary-soft to-violet-soft" />
          <div className="flex flex-wrap items-end gap-4 px-5 pb-5 pt-3">
            <Avatar user={p} size="2xl" className="-mt-12 ring-4 ring-surface" />
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{displayName(p)}</h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                {p.nickname && <span>@{p.nickname}</span>}
                <Badge tone="primary">{roleLabel(p.role)}</Badge>
                {p.department_name && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="size-3.5" /> {p.department_name}
                  </span>
                )}
                {p.date_joined && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" /> od {fmtDate(p.date_joined)}
                  </span>
                )}
              </p>
            </div>
            {isMe && (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <Pencil /> Edytuj profil
              </Button>
            )}
          </div>
        </Card>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Pomysły" value={fmtNum(stats?.ideas ?? 0)} icon={<Lightbulb />} />
          <StatCard label="Wdrożone" value={fmtNum(stats?.implemented ?? 0)} icon={<CheckCircle2 />} />
          <StatCard label="Polubienia" value={fmtNum(stats?.likes_received ?? 0)} icon={<Heart />} />
          <StatCard label="Oszczędności" value={fmtPLN(stats?.savings ?? 0)} icon={<PiggyBank />} hint="miesięcznie, z ankiet" />
        </div>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {isMe ? "Moje opublikowane pomysły" : "Pomysły"}
              {total > 0 && <span className="ml-1.5 text-muted tabular">{total}</span>}
            </h2>
            {isMe && (
              <Link href="/my-ideas" className="text-xs font-medium text-primary hover:underline">
                Wszystkie moje zgłoszenia
              </Link>
            )}
          </div>
          {ideas.isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <IdeaCardSkeleton key={i} />
              ))}
            </div>
          ) : ideas.isError ? (
            <ErrorState size="sm" onRetry={() => ideas.refetch()} />
          ) : total === 0 ? (
            <EmptyState
              variant="card"
              size="sm"
              icon={<Lightbulb />}
              title={isMe ? "Nie masz jeszcze opublikowanych pomysłów" : "Brak opublikowanych pomysłów"}
              action={
                isMe ? (
                  <Link href="/ideas/new" className={buttonVariants({ size: "sm" })}>
                    Zgłoś pierwszy pomysł
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {ideas.data!.results.map((post, i) => (
                <IdeaCard key={post.id} post={post} index={i} hideAuthor />
              ))}
              {total > 10 && <Pagination page={page} pageSize={10} total={total} onPageChange={setPage} />}
            </div>
          )}
        </section>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-1.5">
                <Star className="size-4 text-warning" /> Poziom i punkty
              </span>
            }
          />
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-secondary-soft text-secondary-fg dark:text-secondary">
                <Award className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{g?.level?.name ?? "Brak poziomu"}</p>
                <p className="text-xs text-muted tabular">
                  {fmtNum(g?.total_points ?? 0)} {plural(g?.total_points ?? 0, "punkt", "punkty", "punktów")}
                </p>
              </div>
            </div>
            {isMe && (
              <Link href="/impact" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-4 w-full")}>
                Zobacz mój wkład
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-1.5">
                <Award className="size-4 text-violet" /> Odznaki
              </span>
            }
            description={g?.badges?.length ? `${g.badges.length} ${plural(g.badges.length, "zdobyta", "zdobyte", "zdobytych")}` : undefined}
          />
          <CardContent>
            {g?.badges?.length ? (
              <div className="grid grid-cols-4 gap-2">
                {g.badges.map((b) => (
                  <Tooltip
                    key={b.id}
                    content={
                      <span>
                        <b>{b.name}</b>
                        {b.description ? <span className="block font-normal opacity-80">{b.description}</span> : null}
                        {b.awarded_at ? <span className="block font-normal opacity-70">{fmtDate(b.awarded_at)}</span> : null}
                      </span>
                    }
                  >
                    <span className="flex w-full flex-col items-center gap-1 rounded-md p-1.5 text-center hover:bg-accent">
                      <Badge tone={TIER_TONE[b.tier ?? ""] ?? "primary"} className="size-9 justify-center rounded-full p-0 [&_svg]:size-4">
                        <Award />
                      </Badge>
                      <span className="line-clamp-2 text-[10px] leading-tight text-muted">{b.name}</span>
                    </span>
                  </Tooltip>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">Brak odznak.</p>
            )}
          </CardContent>
        </Card>
      </aside>

      {isMe && <EditProfileDialog open={editing} onOpenChange={setEditing} profile={p} />}
    </div>
  );
}
