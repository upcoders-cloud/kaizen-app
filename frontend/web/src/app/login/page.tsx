"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(username.trim(), password);
    } catch {
      setError("Nieprawidłowy login lub hasło.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#13193b] p-4">
      {/* tło — warstwa gradientu + dekoracyjne poświaty */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1d2b64] via-[#22306e] to-[#0f1733]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[#36d1dc]/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#1d2b64]/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-[#36d1dc]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.4)_1px,transparent_1px)] [background-size:40px_40px]"
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-surface p-8 shadow-xl"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-fg">
            <LogIn size={22} />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Kaizen Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted">
            Zaloguj się danymi z aplikacji
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">
              Login
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="np. manager1"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">
              Hasło
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-danger">{error}</p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            Zaloguj się
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
