"use client";
import { ListPage, MemberRoute } from "../client/index";
import { AppPage } from "../client/layout";

export default function ShoppingList() {
  return (
    <MemberRoute>
      <AppPage title="Shopping list">
        <ListPage />
      </AppPage>
    </MemberRoute>
  );
}
