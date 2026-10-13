import { NextRequest } from "next/server";
import { bridge } from "@/lib/bridge";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return bridge(req, (await params).path);
}
export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
