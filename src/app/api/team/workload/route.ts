import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/services/auth.service";
import { WorkloadService } from "@/lib/services/workload.service";
import { AppError, AuthError, ForbiddenError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AuthError("Authentication required");
    }

    const tenant = await getTenantContext(userId);
    if (tenant.role !== "FIRM_ADMIN") {
      throw new ForbiddenError("Only firm admins can view team workload");
    }

    const service = await WorkloadService.create(userId);
    const workload = await service.getStaffWorkload(tenant.firmId);

    return NextResponse.json({
      data: workload.staff,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
