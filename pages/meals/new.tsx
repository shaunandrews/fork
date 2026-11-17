"use client";
import { MemberRoute } from "../../client/index";
import { AppPage } from "../../client/layout";
import { NewRecipePage } from "../../client/meals";

export default function Page() {
  return (
    <MemberRoute>
      <AppPage title="New recipe" back={{ to: "/meals", text: "Recipes" }}>
        <NewRecipePage />
      </AppPage>
    </MemberRoute>
  );
}
