"use client";
import { MealsPage, MemberRoute } from "../client/index";

export default function Meals() {
  return (
    <MemberRoute>
      <MealsPage />
    </MemberRoute>
  );
}
