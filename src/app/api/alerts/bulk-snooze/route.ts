import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { NexusService } from "@/lib/services/nexus.service";
import { AppError, AuthError, ValidationError } from "@/lib/utils/errors";

type BulkSnoozePayload = {
  alertIds?: string[];
  note?: string;
  days?: number;
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AuthError("Authentication required");
    }

    const body = (await req.json()) as BulkSnoozePayload;
    if (!body.alertIds?.length) {
      throw new ValidationError("alertIds is required");
    }
    if (!body.note || body.note.trim() === "") {
      throw new ValidationError("note is required");
    }

    const nexusService = await NexusService.create(userId);
    const result = await nexusService.bulkSnoozeAlerts({
      alertIds: body.alertIds,
      note: body.note,
      days: body.days ?? 30,
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
      snoozedUntil: result.snoozedUntil,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
