"use client";
import { useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useAdminList, useAdminMutation, type AdminResource } from "@/lib/admin";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog, Sheet } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/table";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Field, Input, SearchInput, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/checkbox";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { errorText } from "./Feedback";

export type Row = Record<string, unknown> & { id: number };

export interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "number" | "checkbox" | "textarea";
  required?: boolean;
  options?: { value: string; label: string }[];
  /** Pusty input = `null` (np. `stock` nagrody). Bez tego puste pole liczbowe jest pomijane. */
  nullable?: boolean;
  /** Wartość startowa dla nowego wpisu. */
  defaultValue?: unknown;
  /** Wartość liczbowa w Select (np. `lead`). */
  numeric?: boolean;
  hint?: string;
  placeholder?: string;
  /** Pole na pełną szerokość w siatce formularza. */
  wide?: boolean;
}

function initialForm(fields: FieldConfig[], row?: Row): Record<string, unknown> {
  if (row) return { ...row };
  return Object.fromEntries(
    fields
      .filter((f) => f.defaultValue !== undefined || f.type === "checkbox")
      .map((f) => [f.key, f.defaultValue ?? (f.key === "is_active")]),
  );
}

/** Formularz zasobu w Sheet (tworzenie i edycja). */
export function ResourceSheet({
  open,
  onOpenChange,
  resource,
  fields,
  row,
  titleNew,
  titleEdit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  resource: AdminResource;
  fields: FieldConfig[];
  row: Row | null;
  titleNew: string;
  titleEdit: (row: Row) => string;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={row ? titleEdit(row) : titleNew}
      width="max-w-lg"
    >
      {open && (
        <ResourceForm
          key={row?.id ?? "new"}
          resource={resource}
          fields={fields}
          row={row}
          close={() => onOpenChange(false)}
        />
      )}
    </Sheet>
  );
}

function ResourceForm({
  resource,
  fields,
  row,
  close,
}: {
  resource: AdminResource;
  fields: FieldConfig[];
  row: Row | null;
  close: () => void;
}) {
  const { create, update } = useAdminMutation<Row>(resource);
  const [form, setForm] = useState<Record<string, unknown>>(() => initialForm(fields, row ?? undefined));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saving = create.isPending || update.isPending;
  const set = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    fields.forEach((f) => {
      const v = form[f.key];
      if (f.required && (v === undefined || v === null || v === "")) errs[f.key] = "Pole wymagane.";
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const payload = Object.fromEntries(
      fields
        .filter((f) => f.key in form)
        .filter((f) => !(f.type === "number" && form[f.key] === null && !f.nullable))
        .map((f) => [f.key, form[f.key]]),
    );
    try {
      if (row) await update.mutateAsync({ id: row.id, payload });
      else await create.mutateAsync(payload);
      toast.success(row ? "Zapisano zmiany" : "Dodano wpis");
      close();
    } catch (err) {
      toast.error("Nie udało się zapisać", errorText(err));
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          if (f.type === "checkbox")
            return (
              <Switch
                key={f.key}
                className="sm:col-span-2"
                label={f.label}
                description={f.hint}
                checked={Boolean(form[f.key])}
                onCheckedChange={(v) => set(f.key, v)}
              />
            );
          const value = form[f.key];
          const wide = f.wide || f.type === "textarea";
          return (
            <Field
              key={f.key}
              label={f.label}
              required={f.required}
              hint={f.hint}
              error={errors[f.key] || undefined}
              className={wide ? "sm:col-span-2" : undefined}
            >
              {f.options ? (
                <Select
                  value={value === null || value === undefined ? "" : String(value)}
                  onValueChange={(v) => set(f.key, v === "" ? null : f.numeric ? Number(v) : v)}
                  placeholder={f.placeholder ?? "Wybierz"}
                  options={f.options}
                />
              ) : f.type === "textarea" ? (
                <Textarea rows={3} value={String(value ?? "")} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
              ) : (
                <Input
                  type={f.type === "number" ? "number" : "text"}
                  value={value === null || value === undefined ? "" : String(value)}
                  placeholder={f.placeholder}
                  onChange={(e) =>
                    set(f.key, f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)
                  }
                />
              )}
            </Field>
          );
        })}
      </div>
      <div className="-mx-5 mt-2 flex justify-end gap-2 border-t border-border px-5 pt-4">
        <Button variant="ghost" onClick={close} disabled={saving}>
          Anuluj
        </Button>
        <Button type="submit" loading={saving}>
          {row ? "Zapisz" : "Dodaj"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Tabela zasobu admina z wyszukiwaniem, edycją w Sheet i usuwaniem z potwierdzeniem.
 * Kolumny definiuje strona; akcje wiersza (Edytuj, Usuń) są dodawane automatycznie.
 */
export function ResourceManager<T extends Row>({
  resource,
  title,
  description,
  fields,
  columns,
  searchKeys = ["name"],
  addLabel = "Dodaj",
  titleNew,
  titleEdit,
  deleteLabel = "Usuń",
  deleteDescription = "Tej operacji nie można cofnąć.",
  defaultSort,
}: {
  resource: AdminResource;
  title?: string;
  description?: string;
  fields: FieldConfig[];
  columns: Column<T>[];
  searchKeys?: string[];
  addLabel?: string;
  titleNew: string;
  titleEdit: (row: T) => string;
  deleteLabel?: string;
  deleteDescription?: string;
  defaultSort?: { key: string; dir: "asc" | "desc" };
}) {
  const query = useAdminList<T>(resource, { page_size: 100 });
  const { remove } = useAdminMutation<T>(resource);
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [toDelete, setToDelete] = useState<T | null>(null);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const list = query.data?.results ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q)));
  }, [query.data, search, searchKeys]);

  const allColumns: Column<T>[] = [
    ...columns,
    {
      key: "__actions",
      header: "",
      align: "right",
      className: "w-12",
      cell: (row) => (
        <span onClick={(e) => e.stopPropagation()}>
          <DropdownMenu
            trigger={
              <IconButton label="Akcje" size="sm">
                <MoreHorizontal />
              </IconButton>
            }
            items={[
              { label: "Edytuj", icon: <Pencil />, onSelect: () => setEditing(row) },
              { type: "separator" },
              { label: deleteLabel, icon: <Trash2 />, danger: true, onSelect: () => setToDelete(row) },
            ]}
          />
        </span>
      ),
    },
  ];

  const erase = () => {
    if (!toDelete) return;
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success("Usunięto wpis");
        setToDelete(null);
      },
      onError: (err) => toast.error("Nie udało się usunąć", errorText(err)),
    });
  };

  return (
    <section className="min-w-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        {(title || description) && (
          <div className="mr-auto">
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="text-xs text-muted">{description}</p>}
          </div>
        )}
        <SearchInput value={search} onValueChange={setSearch} placeholder="Szukaj..." inputSize="sm" className="w-full sm:w-56" />
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> {addLabel}
        </Button>
      </div>
      {query.isError ? (
        <ErrorState description={errorText(query.error)} onRetry={() => query.refetch()} />
      ) : (
        <DataTable
          columns={allColumns}
          data={rows}
          loading={query.isLoading}
          rowKey={(r) => r.id}
          onRowClick={(r) => setEditing(r)}
          pageSize={25}
          defaultSort={defaultSort}
          empty={
            <EmptyState
              size="sm"
              title={search ? "Brak wyników" : "Brak wpisów"}
              description={search ? "Zmień frazę wyszukiwania." : undefined}
              action={
                !search && (
                  <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
                    <Plus /> {addLabel}
                  </Button>
                )
              }
            />
          }
        />
      )}
      <ResourceSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        resource={resource}
        fields={fields}
        row={editing === "new" ? null : (editing as Row | null)}
        titleNew={titleNew}
        titleEdit={(r) => titleEdit(r as T)}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`${deleteLabel}: ${String(toDelete?.name ?? toDelete?.code ?? "")}?`}
        description={deleteDescription}
        tone="danger"
        confirmLabel={deleteLabel}
        loading={remove.isPending}
        onConfirm={erase}
      />
    </section>
  );
}
