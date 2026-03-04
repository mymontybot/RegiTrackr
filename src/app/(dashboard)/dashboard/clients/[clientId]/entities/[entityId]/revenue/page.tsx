import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { EntityService } from "@/lib/services/entity.service";
import { ResourceNotFoundError } from "@/lib/utils/errors";
import { CsvImportDialog } from "@/components/revenue/CsvImportDialog";

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

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-100">Add revenue data</h1>
        <p className="text-slate-400">
          Add revenue data for <strong className="text-slate-100">{entity.name}</strong> to start tracking nexus exposure.
          Use the CSV import below and include this entity by name in the <code className="rounded bg-[#111D35] px-1 text-sm text-slate-300">entity_name</code> column.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CsvImportDialog />
        <span className="text-sm text-slate-500">
          or <Link href="/api/revenue-entries/template" className="font-medium text-blue-400 underline hover:text-blue-300">download the template</Link>
        </span>
      </div>
    </main>
  );
}
