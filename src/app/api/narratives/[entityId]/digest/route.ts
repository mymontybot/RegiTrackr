import { createHash } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { buildNarrativeInput } from "@/lib/ai/narrative-input";
import { generateDigestSentence } from "@/lib/ai/narrative.engine";
import { getTenantContext } from "@/lib/services/auth.service";
import { narrativeCacheKey, redis } from "@/lib/redis/client";
import { AuthError } from "@/lib/utils/errors";

function failure(): NextResponse {
  return NextResponse.json({ success: false }, { status: 200 });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ entityId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new AuthError("Authentication required");

    const tenant = await getTenantContext(userId);
    const { entityId } = await params;

    const scopedEntity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true, firmId: true },
    });
    if (!scopedEntity) return failure();
    if (scopedEntity.firmId !== tenant.firmId) return NextResponse.json({ success: false }, { status: 403 });

    const latestSummary = await prisma.aiSummary.findFirst({
      where: {
        firmId: tenant.firmId,
        entityId,
        summaryType: "NEXUS_EXPOSURE_NARRATIVE",
      },
      orderBy: { generatedAt: "desc" },
      select: { inputHash: true },
    });
    if (latestSummary?.inputHash) {
      const fullCached = await redis.get<{
        highlights?: string[];
      }>(narrativeCacheKey(entityId, latestSummary.inputHash));
      if (Array.isArray(fullCached?.highlights) && fullCached.highlights[0]) {
        return NextResponse.json({ digest: fullCached.highlights[0] });
      }
    }

    const { input } = await buildNarrativeInput(tenant.firmId, entityId);
    const digestInputHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const digestKey = `digest:v1:${entityId}:${digestInputHash}`;
    const cachedDigest = await redis.get<{ digest?: string }>(digestKey);
    if (cachedDigest?.digest) {
      return NextResponse.json({ digest: cachedDigest.digest });
    }

    const digest = await generateDigestSentence(input);
    if (!digest) return failure();

    await redis.set(digestKey, { digest }, { ex: 86400 });
    return NextResponse.json({ digest });
  } catch {
    return failure();
  }
}
