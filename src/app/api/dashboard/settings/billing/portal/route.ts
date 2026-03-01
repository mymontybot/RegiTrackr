import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/services/auth.service";
import { createCustomerPortalSessionUrl } from "@/lib/services/billing.service";
import { AuthError, ResourceNotFoundError } from "@/lib/utils/errors";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    throw new AuthError("Authentication required");
  }

  const tenant = await getTenantContext(userId);
  const origin = new URL(req.url).origin;
  const returnUrl = `${origin}/dashboard/settings/billing`;

  try {
    const portalUrl = await createCustomerPortalSessionUrl(tenant.firmId, returnUrl);
    return NextResponse.redirect(portalUrl);
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.redirect(returnUrl);
    }
    throw error;
  }
}
