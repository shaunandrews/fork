"use client";
import { MemberRoute } from "../../client/index";
import { AppPage } from "../../client/layout";
import { MEALS_NAV, IdeasPage } from "../../client/meals";

export default function Page() {
  return (
    <MemberRoute>
      <AppPage title="Meals" tabTitle="Ideas" subnav={MEALS_NAV} width="wide">
        <IdeasPage />
      </AppPage>
    </MemberRoute>
  );
}
