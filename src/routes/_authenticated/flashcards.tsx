import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ReviewSession } from "@/components/study/ReviewSession";

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Flashcards — StudyAI" },
      { name: "description", content: "Revise os conceitos que você já estudou com flashcards." },
      { property: "og:title", content: "Flashcards — StudyAI" },
      {
        property: "og:description",
        content: "Revise os conceitos que você já estudou com flashcards.",
      },
    ],
  }),
  component: FlashcardsPage,
});

function FlashcardsPage() {
  return (
    <>
      <PageHeader title="Flashcards" subtitle="Revise os conceitos que você já estudou." />
      <ReviewSession showSubject />
    </>
  );
}
