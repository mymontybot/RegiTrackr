export type CachedNarrative = {
  summaryText: string;
  highlights: [string, string, string];
  dataQualityFlags: string[];
  generatedAt: string;
  modelId: string;
  inputHash: string;
};
