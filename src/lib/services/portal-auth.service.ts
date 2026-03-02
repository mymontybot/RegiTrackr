import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { PortalUser } from "@prisma/client";
import { cookies } from "next/headers";
import prisma from "@/lib/db/prisma";
import { AuthError } from "@/lib/utils/errors";

const PORTAL_SESSION_COOKIE = "regitrackr_portal_session";
const PORTAL_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type PortalSession = {
  portalUserId: string;
  firmId: string;
  clientId: string;
  firmSlug: string;
};

type JwtClaims = PortalSession & {
  iat: number;
  exp: number;
};

function getPortalJwtSecret(): Uint8Array {
  const secret = process.env.PORTAL_JWT_SECRET;
  if (!secret) {
    throw new Error("Missing PORTAL_JWT_SECRET");
  }
  return new TextEncoder().encode(secret);
}

async function signPortalJwt(payload: PortalSession): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PORTAL_SESSION_TTL_SECONDS}s`)
    .sign(getPortalJwtSecret());
}

async function verifyPortalJwt(token: string): Promise<PortalSession> {
  try {
    const verified = await jwtVerify<JwtClaims>(token, getPortalJwtSecret(), {
      algorithms: ["HS256"],
    });

    const { portalUserId, firmId, clientId, firmSlug } = verified.payload;
    if (!portalUserId || !firmId || !clientId || !firmSlug) {
      throw new AuthError("Invalid portal session");
    }

    return { portalUserId, firmId, clientId, firmSlug };
  } catch {
    throw new AuthError("Invalid portal session");
  }
}

export async function authenticatePortalUser(
  email: string,
  password: string,
  firmSlug: string,
): Promise<{ session: PortalSession; token: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedSlug = firmSlug.trim().toLowerCase();

  const firm = await prisma.firm.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true, slug: true },
  });
  if (!firm) {
    throw new AuthError("Invalid credentials");
  }

  const portalUser = await prisma.portalUser.findFirst({
    where: {
      firmId: firm.id,
      email: normalizedEmail,
      isActive: true,
    },
    select: {
      id: true,
      firmId: true,
      clientId: true,
      passwordHash: true,
    },
  });

  const passwordMatch = await bcrypt.compare(password, portalUser?.passwordHash ?? "");
  if (!portalUser || !passwordMatch) {
    throw new AuthError("Invalid credentials");
  }

  const session: PortalSession = {
    portalUserId: portalUser.id,
    firmId: portalUser.firmId,
    clientId: portalUser.clientId,
    firmSlug: firm.slug,
  };
  const token = await signPortalJwt(session);
  return { session, token };
}

export async function setPortalSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: PORTAL_SESSION_TTL_SECONDS,
  });
}

export async function clearPortalSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function getPortalSessionFromCookie(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    return await verifyPortalJwt(token);
  } catch {
    return null;
  }
}

export async function requirePortalSession(firmSlug?: string): Promise<PortalSession> {
  const session = await getPortalSessionFromCookie();
  if (!session) {
    throw new AuthError("Portal authentication required");
  }
  if (firmSlug && session.firmSlug !== firmSlug.toLowerCase()) {
    throw new AuthError("Portal session does not match firm");
  }

  const portalUser = await prisma.portalUser.findUnique({
    where: { id: session.portalUserId },
    select: { id: true, firmId: true, clientId: true, isActive: true },
  });
  if (!portalUser || !portalUser.isActive) {
    throw new AuthError("Portal authentication required");
  }
  if (portalUser.firmId !== session.firmId || portalUser.clientId !== session.clientId) {
    throw new AuthError("Portal authentication required");
  }

  return session;
}

export async function getPortalUserFromSession(session: PortalSession): Promise<Pick<
  PortalUser,
  "id" | "email" | "canSubmitRevenue" | "clientId" | "firmId"
>> {
  const portalUser = await prisma.portalUser.findUnique({
    where: { id: session.portalUserId },
    select: {
      id: true,
      email: true,
      canSubmitRevenue: true,
      clientId: true,
      firmId: true,
    },
  });

  if (!portalUser) {
    throw new AuthError("Portal authentication required");
  }
  if (portalUser.clientId !== session.clientId || portalUser.firmId !== session.firmId) {
    throw new AuthError("Portal authentication required");
  }

  return portalUser;
}
