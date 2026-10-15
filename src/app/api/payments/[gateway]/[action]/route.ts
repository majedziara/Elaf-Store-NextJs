import { NextRequest } from "next/server";
import { paymentCallback } from "@/lib/callbacks";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";
export async function GET(request: NextRequest, context: { params: Promise<{ gateway: string; action: string }> }) {
  const { gateway, action } = await context.params;
  return paymentCallback(request, gateway, action);
}
