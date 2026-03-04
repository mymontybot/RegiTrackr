import type { UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { getTenantContext } from "@/lib/services/auth.service";
import { BaseService, type BaseServiceContext } from "./base.service";
import { ForbiddenError, ValidationError } from "@/lib/utils/errors";

const INVITATION_EXPIRY_DAYS = 7;
const TOKEN_BYTES = 32;

export type CreateInvitationInput = {
  email: string;
  role: UserRole;
};

export type InvitationRow = {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  invitedByName: string | null;
};

export class InvitationService extends BaseService {
  static override async create(clerkUserId: string): Promise<InvitationService> {
    const tenant = await getTenantContext(clerkUserId);
    return new InvitationService({
      firmId: tenant.firmId,
      userId: tenant.userId,
      billingTier: tenant.billingTier,
    } as BaseServiceContext);
  }

  async createInvitation(input: CreateInvitationInput): Promise<{ id: string; token: string; expiresAt: Date }> {
    const email = input.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError("Valid work email is required");
    }

    const prisma = this.getPrisma();
    const existingUser = await prisma.user.findFirst({
      where: { firmId: this.firmId, email },
    });
    if (existingUser) {
      throw new ValidationError("A user with this email already belongs to your firm");
    }

    const pending = await prisma.invitation.findFirst({
      where: { firmId: this.firmId, email, status: "PENDING" },
    });
    if (pending && pending.expiresAt > new Date()) {
      throw new ValidationError("A pending invite already exists for this email");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);
    const token = randomBytes(TOKEN_BYTES).toString("base64url");

    const inv = await prisma.invitation.create({
      data: {
        firmId: this.firmId,
        email,
        role: input.role,
        invitedById: this.userId,
        token,
        status: "PENDING",
        expiresAt,
      },
    });

    return { id: inv.id, token: inv.token, expiresAt: inv.expiresAt };
  }

  async listInvitations(): Promise<InvitationRow[]> {
    const prisma = this.getPrisma();
    const rows = await prisma.invitation.findMany({
      where: { firmId: this.firmId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { invitedBy: { select: { name: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      status: r.status,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      invitedByName: r.invitedBy.name,
    }));
  }

}

/** Get invite by token without tenant context (for accept-invite flow). */
export async function getInvitationByToken(token: string): Promise<{
  id: string;
  email: string;
  role: UserRole;
  firmId: string;
  firmName: string;
} | null> {
  const { default: prisma } = await import("@/lib/db/prisma");
  const inv = await prisma.invitation.findUnique({
    where: { token, status: "PENDING" },
    include: { firm: { select: { name: true } } },
  });
  if (!inv || inv.expiresAt < new Date()) return null;
  return {
    id: inv.id,
    email: inv.email,
    role: inv.role,
    firmId: inv.firmId,
    firmName: inv.firm.name,
  };
}

/** Accept an invitation (no tenant context; used when user may not belong to firm yet). */
export async function acceptInvitationByToken(
  token: string,
  clerkUserId: string,
  clerkEmail: string,
  clerkName: string | null,
): Promise<void> {
  const invite = await getInvitationByToken(token);
  if (!invite) throw new ValidationError("Invalid or expired invitation");
  if (invite.email.toLowerCase() !== clerkEmail.toLowerCase()) {
    throw new ForbiddenError("Invitation email does not match your account");
  }
  const { default: prisma } = await import("@/lib/db/prisma");
  const existing = await prisma.user.findUnique({ where: { clerkUserId } });
  if (existing && existing.firmId === invite.firmId) {
    throw new ValidationError("You are already a member of this firm");
  }
  await prisma.$transaction(async (tx) => {
    await tx.invitation.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    if (existing) {
      await tx.user.update({
        where: { id: existing.id },
        data: { firmId: invite.firmId, role: invite.role, email: clerkEmail.toLowerCase(), name: clerkName },
      });
    } else {
      await tx.user.create({
        data: {
          clerkUserId,
          firmId: invite.firmId,
          email: clerkEmail.toLowerCase(),
          name: clerkName,
          role: invite.role,
        },
      });
    }
  });
}
