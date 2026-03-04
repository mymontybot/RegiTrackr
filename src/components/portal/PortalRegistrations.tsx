import type { PortalRegistrationRow } from "@/lib/services/portal.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PortalRegistrationsProps = {
  rows: PortalRegistrationRow[];
};

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function PortalRegistrations({ rows }: PortalRegistrationsProps) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">Registration Status</h2>
      <div className="mt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>State</TableHead>
              <TableHead>Registration Date</TableHead>
              <TableHead>Filing Frequency</TableHead>
              <TableHead>Account Number</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  No registration records available.
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.stateCode}</TableCell>
                <TableCell>{formatDate(row.registrationDate)}</TableCell>
                <TableCell>{row.filingFrequency ?? "-"}</TableCell>
                <TableCell>{row.maskedAccountNumber}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
