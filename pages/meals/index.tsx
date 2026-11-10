"use client";
import { MemberRoute } from "../../client/index";
import { RecipesPage } from "../../client/meals";

export default function Page() {
  return (
    <MemberRoute>
      <RecipesPage />
    </MemberRoute>
  );
}
