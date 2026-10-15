import { NextRequest } from "next/server";
import { forwardPaymentWebhook } from "@/lib/webhooks";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";
export async function POST(request: NextRequest, context: { params: Promise<{ gateway: string; environment: string }> }) {
  const { gateway, environment } = await context.params;
  return forwardPaymentWebhook(request, gateway, environment);
}
