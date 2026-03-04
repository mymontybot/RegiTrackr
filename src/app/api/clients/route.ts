import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/services/auth.service";
import { promoteTier } from "@/lib/services/billing.service";
import { ClientService } from "@/lib/services/client.service";
import { AppError, AuthError, ValidationError } from "@/lib/utils/errors";
import prisma from "@/lib/db/prisma";

type PostPayload = {
  name?: string;
  industry?: string | null;
  assignedUserId?: string | null;
  notes?: string | null;
};

const INDUSTRY_VALUES = [
  "E-commerce",
  "SaaS",
  "Professional Services",
  "Real Estate",
  "Manufacturing",
  "Healthcare",
  "Other",
] as const;

function parseIndustry(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (INDUSTRY_VALUES.includes(trimmed as (typeof INDUSTRY_VALUES)[number])) {
    return trimmed;
  }
  return trimmed;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AuthError("Authentication required");
    }

    const body = (await req.json()) as PostPayload;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      throw new ValidationError("Client name is required");
    }

    const tenant = await getTenantContext(userId);
    const clientService = await ClientService.create(userId);

    const assignedUserId =
      body.assignedUserId === undefined || body.assignedUserId === null || body.assignedUserId === ""
        ? null
        : typeof body.assignedUserId === "string"
          ? body.assignedUserId.trim() || null
          : null;

    if (assignedUserId) {
      const user = await prisma.user.findFirst({
        where: { id: assignedUserId, firmId: tenant.firmId },
        select: { id: true },
      });
      if (!user) {
        throw new ValidationError("Invalid assigned staff");
      }
    }

    const client = await clientService.createClient({
      name,
      industry: parseIndustry(body.industry),
      assignedUserId,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    });

    await clientService.incrementFirmActiveClientCount();
    await promoteTier(tenant.firmId);

    return NextResponse.json(
      { id: client.id, name: client.name },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
