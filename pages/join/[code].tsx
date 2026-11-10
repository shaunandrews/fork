"use client";
import { JoinRoute } from "../../client/index";

export default function JoinWithCode({ params }: { params: { code?: string } }) {
  return <JoinRoute code={params.code} />;
}
