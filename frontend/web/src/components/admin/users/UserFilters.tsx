"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedValue } from "@/components/ui/use-debounce";
import type { useUrlState } from "@/components/ui/use-url-state";
import { ACTIVE_OPTIONS, ROLE_OPTIONS, STAFF_OPTIONS } from "./constants";

type UrlState = ReturnType<typeof useUrlState>;

/** Filtry listy użytkowników zapisane w URL: search, role, department, is_active, is_staff. */
export function UserFilters({
  url,
  departments,
}: {
  url: UrlState;
  departments: { value: string; label: string }[];
}) {
  const urlSearch = url.get("search");
  const [search, setSearch] = useState(urlSearch);
  const [syncedSearch, setSyncedSearch] = useState(urlSearch);
  const debounced = useDebouncedValue(search, 350);

  // Zmiana z zewnątrz (Wyczyść, "wstecz", link) nadpisuje pole; własny zapis z debounce - nie.
  if (urlSearch !== syncedSearch) {
    setSyncedSearch(urlSearch);
    if (urlSearch !== debounced) setSearch(urlSearch);
  }

  useEffect(() => {
    if (debounced !== url.get("search")) url.set("search", debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const dirty = ["search", "role", "department", "is_active", "is_staff"].some((k) => url.get(k));

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <SearchInput
        value={search}
        onValueChange={setSearch}
        placeholder="Login, imię, e-mail..."
        inputSize="sm"
        className="w-full sm:w-64"
      />
      <Select
        selectSize="sm"
        aria-label="Rola"
        value={url.get("role")}
        onValueChange={(v) => url.set("role", v)}
        placeholder="Wszystkie role"
        options={ROLE_OPTIONS}
        className="w-40"
      />
      <Select
        selectSize="sm"
        aria-label="Dział"
        value={url.get("department")}
        onValueChange={(v) => url.set("department", v)}
        placeholder="Wszystkie działy"
        options={[{ value: "none", label: "Bez działu" }, ...departments]}
        className="w-44"
      />
      <Select
        selectSize="sm"
        aria-label="Aktywność"
        value={url.get("is_active")}
        onValueChange={(v) => url.set("is_active", v)}
        placeholder="Aktywni i nie"
        options={ACTIVE_OPTIONS}
        className="w-36"
      />
      <Select
        selectSize="sm"
        aria-label="Dostęp admina"
        value={url.get("is_staff")}
        onValueChange={(v) => url.set("is_staff", v)}
        placeholder="Dostęp admina"
        options={STAFF_OPTIONS}
        className="w-44"
      />
      {dirty && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => url.clear()}
        >
          <X /> Wyczyść
        </Button>
      )}
    </div>
  );
}
