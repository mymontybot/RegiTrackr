import type { NexusBand } from "@prisma/client"
import { cn } from "@/lib/utils"

const nexusBandClassMap: Record<NexusBand, string> = {
  SAFE: "bg-green-100 text-green-800",
  WARNING: "bg-amber-100 text-amber-800",
  URGENT: "bg-orange-100 text-orange-800",
  TRIGGERED: "bg-red-100 text-red-800",
  REGISTERED: "bg-blue-100 text-blue-800",
}

type NexusBadgeProps = {
  band: NexusBand
  className?: string
}

function toLabel(band: NexusBand): string {
  return `${band[0]}${band.slice(1).toLowerCase()}`
}

export function NexusBadge({ band, className }: NexusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        nexusBandClassMap[band],
        className
      )}
    >
      {toLabel(band)}
    </span>
  )
}
