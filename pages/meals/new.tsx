"use client";
import { MemberRoute } from "../../client/index";
import { NewRecipePage } from "../../client/meals";

export default function Page() {
  return (
    <MemberRoute>
      <NewRecipePage />
    </MemberRoute>
  );
}
