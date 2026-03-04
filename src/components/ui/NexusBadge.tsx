import type { NexusBand } from "@prisma/client"
import { cn } from "@/lib/utils"

const nexusBandClassMap: Record<NexusBand, string> = {
  SAFE: "bg-[#052E16] text-[#4ADE80] border border-[#166534]",
  WARNING: "bg-[#1A1400] text-[#FDE047] border border-[#854D0E]",
  URGENT: "bg-[#1C0A00] text-[#FB923C] border border-[#9A3412]",
  TRIGGERED: "bg-[#1C0505] text-[#F87171] border border-[#991B1B]",
  REGISTERED: "bg-[#0A1628] text-[#60A5FA] border border-[#1E40AF]",
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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium font-mono",
        nexusBandClassMap[band],
        className
      )}
    >
      {toLabel(band)}
    </span>
  )
}
