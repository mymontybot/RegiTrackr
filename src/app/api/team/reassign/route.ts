import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/services/auth.service";
import prisma from "@/lib/db/prisma";
import { AppError, AuthError, ForbiddenError, ValidationError } from "@/lib/utils/errors";

type ReassignPayload = {
  fromUserId?: string;
  toUserId?: string;
  includeFilings?: boolean;
};

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AuthError("Authentication required");
    }

    const tenant = await getTenantContext(userId);
    if (tenant.role !== "FIRM_ADMIN") {
      throw new ForbiddenError("Only firm admins can reassign workload");
    }

    const body = (await req.json()) as ReassignPayload;
    const fromUserId = body.fromUserId?.trim();
    const toUserId = body.toUserId?.trim();
    const includeFilings = Boolean(body.includeFilings);

    if (!fromUserId || !toUserId) {
      throw new ValidationError("fromUserId and toUserId are required");
    }
    if (fromUserId === toUserId) {
      throw new ValidationError("fromUserId and toUserId must differ");
    }

    const [fromUser, toUser] = await Promise.all([
      prisma.user.findFirst({
        where: { id: fromUserId, firmId: tenant.firmId },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: { id: toUserId, firmId: tenant.firmId },
        select: { id: true },
      }),
    ]);
    if (!fromUser || !toUser) {
      throw new ValidationError("Invalid staff user selection for this firm");
    }

    const clientReassignResult = await prisma.client.updateMany({
      where: {
        firmId: tenant.firmId,
        assignedUserId: fromUserId,
      },
      data: {
        assignedUserId: toUserId,
      },
    });

    let openFilingsReassigned = 0;
    if (includeFilings) {
      const extra = await prisma.filingRecord.updateMany({
        where: {
          firmId: tenant.firmId,
          assignedUserId: fromUserId,
          status: { in: ["UPCOMING", "PREPARED", "OVERDUE"] },
        },
        data: {
          assignedUserId: toUserId,
        },
      });
      openFilingsReassigned = extra.count;
    }

    return NextResponse.json({
      success: true,
      affectedClientCount: clientReassignResult.count,
      reassignedFilings: openFilingsReassigned,
      openFilingsReassigned,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
