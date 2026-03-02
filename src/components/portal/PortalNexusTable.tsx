import type { PortalNexusRow } from "@/lib/services/portal.service";
import { NexusBadge } from "@/components/ui/NexusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PortalNexusTableProps = {
  rows: PortalNexusRow[];
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PortalNexusTable({ rows }: PortalNexusTableProps) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">Nexus Status</h2>
      <div className="mt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>State</TableHead>
              <TableHead>Revenue YTD</TableHead>
              <TableHead>% of Threshold</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registration Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  No nexus data available yet.
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map((row) => (
              <TableRow key={row.stateCode}>
                <TableCell className="font-medium">{row.stateCode}</TableCell>
                <TableCell>{formatCurrency(row.revenueYtd)}</TableCell>
                <TableCell>{row.thresholdPercent.toFixed(1)}%</TableCell>
                <TableCell>
                  <NexusBadge band={row.band} />
                </TableCell>
                <TableCell>{row.registrationStatus}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
