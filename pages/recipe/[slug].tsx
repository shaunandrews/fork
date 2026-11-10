"use client";
import { MemberRoute } from "../../client/index";
import { RecipePage } from "../../client/meals";

export default function Page({ params }: { params: { slug?: string } }) {
  return (
    <MemberRoute>
      <RecipePage slug={params.slug} />
    </MemberRoute>
  );
}
