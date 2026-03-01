import { invalidateAllNarratives, invalidateEntityNarratives } from "@/lib/redis/client";

export async function onRevenueEntryChanged(entityId: string): Promise<void> {
  await invalidateEntityNarratives(entityId);
}

export async function onFilingStatusChanged(entityId: string): Promise<void> {
  await invalidateEntityNarratives(entityId);
}

export async function onAlertTriggered(entityId: string): Promise<void> {
  await invalidateEntityNarratives(entityId);
}

export async function onThresholdDatabaseUpdated(): Promise<void> {
  await invalidateAllNarratives();
}
