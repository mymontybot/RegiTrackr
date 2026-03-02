"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type PortalLogoutButtonProps = {
  firmSlug: string;
};

export function PortalLogoutButton({ firmSlug }: PortalLogoutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className="rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60"
      onClick={() => {
        startTransition(async () => {
          await fetch("/api/portal/auth/logout", {
            method: "POST",
          });
          router.push(`/portal/${firmSlug}/login`);
          router.refresh();
        });
      }}
    >
      {isPending ? "Signing out..." : "Logout"}
    </button>
  );
}
