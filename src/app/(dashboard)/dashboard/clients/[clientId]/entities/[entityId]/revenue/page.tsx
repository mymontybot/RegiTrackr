import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { Download, FileSpreadsheet, Info, Upload } from "lucide-react";
import { EntityService } from "@/lib/services/entity.service";
import { ResourceNotFoundError } from "@/lib/utils/errors";
import { CsvImportDialog } from "@/components/revenue/CsvImportDialog";
import { Button } from "@/components/ui/button";

type EntityRevenuePageProps = {
  params: Promise<{ clientId: string; entityId: string }>;
};

export default async function EntityRevenuePage({ params }: EntityRevenuePageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { clientId, entityId } = await params;

  const entityService = await EntityService.create(userId);
  let entity: Awaited<ReturnType<EntityService["getEntityById"]>>;
  try {
    entity = await entityService.getEntityById(entityId);
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      notFound();
    }
    throw error;
  }

  if (entity.clientId !== clientId) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div>
        <Link
          href={`/dashboard/clients/${clientId}`}
          className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-100"
        >
          ← Back to client
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Import Revenue Data
        </h1>
        <p className="text-sm font-medium text-blue-400">Entity: {entity.name}</p>
      </div>

      <div className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
        <h2 className="mb-6 text-base font-semibold text-slate-100">
          How to get client revenue data into RegiTrackr
        </h2>

        <div className="space-y-8">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <Download className="h-5 w-5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-100">
                Download the CSV template
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                The template has the exact columns RegiTrackr expects. Fill in one row per state
                per month for this entity.
              </p>
              <a
                href="/api/revenue-entries/template"
                className="mt-3 inline-flex rounded-lg border border-[#2A3F66] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100"
              >
                Download Template
              </a>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <FileSpreadsheet className="h-5 w-5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-100">
                Fill in your client&apos;s revenue by state
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                For each state where the client made sales, enter the monthly revenue amount and
                transaction count. One row per state per month. The entity_name column must match
                exactly: <code className="rounded bg-[#111D35] px-1 font-mono text-sm text-slate-300">{entity.name}</code>
              </p>
              <div className="mt-3 overflow-x-auto rounded-lg border border-[#1A2640]">
                <table className="w-full min-w-[400px] border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1A2640] bg-[#060B18]">
                      <th className="px-3 py-2 text-left font-medium text-slate-500">entity_name</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">state_code</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">period</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">revenue_amount</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">transaction_count</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1A2640] bg-[#0A1020]">
                      <td className="px-3 py-2 font-mono text-slate-300">{entity.name}</td>
                      <td className="px-3 py-2 font-mono text-slate-300">TX</td>
                      <td className="px-3 py-2 font-mono text-slate-300">2025-01</td>
                      <td className="px-3 py-2 font-mono text-slate-300">45000</td>
                      <td className="px-3 py-2 font-mono text-slate-300">312</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <Upload className="h-5 w-5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-100">
                Upload your completed CSV
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                RegiTrackr will validate every row before importing. Any errors are shown before
                data is saved — nothing imports until you confirm.
              </p>
              <div className="mt-3">
                <CsvImportDialog
                  trigger={
                    <Button className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white">
                      <Upload className="h-4 w-4" />
                      Upload CSV File
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 rounded-lg border border-blue-800/50 bg-[#0A1628] p-4">
        <Info className="h-5 w-5 shrink-0 text-blue-400" />
        <p className="text-sm leading-relaxed text-slate-300">
          After importing, RegiTrackr will automatically recalculate nexus exposure for all states
          and update the AI Nexus Exposure Narrative. This usually takes less than 30 seconds.
        </p>
      </div>
    </main>
  );
}
