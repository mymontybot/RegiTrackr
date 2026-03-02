import Link from "next/link"
import type { ReactNode } from "react"
import type { BillingTier } from "@prisma/client"

const tierRank: Record<BillingTier, number> = {
  STARTER: 0,
  GROWTH: 1,
  PRO: 2,
  ENTERPRISE: 3,
}

type PlanGateProps = {
  currentTier: BillingTier
  requiredTier: BillingTier
  children: ReactNode
  title?: string
  description?: string
}

export function PlanGate({
  currentTier,
  requiredTier,
  children,
  title = "Upgrade required",
  description = "Upgrade your plan to unlock this feature.",
}: PlanGateProps) {
  if (tierRank[currentTier] >= tierRank[requiredTier]) {
    return <>{children}</>
  }

  return (
    <div className="rounded-lg border border-dashed p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {description} Required tier: {requiredTier}.
      </p>
      <Link
        href="/dashboard/settings/billing"
        className="mt-3 inline-flex rounded-md border px-3 py-1.5 text-sm font-medium"
      >
        View plans
      </Link>
    </div>
  )
}
