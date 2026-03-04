import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/services/auth.service";

function toSlug(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "firm";
}

async function getUniqueFirmSlug(baseSlug: string, excludeFirmId: string): Promise<string> {
  let candidate = baseSlug;
  let suffix = 1;

  for (;;) {
    const existing = await prisma.firm.findFirst({
      where: { slug: candidate, id: { not: excludeFirmId } },
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

type PatchBody = {
  name?: string;
  ownerName?: string;
  clientCount?: string;
};

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tenant;
  try {
    tenant = await getTenantContext(userId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (tenant.role !== "FIRM_ADMIN") {
    return NextResponse.json({ error: "Only firm admins can update firm settings" }, { status: 403 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Firm name is required" }, { status: 400 });
  }

  const ownerName = typeof body.ownerName === "string" ? body.ownerName.trim() : undefined;
  const clientCount = typeof body.clientCount === "string" ? body.clientCount : undefined;
  if (clientCount) {
    console.log("[onboarding] clientCount (sales context):", clientCount);
  }

  const newSlug = await getUniqueFirmSlug(toSlug(name), tenant.firmId);

  const updatedFirm = await prisma.firm.update({
    where: { id: tenant.firmId },
    data: { name, slug: newSlug },
  });

  if (ownerName !== undefined) {
    await prisma.user.updateMany({
      where: { id: tenant.userId },
      data: { name: ownerName || null },
    });
  }

  console.log("[api/firm] Updated firm name:", updatedFirm.name);

  return NextResponse.json({ firm: updatedFirm });
}
