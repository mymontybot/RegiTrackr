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

export function CsvImportDialog() {
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
        <Button>Import Revenue CSV</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>CSV Import</DialogTitle>
          <DialogDescription>
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
          />

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              Import in progress...
            </div>
          ) : null}

          {result?.message ? (
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertTitle>{result.success ? "Import complete" : "Import failed"}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          ) : null}

          {successMessage ? (
            <Alert>
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                {successMessage} in {result?.processingTimeMs} ms.
              </AlertDescription>
            </Alert>
          ) : null}

          {hasErrors ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Validation Errors ({result?.errors.length})</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result?.errors.map((error, index) => (
                      <TableRow key={`${error.rowNumber}-${error.field}-${index}`}>
                        <TableCell>{error.rowNumber}</TableCell>
                        <TableCell>{error.field}</TableCell>
                        <TableCell>{error.message}</TableCell>
                        <TableCell>{error.value ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={handleImport} disabled={!file || loading}>
            Import CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CsvImportDialog;
