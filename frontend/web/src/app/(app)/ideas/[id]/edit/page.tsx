"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePost } from "@/lib/ideas";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { IdeaForm } from "@/components/ideas/IdeaForm";

export default function EditIdeaPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const query = usePost(Number(id) || undefined);
  const post = query.data;

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !post) return <ErrorState onRetry={() => query.refetch()} />;

  const editable = post.author.id === user?.id && (post.status === "TO_VERIFY" || post.status === "CANCELLED");
  if (!editable) {
    return (
      <EmptyState
        variant="card"
        icon={<Lock />}
        title="Nie można edytować tego pomysłu"
        description="Edytować może tylko autor, dopóki pomysł czeka na weryfikację albo został odrzucony."
        action={
          <Link href={`/ideas/${post.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Wróć do pomysłu
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Edycja pomysłu" description={post.title} />
      <IdeaForm post={post} />
    </div>
  );
}
