import type { NexusRegistration, UserRole } from "@prisma/client";
import { decrypt, encrypt, maskAccountNumber } from "@/lib/encryption/field-encryption";
import { getTenantContext } from "@/lib/services/auth.service";
import { BaseService, type BaseServiceContext } from "@/lib/services/base.service";
import { ForbiddenError, ResourceNotFoundError } from "@/lib/utils/errors";

type UpsertRegistrationInput = {
  entityId: string;
  stateCode: string;
  status: NexusRegistration["status"];
  filingFrequency?: NexusRegistration["filingFrequency"];
  registrationDate?: Date | null;
  stateAccountNumber?: string | null;
  notes?: string | null;
};

export class NexusRegistrationService extends BaseService {
  constructor(ctx: BaseServiceContext) {
    super(ctx);
  }

  static async create(clerkUserId: string): Promise<NexusRegistrationService> {
    const tenant = await getTenantContext(clerkUserId);
    return new NexusRegistrationService({
      firmId: tenant.firmId,
      userId: tenant.userId,
      billingTier: tenant.billingTier,
    });
  }

  private async getCurrentUserRole(): Promise<UserRole> {
    const user = await this.getPrisma().user.findUnique({
      where: { id: this.userId },
      select: { role: true },
    });
    return user?.role ?? "FIRM_ADMIN";
  }

  async upsertRegistration(input: UpsertRegistrationInput): Promise<NexusRegistration> {
    const entity = await this.getPrisma().entity.findUnique({
      where: { id: input.entityId },
      select: { id: true, firmId: true },
    });
    if (!entity) {
      throw new ResourceNotFoundError("Entity not found", { entityId: input.entityId });
    }
    this.assertFirmScope(entity);

    const encryptedAccount = input.stateAccountNumber
      ? encrypt(input.stateAccountNumber)
      : undefined;

    return this.getPrisma().nexusRegistration.upsert({
      where: {
        entityId_stateCode: {
          entityId: input.entityId,
          stateCode: input.stateCode,
        },
      },
      create: {
        entityId: input.entityId,
        firmId: this.firmId,
        stateCode: input.stateCode,
        status: input.status,
        filingFrequency: input.filingFrequency ?? null,
        registrationDate: input.registrationDate ?? null,
        stateAccountNumber: encryptedAccount ?? null,
        notes: input.notes ?? null,
      },
      update: {
        status: input.status,
        filingFrequency: input.filingFrequency,
        registrationDate: input.registrationDate,
        stateAccountNumber: encryptedAccount,
        notes: input.notes,
      },
    });
  }

  async getRegistrationById(registrationId: string): Promise<NexusRegistration> {
    const registration = await this.getPrisma().nexusRegistration.findUnique({
      where: { id: registrationId },
    });
    if (!registration) {
      throw new ResourceNotFoundError("Nexus registration not found", { registrationId });
    }
    this.assertFirmScope(registration);

    const role = await this.getCurrentUserRole();
    if (registration.stateAccountNumber) {
      const decrypted = decrypt(registration.stateAccountNumber);
      if (role === "FIRM_ADMIN" || role === "STAFF_ACCOUNTANT") {
        return { ...registration, stateAccountNumber: decrypted };
      }

      return { ...registration, stateAccountNumber: maskAccountNumber(decrypted) };
    }

    if (role === "READ_ONLY") {
      throw new ForbiddenError("Read-only users cannot access raw registration details");
    }

    return registration;
  }
}
