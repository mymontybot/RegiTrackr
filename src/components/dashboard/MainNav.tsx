import Link from "next/link";
import type { UserRole } from "@prisma/client";

type MainNavProps = {
  role: UserRole;
  current: "dashboard" | "calendar" | "alerts" | "team";
};

function linkClass(active: boolean): string {
  return `rounded-md border px-3 py-1.5 text-sm font-medium ${active ? "bg-muted" : ""}`;
}

export function MainNav({ role, current }: MainNavProps) {
  return (
    <nav className="flex flex-wrap items-center gap-2">
      <Link href="/dashboard" className={linkClass(current === "dashboard")}>
        Dashboard
      </Link>
      <Link href="/dashboard/calendar" className={linkClass(current === "calendar")}>
        Calendar
      </Link>
      <Link href="/dashboard/alerts" className={linkClass(current === "alerts")}>
        Alerts
      </Link>
      {role === "FIRM_ADMIN" ? (
        <Link href="/dashboard/team" className={linkClass(current === "team")}>
          Team
        </Link>
      ) : null}
    </nav>
  );
}
