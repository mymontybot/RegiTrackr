import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/dashboard/MainNav";
import { NexusTriggerHistory } from "@/components/dashboard/NexusTriggerHistory";
import { NarrativeCard } from "@/components/dashboard/NarrativeCard";
import { ExportScorecardButton } from "@/components/dashboard/ExportScorecardButton";
import { UserProfileButton } from "@/components/dashboard/UserProfileButton";
import { ClientEntitiesSection } from "@/components/clients/ClientEntitiesSection";
import { ClientService } from "@/lib/services/client.service";
import { getTenantContext } from "@/lib/services/auth.service";
import { ResourceNotFoundError } from "@/lib/utils/errors";

type ClientDetailPageProps = {
  params: Promise<{ clientId: string }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { clientId } = await params;
  const service = await ClientService.create(userId);

  let client: Awaited<ReturnType<ClientService["getClientById"]>>;
  try {
    client = await service.getClientById(clientId);
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      notFound();
    }
    throw error;
  }

  const tenant = await getTenantContext(userId);
  const activeAlerts = client.entities.reduce((count, entity) => count + entity.alerts.length, 0);
  const nextFiling = client.entities
    .flatMap((entity) => entity.filingRecords.map((filing) => ({ ...filing, entityName: entity.name })))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
  return (
    <div className="flex min-h-screen bg-[#060B18]">
      <MainNav role={tenant.role} current="dashboard" />
      <main className="ml-64 flex-1 min-w-0 space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between border-b border-[#1A2640] bg-[#0D1526] -mt-6 -mr-6 mb-6 px-6 py-4 gap-3">
          <div>
            <p className="text-sm text-slate-500">Client</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{client.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Industry: {client.industry ?? "Not set"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportScorecardButton clientId={client.id} />
            <UserProfileButton />
            <Link
              href="/dashboard"
              className="rounded-lg border border-[#2A3F66] px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100"
            >
              Back
            </Link>
            <Link
              href={`/dashboard/clients/${client.id}/edit`}
              className="rounded-lg border border-[#2A3F66] px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100"
            >
              Edit
            </Link>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card
            className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
            style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500">Entities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-2xl font-bold text-slate-100">{client.entities.length}</p>
            </CardContent>
          </Card>
          <Card
            className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
            style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-2xl font-bold text-[#F87171]">{activeAlerts}</p>
            </CardContent>
          </Card>
          <Card
            className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
            style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500">Next Filing Due</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-lg font-semibold text-slate-100">
                {nextFiling ? formatDate(nextFiling.dueDate) : "No filing scheduled"}
              </p>
              {nextFiling ? (
                <p className="text-xs text-slate-500">{nextFiling.entityName}</p>
              ) : null}
            </CardContent>
          </Card>
        </section>

      {client.entities[0] ? <NarrativeCard entityId={client.entities[0].id} /> : null}

      <ClientEntitiesSection
        clientId={client.id}
        entities={client.entities.map((e) => ({
          id: e.id,
          name: e.name,
          entityType: e.entityType,
          alerts: e.alerts.map((a) => ({ band: a.band, stateCode: a.stateCode })),
          filingRecords: e.filingRecords.map((f) => ({ dueDate: f.dueDate })),
        }))}
      />

      {client.entities[0] ? <NexusTriggerHistory entityId={client.entities[0].id} /> : null}
      </main>
    </div>
  );
}
