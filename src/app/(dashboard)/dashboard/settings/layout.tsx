import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MainNav } from "@/components/dashboard/MainNav";
import { UserProfileButton } from "@/components/dashboard/UserProfileButton";
import { getTenantContext } from "@/lib/services/auth.service";
import { CreditCard, Users } from "lucide-react";

type SettingsLayoutProps = {
  children: React.ReactNode;
};

const SETTINGS_NAV = [
  { href: "/dashboard/settings/team", label: "Team & Roles", icon: Users },
  { href: "/dashboard/settings/billing", label: "Billing", icon: CreditCard },
] as const;

export default async function SettingsLayout({ children }: SettingsLayoutProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const tenant = await getTenantContext(userId);
  if (tenant.role !== "FIRM_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-[#060B18]">
      <MainNav role={tenant.role} current="settings" />

      <main className="ml-64 flex-1 min-w-0 p-6">
        <div className="flex items-center justify-between border-b border-[#1A2640] bg-[#0D1526] -mt-6 -mr-6 mb-6 h-14 px-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Settings</h1>
          <UserProfileButton />
        </div>

        <div className="flex gap-8">
          <aside className="w-56 shrink-0">
            <nav className="space-y-0.5 rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-1 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
              {SETTINGS_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100"
                  >
                    <Icon className="h-4 w-4 text-slate-500" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </main>
    </div>
  );
}
