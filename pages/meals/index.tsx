"use client";
import { MemberRoute } from "../../client/index";
import { AppPage } from "../../client/layout";
import { MEALS_NAV, RecipesPage } from "../../client/meals";

export default function Page() {
  return (
    <MemberRoute>
      <AppPage title="Meals" tabTitle="Recipes" description="Your family's recipes. Meals you pick for a day show up here too." subnav={MEALS_NAV} width="wide">
        <RecipesPage />
      </AppPage>
    </MemberRoute>
  );
}
