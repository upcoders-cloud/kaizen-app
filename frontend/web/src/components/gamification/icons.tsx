import { createElement } from "react";
import {
  Award,
  BookOpen,
  CalendarDays,
  Car,
  CheckCircle2,
  Coffee,
  Crown,
  Feather,
  Flame,
  Gift,
  Headphones,
  Heart,
  Lightbulb,
  MessageCircle,
  Medal,
  PenLine,
  Pizza,
  Rocket,
  Shirt,
  Sparkles,
  Star,
  Target,
  ThumbsUp,
  Ticket,
  Trophy,
  Umbrella,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Nazwy ikon z backendu (styl Feather/Lucide) -> komponent. Nieznane: fallback. */
const ICONS: Record<string, LucideIcon> = {
  award: Award,
  book: BookOpen,
  "book-open": BookOpen,
  calendar: CalendarDays,
  car: Car,
  "check-circle": CheckCircle2,
  coffee: Coffee,
  crown: Crown,
  "edit-3": PenLine,
  edit: PenLine,
  feather: Feather,
  flame: Flame,
  fire: Flame,
  gift: Gift,
  headphones: Headphones,
  heart: Heart,
  lightbulb: Lightbulb,
  "message-circle": MessageCircle,
  "message-square": MessageCircle,
  medal: Medal,
  pizza: Pizza,
  rocket: Rocket,
  shirt: Shirt,
  "t-shirt": Shirt,
  sparkles: Sparkles,
  star: Star,
  target: Target,
  "thumbs-up": ThumbsUp,
  ticket: Ticket,
  trophy: Trophy,
  umbrella: Umbrella,
  users: Users,
  zap: Zap,
};

export function iconFor(name: string | undefined | null, fallback: LucideIcon = Gift): LucideIcon {
  if (!name) return fallback;
  return ICONS[name.toLowerCase()] ?? fallback;
}

export const TIER_META: Record<string, { label: string; className: string }> = {
  BRONZE: { label: "Brąz", className: "bg-medal-bronze-soft text-medal-bronze" },
  SILVER: { label: "Srebro", className: "bg-medal-silver-soft text-medal-silver" },
  GOLD: { label: "Złoto", className: "bg-medal-gold-soft text-medal-gold" },
};

/** Renderuje ikonę po nazwie (bez tworzenia komponentu w renderze). */
export function renderIcon(name: string | undefined | null, className?: string, fallback: LucideIcon = Gift) {
  return createElement(iconFor(name, fallback), { className });
}
