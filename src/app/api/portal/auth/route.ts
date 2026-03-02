import { NextResponse } from "next/server";
import {
  authenticatePortalUser,
  setPortalSessionCookie,
} from "@/lib/services/portal-auth.service";
import { AppError, AuthError } from "@/lib/utils/errors";

type LoginPayload = {
  email?: string;
  password?: string;
  firmSlug?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginPayload;
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";
    const firmSlug = body.firmSlug?.trim() ?? "";

    if (!email || !password || !firmSlug) {
      throw new AuthError("Invalid credentials");
    }

    const { token, session } = await authenticatePortalUser(email, password, firmSlug);
    await setPortalSessionCookie(token);

    return NextResponse.json({
      success: true,
      session: {
        firmSlug: session.firmSlug,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
