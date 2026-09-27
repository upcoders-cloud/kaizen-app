"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { IdeaCard, IdeaCardSkeleton } from "@/components/ideas";
import { getMyIdeas, resubmitIdea } from "@/lib/notifications";

const filters = [
  { value: "all", label: "Wszystkie" },
  { value: "TO_VERIFY", label: "Do weryfikacji" },
  { value: "SUBMITTED", label: "Zgłoszone" },
  { value: "IN_PROGRESS", label: "W realizacji" },
  { value: "IMPLEMENTED", label: "Wdrożone" },
  { value: "CANCELLED", label: "Odrzucone" },
];

export default function MyIdeasPage() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const ideas = useQuery({ queryKey: ["posts", "mine", status, page], queryFn: () => getMyIdeas(page, status) });
  const resubmit = useMutation({
    mutationFn: resubmitIdea,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["posts"] }); },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Moje pomysły" description="Śledź zgłoszenia i ich postęp."
        actions={<Link href="/ideas/new" className={buttonVariants()}><Plus className="size-4" /> Nowy pomysł</Link>}>
        <div className="overflow-x-auto"><Tabs value={status} items={filters} onValueChange={(value) => { setStatus(value); setPage(1); }} /></div>
      </PageHeader>
      {resubmit.isError && <p role="alert" className="mb-4 text-sm text-danger">Nie udało się ponownie zgłosić pomysłu. Spróbuj ponownie.</p>}
      {ideas.isPending ? <div className="space-y-3" aria-label="Ładowanie pomysłów">{[1, 2, 3].map((id) => <IdeaCardSkeleton key={id} />)}</div>
        : ideas.isError ? <ErrorState onRetry={() => ideas.refetch()} />
        : ideas.data.results.length === 0 ? <EmptyState variant="card" icon={<Lightbulb />} title="Brak pomysłów w tej kategorii" description="Wybierz inną zakładkę lub zgłoś nowy pomysł."
            action={<Link href="/ideas/new" className={buttonVariants({ size: "sm" })}>Dodaj pomysł</Link>} />
        : <div className="space-y-3">{ideas.data.results.map((idea, index) => <IdeaCard key={idea.id} post={idea} index={index} hideAuthor
            actions={idea.status === "CANCELLED" ? <Button variant="soft" size="xs" loading={resubmit.isPending && resubmit.variables === idea.id} onClick={() => resubmit.mutate(idea.id)}>Zgłoś ponownie</Button> : undefined}>
            {idea.status === "CANCELLED" && idea.rejection_reason && <p className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">Powód odrzucenia: {idea.rejection_reason}</p>}
          </IdeaCard>)}
            {ideas.data.count > 20 && <Pagination page={page} pageSize={20} total={ideas.data.count} onPageChange={setPage} className="pt-3" />}
          </div>}
    </div>
  );
}
