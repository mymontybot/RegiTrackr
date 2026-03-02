import { beforeEach, describe, expect, it, vi } from "vitest";
import { decrypt, encrypt, maskAccountNumber } from "../lib/encryption/field-encryption";
import { PortalService } from "../lib/services/portal.service";
import { NexusRegistrationService } from "../lib/services/nexus-registration.service";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  nexusRegistration: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("../lib/db/prisma", () => ({
  default: prismaMock,
}));

describe("field-level encryption", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("1) encrypt then decrypt returns original value", () => {
    const plain = "12-3456789";
    const cipher = encrypt(plain);
    const roundTrip = decrypt(cipher);

    expect(roundTrip).toBe(plain);
  });

  it("2) two encryptions of same value produce different ciphertext", () => {
    const plain = "12-3456789";
    const first = encrypt(plain);
    const second = encrypt(plain);

    expect(first).not.toBe(second);
    expect(decrypt(first)).toBe(plain);
    expect(decrypt(second)).toBe(plain);
  });

  it("3) masked account number shows only last 4 digits", () => {
    expect(maskAccountNumber("CA-12345678901234")).toBe("****1234");
  });

  it("4) portal user API returns masked number, not decrypted", async () => {
    const encryptedAccount = encrypt("987654321234");
    prismaMock.nexusRegistration.findMany.mockResolvedValueOnce([
      {
        id: "nr-1",
        stateCode: "CA",
        registrationDate: new Date("2026-03-01T00:00:00.000Z"),
        filingFrequency: "MONTHLY",
        stateAccountNumber: encryptedAccount,
        status: "REGISTERED",
      },
    ]);

    const service = PortalService.create({
      portalUserId: "portal-1",
      firmId: "firm-a",
      clientId: "client-a",
      firmSlug: "firm-a",
    });

    const rows = await service.getRegistrationTable();

    expect(rows[0].maskedAccountNumber).toBe("****1234");
    expect(rows[0].maskedAccountNumber).not.toContain("987654321234");
  });

  it("5) CPA staff API returns decrypted number", async () => {
    const encryptedAccount = encrypt("1111222233334444");
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user-staff-a",
      role: "STAFF_ACCOUNTANT",
    });
    prismaMock.nexusRegistration.findUnique.mockResolvedValueOnce({
      id: "nr-2",
      firmId: "firm-a",
      entityId: "entity-a",
      stateCode: "NY",
      status: "REGISTERED",
      filingFrequency: "MONTHLY",
      registrationDate: new Date("2026-03-01T00:00:00.000Z"),
      stateAccountNumber: encryptedAccount,
      notes: null,
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    });

    const service = new NexusRegistrationService({
      firmId: "firm-a",
      userId: "user-staff-a",
      billingTier: "PRO",
    });
    const row = await service.getRegistrationById("nr-2");

    expect(row.stateAccountNumber).toBe("1111222233334444");
  });
});
