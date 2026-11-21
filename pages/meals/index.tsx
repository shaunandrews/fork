"use client";
import { MemberRoute } from "../../client/index";
import { AppPage } from "../../client/layout";
import { MEALS_NAV, RecipesPage } from "../../client/meals";

export default function Page() {
  return (
    <MemberRoute>
      <AppPage title="Meals" tabTitle="Recipes" subnav={MEALS_NAV} width="wide">
        <RecipesPage />
      </AppPage>
    </MemberRoute>
  );
}
