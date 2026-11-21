"use client";
import { MemberRoute } from "../../client/index";
import { AppPage } from "../../client/layout";
import { IngredientsPage } from "../../client/meals";

export default function Page() {
  return (
    <MemberRoute>
      <AppPage title="Meals" tabTitle="Ingredients" width="wide">
        <IngredientsPage />
      </AppPage>
    </MemberRoute>
  );
}
