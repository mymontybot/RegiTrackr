import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { FilingStatus, NexusBand } from "@prisma/client";

export type RiskScorecardNexusRow = {
  stateCode: string;
  revenueYtd: number;
  thresholdPercent: number;
  band: NexusBand;
};

export type RiskScorecardDeadlineRow = {
  stateCode: string;
  periodLabel: string;
  dueDate: string;
  daysUntilDue: number;
  status: FilingStatus;
};

export type RiskScorecardData = {
  firmName: string;
  generatedDate: string;
  clientName: string;
  entityName: string;
  nexusRows: RiskScorecardNexusRow[];
  registrationGaps: string[];
  deadlineRows: RiskScorecardDeadlineRow[];
  aiNarrative?: string | null;
};

const styles = StyleSheet.create({
  page: {
    fontSize: 10,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 30,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 10,
    color: "#4B5563",
  },
  identityRow: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
  },
  section: {
    marginBottom: 11,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 5,
  },
  table: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  overdueRow: {
    backgroundColor: "#FEF2F2",
  },
  colState: { width: "16%", padding: 4 },
  colRevenue: { width: "22%", padding: 4 },
  colPercent: { width: "22%", padding: 4 },
  colStatus: { width: "22%", padding: 4 },
  colPeriod: { width: "20%", padding: 4 },
  colDueDate: { width: "20%", padding: 4 },
  colDays: { width: "20%", padding: 4 },
  gapLabel: {
    color: "#B91C1C",
    fontWeight: 700,
    marginLeft: 6,
  },
  narrativeBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 3,
    padding: 8,
    backgroundColor: "#F9FAFB",
  },
  disclaimer: {
    marginTop: 6,
    fontSize: 8,
    color: "#6B7280",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    textAlign: "center",
    fontSize: 8,
    color: "#6B7280",
  },
  muted: {
    color: "#6B7280",
  },
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function colorForBand(band: NexusBand): string {
  if (band === "TRIGGERED") return "#B91C1C";
  if (band === "URGENT") return "#C2410C";
  if (band === "WARNING") return "#B45309";
  if (band === "SAFE") return "#166534";
  return "#374151";
}

function bandLabel(band: NexusBand): string {
  return `${band[0]}${band.slice(1).toLowerCase()}`;
}

export function buildRiskScorecardPdfDocument(
  data: RiskScorecardData,
): React.ReactElement<DocumentProps> {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Compliance Risk Score Card</Text>
          <Text style={styles.subtitle}>
            {data.firmName} • Generated {data.generatedDate}
          </Text>
        </View>

        <View style={styles.identityRow}>
          <Text>Client: {data.clientName}</Text>
          <Text>Entity: {data.entityName}</Text>
          <Text style={styles.muted}>Prepared by RegiTrackr</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Nexus Exposure Summary</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colState}>State</Text>
              <Text style={styles.colRevenue}>Revenue YTD</Text>
              <Text style={styles.colPercent}>% of Threshold</Text>
              <Text style={styles.colStatus}>Status</Text>
            </View>
            {data.nexusRows.map((row) => (
              <View key={row.stateCode} style={styles.tableRow}>
                <Text style={styles.colState}>{row.stateCode}</Text>
                <Text style={styles.colRevenue}>{formatCurrency(row.revenueYtd)}</Text>
                <Text style={styles.colPercent}>{row.thresholdPercent.toFixed(1)}%</Text>
                <Text style={[styles.colStatus, { color: colorForBand(row.band) }]}>
                  {bandLabel(row.band)}
                </Text>
              </View>
            ))}
            {data.nexusRows.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.colState, styles.muted]}>No nexus records</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Registration Gaps</Text>
          {data.registrationGaps.length === 0 ? (
            <Text style={styles.muted}>No triggered registration gaps found.</Text>
          ) : (
            data.registrationGaps.map((state) => (
              <Text key={state}>
                {state}
                <Text style={styles.gapLabel}> Action required</Text>
              </Text>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Upcoming Deadlines (Next 30 Days)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colState}>State</Text>
              <Text style={styles.colPeriod}>Period</Text>
              <Text style={styles.colDueDate}>Due Date</Text>
              <Text style={styles.colDays}>Days Until Due</Text>
              <Text style={styles.colStatus}>Status</Text>
            </View>
            {data.deadlineRows.map((row, idx) => (
              <View
                key={`${row.stateCode}-${idx}`}
                style={row.status === "OVERDUE" ? [styles.tableRow, styles.overdueRow] : styles.tableRow}
              >
                <Text style={styles.colState}>{row.stateCode}</Text>
                <Text style={styles.colPeriod}>{row.periodLabel}</Text>
                <Text style={styles.colDueDate}>{row.dueDate}</Text>
                <Text style={styles.colDays}>{row.daysUntilDue}</Text>
                <Text style={styles.colStatus}>{row.status}</Text>
              </View>
            ))}
            {data.deadlineRows.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.colState, styles.muted]}>No deadlines in this window.</Text>
              </View>
            ) : null}
          </View>
        </View>

        {data.aiNarrative ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. AI-Generated Compliance Summary (RegiTrackr)</Text>
            <View style={styles.narrativeBox}>
              <Text>{data.aiNarrative}</Text>
              <Text style={styles.disclaimer}>
                This narrative is AI-generated for informational purposes and should be reviewed by a qualified tax professional.
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.footer}>Generated by RegiTrackr • regitrackr.com • Not tax advice</Text>
      </Page>
    </Document>
  );
}
