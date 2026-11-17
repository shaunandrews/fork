"use client";
import { FamilyPage, MemberRoute } from "../client/index";
import { AppPage } from "../client/layout";

export default function Family() {
  return (
    <MemberRoute>
      <AppPage title="Family">
        <FamilyPage />
      </AppPage>
    </MemberRoute>
  );
}
