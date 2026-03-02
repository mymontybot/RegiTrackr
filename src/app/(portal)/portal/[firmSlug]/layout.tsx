import type { ReactNode } from "react";
import Link from "next/link";
import prisma from "@/lib/db/prisma";

type FirmPortalLayoutProps = {
  children: ReactNode;
  params: Promise<{ firmSlug: string }>;
};

export default async function FirmPortalLayout({
  children,
  params,
}: FirmPortalLayoutProps) {
  const { firmSlug } = await params;
  const firm = await prisma.firm.findUnique({
    where: { slug: firmSlug.toLowerCase() },
    select: {
      name: true,
      logoUrl: true,
      supportEmail: true,
    },
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            {firm?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={firm.logoUrl} alt={`${firm.name} logo`} className="h-8 w-8 rounded object-cover" />
            ) : (
              <div className="h-8 w-8 rounded bg-muted" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Client Portal</p>
              <h1 className="text-base font-semibold">{firm?.name ?? "Firm Portal"}</h1>
            </div>
          </div>
          <Link
            href={`/portal/${firmSlug}/login`}
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            Login
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 py-6">{children}</div>

      <footer className="border-t bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-4 text-xs text-muted-foreground">
          <p>Support: {firm?.supportEmail ?? "Not configured"}</p>
          <p>powered by RegiTrackr</p>
        </div>
      </footer>
    </div>
  );
}
