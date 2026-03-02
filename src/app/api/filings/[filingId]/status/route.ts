import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { DeadlineService } from "@/lib/services/deadline.service";
import { AppError, AuthError, ResourceNotFoundError, ValidationError } from "@/lib/utils/errors";

type PatchPayload = {
  status?: "UPCOMING" | "PREPARED" | "FILED" | "CONFIRMED" | "OVERDUE";
  note?: string;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ filingId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AuthError("Authentication required");
    }

    const body = (await req.json()) as PatchPayload;
    if (!body.note || body.note.trim() === "") {
      return NextResponse.json({ error: "note is required" }, { status: 400 });
    }
    if (!body.status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const { filingId } = await params;
    const deadlineService = await DeadlineService.create(userId);
    const result = await deadlineService.updateFilingStatus(filingId, {
      status: body.status,
      note: body.note,
    });

    return NextResponse.json(result);
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
