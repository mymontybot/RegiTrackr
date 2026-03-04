import type { Entity, EntityType, UserRole } from "@prisma/client";
import { decrypt, encrypt } from "@/lib/encryption/field-encryption";
import { getTenantContext } from "@/lib/services/auth.service";
import { BaseService, type BaseServiceContext } from "@/lib/services/base.service";
import { ForbiddenError, ResourceNotFoundError } from "@/lib/utils/errors";

type CreateEntityInput = {
  clientId: string;
  name: string;
  entityType: EntityType;
  ein?: string;
  stateOfFormation?: string | null;
  formationDate?: Date | null;
};

type UpdateEntityInput = {
  name?: string;
  entityType?: EntityType;
  ein?: string;
};

export class EntityService extends BaseService {
  constructor(ctx: BaseServiceContext) {
    super(ctx);
  }

  static async create(clerkUserId: string): Promise<EntityService> {
    const tenant = await getTenantContext(clerkUserId);
    return new EntityService({
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

  async createEntity(input: CreateEntityInput): Promise<Entity> {
    const role = await this.getCurrentUserRole();
    if (role === "READ_ONLY") {
      throw new ForbiddenError("Read-only users cannot create entities");
    }

    const client = await this.getPrisma().client.findUnique({
      where: { id: input.clientId },
      select: { id: true, firmId: true },
    });
    if (!client) {
      throw new ResourceNotFoundError("Client not found", { clientId: input.clientId });
    }
    this.assertFirmScope(client);

    return this.getPrisma().entity.create({
      data: {
        clientId: input.clientId,
        firmId: this.firmId,
        name: input.name,
        entityType: input.entityType,
        ein: encrypt(input.ein ?? ""),
        stateOfFormation: input.stateOfFormation ?? null,
        formationDate: input.formationDate ?? null,
      },
    });
  }

  async updateEntity(entityId: string, input: UpdateEntityInput): Promise<Entity> {
    const role = await this.getCurrentUserRole();
    if (role === "READ_ONLY") {
      throw new ForbiddenError("Read-only users cannot update entities");
    }

    const existing = await this.getPrisma().entity.findUnique({
      where: { id: entityId },
      select: { id: true, firmId: true },
    });
    if (!existing) {
      throw new ResourceNotFoundError("Entity not found", { entityId });
    }
    this.assertFirmScope(existing);

    return this.getPrisma().entity.update({
      where: { id: entityId },
      data: {
        name: input.name,
        entityType: input.entityType,
        ein: input.ein ? encrypt(input.ein) : undefined,
      },
    });
  }

  async getEntityById(entityId: string): Promise<Entity> {
    const entity = await this.getPrisma().entity.findUnique({
      where: { id: entityId },
    });
    if (!entity) {
      throw new ResourceNotFoundError("Entity not found", { entityId });
    }
    this.assertFirmScope(entity);

    const role = await this.getCurrentUserRole();
    if (role === "FIRM_ADMIN" || role === "STAFF_ACCOUNTANT") {
      return {
        ...entity,
        ein: decrypt(entity.ein),
      };
    }

    return {
      ...entity,
      ein: "",
    };
  }
}
