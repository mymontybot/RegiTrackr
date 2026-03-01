import { Redis } from "@upstash/redis";
import type { CachedNarrative } from "@/types/narrative.types";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
  }

  return new Redis({ url, token });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export function narrativeCacheKey(entityId: string, inputHash: string): string {
  return `narrative:v1:${entityId}:${inputHash}`;
}

export async function setNarrative(
  key: string,
  value: CachedNarrative,
  ttlSeconds = 86400,
): Promise<void> {
  await redis.set(key, value, { ex: ttlSeconds });
}

export async function getNarrative(key: string): Promise<CachedNarrative | null> {
  const narrative = await redis.get<CachedNarrative>(key);
  return narrative ?? null;
}

export async function deleteNarrative(key: string): Promise<void> {
  await redis.del(key);
}

async function deleteByPattern(pattern: string): Promise<void> {
  let cursor = "0";

  do {
    const result = (await redis.scan(cursor, { match: pattern, count: 200 })) as [
      string,
      string[],
    ];
    const [nextCursor, keys] = result;

    if (keys.length > 0) {
      await redis.del(...keys);
    }

    cursor = nextCursor;
  } while (cursor !== "0");
}

export async function invalidateEntityNarratives(entityId: string): Promise<void> {
  await deleteByPattern(`narrative:v1:${entityId}:*`);
}

export async function invalidateAllNarratives(): Promise<void> {
  await deleteByPattern("narrative:v1:*");
}
