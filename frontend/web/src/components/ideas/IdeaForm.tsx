"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Calculator, ImagePlus, Info, Lightbulb, Send, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, displayName, errorMessage, fmtHours, fmtPLN } from "@/lib/utils";
import {
  createPost,
  fileToDataUrl,
  IMAGE_TYPE_LABELS,
  ideaKeys,
  type ImageType,
  saveSurvey,
  updatePost,
  useApprovers,
  useCategories,
  type SurveyInput,
} from "@/lib/ideas";
import { api } from "@/lib/api";
import type { Post } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox, Switch } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";

const MAX_IMAGES = 6;
const MAX_FILE_MB = 10;
// Te same stałe co backend (ideas/services/post_survey_calculator.py) - tylko podgląd.
const HOURLY_RATE = 60;
const UNIT_MULTIPLIER = { DAY: 22, WEEK: 4, MONTH: 1 } as const;

interface NewImage {
  key: string;
  dataUrl: string;
  name: string;
  type: ImageType;
}

const IMAGE_TYPES: ImageType[] = ["GENERAL", "BEFORE", "AFTER"];

/** Przełącznik typu zdjęcia pod miniaturą (Ogólne / Przed / Po). */
function ImageTypePicker({ value, onChange }: { value: ImageType; onChange: (t: ImageType) => void }) {
  return (
    <div role="radiogroup" aria-label="Typ zdjęcia" className="grid grid-cols-3 gap-0.5 rounded-md bg-accent p-0.5">
      {IMAGE_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          onClick={() => onChange(t)}
          className={cn(
            "h-6 rounded-[5px] text-[11px] font-medium transition-colors",
            value === t ? "bg-surface text-foreground shadow-xs" : "text-muted hover:text-foreground",
          )}
        >
          {IMAGE_TYPE_LABELS[t]}
        </button>
      ))}
    </div>
  );
}

interface FormState {
  title: string;
  content: string;
  category: string;
  manager: string;
  surveyOn: boolean;
  frequency_value: string;
  frequency_unit: "DAY" | "WEEK" | "MONTH";
  affected_people: string;
  time_lost_minutes: string;
}

function initialState(post?: Post): FormState {
  return {
    title: post?.title ?? "",
    content: post?.content ?? "",
    category: post?.category ? String(post.category) : "",
    manager: post?.assigned_manager ? String(post.assigned_manager) : "",
    surveyOn: !!post?.survey,
    frequency_value: post?.survey ? String(post.survey.frequency_value) : "",
    frequency_unit: post?.survey?.frequency_unit ?? "WEEK",
    affected_people: post?.survey ? String(post.survey.affected_people) : "",
    time_lost_minutes: post?.survey ? String(post.survey.time_lost_minutes) : "",
  };
}

function SectionTitle({ n, title, description }: { n: number; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
        {n}
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
    </div>
  );
}

export function IdeaForm({ post }: { post?: Post }) {
  const router = useRouter();
  const qc = useQueryClient();
  const categories = useCategories();
  const managers = useApprovers("MANAGER");
  const [form, setForm] = useState<FormState>(() => initialState(post));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "images", string>>>({});
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  const [resubmitAfter, setResubmitAfter] = useState(post?.status === "CANCELLED");
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const editing = !!post;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const existing = (post?.image_items ?? []).filter((i) => !removed.includes(i.id));
  const imageCount = existing.length + newImages.length;

  const preview = useMemo(() => {
    const fv = Number(form.frequency_value);
    const ap = Number(form.affected_people);
    const tl = Number(form.time_lost_minutes);
    if (!fv || !ap || !tl) return null;
    const hours = (fv * ap * tl * UNIT_MULTIPLIER[form.frequency_unit]) / 60;
    return { hours, money: hours * HOURLY_RATE };
  }, [form.frequency_value, form.affected_people, form.time_lost_minutes, form.frequency_unit]);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const room = MAX_IMAGES - imageCount;
    if (list.length === 0) return;
    if (room <= 0) {
      toast.warning(`Maksymalnie ${MAX_IMAGES} zdjęć`);
      return;
    }
    const tooBig = list.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig.length) toast.warning(`Pominięto pliki większe niż ${MAX_FILE_MB} MB`);
    const accepted = list.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024).slice(0, room);
    const converted = await Promise.all(
      accepted.map(async (f) => ({
        key: `${f.name}-${f.size}-${f.lastModified}-${Math.random()}`,
        name: f.name,
        dataUrl: await fileToDataUrl(f),
        type: "GENERAL" as ImageType,
      })),
    );
    setNewImages((imgs) => [...imgs, ...converted]);
  };

  const validate = () => {
    const e: typeof errors = {};
    if (form.title.trim().length < 5) e.title = "Tytuł musi mieć co najmniej 5 znaków.";
    if (form.title.length > 200) e.title = "Tytuł może mieć maksymalnie 200 znaków.";
    if (form.content.trim().length < 20) e.content = "Opisz pomysł nieco dokładniej (min. 20 znaków).";
    if (!form.category) e.category = "Wybierz kategorię.";
    if (!form.manager) e.manager = "Wybierz kierownika, który oceni pomysł.";
    if (form.surveyOn) {
      if (!(Number(form.frequency_value) > 0)) e.frequency_value = "Podaj liczbę większą od 0.";
      if (!(Number(form.affected_people) > 0)) e.affected_people = "Podaj liczbę osób.";
      if (!(Number(form.time_lost_minutes) > 0)) e.time_lost_minutes = "Podaj stracone minuty.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Popraw zaznaczone pola");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: Number(form.category),
        assigned_manager: Number(form.manager),
        ...(newImages.length ? { images: newImages.map((i) => ({ image: i.dataUrl, type: i.type })) } : {}),
        ...(removed.length ? { remove_images: removed } : {}),
      };
      const saved = editing ? await updatePost(post!.id, payload) : await createPost(payload);

      if (form.surveyOn) {
        const survey: SurveyInput = {
          frequency_value: Number(form.frequency_value),
          frequency_unit: form.frequency_unit,
          affected_people: Number(form.affected_people),
          time_lost_minutes: Number(form.time_lost_minutes),
        };
        try {
          await saveSurvey(saved.id, survey, !!post?.survey);
        } catch (err) {
          toast.warning("Pomysł zapisany, ale nie udało się zapisać ankiety", errorMessage(err));
        }
      }

      if (editing && post?.status === "CANCELLED" && resubmitAfter) {
        await api.post(`/posts/${saved.id}/resubmit/`);
      }

      await qc.invalidateQueries({ queryKey: ideaKeys.all });
      toast.success(
        editing ? "Zapisano zmiany" : "Pomysł zgłoszony",
        editing ? undefined : "Kierownik dostał powiadomienie. Śledź status w „Moje pomysły”.",
      );
      router.push(`/ideas/${saved.id}`);
    } catch (err) {
      toast.error(editing ? "Nie udało się zapisać zmian" : "Nie udało się zgłosić pomysłu", errorMessage(err));
      setSaving(false);
    }
  };

  const categoryOptions = (categories.data ?? [])
    .filter((c) => c.is_active !== false || String(c.id) === form.category)
    .map((c) => ({ value: String(c.id), label: c.name }));
  const managerOptions = (managers.data ?? []).map((m) => ({
    value: String(m.id),
    label: `${displayName(m)}${m.department_name ? ` · ${m.department_name}` : ""}`,
  }));

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-5 p-5">
            <SectionTitle n={1} title="Opis pomysłu" description="Co chcesz usprawnić i dlaczego?" />
            <Field label="Tytuł" required error={errors.title} hint={`${form.title.length}/200`}>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="np. Tablica cieni na narzędzia przy linii 3"
                maxLength={200}
                inputSize="lg"
                autoFocus={!editing}
              />
            </Field>
            <Field
              label="Opis"
              required
              error={errors.content}
              hint="Opisz problem, proponowane rozwiązanie i spodziewany efekt. Możesz używać akapitów."
            >
              <Textarea
                rows={8}
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder={"Problem: ...\nRozwiązanie: ...\nEfekt: ..."}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kategoria" required error={errors.category}>
                <Select
                  value={form.category}
                  onValueChange={(v) => set("category", v)}
                  placeholder={categories.isLoading ? "Wczytywanie..." : "Wybierz kategorię"}
                  options={categoryOptions}
                />
              </Field>
              <Field label="Kierownik oceniający" required error={errors.manager}>
                <Select
                  value={form.manager}
                  onValueChange={(v) => set("manager", v)}
                  placeholder={managers.isLoading ? "Wczytywanie..." : "Wybierz kierownika"}
                  options={managerOptions}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <SectionTitle
              n={2}
              title="Zdjęcia"
              description={`Opcjonalnie, do ${MAX_IMAGES} zdjęć. Oznacz „Przed” i „Po”, a szczegóły pokażą porównanie.`}
            />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "grid grid-cols-2 items-start gap-2 rounded-lg border border-dashed p-2 transition-colors min-[420px]:grid-cols-3 sm:grid-cols-4",
                dragOver ? "border-primary bg-primary-soft/40" : "border-border-strong",
              )}
            >
              <AnimatePresence initial={false}>
                {existing.map((img) => (
                  <motion.div
                    key={`e${img.id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group relative aspect-square overflow-hidden rounded-md border border-border bg-surface-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="size-full object-cover" />
                    {img.type && img.type !== "GENERAL" && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] font-semibold uppercase text-white">
                        {IMAGE_TYPE_LABELS[img.type]}
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label="Usuń zdjęcie"
                      onClick={() => setRemoved((r) => [...r, img.id])}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  </motion.div>
                ))}
                {newImages.map((img) => (
                  <motion.div
                    key={img.key}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col gap-1"
                  >
                    <div className="group relative aspect-square overflow-hidden rounded-md border border-border bg-surface-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.dataUrl} alt={img.name} className="size-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-primary px-1 text-[9px] font-semibold text-primary-fg">
                      Nowe
                    </span>
                    <button
                      type="button"
                      aria-label="Usuń zdjęcie"
                      onClick={() => setNewImages((imgs) => imgs.filter((i) => i.key !== img.key))}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                    </div>
                    <ImageTypePicker
                      value={img.type}
                      onChange={(t) => setNewImages((imgs) => imgs.map((i) => (i.key === img.key ? { ...i, type: t } : i)))}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              {imageCount < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md text-xs text-muted transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ImagePlus className="size-5" />
                  Dodaj
                  <span className="text-[10px] text-subtle">lub upuść</span>
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </CardContent>
        </Card>

        <Card id="ankieta" className="scroll-mt-20">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <SectionTitle
                n={3}
                title="Szacunek oszczędności"
                description="Opcjonalnie. Pomaga kierownikowi ocenić wartość pomysłu."
              />
              <Switch checked={form.surveyOn} onCheckedChange={(v) => set("surveyOn", v)} />
            </div>
            <AnimatePresence initial={false}>
              {form.surveyOn && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-4 pt-1 sm:grid-cols-2">
                    <Field label="Jak często występuje problem?" required error={errors.frequency_value}>
                      <Input
                        type="number"
                        min={1}
                        value={form.frequency_value}
                        onChange={(e) => set("frequency_value", e.target.value)}
                        placeholder="np. 3"
                      />
                    </Field>
                    <Field label="Na jaki okres?">
                      <Select
                        value={form.frequency_unit}
                        onValueChange={(v) => set("frequency_unit", v as FormState["frequency_unit"])}
                        options={[
                          { value: "DAY", label: "Dziennie (dzień roboczy)" },
                          { value: "WEEK", label: "Tygodniowo" },
                          { value: "MONTH", label: "Miesięcznie" },
                        ]}
                      />
                    </Field>
                    <Field label="Ile osób dotyczy?" required error={errors.affected_people}>
                      <Input
                        type="number"
                        min={1}
                        value={form.affected_people}
                        onChange={(e) => set("affected_people", e.target.value)}
                        placeholder="np. 12"
                      />
                    </Field>
                    <Field label="Ile minut traci się za każdym razem?" required error={errors.time_lost_minutes}>
                      <Input
                        type="number"
                        min={1}
                        value={form.time_lost_minutes}
                        onChange={(e) => set("time_lost_minutes", e.target.value)}
                        placeholder="np. 10"
                      />
                    </Field>
                  </div>
                  {preview && (
                    <div className="mt-4 flex items-center gap-3 rounded-md bg-success-soft px-3 py-2.5 text-[13px]">
                      <Calculator className="size-4 shrink-0 text-success" />
                      <span className="text-foreground">
                        Szacunkowo <b className="tabular">{fmtHours(preview.hours)}</b> i{" "}
                        <b className="tabular">{fmtPLN(preview.money)}</b> miesięcznie (
                        {fmtPLN(preview.money * 12)} rocznie).
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader title={editing ? "Zapisz zmiany" : "Zgłoś pomysł"} />
          <CardContent className="flex flex-col gap-3">
            {editing && post?.status === "CANCELLED" && (
              <Checkbox
                checked={resubmitAfter}
                onCheckedChange={setResubmitAfter}
                label="Zgłoś ponownie po zapisaniu"
                description="Pomysł wróci do weryfikacji."
              />
            )}
            <Button type="submit" loading={saving} className="w-full">
              {!saving && <Send />}
              {editing ? "Zapisz" : "Wyślij do akceptacji"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => router.back()} disabled={saving}>
              Anuluj
            </Button>
          </CardContent>
        </Card>
        <div className="rounded-lg border border-border bg-surface-muted p-4 text-[13px]">
          <p className="mb-2 flex items-center gap-1.5 font-semibold text-foreground">
            <Lightbulb className="size-4 text-warning" /> Dobre zgłoszenie
          </p>
          <ul className="space-y-1.5 text-muted">
            <li>Konkretny tytuł mówiący, co się zmieni.</li>
            <li>Opis problemu i proponowanego rozwiązania.</li>
            <li>Zdjęcie obecnego stanu.</li>
            <li>Szacunek oszczędności przyspiesza decyzję.</li>
          </ul>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-subtle">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Pomysł trafi do lidera zespołu (jeśli jest) i wybranego kierownika. Koszt powyżej 10 000 zł wymaga
            akceptacji dyrektora.
          </p>
        </div>
      </aside>
    </form>
  );
}
