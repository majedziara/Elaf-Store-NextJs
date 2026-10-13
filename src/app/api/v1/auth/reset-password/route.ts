import { NextRequest } from "next/server";
import { mailLink } from "@/lib/callbacks";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  return mailLink(request, "reset-password");
}
