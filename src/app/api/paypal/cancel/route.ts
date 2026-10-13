import { NextRequest } from "next/server";
import { paypalCallback } from "@/lib/callbacks";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  return paypalCallback(request, "cancel");
}
