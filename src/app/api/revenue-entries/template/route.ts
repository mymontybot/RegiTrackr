import { downloadTemplate } from "@/lib/utils/csv-import";

export async function GET() {
  const csv = downloadTemplate();
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="regitrackr_revenue_template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
