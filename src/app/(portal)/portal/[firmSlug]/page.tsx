import { redirect } from "next/navigation";
import { PortalAlerts } from "@/components/portal/PortalAlerts";
import { PortalDeadlines } from "@/components/portal/PortalDeadlines";
import { PortalLogoutButton } from "@/components/portal/PortalLogoutButton";
import { PortalNexusTable } from "@/components/portal/PortalNexusTable";
import { PortalRegistrations } from "@/components/portal/PortalRegistrations";
import { RevenueSubmitForm } from "@/components/portal/RevenueSubmitForm";
import { requirePortalSession } from "@/lib/services/portal-auth.service";
import { PortalService } from "@/lib/services/portal.service";
import { AuthError } from "@/lib/utils/errors";

type PortalDashboardPageProps = {
  params: Promise<{ firmSlug: string }>;
};

export default async function PortalDashboardPage({ params }: PortalDashboardPageProps) {
  const { firmSlug } = await params;
  let session;
  try {
    session = await requirePortalSession(firmSlug);
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/portal/${firmSlug}/login`);
    }
    throw error;
  }

  const portalService = PortalService.create(session);
  const [shell, nexusRows, deadlines, alerts, registrations, stateOptions] = await Promise.all([
    portalService.getPortalShellData(),
    portalService.getNexusStatusTable(),
    portalService.getUpcomingDeadlines(3),
    portalService.getActiveThresholdAlerts(),
    portalService.getRegistrationTable(),
    portalService.getRevenueSubmissionStates(),
  ]);

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{shell.client.name}</h2>
          <p className="text-sm text-muted-foreground">
            Portal account: {shell.portalUser.email}
          </p>
        </div>
        <PortalLogoutButton firmSlug={firmSlug} />
      </div>

      <PortalNexusTable rows={nexusRows} />
      <PortalDeadlines rows={deadlines} />
      <PortalAlerts rows={alerts} />
      <PortalRegistrations rows={registrations} />
      {shell.portalUser.canSubmitRevenue ? <RevenueSubmitForm stateOptions={stateOptions} /> : null}
    </main>
  );
}
