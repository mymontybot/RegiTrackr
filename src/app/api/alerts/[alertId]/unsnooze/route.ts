import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { NexusService } from "@/lib/services/nexus.service";
import { AppError, AuthError, ResourceNotFoundError } from "@/lib/utils/errors";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ alertId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AuthError("Authentication required");
    }

    const { alertId } = await params;
    const nexusService = await NexusService.create(userId);
    const alert = await nexusService.unsnoozeAlert(alertId);

    return NextResponse.json({ success: true, alert });
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
