"use client";
import { MemberRoute } from "../../client/index";
import { AppPage } from "../../client/layout";
import { MEALS_NAV, IngredientsPage } from "../../client/meals";

export default function Page() {
  return (
    <MemberRoute>
      <AppPage title="Meals" tabTitle="Ingredients" description="One list for every recipe. Merge two names for the same thing and the shopping list adds them up." subnav={MEALS_NAV} width="wide">
        <IngredientsPage />
      </AppPage>
    </MemberRoute>
  );
}
