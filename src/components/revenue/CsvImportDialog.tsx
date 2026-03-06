"use client";

import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type RowError = {
  rowNumber: number;
  field: string;
  message: string;
  value?: string;
};

type ImportResponse = {
  success: boolean;
  imported: number;
  errors: RowError[];
  totalRows: number;
  processingTimeMs: number;
  message?: string;
};

type CsvImportDialogProps = {
  trigger?: React.ReactNode;
};

export function CsvImportDialog({ trigger }: CsvImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const hasErrors = (result?.errors?.length ?? 0) > 0;
  const successMessage = useMemo(() => {
    if (!result?.success) return null;
    return `Imported ${result.imported} rows successfully`;
  }, [result]);

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/revenue-entries/import", {
        method: "POST",
        body: formData,
      });
      const payload = (await res.json()) as ImportResponse;
      setResult(payload);
    } catch {
      setResult({
        success: false,
        imported: 0,
        errors: [],
        totalRows: 0,
        processingTimeMs: 0,
        message: "Failed to upload file",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>Import Revenue CSV</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl border-[#1E2D4A] bg-[#0D1526]">
        <DialogHeader>
          <DialogTitle className="text-slate-100">CSV Import</DialogTitle>
          <DialogDescription className="text-slate-400">
            Upload a CSV file with revenue entries (up to 10,000 rows).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.location.href = "/api/revenue-entries/template";
              }}
              className="border-[#2A3F66] text-slate-300 hover:bg-[#111D35] hover:text-slate-100"
            >
              Download Template
            </Button>
          </div>

          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setFile(selected);
            }}
            className="border-[#1E2D4A] bg-[#060B18] text-slate-100 file:border-0 file:bg-[#111D35] file:text-slate-300"
          />

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-r-transparent" />
              Import in progress...
            </div>
          ) : null}

          {result?.message ? (
            <Alert variant={result.success ? "default" : "destructive"} className={result.success ? "border-[#1A2640] bg-[#111D35] text-slate-300" : "border-red-900/50 bg-red-950/30 text-red-400"}>
              <AlertTitle className={result.success ? "text-slate-100" : "text-red-400"}>{result.success ? "Import complete" : "Import failed"}</AlertTitle>
              <AlertDescription className={result.success ? "text-slate-400" : "text-red-300"}>{result.message}</AlertDescription>
            </Alert>
          ) : null}

          {successMessage ? (
            <Alert className="border-[#1A2640] bg-[#111D35]">
              <AlertTitle className="text-slate-100">Success</AlertTitle>
              <AlertDescription className="text-slate-400">
                {successMessage} in <span className="font-mono">{result?.processingTimeMs}</span> ms.
              </AlertDescription>
            </Alert>
          ) : null}

          {hasErrors ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-200">Validation Errors (<span className="font-mono">{result?.errors.length}</span>)</h3>
              <div className="rounded-lg border border-[#1E2D4A]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#1A2640] hover:bg-transparent">
                      <TableHead className="text-slate-500">Row</TableHead>
                      <TableHead className="text-slate-500">Field</TableHead>
                      <TableHead className="text-slate-500">Message</TableHead>
                      <TableHead className="text-slate-500">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result?.errors.map((error, index) => (
                      <TableRow key={`${error.rowNumber}-${error.field}-${index}`} className="border-b border-[#1A2640] bg-[#0A1020] even:bg-[#0A1020] hover:bg-[#111D35]">
                        <TableCell className="py-2.5 font-mono text-slate-300">{error.rowNumber}</TableCell>
                        <TableCell className="py-2.5 text-slate-300">{error.field}</TableCell>
                        <TableCell className="py-2.5 text-slate-300">{error.message}</TableCell>
                        <TableCell className="py-2.5 text-slate-300">{error.value ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-[#2A3F66] text-slate-300 hover:bg-[#111D35] hover:text-slate-100">
            Close
          </Button>
          <Button onClick={handleImport} disabled={!file || loading} className="bg-blue-500 hover:bg-blue-600 text-white">
            Import CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CsvImportDialog;
