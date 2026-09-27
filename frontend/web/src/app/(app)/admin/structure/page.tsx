"use client";
import { Suspense } from "react";
import { Building2, Layers } from "lucide-react";
import { useAdminList, useAdminStats, type AdminUser, type Category, type Department } from "@/lib/admin";
import { displayName, fmtNum } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useUrlState } from "@/components/ui/use-url-state";
import type { Column } from "@/components/ui/table";
import { ResourceManager, type FieldConfig } from "@/components/admin/ResourceManager";
import { ActiveBadge } from "@/components/admin/Feedback";

type Tab = "departments" | "categories";

const departmentColumns: Column<Department & { id: number }>[] = [
  { key: "name", header: "Dział", sortable: true, cell: (d) => <span className="font-medium">{d.name}</span> },
  {
    key: "lead_name",
    header: "Lider zespołu",
    sortable: true,
    cell: (d) => (d.lead_name ? d.lead_name : <span className="text-subtle">Brak (akceptuje kierownik)</span>),
  },
  { key: "member_count", header: "Osoby", sortable: true, align: "right", cell: (d) => <span className="tabular">{fmtNum(d.member_count ?? 0)}</span> },
  { key: "is_active", header: "Status", cell: (d) => <ActiveBadge active={d.is_active} /> },
];

const categoryColumns: Column<Category & { id: number }>[] = [
  { key: "name", header: "Kategoria", sortable: true, cell: (c) => <span className="font-medium">{c.name}</span> },
  { key: "post_count", header: "Pomysły", sortable: true, align: "right", cell: (c) => <span className="tabular">{fmtNum(c.post_count ?? 0)}</span> },
  { key: "is_active", header: "Status", cell: (c) => <ActiveBadge active={c.is_active} /> },
];

function StructureContent() {
  const url = useUrlState();
  const tab = (url.get("tab") as Tab) || "departments";
  const stats = useAdminStats();
  const leaders = useAdminList<AdminUser>("users", { is_active: true, page_size: 100, role: "TEAM_LEAD" });
  const leadOptions = (leaders.data?.results ?? []).map((u) => ({
    value: String(u.id),
    label: `${displayName(u)}${u.department_name ? ` · ${u.department_name}` : ""}`,
  }));

  const departmentFields: FieldConfig[] = [
    { key: "name", label: "Nazwa", required: true, wide: true },
    {
      key: "lead",
      label: "Lider zespołu",
      options: leadOptions,
      numeric: true,
      placeholder: "Brak lidera",
      hint: "Lider akceptuje pierwszy etap pomysłów pracowników działu.",
      wide: true,
    },
    { key: "is_active", label: "Aktywny", type: "checkbox", hint: "Nieaktywny dział znika z list wyboru." },
  ];
  const categoryFields: FieldConfig[] = [
    { key: "name", label: "Nazwa", required: true, wide: true },
    { key: "is_active", label: "Aktywna", type: "checkbox", hint: "Nieaktywnej kategorii nie można wybrać przy zgłoszeniu." },
  ];

  return (
    <div>
      <PageHeader title="Działy i kategorie" description="Struktura organizacji i słownik kategorii pomysłów.">
        <Tabs
          value={tab}
          onValueChange={(v) => url.set("tab", v === "departments" ? null : v)}
          items={[
            { value: "departments", label: "Działy", icon: <Building2 />, count: stats.data?.departments },
            { value: "categories", label: "Kategorie", icon: <Layers />, count: stats.data?.categories },
          ]}
        />
      </PageHeader>
      {tab === "departments" ? (
        <ResourceManager<Department & { id: number } & Record<string, unknown>>
          key="departments"
          resource="departments"
          fields={departmentFields}
          columns={departmentColumns}
          addLabel="Nowy dział"
          titleNew="Nowy dział"
          titleEdit={(d) => `Dział: ${d.name}`}
          deleteDescription="Członkowie działu zostaną bez działu. Zamiast usuwać, możesz dział dezaktywować."
          defaultSort={{ key: "name", dir: "asc" }}
        />
      ) : (
        <ResourceManager<Category & { id: number } & Record<string, unknown>>
          key="categories"
          resource="categories"
          fields={categoryFields}
          columns={categoryColumns}
          addLabel="Nowa kategoria"
          titleNew="Nowa kategoria"
          titleEdit={(c) => `Kategoria: ${c.name}`}
          deleteDescription="Kategorii z pomysłami nie można usunąć - dezaktywuj ją zamiast tego."
          defaultSort={{ key: "name", dir: "asc" }}
        />
      )}
    </div>
  );
}

export default function StructurePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <StructureContent />
    </Suspense>
  );
}
