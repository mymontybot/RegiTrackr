import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { InvitationService } from "@/lib/services/invitation.service";
import { getTenantContext } from "@/lib/services/auth.service";

const VALID_ROLES = ["FIRM_ADMIN", "MANAGER", "STAFF_ACCOUNTANT", "READ_ONLY"] as const;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await getTenantContext(userId);
  if (tenant.role !== "FIRM_ADMIN") {
    return NextResponse.json({ error: "Only firm admins can invite users" }, { status: 403 });
  }

  let body: { email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const role = body.role;
  if (!email || !role || !VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    return NextResponse.json({ error: "Email and a valid role are required" }, { status: 400 });
  }

  try {
    const service = await InvitationService.create(userId);
    const { token, expiresAt } = await service.createInvitation({
      email,
      role: role as (typeof VALID_ROLES)[number],
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000");
    const acceptUrl = baseUrl + "/accept-invite?token=" + encodeURIComponent(token);

    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const from = process.env.RESEND_FROM_EMAIL ?? "RegiTrackr <onboarding@resend.dev>";
      await resend.emails.send({
        from,
        to: email,
        subject: "You're invited to join RegiTrackr",
        text: "You've been invited to join a firm on RegiTrackr. Accept your invitation by visiting: " + acceptUrl + "\n\nThis link expires " + expiresAt.toLocaleDateString() + ".",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create invitation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
