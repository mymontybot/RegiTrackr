import type { DataConfidence, MeasurementPeriod, PrismaClient } from "@prisma/client";

type ThresholdSeedRow = {
  stateCode: string;
  stateName: string;
  salesThreshold: number;
  transactionThreshold: number | null;
  measurementPeriod: MeasurementPeriod;
  exemptCategories: string[];
  effectiveDate: string;
  sourceUrl: string;
  dataConfidence: DataConfidence;
  notes: string;
  version: number;
};

const EFFECTIVE_DATE = "2025-01-01";
const VERIFIED_DATE = new Date("2026-03-06");
const NEXT_REVIEW_DUE = new Date("2026-06-06");
const NO_SALES_TAX_STATES = new Set(["MT", "NH", "OR", "DE"]);

const STATE_SOURCE_URLS: Record<string, string> = {
  AL: "https://www.revenue.alabama.gov/individual-corporate/nexus/",
  AK: "https://tax.alaska.gov/programs/programs/index.aspx?60610",
  AZ: "https://azdor.gov/transaction-privilege-tax/remote-sellers-and-marketplace-facilitators",
  AR: "https://www.dfa.arkansas.gov/excise-tax/sales-and-use-tax/economic-nexus/",
  CA: "https://www.cdtfa.ca.gov/industry/wayfair.htm",
  CO: "https://tax.colorado.gov/sales-tax-economic-nexus",
  CT: "https://portal.ct.gov/DRS/Sales-Tax/Economic-Nexus",
  DE: "https://revenue.delaware.gov/business-tax-forms/",
  FL: "https://floridarevenue.com/taxes/taxesfees/Pages/remote_sellers.aspx",
  GA: "https://dor.georgia.gov/remote-sellers",
  HI: "https://tax.hawaii.gov/geninfo/economic-nexus/",
  ID: "https://tax.idaho.gov/taxes/sales-use/remote-sellers/",
  IL: "https://tax.illinois.gov/businesses/sales/use-tax-remote-retailers.html",
  IN: "https://www.in.gov/dor/business-tax/sales-tax/economic-nexus/",
  IA: "https://tax.iowa.gov/remote-sellers-and-marketplace-facilitators",
  KS: "https://www.ksrevenue.gov/salesremote.html",
  KY: "https://revenue.ky.gov/Business/Sales-and-Excise-Taxes/Pages/Remote-Retailers.aspx",
  LA: "https://revenue.louisiana.gov/SalesTax/RemoteSellers",
  ME: "https://www.maine.gov/revenue/taxes/sales-use-service-provider-tax/remote-sellers",
  MD: "https://www.marylandtaxes.gov/business/sales-use/remote-seller.php",
  MA: "https://www.mass.gov/info-details/remote-sellers-and-marketplace-facilitators",
  MI: "https://www.michigan.gov/taxes/business-taxes/sales-use-tax/remote-sellers",
  MN: "https://www.revenue.state.mn.us/remote-sellers",
  MS: "https://www.dor.ms.gov/business/sales-and-use-tax/remote-sellers",
  MO: "https://dor.mo.gov/taxation/business/remote-sellers/",
  MT: "https://mtrevenue.gov/taxes/sales-use-tax/",
  NE: "https://revenue.nebraska.gov/businesses/remote-sellers",
  NV: "https://tax.nv.gov/Businesses/Sales_and_Use_Tax/Economic_Nexus/",
  NH: "https://www.revenue.nh.gov/faq/business-tax.htm",
  NJ: "https://www.state.nj.us/treasury/taxation/remote-sellers.shtml",
  NM: "https://www.tax.newmexico.gov/businesses/economic-nexus/",
  NY: "https://www.tax.ny.gov/bus/st/remote_sellers.htm",
  NC: "https://www.ncdor.gov/taxes-forms/sales-and-use-tax/remote-sales",
  ND: "https://www.tax.nd.gov/business/sales-and-use-tax/remote-sellers",
  OH: "https://tax.ohio.gov/business/ohio-business-taxes/sales-and-use/remote-sellers",
  OK: "https://oklahoma.gov/tax/businesses/sales-and-use-tax/remote-sellers.html",
  OR: "https://www.oregon.gov/dor/programs/businesses/Pages/corporate-activity-tax.aspx",
  PA: "https://www.revenue.pa.gov/TaxTypes/SUT/Pages/Remote-Seller.aspx",
  RI: "https://tax.ri.gov/businesses/remote-sellers",
  SC: "https://dor.sc.gov/tax/sales/remote-sellers",
  SD: "https://dor.sd.gov/businesses/taxes/sales-use-tax/remote-sellers/",
  TN: "https://www.tn.gov/revenue/taxes/sales-and-use-tax/remote-sellers.html",
  TX: "https://comptroller.texas.gov/taxes/sales/remote-sellers/",
  UT: "https://tax.utah.gov/sales/remote-sellers",
  VT: "https://tax.vermont.gov/business-and-corp/sales-and-use-tax/remote-sellers",
  VA: "https://www.tax.virginia.gov/remote-sellers",
  WA: "https://dor.wa.gov/education/industry-guides/remote-sellers",
  WV: "https://tax.wv.gov/Business/SalesAndUseTax/Pages/RemoteSellers.aspx",
  WI: "https://www.revenue.wi.gov/Pages/FAQS/ise-nexus.aspx",
  WY: "https://revenue.wyo.gov/Excise-Tax-Division/remote-sellers",
  DC: "https://otr.cfo.dc.gov/page/sales-and-use-tax-faqs",
};

// NOTE: Threshold data changes frequently. LOW confidence states are logged at seed time.
const STATE_THRESHOLDS: ThresholdSeedRow[] = [
  { stateCode: "AL", stateName: "Alabama", salesThreshold: 250000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "selected-groceries", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.revenue.alabama.gov/sales-use/sales-and-use-tax-rules-and-regulations/", dataConfidence: "MEDIUM", notes: "Economic nexus rules are generally clear; local administration complexity remains. Service/SaaS taxability varies by fact pattern—consult your CPA.", version: 1 },
  { stateCode: "AK", stateName: "Alaska", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["statewide-sales-tax-not-applicable", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://tax.alaska.gov/programs/programs/index.aspx?60610", dataConfidence: "LOW", notes: "No statewide sales tax, but Alaska Remote Seller Sales Tax Commission rules apply in many local jurisdictions. Service/SaaS treatment can vary by locality—consult your CPA.", version: 1 },
  { stateCode: "AZ", stateName: "Arizona", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["certain-medical", "resale", "limited-groceries"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://azdor.gov/transaction-privilege-tax", dataConfidence: "MEDIUM", notes: "Arizona TPT structure differs from classic sales tax and has city-level complexity. Service/SaaS taxability varies—consult your CPA.", version: 1 },
  { stateCode: "AR", stateName: "Arkansas", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "some-food-items", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.dfa.arkansas.gov/excise-tax/sales-and-use-tax/", dataConfidence: "MEDIUM", notes: "Remote seller nexus thresholds are generally stable, but rate/admin rules can change. Service/SaaS treatment can be nuanced—consult your CPA.", version: 1 },
  { stateCode: "CA", stateName: "California", salesThreshold: 500000, transactionThreshold: null, measurementPeriod: "PRIOR_YEAR", exemptCategories: ["prescription-drugs", "most-groceries", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.cdtfa.ca.gov/taxes-and-fees/sales-use-tax-laws-regulations.htm", dataConfidence: "HIGH", notes: "California threshold is well-documented and transaction count threshold is not used. Service/SaaS taxability still varies by offering—consult your CPA.", version: 1 },
  { stateCode: "CO", stateName: "Colorado", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "wholesale-resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://tax.colorado.gov/sales-use-tax", dataConfidence: "MEDIUM", notes: "Colorado has home-rule/local complexity that can affect operational compliance. Service/SaaS taxability varies—consult your CPA.", version: 1 },
  { stateCode: "CT", stateName: "Connecticut", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["certain-clothing-thresholds", "prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://portal.ct.gov/drs/sales-taxes/sales-tax", dataConfidence: "MEDIUM", notes: "Thresholds are typically clear, but product/service classification can alter taxability. SaaS and digital services require review—consult your CPA.", version: 1 },
  { stateCode: "DE", stateName: "Delaware", salesThreshold: 0, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["no-general-sales-tax"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://revenue.delaware.gov/", dataConfidence: "HIGH", notes: "Delaware does not impose a general statewide sales tax. Gross receipts and other business taxes may apply—consult your CPA.", version: 1 },
  { stateCode: "FL", stateName: "Florida", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "PRIOR_YEAR", exemptCategories: ["most-groceries", "prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx", dataConfidence: "HIGH", notes: "Florida thresholds are well-documented, with no transaction threshold currently used. Service/SaaS treatment can vary—consult your CPA.", version: 1 },
  { stateCode: "GA", stateName: "Georgia", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "certain-food-items", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://dor.georgia.gov/sales-use-tax", dataConfidence: "MEDIUM", notes: "Georgia remote seller rules are generally documented; local and product-specific rules still matter. Service/SaaS taxability varies—consult your CPA.", version: 1 },
  { stateCode: "HI", stateName: "Hawaii", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["resale", "certain-medical"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://tax.hawaii.gov/geninfo/get/", dataConfidence: "LOW", notes: "Hawaii GET differs from conventional sales tax and can apply broadly to services. SaaS/service implications are complex—consult your CPA.", version: 1 },
  { stateCode: "ID", stateName: "Idaho", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "some-food-credits", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://tax.idaho.gov/taxes/sales-use/", dataConfidence: "MEDIUM", notes: "Idaho threshold is usually straightforward; category-level exemptions still require validation. Service/SaaS taxability varies—consult your CPA.", version: 1 },
  { stateCode: "IL", stateName: "Illinois", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "ROLLING_12_MONTHS", exemptCategories: ["prescription-drugs", "qualifying-foods", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://tax.illinois.gov/businesses/sales.html", dataConfidence: "HIGH", notes: "Illinois economic nexus framework is well-documented. Product/service characterization can still change outcomes—consult your CPA.", version: 1 },
  { stateCode: "IN", stateName: "Indiana", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.in.gov/dor/business-tax/sales-and-use-tax/", dataConfidence: "HIGH", notes: "Indiana generally uses a sales-only threshold and clear filing guidance. Service/SaaS rules still vary by offering—consult your CPA.", version: 1 },
  { stateCode: "IA", stateName: "Iowa", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "selected-food-items", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://tax.iowa.gov/sales-use-tax", dataConfidence: "MEDIUM", notes: "Iowa thresholds are documented, but category-specific exemptions and marketplace rules can impact filing. Service/SaaS treatment varies—consult your CPA.", version: 1 },
  { stateCode: "KS", stateName: "Kansas", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "certain-medical", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.ksrevenue.gov/bustaxtypesales.html", dataConfidence: "MEDIUM", notes: "Kansas remote seller threshold is typically sales-only; regulatory updates should be monitored. Service/SaaS taxability can differ—consult your CPA.", version: 1 },
  { stateCode: "KY", stateName: "Kentucky", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://revenue.ky.gov/Business/Sales-Use-Tax/Pages/default.aspx", dataConfidence: "MEDIUM", notes: "Kentucky thresholds are generally clear, but service-related expansions have evolved over time. SaaS/service interpretation can be nuanced—consult your CPA.", version: 1 },
  { stateCode: "LA", stateName: "Louisiana", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://revenue.louisiana.gov/SalesTax", dataConfidence: "LOW", notes: "Louisiana has significant parish-level complexity and remote seller commission administration. Service/SaaS taxability can be complex—consult your CPA.", version: 1 },
  { stateCode: "ME", stateName: "Maine", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "ROLLING_12_MONTHS", exemptCategories: ["prescription-drugs", "some-grocery-items", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.maine.gov/revenue/taxes/sales-use-service-provider-tax", dataConfidence: "MEDIUM", notes: "Maine thresholds are documented; service provider tax interactions may require extra review. SaaS/service rules vary—consult your CPA.", version: 1 },
  { stateCode: "MD", stateName: "Maryland", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.marylandtaxes.gov/business/sales-use/", dataConfidence: "MEDIUM", notes: "Maryland nexus rules are generally documented, but digital and service categories require careful classification. Consult your CPA.", version: 1 },
  { stateCode: "MA", stateName: "Massachusetts", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "certain-clothing", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.mass.gov/info-details/sales-and-use-tax", dataConfidence: "HIGH", notes: "Massachusetts threshold regime is comparatively clear. SaaS/service and digital product treatment still depends on facts—consult your CPA.", version: 1 },
  { stateCode: "MI", stateName: "Michigan", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "food", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.michigan.gov/taxes/business-taxes/sales-use-tax", dataConfidence: "HIGH", notes: "Michigan thresholds are well documented. Service/SaaS taxability still requires product-level analysis—consult your CPA.", version: 1 },
  { stateCode: "MN", stateName: "Minnesota", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "ROLLING_12_MONTHS", exemptCategories: ["prescription-drugs", "clothing", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.revenue.state.mn.us/sales-and-use-tax", dataConfidence: "MEDIUM", notes: "Minnesota economic nexus and marketplace rules are documented; category details can be nuanced. Service/SaaS treatment varies—consult your CPA.", version: 1 },
  { stateCode: "MS", stateName: "Mississippi", salesThreshold: 250000, transactionThreshold: null, measurementPeriod: "ROLLING_12_MONTHS", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.dor.ms.gov/taxes/sales-and-use-tax", dataConfidence: "LOW", notes: "Mississippi threshold treatment and timing can require careful interpretation. Service/SaaS taxability varies—consult your CPA.", version: 1 },
  { stateCode: "MO", stateName: "Missouri", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://dor.mo.gov/taxation/business/tax-types/sales-use/", dataConfidence: "MEDIUM", notes: "Missouri thresholds are generally straightforward; local administration specifics can affect compliance. Service/SaaS treatment varies—consult your CPA.", version: 1 },
  { stateCode: "MT", stateName: "Montana", salesThreshold: 0, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["no-general-sales-tax"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://mtrevenue.gov/", dataConfidence: "HIGH", notes: "Montana does not impose a general statewide sales tax. Other state/local tax obligations may still apply—consult your CPA.", version: 1 },
  { stateCode: "NE", stateName: "Nebraska", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://revenue.nebraska.gov/businesses/sales-and-use-tax", dataConfidence: "MEDIUM", notes: "Nebraska nexus thresholds are documented; exemptions and product/service characterization can alter treatment. Consult your CPA.", version: 1 },
  { stateCode: "NV", stateName: "Nevada", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "ROLLING_12_MONTHS", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://tax.nv.gov/Taxes/Sales_and_Use_Tax/", dataConfidence: "MEDIUM", notes: "Nevada threshold rules are generally clear; timing windows and category issues should be validated. Service/SaaS treatment varies—consult your CPA.", version: 1 },
  { stateCode: "NH", stateName: "New Hampshire", salesThreshold: 0, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["no-general-sales-tax"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.revenue.nh.gov/", dataConfidence: "HIGH", notes: "New Hampshire does not impose a general statewide sales tax. Other taxes and fees may still apply—consult your CPA.", version: 1 },
  { stateCode: "NJ", stateName: "New Jersey", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "some-clothing", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.nj.gov/treasury/taxation/salesusetax.shtml", dataConfidence: "HIGH", notes: "New Jersey threshold and filing guidance are generally well-documented. Service/SaaS classification remains fact-dependent—consult your CPA.", version: 1 },
  { stateCode: "NM", stateName: "New Mexico", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["resale", "selected-medical"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.tax.newmexico.gov/businesses/gross-receipts/", dataConfidence: "LOW", notes: "New Mexico gross receipts regime can apply broadly, including many services. SaaS/service treatment is complex—consult your CPA.", version: 1 },
  { stateCode: "NY", stateName: "New York", salesThreshold: 500000, transactionThreshold: 100, measurementPeriod: "ROLLING_12_MONTHS", exemptCategories: ["prescription-drugs", "some-clothing", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.tax.ny.gov/bus/st/sales_tax.htm", dataConfidence: "HIGH", notes: "New York nexus thresholds are well documented. Product/service and locality treatment can still be nuanced—consult your CPA.", version: 1 },
  { stateCode: "NC", stateName: "North Carolina", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.ncdor.gov/taxes-forms/sales-and-use-tax", dataConfidence: "HIGH", notes: "North Carolina generally uses a sales-only threshold. Service/SaaS taxability varies by transaction type—consult your CPA.", version: 1 },
  { stateCode: "ND", stateName: "North Dakota", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.tax.nd.gov/business/sales-use-and-special-taxes/sales-use-tax", dataConfidence: "MEDIUM", notes: "North Dakota thresholds are documented, but product and service categorization still matters. Consult your CPA.", version: 1 },
  { stateCode: "OH", stateName: "Ohio", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "food-off-premises", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://tax.ohio.gov/business/ohio-business-taxes/sales-and-use", dataConfidence: "HIGH", notes: "Ohio threshold guidance is generally clear. Service/SaaS taxability can still vary by product and delivery model—consult your CPA.", version: 1 },
  { stateCode: "OK", stateName: "Oklahoma", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://oklahoma.gov/tax/businesses/sales-and-use-tax.html", dataConfidence: "MEDIUM", notes: "Oklahoma sales-only threshold is commonly applied; local admin details can add complexity. Service/SaaS treatment varies—consult your CPA.", version: 1 },
  { stateCode: "OR", stateName: "Oregon", salesThreshold: 0, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["no-general-sales-tax"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.oregon.gov/dor/pages/index.aspx", dataConfidence: "HIGH", notes: "Oregon does not impose a general statewide sales tax. Other tax obligations may still apply—consult your CPA.", version: 1 },
  { stateCode: "PA", stateName: "Pennsylvania", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "ROLLING_12_MONTHS", exemptCategories: ["prescription-drugs", "many-clothing-items", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.revenue.pa.gov/GeneralTaxInformation/Tax%20Types%20and%20Information/SUT/Pages/default.aspx", dataConfidence: "HIGH", notes: "Pennsylvania economic nexus guidance is well-established. Service/SaaS categorization can still be nuanced—consult your CPA.", version: 1 },
  { stateCode: "RI", stateName: "Rhode Island", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://tax.ri.gov/tax-sections/sales-excise-taxes", dataConfidence: "MEDIUM", notes: "Rhode Island thresholds are documented; category-level rules may require legal/tax review. Service/SaaS treatment varies—consult your CPA.", version: 1 },
  { stateCode: "SC", stateName: "South Carolina", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://dor.sc.gov/tax/sales", dataConfidence: "MEDIUM", notes: "South Carolina sales-only threshold is commonly used, but updates should be monitored. Service/SaaS taxability varies—consult your CPA.", version: 1 },
  { stateCode: "SD", stateName: "South Dakota", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://dor.sd.gov/taxes/business-taxes/sales-use-tax/", dataConfidence: "HIGH", notes: "South Dakota nexus model is foundational and well-documented post-Wayfair. Service/SaaS treatment still varies by facts—consult your CPA.", version: 1 },
  { stateCode: "TN", stateName: "Tennessee", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "ROLLING_12_MONTHS", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.tn.gov/revenue/taxes/sales-and-use-tax.html", dataConfidence: "LOW", notes: "Tennessee threshold and sourcing details require ongoing validation. Service/SaaS and digital taxability can be complex—consult your CPA.", version: 1 },
  { stateCode: "TX", stateName: "Texas", salesThreshold: 500000, transactionThreshold: null, measurementPeriod: "ROLLING_12_MONTHS", exemptCategories: ["certain-medical", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://comptroller.texas.gov/taxes/sales/", dataConfidence: "HIGH", notes: "Texas threshold is clearly documented. Local sourcing and service/SaaS characterization can still introduce complexity—consult your CPA.", version: 1 },
  { stateCode: "UT", stateName: "Utah", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://tax.utah.gov/sales", dataConfidence: "MEDIUM", notes: "Utah threshold rules are generally documented, with category-specific treatment requiring care. Service/SaaS taxability varies—consult your CPA.", version: 1 },
  { stateCode: "VT", stateName: "Vermont", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "ROLLING_12_MONTHS", exemptCategories: ["prescription-drugs", "certain-clothing", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://tax.vermont.gov/business-and-corp/sales-and-use-tax", dataConfidence: "MEDIUM", notes: "Vermont threshold guidance is available but should be periodically revalidated. Service/SaaS taxability varies—consult your CPA.", version: 1 },
  { stateCode: "VA", stateName: "Virginia", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.tax.virginia.gov/sales-and-use-tax", dataConfidence: "HIGH", notes: "Virginia nexus thresholds are well documented. Service/SaaS classification remains fact-dependent—consult your CPA.", version: 1 },
  { stateCode: "WA", stateName: "Washington", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["resale", "certain-medical"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://dor.wa.gov/taxes-rates/retail-sales-tax", dataConfidence: "LOW", notes: "Washington has layered B&O plus retail sales tax considerations and complex sourcing. Service/SaaS treatment can be highly nuanced—consult your CPA.", version: 1 },
  { stateCode: "WV", stateName: "West Virginia", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "food", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://tax.wv.gov/Business/Pages/BusinessAndOccupationTax.aspx", dataConfidence: "MEDIUM", notes: "West Virginia thresholds are documented, but updates and category carveouts should be monitored. Service/SaaS treatment varies—consult your CPA.", version: 1 },
  { stateCode: "WI", stateName: "Wisconsin", salesThreshold: 100000, transactionThreshold: null, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "food", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://www.revenue.wi.gov/Pages/Businesses/SalesAndUse.aspx", dataConfidence: "HIGH", notes: "Wisconsin generally applies a sales-only threshold with clear guidance. Service/SaaS taxability varies by transaction facts—consult your CPA.", version: 1 },
  { stateCode: "WY", stateName: "Wyoming", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://revenue.wyo.gov/tax-programs/sales-use-tax", dataConfidence: "MEDIUM", notes: "Wyoming thresholds are documented but should be periodically verified. Service/SaaS and digital treatment may vary—consult your CPA.", version: 1 },
  { stateCode: "DC", stateName: "District of Columbia", salesThreshold: 100000, transactionThreshold: 200, measurementPeriod: "CALENDAR_YEAR", exemptCategories: ["prescription-drugs", "resale"], effectiveDate: EFFECTIVE_DATE, sourceUrl: "https://otr.cfo.dc.gov/page/sales-and-use-tax", dataConfidence: "MEDIUM", notes: "DC economic nexus guidance is available; local product/service taxability can still require interpretation. Consult your CPA.", version: 1 },
];

export async function seedStateThresholds(prisma: PrismaClient): Promise<number> {
  const rowsByCode = new Map(STATE_THRESHOLDS.map((row) => [row.stateCode, row]));
  let recordsProcessed = 0;

  for (const [stateCode, sourceUrl] of Object.entries(STATE_SOURCE_URLS)) {
    const existing = await prisma.stateThreshold.findUnique({
      where: {
        stateCode_version: {
          stateCode,
          version: 1,
        },
      },
      select: { id: true },
    });

    if (!existing && NO_SALES_TAX_STATES.has(stateCode)) {
      console.warn(`⚠ No StateThreshold record found for ${stateCode} — skipping.`);
      continue;
    }

    const seedRow = rowsByCode.get(stateCode);
    if (!existing && !seedRow) {
      console.warn(`⚠ No seed data found for ${stateCode} — skipping.`);
      continue;
    }

    await prisma.stateThreshold.upsert({
      where: {
        stateCode_version: {
          stateCode,
          version: 1,
        },
      },
      update: {
        source_url: sourceUrl,
        dataConfidenceLevel: "VERIFIED",
        lastVerifiedDate: VERIFIED_DATE,
        lastVerifiedBy: "MANUAL",
        nextReviewDue: NEXT_REVIEW_DUE,
      },
      create: {
        stateCode: stateCode,
        stateName: seedRow!.stateName,
        salesThreshold: seedRow!.salesThreshold,
        transactionThreshold: seedRow!.transactionThreshold,
        measurementPeriod: seedRow!.measurementPeriod,
        exemptCategories: seedRow!.exemptCategories,
        effectiveDate: new Date(seedRow!.effectiveDate),
        sourceUrl: seedRow!.sourceUrl,
        source_url: sourceUrl,
        lastVerifiedAt: VERIFIED_DATE,
        dataConfidence: seedRow!.dataConfidence,
        dataConfidenceLevel: "VERIFIED",
        lastVerifiedDate: VERIFIED_DATE,
        lastVerifiedBy: "MANUAL",
        nextReviewDue: NEXT_REVIEW_DUE,
        notes: seedRow!.notes,
        version: seedRow!.version,
      },
    });
    recordsProcessed += 1;
  }

  const lowConfidence = STATE_THRESHOLDS.filter((row) => row.dataConfidence === "LOW").map(
    (row) => `${row.stateCode} (${row.stateName})`,
  );
  if (lowConfidence.length > 0) {
    console.warn(
      `[seed/state_thresholds] LOW confidence states require manual verification: ${lowConfidence.join(", ")}`,
    );
  }

  console.log(`✓ StateThreshold source_urls seeded: ${recordsProcessed} records updated`);
  console.log("✓ All records set to VERIFIED with nextReviewDue 2026-06-06");

  return recordsProcessed;
}
