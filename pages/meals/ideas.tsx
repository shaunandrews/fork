"use client";
import { MemberRoute } from "../../client/index";
import { AppPage } from "../../client/layout";
import { IdeasPage } from "../../client/meals";

export default function Page() {
  return (
    <MemberRoute>
      <AppPage title="Meals" tabTitle="Ideas" width="wide">
        <IdeasPage />
      </AppPage>
    </MemberRoute>
  );
}
