"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { NexusBand } from "@prisma/client"
import type { ClientListRow } from "@/lib/services/client.service"
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
  filters: {
    search?: string
    nexusBand?: NexusBand | "ALL"
    assignedStaffId?: string
  }
}

function DigestCell({ entityId }: { entityId: string | null }) {
  const [loading, setLoading] = useState(true)
  const [digest, setDigest] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!entityId) {
      setLoading(false)
      setDigest(null)
      return
    }

    const fetchDigest = async () => {
      try {
        const response = await fetch(`/api/narratives/${entityId}/digest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
        if (!response.ok) {
          if (!cancelled) setDigest(null)
          return
        }
        const payload = (await response.json()) as { digest?: string; success?: false }
        if (!cancelled) {
          if (!payload.digest) {
            setDigest(null)
            return
          }
          setDigest(payload.digest)
        }
      } catch {
        if (!cancelled) setDigest(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDigest()
    return () => {
      cancelled = true
    }
  }, [entityId])

  if (loading || !digest) {
    return <p className="truncate text-sm italic text-slate-400">Generating...</p>
  }

  return <p className="truncate text-sm italic text-slate-400">{digest}</p>
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
  filters,
}: ClientTableProps) {
  const router = useRouter()

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
        <Table className="w-full border-collapse text-sm">
          <TableHeader>
            <TableRow className="border-b border-[#1A2640]">
              <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Client Name</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Entities</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Most Urgent Nexus State</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Active Alerts</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Next Filing Due</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Assigned Staff</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">AI Narrative Digest</TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase tracking-widest text-slate-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-sm font-medium text-slate-500">No clients match the current filters.</p>
                    <p className="mt-1 text-xs text-slate-600">Try adjusting your search or filter criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}

            {rows.map((row, idx) => (
              <TableRow
                key={row.clientId}
                className={`cursor-pointer border-b border-[#1A2640] transition-colors hover:bg-[#111D35] ${idx % 2 === 1 ? "bg-[#0A1020]" : ""}`}
                onClick={() => router.push(`/dashboard/clients/${row.clientId}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    router.push(`/dashboard/clients/${row.clientId}`)
                  }
                }}
                tabIndex={0}
              >
                <TableCell className="px-4 py-2.5 text-sm font-medium text-slate-100">{row.clientName}</TableCell>
                <TableCell className="px-4 py-2.5 text-sm font-mono text-slate-300">{row.entitiesCount}</TableCell>
                <TableCell className="px-4 py-2.5 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <NexusBadge band={row.mostUrgentNexusState.band} />
                    <span className="text-xs text-slate-500">
                      {row.mostUrgentNexusState.stateCode ?? "No state"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-2.5 text-sm font-mono text-slate-300">{row.activeAlertsCount}</TableCell>
                <TableCell className="px-4 py-2.5 text-sm text-slate-300">
                  <div className="space-y-0.5">
                    <p className="font-mono text-xs text-slate-400">{formatDate(row.nextFilingDue.date)}</p>
                    <p className="text-xs text-slate-500">
                      {formatDaysUntil(row.nextFilingDue.daysUntil)}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-2.5 text-sm text-slate-300">
                  {row.assignedStaff ? row.assignedStaff.name ?? row.assignedStaff.email : "Unassigned"}
                </TableCell>
                <TableCell className="max-w-sm whitespace-normal px-4 py-2.5 text-sm text-slate-400">
                  <DigestCell entityId={row.digestEntityId} />
                </TableCell>
                <TableCell
                  className="px-4 py-2.5 text-right"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/dashboard/clients/${row.clientId}`}
                      className="rounded-lg border border-[#2A3F66] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100"
                    >
                      View
                    </Link>
                    <Link
                      href={`/dashboard/clients/${row.clientId}/edit`}
                      className="rounded-lg border border-[#2A3F66] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100"
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
        <p className="text-sm text-slate-500">
          Showing page {page} of {totalPages} ({total} clients)
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={buildPageHref(Math.max(1, page - 1), filters)}
            aria-disabled={page <= 1}
            className="rounded-lg border border-[#2A3F66] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            Previous
          </Link>
          <Link
            href={buildPageHref(Math.min(totalPages, page + 1), filters)}
            aria-disabled={page >= totalPages}
            className="rounded-lg border border-[#2A3F66] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  )
}
