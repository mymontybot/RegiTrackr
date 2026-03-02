import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function normalizeRuntimeDatabaseUrl(raw: string): string {
  const url = new URL(raw);
  const isSupabasePoolerHost = url.hostname.includes(".pooler.supabase.com");

  if (!url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  if (isSupabasePoolerHost && url.port !== "6543") {
    console.warn(
      `[prisma] DATABASE_URL points to Supabase pooler on port ${url.port || "(default)"}. ` +
        "Recommended app runtime port is 6543.",
    );
  }

  return url.toString();
}

function prismaClientSingleton() {
  const runtimeUrl = process.env.DATABASE_URL;
  const connectionString = runtimeUrl
    ? normalizeRuntimeDatabaseUrl(runtimeUrl)
    : runtimeUrl;

  if (!connectionString) {
    throw new Error("Missing DATABASE_URL");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
