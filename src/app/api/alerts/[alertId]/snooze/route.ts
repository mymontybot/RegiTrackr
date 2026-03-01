import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { NexusService } from "@/lib/services/nexus.service";
import {
  AppError,
  AuthError,
  ResourceNotFoundError,
  ValidationError,
} from "@/lib/utils/errors";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ alertId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AuthError("Authentication required");
    }

    const body = (await req.json()) as { note?: string; days?: number };
    if (!body.note || body.note.trim() === "") {
      return NextResponse.json({ error: "note is required" }, { status: 400 });
    }

    const { alertId } = await params;
    const nexusService = await NexusService.create(userId);
    const alert = await nexusService.snoozeAlert(alertId, {
      note: body.note,
      days: body.days ?? 30,
    });

    return NextResponse.json({
      alert,
      auditTrail: {
        snoozedAt: new Date().toISOString(),
        snoozedByUserId: alert.snoozedByUserId,
        snoozeNote: alert.snoozeNote,
        snoozedUntil: alert.snoozedUntil,
      },
    });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
