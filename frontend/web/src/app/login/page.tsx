"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lightbulb, LogIn, Rocket, Sparkles, Trophy } from "lucide-react";
import { safeNext, useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

const FEATURES = [
  { icon: Lightbulb, title: "Zgłaszaj pomysły", text: "W kilka minut, ze zdjęciami i szacunkiem oszczędności." },
  { icon: Rocket, title: "Śledź wdrożenia", text: "Akceptacje, postęp i terminy w jednym miejscu." },
  { icon: Trophy, title: "Zdobywaj punkty", text: "Ranking, odznaki i nagrody za realny wpływ." },
];

export default function LoginPage() {
  const { signIn, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Zalogowany użytkownik nie powinien widzieć logowania; kierujemy tam, gdzie signIn (respektuje ?next=).
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
    }
  }, [authLoading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Podaj login i hasło.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const next = new URLSearchParams(window.location.search).get("next");
      await signIn(username.trim(), password, next);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(
        status === 401 || status === 400
          ? "Nieprawidłowy login lub hasło."
          : errorMessage(err, "Nie udało się połączyć z serwerem."),
      );
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      {/* panel marki: stałe tokeny --brand-* (zawsze ciemny, niezależnie od motywu) */}
      <div className="relative hidden overflow-hidden bg-brand-navy-deep p-12 text-brand-on lg:flex lg:flex-col">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-navy via-brand-navy-mid to-brand-navy-deep" />
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-32 size-96 rounded-full bg-brand-cyan/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 right-0 size-[28rem] rounded-full bg-brand-cyan/10 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(var(--brand-grid)_1px,transparent_1px),linear-gradient(90deg,var(--brand-grid)_1px,transparent_1px)] [background-size:44px_44px]"
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-brand-on/10 ring-1 ring-brand-on/20">
            <Sparkles className="size-4 text-brand-cyan" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Kaizen</span>
        </div>
        <div className="relative mt-auto max-w-md">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-semibold leading-tight tracking-tight"
          >
            Małe usprawnienia,
            <br />
            <span className="text-brand-cyan">duża zmiana.</span>
          </motion.h2>
          <div className="mt-8 space-y-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                className="flex gap-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-on/10 ring-1 ring-brand-on/15">
                  <f.icon className="size-4 text-brand-cyan" />
                </span>
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-sm text-brand-on/60">{f.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <p className="relative mt-12 text-xs text-brand-on/40">© {new Date().getFullYear()} Kaizen</p>
      </div>

      {/* formularz */}
      <div className="flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <div className="mb-8">
            <span className="mb-5 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-fg shadow-pop lg:hidden">
              <Sparkles className="size-5" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Zaloguj się</h1>
            <p className="mt-1.5 text-sm text-muted">Użyj tych samych danych co w aplikacji mobilnej.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label="Login">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                autoComplete="username"
                autoFocus
                inputSize="lg"
                placeholder="np. manager1"
              />
            </Field>
            <Field label="Hasło">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                inputSize="lg"
                placeholder="••••••••"
              />
            </Field>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="rounded-md bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger"
              >
                {error}
              </motion.p>
            )}
            <Button type="submit" loading={loading} size="lg" className="w-full">
              {!loading && <LogIn />}
              Zaloguj się
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
