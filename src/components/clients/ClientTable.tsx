"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { BillingTier, NexusBand } from "@prisma/client"
import type { ClientListRow } from "@/lib/services/client.service"
import { PlanGate } from "@/components/ui/PlanGate"
import { Skeleton } from "@/components/ui/skeleton"
import { NexusBadge } from "@/components/ui/NexusBadge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ClientTableProps = {
  rows: ClientListRow[]
  page: number
  totalPages: number
  total: number
  currentTier: BillingTier
  filters: {
    search?: string
    nexusBand?: NexusBand | "ALL"
    assignedStaffId?: string
  }
}

function DigestCell({ entityId }: { entityId: string | null }) {
  const [loading, setLoading] = useState(Boolean(entityId))
  const [digest, setDigest] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!entityId) {
      setLoading(false)
      setHidden(true)
      return
    }

    const fetchDigest = async () => {
      try {
        const response = await fetch(`/api/narratives/${entityId}/digest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
        if (!response.ok) {
          if (!cancelled) setHidden(true)
          return
        }
        const payload = (await response.json()) as { digest?: string; success?: false }
        if (!cancelled) {
          if (!payload.digest) {
            setHidden(true)
            return
          }
          setDigest(payload.digest)
        }
      } catch {
        if (!cancelled) setHidden(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDigest()
    return () => {
      cancelled = true
    }
  }, [entityId])

  if (hidden) return null
  if (loading) return <Skeleton className="h-4 w-24" />
  if (!digest) return null

  return <p className="truncate text-sm italic text-muted-foreground">{digest}</p>
}

function formatDate(date: Date | null): string {
  if (!date) return "No filing scheduled"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatDaysUntil(daysUntil: number | null): string {
  if (daysUntil === null) return ""
  if (daysUntil < 0) return `${Math.abs(daysUntil)}d overdue`
  if (daysUntil === 0) return "due today"
  return `in ${daysUntil}d`
}

function buildPageHref(
  page: number,
  filters: ClientTableProps["filters"],
): string {
  const params = new URLSearchParams()
  params.set("page", String(page))
  if (filters.search) params.set("search", filters.search)
  if (filters.nexusBand && filters.nexusBand !== "ALL") {
    params.set("nexusBand", filters.nexusBand)
  }
  if (filters.assignedStaffId) params.set("assignedStaffId", filters.assignedStaffId)
  return `/dashboard?${params.toString()}`
}

export function ClientTable({
  rows,
  page,
  totalPages,
  total,
  currentTier,
  filters,
}: ClientTableProps) {
  const router = useRouter()

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client Name</TableHead>
              <TableHead>Entities</TableHead>
              <TableHead>Most Urgent Nexus State</TableHead>
              <TableHead>Active Alerts</TableHead>
              <TableHead>Next Filing Due</TableHead>
              <TableHead>Assigned Staff</TableHead>
              <TableHead>AI Narrative Digest</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No clients match the current filters.
                </TableCell>
              </TableRow>
            ) : null}

            {rows.map((row) => (
              <TableRow
                key={row.clientId}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/clients/${row.clientId}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    router.push(`/dashboard/clients/${row.clientId}`)
                  }
                }}
                tabIndex={0}
              >
                <TableCell className="font-medium">{row.clientName}</TableCell>
                <TableCell>{row.entitiesCount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <NexusBadge band={row.mostUrgentNexusState.band} />
                    <span className="text-xs text-muted-foreground">
                      {row.mostUrgentNexusState.stateCode ?? "No state"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{row.activeAlertsCount}</TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <p>{formatDate(row.nextFilingDue.date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDaysUntil(row.nextFilingDue.daysUntil)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {row.assignedStaff ? row.assignedStaff.name ?? row.assignedStaff.email : "Unassigned"}
                </TableCell>
                <TableCell className="max-w-sm whitespace-normal text-sm text-muted-foreground">
                  <PlanGate
                    currentTier={currentTier}
                    requiredTier="PRO"
                    title="Pro required"
                    description="Upgrade to view AI digest."
                  >
                    <DigestCell entityId={row.digestEntityId} />
                  </PlanGate>
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/dashboard/clients/${row.clientId}`}
                      className="rounded-md border px-2.5 py-1 text-xs font-medium"
                    >
                      View
                    </Link>
                    <Link
                      href={`/dashboard/clients/${row.clientId}/edit`}
                      className="rounded-md border px-2.5 py-1 text-xs font-medium"
                    >
                      Edit
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing page {page} of {totalPages} ({total} clients)
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={buildPageHref(Math.max(1, page - 1), filters)}
            aria-disabled={page <= 1}
            className="rounded-md border px-3 py-1.5 text-sm font-medium aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            Previous
          </Link>
          <Link
            href={buildPageHref(Math.min(totalPages, page + 1), filters)}
            aria-disabled={page >= totalPages}
            className="rounded-md border px-3 py-1.5 text-sm font-medium aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  )
}
