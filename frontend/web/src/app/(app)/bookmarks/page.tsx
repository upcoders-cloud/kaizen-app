"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { IdeaCard, IdeaCardSkeleton } from "@/components/ideas";
import { getBookmarkedIdeas, removeBookmark } from "@/lib/notifications";

export default function BookmarksPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const ideas = useQuery({ queryKey: ["posts", "bookmarked", page], queryFn: () => getBookmarkedIdeas(page) });
  const remove = useMutation({
    mutationFn: removeBookmark,
    onSuccess: (result) => {
      if (!result.is_bookmarked_by_me) {
        if (page > 1 && ideas.data?.results.length === 1) setPage(page - 1);
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      }
    },
  });

  return <div className="mx-auto max-w-4xl">
    <PageHeader title="Zapisane pomysły" description="Pomysły, do których chcesz wrócić." />
    {remove.isError && <p role="alert" className="mb-4 text-sm text-danger">Nie udało się usunąć pomysłu z zapisanych.</p>}
    {ideas.isPending ? <div className="space-y-3" aria-label="Ładowanie zapisanych pomysłów">{[1, 2, 3].map((id) => <IdeaCardSkeleton key={id} />)}</div>
      : ideas.isError ? <ErrorState onRetry={() => ideas.refetch()} />
      : ideas.data.results.length === 0 ? <EmptyState variant="card" icon={<Bookmark />} title="Nie masz zapisanych pomysłów" description="Zapisz interesujący pomysł w aktualnościach, aby zobaczyć go tutaj." />
      : <div className="space-y-3">{ideas.data.results.map((idea, index) => <IdeaCard key={idea.id} post={idea} index={index}
          hideSocial actions={<Button variant="ghost" size="xs" loading={remove.isPending && remove.variables === idea.id}
            onClick={() => remove.mutate(idea.id)}><Bookmark className="size-4" /> Usuń z zapisanych</Button>} />)}
          {ideas.data.count > 20 && <Pagination page={page} pageSize={20} total={ideas.data.count} onPageChange={setPage} className="pt-3" />}
        </div>}
  </div>;
}
