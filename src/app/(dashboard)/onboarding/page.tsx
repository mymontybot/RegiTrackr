import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/services/auth.service";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

function isDefaultFirmName(firmName: string, clerkFirstName: string | null, emailLocal: string): boolean {
  const trimmed = firmName.trim().toLowerCase();
  if (trimmed === "my firm") return true;
  const fallback = clerkFirstName?.trim()
    ? `${clerkFirstName.trim()} Firm`.toLowerCase()
    : `${emailLocal} Firm`.toLowerCase();
  return trimmed === fallback;
}

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const tenant = await getTenantContext(userId);
  const [clerkUser, firm] = await Promise.all([
    currentUser(),
    prisma.firm.findUnique({
      where: { id: tenant.firmId },
      select: { name: true },
    }),
  ]);

  if (!firm) {
    redirect("/dashboard");
  }

  const primaryEmail =
    clerkUser?.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    "";
  const emailLocal = primaryEmail ? primaryEmail.split("@")[0] : "";
  const clerkFirstName = clerkUser?.firstName ?? null;

  if (!isDefaultFirmName(firm.name, clerkFirstName, emailLocal)) {
    redirect("/dashboard");
  }

  const initialOwnerName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() || "";

  return (
    <div className="flex min-h-screen flex-col bg-[#060B18]">
      <header className="border-b border-[#1E2D4A] px-6 py-4">
        <Link
          href="/dashboard"
          className="[font-family:var(--font-syne),system-ui,sans-serif] text-xl font-bold text-slate-100"
        >
          RegiTrackr
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div
          className="mx-auto w-full max-w-lg rounded-2xl border border-[#1E2D4A] bg-[#0D1526] p-10"
          style={{ borderTop: "2px solid rgba(59,130,246,0.5)" }}
        >
          <OnboardingForm initialOwnerName={initialOwnerName} />
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Need help getting started?{" "}
          <a
            href="#"
            className="text-blue-400 hover:text-blue-300"
          >
            Book a 15-minute setup call →
          </a>
        </p>
      </main>
    </div>
  );
}
