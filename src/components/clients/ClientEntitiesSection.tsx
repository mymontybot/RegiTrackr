"use client";

import Link from "next/link";
import { useState } from "react";
import { AddEntityDrawer } from "@/components/entities/AddEntityDrawer";
import { NexusBadge } from "@/components/ui/NexusBadge";

type EntityRow = {
  id: string;
  name: string;
  entityType: string;
  alerts: { band: string; stateCode: string }[];
  filingRecords: { dueDate: Date | string }[];
};

type ClientEntitiesSectionProps = {
  clientId: string;
  entities: EntityRow[];
  formatDate: (date: Date) => string;
};

export function ClientEntitiesSection({
  clientId,
  entities,
  formatDate,
}: ClientEntitiesSectionProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newEntityId, setNewEntityId] = useState<string | null>(null);

  return (
    <>
      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Entities</h2>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Add Entity
          </button>
        </div>
        <div className="space-y-2">
          {entities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entities yet.</p>
          ) : null}
          {entities.map((entity) => {
            const urgentAlert = entity.alerts[0];
            const upcomingFiling = entity.filingRecords[0];
            const showActivationBanner = newEntityId === entity.id;
            return (
              <div key={entity.id} className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{entity.name}</p>
                    <p className="text-xs text-muted-foreground">{entity.entityType}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {urgentAlert ? (
                      <>
                        <NexusBadge band={urgentAlert.band} />
                        <span className="text-xs text-muted-foreground">{urgentAlert.stateCode}</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">No active alerts</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {upcomingFiling ? `Due ${formatDate(new Date(upcomingFiling.dueDate))}` : "No filing due date"}
                  </div>
                </div>
                {showActivationBanner ? (
                  <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 px-3 py-2">
                    <Link
                      href={`/dashboard/clients/${clientId}/entities/${entity.id}/revenue`}
                      className="text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline"
                    >
                      Add revenue data to start tracking nexus exposure →
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <AddEntityDrawer
        clientId={clientId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSuccess={(entity) => {
          setNewEntityId(entity.id);
        }}
      />
    </>
  );
}
