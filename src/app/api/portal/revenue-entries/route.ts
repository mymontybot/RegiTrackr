import { NextResponse } from "next/server";
import { requirePortalSession } from "@/lib/services/portal-auth.service";
import { PortalService } from "@/lib/services/portal.service";
import { AppError } from "@/lib/utils/errors";

type RevenueSubmissionPayload = {
  stateCode?: string;
  periodYear?: number;
  periodMonth?: number;
  revenueAmount?: number;
};

export async function POST(req: Request) {
  try {
    const session = await requirePortalSession();
    const payload = (await req.json()) as RevenueSubmissionPayload;

    if (!payload.stateCode || payload.periodYear === undefined || payload.periodMonth === undefined || payload.revenueAmount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const portalService = PortalService.create(session);
    const result = await portalService.submitRevenue({
      stateCode: payload.stateCode,
      periodYear: payload.periodYear,
      periodMonth: payload.periodMonth,
      revenueAmount: payload.revenueAmount,
    });

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
