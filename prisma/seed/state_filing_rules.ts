import type { FilingFrequency, PrismaClient } from "@prisma/client";

type StateMeta = {
  stateCode: string;
  stateName: string;
  hasGeneralSalesTax: boolean;
  sourceUrl: string;
  dueDateDaysAfterPeriod: number;
};

type FilingRuleSeedRow = {
  stateCode: string;
  filingFrequency: FilingFrequency;
  revenueThresholdForFrequency: number | null;
  dueDateDaysAfterPeriod: number;
  notes: string;
  version: number;
};

const STATES: StateMeta[] = [
  { stateCode: "AL", stateName: "Alabama", hasGeneralSalesTax: true, sourceUrl: "https://www.revenue.alabama.gov/sales-use/sales-use-tax-due-dates/", dueDateDaysAfterPeriod: 20 },
  { stateCode: "AK", stateName: "Alaska", hasGeneralSalesTax: true, sourceUrl: "https://www.arsstc.org/", dueDateDaysAfterPeriod: 30 },
  { stateCode: "AZ", stateName: "Arizona", hasGeneralSalesTax: true, sourceUrl: "https://azdor.gov/transaction-privilege-tax/tpt-filing-frequency-and-due-dates", dueDateDaysAfterPeriod: 20 },
  { stateCode: "AR", stateName: "Arkansas", hasGeneralSalesTax: true, sourceUrl: "https://www.dfa.arkansas.gov/excise-tax/sales-and-use-tax/", dueDateDaysAfterPeriod: 20 },
  { stateCode: "CA", stateName: "California", hasGeneralSalesTax: true, sourceUrl: "https://www.cdtfa.ca.gov/taxes-and-fees/pay-sales-and-use-taxes.htm", dueDateDaysAfterPeriod: 30 },
  { stateCode: "CO", stateName: "Colorado", hasGeneralSalesTax: true, sourceUrl: "https://tax.colorado.gov/sales-tax-filing-information", dueDateDaysAfterPeriod: 20 },
  { stateCode: "CT", stateName: "Connecticut", hasGeneralSalesTax: true, sourceUrl: "https://portal.ct.gov/drs/electronic-filing/payment-options", dueDateDaysAfterPeriod: 30 },
  { stateCode: "DE", stateName: "Delaware", hasGeneralSalesTax: false, sourceUrl: "https://revenue.delaware.gov/business-tax-forms/", dueDateDaysAfterPeriod: 0 },
  { stateCode: "FL", stateName: "Florida", hasGeneralSalesTax: true, sourceUrl: "https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx", dueDateDaysAfterPeriod: 20 },
  { stateCode: "GA", stateName: "Georgia", hasGeneralSalesTax: true, sourceUrl: "https://dor.georgia.gov/sales-use-tax", dueDateDaysAfterPeriod: 20 },
  { stateCode: "HI", stateName: "Hawaii", hasGeneralSalesTax: true, sourceUrl: "https://tax.hawaii.gov/geninfo/get/", dueDateDaysAfterPeriod: 20 },
  { stateCode: "ID", stateName: "Idaho", hasGeneralSalesTax: true, sourceUrl: "https://tax.idaho.gov/taxes/sales-use/", dueDateDaysAfterPeriod: 20 },
  { stateCode: "IL", stateName: "Illinois", hasGeneralSalesTax: true, sourceUrl: "https://tax.illinois.gov/businesses/sales.html", dueDateDaysAfterPeriod: 20 },
  { stateCode: "IN", stateName: "Indiana", hasGeneralSalesTax: true, sourceUrl: "https://www.in.gov/dor/business-tax/sales-and-use-tax/", dueDateDaysAfterPeriod: 30 },
  { stateCode: "IA", stateName: "Iowa", hasGeneralSalesTax: true, sourceUrl: "https://tax.iowa.gov/sales-use-tax", dueDateDaysAfterPeriod: 31 },
  { stateCode: "KS", stateName: "Kansas", hasGeneralSalesTax: true, sourceUrl: "https://www.ksrevenue.gov/bustaxtypesales.html", dueDateDaysAfterPeriod: 25 },
  { stateCode: "KY", stateName: "Kentucky", hasGeneralSalesTax: true, sourceUrl: "https://revenue.ky.gov/Business/Sales-Use-Tax/Pages/default.aspx", dueDateDaysAfterPeriod: 20 },
  { stateCode: "LA", stateName: "Louisiana", hasGeneralSalesTax: true, sourceUrl: "https://revenue.louisiana.gov/SalesTax", dueDateDaysAfterPeriod: 20 },
  { stateCode: "ME", stateName: "Maine", hasGeneralSalesTax: true, sourceUrl: "https://www.maine.gov/revenue/taxes/sales-use-service-provider-tax", dueDateDaysAfterPeriod: 15 },
  { stateCode: "MD", stateName: "Maryland", hasGeneralSalesTax: true, sourceUrl: "https://www.marylandtaxes.gov/business/sales-use/", dueDateDaysAfterPeriod: 20 },
  { stateCode: "MA", stateName: "Massachusetts", hasGeneralSalesTax: true, sourceUrl: "https://www.mass.gov/sales-and-use-tax", dueDateDaysAfterPeriod: 30 },
  { stateCode: "MI", stateName: "Michigan", hasGeneralSalesTax: true, sourceUrl: "https://www.michigan.gov/taxes/business-taxes/sales-use-tax", dueDateDaysAfterPeriod: 20 },
  { stateCode: "MN", stateName: "Minnesota", hasGeneralSalesTax: true, sourceUrl: "https://www.revenue.state.mn.us/sales-and-use-tax", dueDateDaysAfterPeriod: 20 },
  { stateCode: "MS", stateName: "Mississippi", hasGeneralSalesTax: true, sourceUrl: "https://www.dor.ms.gov/taxes/sales-and-use-tax", dueDateDaysAfterPeriod: 20 },
  { stateCode: "MO", stateName: "Missouri", hasGeneralSalesTax: true, sourceUrl: "https://dor.mo.gov/taxation/business/tax-types/sales-use/", dueDateDaysAfterPeriod: 30 },
  { stateCode: "MT", stateName: "Montana", hasGeneralSalesTax: false, sourceUrl: "https://mtrevenue.gov/", dueDateDaysAfterPeriod: 0 },
  { stateCode: "NE", stateName: "Nebraska", hasGeneralSalesTax: true, sourceUrl: "https://revenue.nebraska.gov/businesses/sales-and-use-tax", dueDateDaysAfterPeriod: 20 },
  { stateCode: "NV", stateName: "Nevada", hasGeneralSalesTax: true, sourceUrl: "https://tax.nv.gov/Taxes/Sales_and_Use_Tax/", dueDateDaysAfterPeriod: 30 },
  { stateCode: "NH", stateName: "New Hampshire", hasGeneralSalesTax: false, sourceUrl: "https://www.revenue.nh.gov/", dueDateDaysAfterPeriod: 0 },
  { stateCode: "NJ", stateName: "New Jersey", hasGeneralSalesTax: true, sourceUrl: "https://www.nj.gov/treasury/taxation/salesusetax.shtml", dueDateDaysAfterPeriod: 20 },
  { stateCode: "NM", stateName: "New Mexico", hasGeneralSalesTax: true, sourceUrl: "https://www.tax.newmexico.gov/businesses/gross-receipts/", dueDateDaysAfterPeriod: 25 },
  { stateCode: "NY", stateName: "New York", hasGeneralSalesTax: true, sourceUrl: "https://www.tax.ny.gov/bus/st/sales_tax.htm", dueDateDaysAfterPeriod: 20 },
  { stateCode: "NC", stateName: "North Carolina", hasGeneralSalesTax: true, sourceUrl: "https://www.ncdor.gov/taxes-forms/sales-and-use-tax", dueDateDaysAfterPeriod: 20 },
  { stateCode: "ND", stateName: "North Dakota", hasGeneralSalesTax: true, sourceUrl: "https://www.tax.nd.gov/business/sales-use-and-special-taxes/sales-use-tax", dueDateDaysAfterPeriod: 30 },
  { stateCode: "OH", stateName: "Ohio", hasGeneralSalesTax: true, sourceUrl: "https://tax.ohio.gov/business/ohio-business-taxes/sales-and-use", dueDateDaysAfterPeriod: 23 },
  { stateCode: "OK", stateName: "Oklahoma", hasGeneralSalesTax: true, sourceUrl: "https://oklahoma.gov/tax/businesses/sales-and-use-tax.html", dueDateDaysAfterPeriod: 20 },
  { stateCode: "OR", stateName: "Oregon", hasGeneralSalesTax: false, sourceUrl: "https://www.oregon.gov/dor/pages/index.aspx", dueDateDaysAfterPeriod: 0 },
  { stateCode: "PA", stateName: "Pennsylvania", hasGeneralSalesTax: true, sourceUrl: "https://www.revenue.pa.gov/GeneralTaxInformation/Tax%20Types%20and%20Information/SUT/Pages/default.aspx", dueDateDaysAfterPeriod: 20 },
  { stateCode: "RI", stateName: "Rhode Island", hasGeneralSalesTax: true, sourceUrl: "https://tax.ri.gov/tax-sections/sales-excise-taxes", dueDateDaysAfterPeriod: 20 },
  { stateCode: "SC", stateName: "South Carolina", hasGeneralSalesTax: true, sourceUrl: "https://dor.sc.gov/tax/sales", dueDateDaysAfterPeriod: 20 },
  { stateCode: "SD", stateName: "South Dakota", hasGeneralSalesTax: true, sourceUrl: "https://dor.sd.gov/taxes/business-taxes/sales-use-tax/", dueDateDaysAfterPeriod: 20 },
  { stateCode: "TN", stateName: "Tennessee", hasGeneralSalesTax: true, sourceUrl: "https://www.tn.gov/revenue/taxes/sales-and-use-tax.html", dueDateDaysAfterPeriod: 20 },
  { stateCode: "TX", stateName: "Texas", hasGeneralSalesTax: true, sourceUrl: "https://comptroller.texas.gov/taxes/sales/", dueDateDaysAfterPeriod: 20 },
  { stateCode: "UT", stateName: "Utah", hasGeneralSalesTax: true, sourceUrl: "https://tax.utah.gov/sales", dueDateDaysAfterPeriod: 30 },
  { stateCode: "VT", stateName: "Vermont", hasGeneralSalesTax: true, sourceUrl: "https://tax.vermont.gov/business-and-corp/sales-and-use-tax", dueDateDaysAfterPeriod: 25 },
  { stateCode: "VA", stateName: "Virginia", hasGeneralSalesTax: true, sourceUrl: "https://www.tax.virginia.gov/sales-and-use-tax", dueDateDaysAfterPeriod: 20 },
  { stateCode: "WA", stateName: "Washington", hasGeneralSalesTax: true, sourceUrl: "https://dor.wa.gov/taxes-rates/retail-sales-tax", dueDateDaysAfterPeriod: 30 },
  { stateCode: "WV", stateName: "West Virginia", hasGeneralSalesTax: true, sourceUrl: "https://tax.wv.gov/Business/Pages/BusinessAndOccupationTax.aspx", dueDateDaysAfterPeriod: 20 },
  { stateCode: "WI", stateName: "Wisconsin", hasGeneralSalesTax: true, sourceUrl: "https://www.revenue.wi.gov/Pages/Businesses/SalesAndUse.aspx", dueDateDaysAfterPeriod: 30 },
  { stateCode: "WY", stateName: "Wyoming", hasGeneralSalesTax: true, sourceUrl: "https://revenue.wyo.gov/tax-programs/sales-use-tax", dueDateDaysAfterPeriod: 20 },
  { stateCode: "DC", stateName: "District of Columbia", hasGeneralSalesTax: true, sourceUrl: "https://otr.cfo.dc.gov/page/sales-and-use-tax", dueDateDaysAfterPeriod: 20 },
];

const LOW_CONFIDENCE_RULE_STATES = new Set([
  "AK",
  "HI",
  "LA",
  "MS",
  "NM",
  "TN",
  "WA",
]);

function toFilingRules(state: StateMeta): FilingRuleSeedRow[] {
  if (!state.hasGeneralSalesTax) {
    return [
      {
        stateCode: state.stateCode,
        filingFrequency: "ANNUAL",
        revenueThresholdForFrequency: null,
        dueDateDaysAfterPeriod: state.dueDateDaysAfterPeriod,
        notes: `No general statewide sales tax in ${state.stateName}. Keep row for scheduler compatibility and manual review. Source: ${state.sourceUrl}`,
        version: 1,
      },
    ];
  }

  return [
    {
      stateCode: state.stateCode,
      filingFrequency: "MONTHLY",
      revenueThresholdForFrequency: 10000,
      dueDateDaysAfterPeriod: state.dueDateDaysAfterPeriod,
      notes: `Baseline monthly cadence for higher-volume filers. State-specific registration assignments vary; verify against ${state.sourceUrl}.`,
      version: 1,
    },
    {
      stateCode: state.stateCode,
      filingFrequency: "QUARTERLY",
      revenueThresholdForFrequency: 2000,
      dueDateDaysAfterPeriod: state.dueDateDaysAfterPeriod,
      notes: `Baseline quarterly cadence for mid-volume filers. State-specific assignment thresholds vary; verify against ${state.sourceUrl}.`,
      version: 1,
    },
    {
      stateCode: state.stateCode,
      filingFrequency: "ANNUAL",
      revenueThresholdForFrequency: 0,
      dueDateDaysAfterPeriod: state.dueDateDaysAfterPeriod,
      notes: `Baseline annual cadence for low-volume filers. Filing assignment can change by state and product mix; consult your CPA.`,
      version: 1,
    },
  ];
}

export async function seedStateFilingRules(prisma: PrismaClient): Promise<number> {
  const rules = STATES.flatMap(toFilingRules);

  await prisma.stateFilingRule.deleteMany({ where: { version: 1 } });
  const result = await prisma.stateFilingRule.createMany({ data: rules });

  const lowConfidence = STATES.filter((state) =>
    LOW_CONFIDENCE_RULE_STATES.has(state.stateCode),
  ).map((state) => `${state.stateCode} (${state.stateName})`);
  if (lowConfidence.length > 0) {
    console.warn(
      `[seed/state_filing_rules] LOW confidence filing cadence states require manual verification: ${lowConfidence.join(", ")}`,
    );
  }

  return result.count;
}
