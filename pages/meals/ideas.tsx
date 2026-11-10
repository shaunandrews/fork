"use client";
import { MemberRoute } from "../../client/index";
import { IdeasPage } from "../../client/meals";

export default function Page() {
  return (
    <MemberRoute>
      <IdeasPage />
    </MemberRoute>
  );
}
