import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { ClientEditForm } from "@/components/clients/ClientEditForm";
import { ClientService } from "@/lib/services/client.service";
import { ResourceNotFoundError } from "@/lib/utils/errors";

type EditClientPageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function EditClientPage({ params }: EditClientPageProps) {
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

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-100">Edit Client</h1>
        <p className="text-sm text-slate-500">Update client details for {client.name}.</p>
      </div>

      <ClientEditForm
        clientId={client.id}
        initialName={client.name}
        initialIndustry={client.industry}
      />

      <Link
        href={`/dashboard/clients/${client.id}`}
        className="inline-flex rounded-md border px-3 py-1.5 text-sm font-medium"
      >
        Back to client
      </Link>
    </main>
  );
}
