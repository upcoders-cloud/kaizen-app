"use client";
import { PageHeader } from "@/components/ui/page-header";
import { IdeaForm } from "@/components/ideas/IdeaForm";

export default function NewIdeaPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Nowy pomysł" description="Zgłoś usprawnienie - małe zmiany robią dużą różnicę." />
      <IdeaForm />
    </div>
  );
}
