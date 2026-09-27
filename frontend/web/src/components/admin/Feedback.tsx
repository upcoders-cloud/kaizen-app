"use client";
import { AxiosError } from "axios";
import { Badge } from "@/components/ui/badge";

const FIELD_LABELS: Record<string, string> = {
  name: "Nazwa",
  code: "Kod",
  username: "Login",
  password: "Hasło",
  email: "E-mail",
  criteria_type: "Kryterium",
  threshold: "Próg",
  tier: "Poziom",
  cost_points: "Koszt",
  stock: "Stan",
  min_points: "Punkty minimum",
  order: "Kolejność",
  points: "Punkty",
  reason: "Powód",
};

/** Czytelny komunikat błędu z odpowiedzi DRF (najpierw `detail`, potem pierwszy błąd pola z nazwą pola). */
export function errorText(error: unknown): string {
  const response = (error as AxiosError<Record<string, unknown>>)?.response;
  if (!response) return "Brak połączenia z serwerem. Spróbuj ponownie.";
  const data = response.data;
  if (data && typeof data === "object") {
    if (typeof data.detail === "string") return data.detail;
    for (const [field, value] of Object.entries(data)) {
      const msg = Array.isArray(value) ? value[0] : value;
      if (typeof msg === "string") {
        const label = FIELD_LABELS[field];
        return label && field !== "non_field_errors" ? `${label}: ${msg}` : msg;
      }
    }
  }
  if (response.status === 404) return "Nie znaleziono danych.";
  if (response.status === 403) return "Brak uprawnień do tych danych.";
  return "Nie udało się wykonać operacji. Spróbuj ponownie.";
}

export function ActiveBadge({ active, on = "Aktywny", off = "Nieaktywny" }: { active: boolean; on?: string; off?: string }) {
  return (
    <Badge tone={active ? "success" : "neutral"} dot>
      {active ? on : off}
    </Badge>
  );
}
