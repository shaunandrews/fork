"use client";
import { MemberRoute } from "../../client/index";
import { AppPage } from "../../client/layout";
import { RecipesPage } from "../../client/meals";

export default function Page() {
  return (
    <MemberRoute>
      <AppPage title="Meals" tabTitle="Recipes" width="wide">
        <RecipesPage />
      </AppPage>
    </MemberRoute>
  );
}
