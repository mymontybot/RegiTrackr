import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Dev only: returns the current user's Clerk ID so you can set SEED_LINK_CLERK_USER_ID
 * and run `npx prisma db seed` to link your account to the Hartwell fixture firm.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Not signed in. Sign in first, then visit this URL again." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    clerkUserId: userId,
    message:
      "Copy clerkUserId into your .env file as SEED_LINK_CLERK_USER_ID, then run: NODE_ENV=development npx prisma db seed",
  });
}
