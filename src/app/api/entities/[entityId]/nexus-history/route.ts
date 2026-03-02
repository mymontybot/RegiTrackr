import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { NexusHistoryService } from "@/lib/services/nexus-history.service";
import { AppError, AuthError, ResourceNotFoundError } from "@/lib/utils/errors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ entityId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AuthError("Authentication required");
    }

    const { entityId } = await params;
    const url = new URL(req.url);
    const stateCode = url.searchParams.get("stateCode")?.trim().toUpperCase();

    const service = await NexusHistoryService.create(userId);
    if (stateCode) {
      const history = await service.getTriggerHistory(entityId, stateCode);
      return NextResponse.json({ data: history });
    }

    const histories = await service.getTriggerHistoryForAllStates(entityId);
    return NextResponse.json({ data: histories });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
