"use client";
import { MemberRoute } from "../../client/index";
import { AppPage } from "../../client/layout";
import { MEALS_NAV, IdeasPage } from "../../client/meals";

export default function Page() {
  return (
    <MemberRoute>
      <AppPage title="Meals" tabTitle="Ideas" description="Family dinners from Fork, ready to plan or keep." subnav={MEALS_NAV} width="wide">
        <IdeasPage />
      </AppPage>
    </MemberRoute>
  );
}
