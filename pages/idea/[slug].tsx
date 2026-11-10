"use client";
import { MemberRoute } from "../../client/index";
import { IdeaPage } from "../../client/meals";

export default function Page({ params }: { params: { slug?: string } }) {
  return (
    <MemberRoute>
      <IdeaPage slug={params.slug} />
    </MemberRoute>
  );
}
