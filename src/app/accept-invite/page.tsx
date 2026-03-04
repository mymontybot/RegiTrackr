import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AcceptInviteClient } from "@/components/accept-invite/AcceptInviteClient";
import { getInvitationByToken } from "@/lib/services/invitation.service";

type AcceptInvitePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const { userId } = await auth();
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : Array.isArray(params.token) ? params.token[0] : "";

  if (!token) {
    redirect("/sign-in");
  }

  const invite = await getInvitationByToken(token);
  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm text-center max-w-md">
          <h1 className="text-xl font-semibold text-foreground">Invalid or expired invitation</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invite link is no longer valid. Ask your firm admin to send a new one.
          </p>
          <a href="/sign-in" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
            Go to sign in
          </a>
        </div>
      </div>
    );
  }

  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/accept-invite?token=${token}`)}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <AcceptInviteClient
        token={token}
        firmName={invite.firmName}
        role={invite.role}
        email={invite.email}
      />
    </div>
  );
}
