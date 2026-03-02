import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NexusTriggerHistory } from "@/components/dashboard/NexusTriggerHistory";
import { NarrativeCard } from "@/components/dashboard/NarrativeCard";
import { NexusBadge } from "@/components/ui/NexusBadge";
import { ExportScorecardButton } from "@/components/dashboard/ExportScorecardButton";
import { ClientService } from "@/lib/services/client.service";
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

  const activeAlerts = client.entities.reduce((count, entity) => count + entity.alerts.length, 0);
  const nextFiling = client.entities
    .flatMap((entity) => entity.filingRecords.map((filing) => ({ ...filing, entityName: entity.name })))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Client</p>
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Industry: {client.industry ?? "Not set"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportScorecardButton clientId={client.id} />
          <Link href="/dashboard" className="rounded-md border px-3 py-1.5 text-sm font-medium">
            Back
          </Link>
          <Link
            href={`/dashboard/clients/${client.id}/edit`}
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            Edit
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{client.entities.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-red-600">{activeAlerts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Filing Due</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {nextFiling ? formatDate(nextFiling.dueDate) : "No filing scheduled"}
            </p>
            {nextFiling ? (
              <p className="text-xs text-muted-foreground">{nextFiling.entityName}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {client.entities[0] ? <NarrativeCard entityId={client.entities[0].id} /> : null}

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Entities</h2>
        <div className="space-y-2">
          {client.entities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entities yet.</p>
          ) : null}
          {client.entities.map((entity) => {
            const urgentAlert = entity.alerts[0];
            const upcomingFiling = entity.filingRecords[0];
            return (
              <div
                key={entity.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              >
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
                  {upcomingFiling ? `Due ${formatDate(upcomingFiling.dueDate)}` : "No filing due date"}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {client.entities[0] ? <NexusTriggerHistory entityId={client.entities[0].id} /> : null}
    </main>
  );
}
