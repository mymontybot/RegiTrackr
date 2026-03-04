import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WaitlistBody = {
  email?: string;
};

export async function POST(req: Request) {
  let body: WaitlistBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  try {
    await prisma.waitlistEntry.create({
      data: {
        email,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Email already on waitlist" }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Unable to save waitlist entry" },
      { status: 500 },
    );
  }
}
