"use client";

import type { NexusBand } from "@prisma/client";
import Link from "next/link";
import { useState } from "react";
import { AddEntityDrawer } from "@/components/entities/AddEntityDrawer";
import { NexusBadge } from "@/components/ui/NexusBadge";

type EntityRow = {
  id: string;
  name: string;
  entityType: string;
  alerts: { band: NexusBand; stateCode: string }[];
  filingRecords: { dueDate: Date | string }[];
};

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

type ClientEntitiesSectionProps = {
  clientId: string;
  entities: EntityRow[];
};

export function ClientEntitiesSection({
  clientId,
  entities,
}: ClientEntitiesSectionProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newEntityId, setNewEntityId] = useState<string | null>(null);

  return (
    <>
      <section className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-100">Entities</h2>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="shrink-0 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            Add Entity
          </button>
        </div>
        <div className="space-y-2">
          {entities.length === 0 ? (
            <p className="text-sm text-slate-500">No entities yet.</p>
          ) : null}
          {entities.map((entity) => {
            const urgentAlert = entity.alerts[0];
            const upcomingFiling = entity.filingRecords[0];
            const showActivationBanner = newEntityId === entity.id;
            return (
              <div key={entity.id} className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1A2640] bg-[#111D35] p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-100">{entity.name}</p>
                    <p className="text-xs text-slate-500">{entity.entityType}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {urgentAlert ? (
                      <>
                        <NexusBadge band={urgentAlert.band} />
                        <span className="text-xs text-slate-500">{urgentAlert.stateCode}</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500">No active alerts</span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    {upcomingFiling ? `Due ${formatDate(upcomingFiling.dueDate)}` : "No filing due date"}
                  </div>
                </div>
                {showActivationBanner ? (
                  <div className="rounded-lg border border-[#1E3A5F] bg-[#0F172A] px-3 py-2">
                    <Link
                      href={`/dashboard/clients/${clientId}/entities/${entity.id}/revenue`}
                      className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
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
