const INJECTION_PATTERNS = [
  /ignore all previous instructions/gi,
  /ignore previous instructions/gi,
  /system:/gi,
  /assistant:/gi,
  /human:/gi,
  /you are now/gi,
  /new instructions/gi,
];

export function sanitizeForPrompt(input: string): string {
  let output = input;
  output = output.replace(/`+/g, " ");
  output = output.replace(/<[^>]*>/g, " ");
  output = output.replace(/\r?\n+/g, " ");
  for (const pattern of INJECTION_PATTERNS) {
    output = output.replace(pattern, " ");
  }
  return output.replace(/\s+/g, " ").trim();
}
