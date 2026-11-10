"use client";
import { MemberRoute } from "../../client/index";
import { IngredientsPage } from "../../client/meals";

export default function Page() {
  return (
    <MemberRoute>
      <IngredientsPage />
    </MemberRoute>
  );
}
