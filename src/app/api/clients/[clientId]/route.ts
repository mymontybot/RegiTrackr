import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ClientService } from "@/lib/services/client.service";
import { AppError, AuthError, ValidationError } from "@/lib/utils/errors";

type PatchPayload = {
  name?: string;
  industry?: string | null;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AuthError("Authentication required");
    }

    const body = (await req.json()) as PatchPayload;
    if (body.name !== undefined && body.name.trim().length === 0) {
      throw new ValidationError("Client name cannot be empty");
    }

    const { clientId } = await params;
    const clientService = await ClientService.create(userId);
    const updated = await clientService.updateClient(clientId, {
      name: body.name?.trim(),
      industry: body.industry === undefined ? undefined : body.industry?.trim() || null,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      industry: updated.industry,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
