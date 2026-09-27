"use client";
import { Suspense, useMemo, useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { useAdminList, useAdminMutation, useAdminStats, type AdminUser, type Department, type ListParams } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { displayName, fmtNum, plural } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useUrlState } from "@/components/ui/use-url-state";
import { errorText } from "@/components/admin/Feedback";
import { UserFilters } from "@/components/admin/users/UserFilters";
import { UserSheet } from "@/components/admin/users/UserSheet";
import { PasswordDialog } from "@/components/admin/users/PasswordDialog";
import { PointsDialog } from "@/components/admin/users/PointsDialog";
import { userColumns } from "@/components/admin/users/columns";
import { USERS_PAGE_SIZE } from "@/components/admin/users/constants";

const FILTER_KEYS = ["search", "role", "department", "is_active", "is_staff"] as const;

function UsersContent() {
  const url = useUrlState();
  const { user: me } = useAuth();
  const page = Number(url.get("page") || 1);
  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: USERS_PAGE_SIZE };
    FILTER_KEYS.forEach((k) => {
      const v = url.get(k).trim();
      if (v) p[k] = v;
    });
    return p as ListParams;
  }, [url, page]);

  const users = useAdminList<AdminUser>("users", params);
  const stats = useAdminStats();
  const departments = useAdminList<Department>("departments");
  const { update, remove } = useAdminMutation<AdminUser>("users");

  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);
  const [pwUser, setPwUser] = useState<AdminUser | null>(null);
  const [pointsUser, setPointsUser] = useState<AdminUser | null>(null);
  const [toDeactivate, setToDeactivate] = useState<AdminUser | null>(null);

  const rows = users.data?.results;
  // Sheet i dialogi pokazują świeże dane z listy (np. saldo po korekcie punktów).
  const fresh = (u: AdminUser | null) => (u && rows?.find((r) => r.id === u.id)) || u;

  const departmentOptions = (departments.data?.results ?? []).map((d) => ({
    value: String(d.id),
    label: d.is_active ? d.name : `${d.name} (nieaktywny)`,
  }));
  const filtered = FILTER_KEYS.some((k) => url.get(k));

  const activate = (u: AdminUser) =>
    update.mutate(
      { id: u.id, payload: { is_active: true } },
      {
        onSuccess: () => toast.success("Konto aktywne", `${displayName(u)} może się znowu zalogować.`),
        onError: (err) => toast.error("Nie udało się aktywować konta", errorText(err)),
      },
    );

  const deactivate = () => {
    if (!toDeactivate) return;
    const u = toDeactivate;
    remove.mutate(u.id, {
      onSuccess: () => {
        toast.success("Konto dezaktywowane", displayName(u));
        setToDeactivate(null);
      },
      onError: (err) => toast.error("Nie udało się dezaktywować konta", errorText(err)),
    });
  };

  const columns = userColumns({
    currentUserId: me?.id,
    onEdit: setEditing,
    onPassword: setPwUser,
    onPoints: setPointsUser,
    onDeactivate: setToDeactivate,
    onActivate: activate,
  });

  const s = stats.data;
  const description = s
    ? `${fmtNum(s.active_users)} aktywnych z ${fmtNum(s.total_users)} ${plural(s.total_users, "konta", "kont", "kont")} · ${fmtNum(s.admins)} ${plural(s.admins, "administrator", "administratorzy", "administratorów")}`
    : "Konta, role, działy i dostęp do panelu.";

  return (
    <div>
      <PageHeader
        title="Użytkownicy"
        description={description}
        actions={
          <Button size="sm" onClick={() => setEditing("new")}>
            <UserPlus /> Nowe konto
          </Button>
        }
      />
      <UserFilters url={url} departments={departmentOptions} />
      {users.isError ? (
        <ErrorState description={errorText(users.error)} onRetry={() => users.refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          loading={users.isLoading}
          rowKey={(u) => u.id}
          onRowClick={setEditing}
          pagination={{
            page,
            pageSize: USERS_PAGE_SIZE,
            total: users.data?.count ?? 0,
            onPageChange: (p) => url.setMany({ page: p > 1 ? p : null }, { resetPage: false }),
          }}
          empty={
            <EmptyState
              size="sm"
              icon={<Users />}
              title={filtered ? "Brak użytkowników dla tych filtrów" : "Brak użytkowników"}
              description={filtered ? "Zmień lub wyczyść filtry." : undefined}
              action={
                filtered && (
                  <Button size="sm" variant="secondary" onClick={() => url.clear()}>
                    Wyczyść filtry
                  </Button>
                )
              }
            />
          }
        />
      )}

      <UserSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        user={editing === "new" ? null : fresh(editing)}
        departments={departmentOptions}
        currentUserId={me?.id}
        onPassword={setPwUser}
        onPoints={setPointsUser}
      />
      <PasswordDialog user={pwUser} onClose={() => setPwUser(null)} />
      <PointsDialog user={fresh(pointsUser)} onClose={() => setPointsUser(null)} />
      <ConfirmDialog
        open={!!toDeactivate}
        onOpenChange={(o) => !o && setToDeactivate(null)}
        title={`Dezaktywować konto ${toDeactivate ? displayName(toDeactivate) : ""}?`}
        description="Użytkownik nie zaloguje się, ale jego pomysły, komentarze i punkty zostaną. Konto można później aktywować."
        tone="danger"
        confirmLabel="Dezaktywuj"
        loading={remove.isPending}
        onConfirm={deactivate}
      />
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <UsersContent />
    </Suspense>
  );
}
