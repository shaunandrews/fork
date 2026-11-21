"use client";
import { MemberRoute } from "../../client/index";
import { AppPage } from "../../client/layout";
import { MEALS_NAV, IngredientsPage } from "../../client/meals";

export default function Page() {
  return (
    <MemberRoute>
      <AppPage title="Meals" tabTitle="Ingredients" subnav={MEALS_NAV} width="wide">
        <IngredientsPage />
      </AppPage>
    </MemberRoute>
  );
}
