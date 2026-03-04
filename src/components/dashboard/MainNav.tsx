import Link from "next/link";
import type { UserRole } from "@prisma/client";
import {
  LayoutDashboard,
  Calendar,
  Bell,
  UserCheck,
  Settings,
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";

type MainNavProps = {
  role: UserRole;
  current: "dashboard" | "calendar" | "alerts" | "team" | "settings";
};

const NAV_ITEMS = [
  { key: "dashboard" as const, href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "calendar" as const, href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { key: "alerts" as const, href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { key: "team" as const, href: "/dashboard/team", label: "Team", icon: UserCheck, adminOnly: true },
  { key: "settings" as const, href: "/dashboard/settings/team", label: "Settings", icon: Settings, adminOnly: true },
];

function navItemClass(active: boolean): string {
  return active
    ? "flex items-center gap-3 px-[14px] py-2.5 text-sm text-slate-100 font-medium rounded-lg mx-2 bg-[#111D35] border-l-2 border-l-blue-500"
    : "flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 rounded-lg mx-2 hover:bg-[#111D35] hover:text-slate-200 transition-colors";
}

export function MainNav({ role, current }: MainNavProps) {
  return (
    <nav className="fixed left-0 top-0 z-30 flex h-full w-60 flex-col bg-[#080C1A] border-r border-[#1A2640]">
      <div className="border-b border-[#1A2640] px-5 py-5">
        <span className="text-base font-bold tracking-tight text-slate-100">RegiTrackr</span>
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-1">
        <span className="mb-1 mt-6 px-4 text-xs font-medium uppercase tracking-widest text-slate-600">
          Menu
        </span>
        {NAV_ITEMS.map((item) => {
          if (item.adminOnly && role !== "FIRM_ADMIN") return null;
          const Icon = item.icon;
          return (
            <Link key={item.key} href={item.href} className={navItemClass(current === item.key)}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-auto border-t border-[#1A2640] p-4 pb-4 pt-4">
        <ThemeToggle />
      </div>
    </nav>
  );
}
