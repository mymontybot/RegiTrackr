import { NextResponse } from "next/server";
import { clearPortalSessionCookie } from "@/lib/services/portal-auth.service";

export async function POST() {
  await clearPortalSessionCookie();
  return NextResponse.json({ success: true });
}
