import type { EntityType } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { EntityService } from "@/lib/services/entity.service";
import { AppError, AuthError, ValidationError } from "@/lib/utils/errors";

type PostPayload = {
  clientId?: string;
  name?: string;
  entityType?: string;
  stateOfFormation?: string | null;
  ein?: string | null;
  formationDate?: string | null;
};

const ENTITY_TYPES: EntityType[] = [
  "LLC",
  "S_CORP",
  "C_CORP",
  "PARTNERSHIP",
  "SOLE_PROPRIETOR",
  "NON_PROFIT",
  "TRUST",
  "OTHER",
];

const STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
]);

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AuthError("Authentication required");
    }

    const body = (await req.json()) as PostPayload;
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!clientId) {
      throw new ValidationError("clientId is required");
    }
    if (!name) {
      throw new ValidationError("Legal entity name is required");
    }
    const entityType = body.entityType as EntityType | undefined;
    if (!entityType || !ENTITY_TYPES.includes(entityType)) {
      throw new ValidationError("Valid entity type is required");
    }

    const entityService = await EntityService.create(userId);

    const stateOfFormation =
      body.stateOfFormation === undefined || body.stateOfFormation === null || body.stateOfFormation === ""
        ? null
        : typeof body.stateOfFormation === "string"
          ? body.stateOfFormation.trim() || null
          : null;
    if (stateOfFormation !== null && !STATE_CODES.has(stateOfFormation)) {
      throw new ValidationError("Invalid state of formation");
    }

    const ein =
      body.ein === undefined || body.ein === null
        ? ""
        : typeof body.ein === "string"
          ? body.ein.trim().replace(/\D/g, "")
          : "";

    let formationDate: Date | null = null;
    if (body.formationDate && typeof body.formationDate === "string") {
      const parsed = new Date(body.formationDate);
      if (!Number.isNaN(parsed.getTime())) {
        formationDate = parsed;
      }
    }

    const entity = await entityService.createEntity({
      clientId,
      name,
      entityType,
      ...(ein ? { ein } : {}),
      stateOfFormation,
      formationDate,
    });

    return NextResponse.json(
      { id: entity.id, name: entity.name },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
