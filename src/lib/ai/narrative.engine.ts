import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { narrativeInputSchema, narrativeOutputSchema, type NarrativeInput, type NarrativeOutput, NARRATIVE_DISCLAIMER } from "../validators/narrative.schemas";

const MODEL_ID = "claude-sonnet-4-6";

const modelNarrativeResponseSchema = z.object({
  summaryText: z.string(),
  highlights: z.tuple([z.string(), z.string(), z.string()]),
  dataQualityFlags: z.array(z.string()),
  disclaimer: z.literal(NARRATIVE_DISCLAIMER),
});

async function getSystemPrompt(): Promise<string> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const promptPath = path.join(process.cwd(), "src/lib/ai/prompts/narrative.system.md");
  return fs.readFile(promptPath, "utf8");
}

export async function callAnthropicNarrative(
  systemPrompt: string,
  input: NarrativeInput,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }
  const client = new Anthropic({ apiKey });
  const result = await client.messages.create({
    model: MODEL_ID,
    max_tokens: 800,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content:
          "Return strict JSON with keys: summaryText, highlights (exactly 3 strings), dataQualityFlags, disclaimer. Input:\n" +
          JSON.stringify(input),
      },
    ],
  });

  const textPart = result.content.find((c) => c.type === "text");
  return textPart?.text ?? "";
}

export const narrativeEngineDeps: {
  callAnthropicNarrative: (
    systemPrompt: string,
    input: NarrativeInput,
  ) => Promise<string>;
} = {
  callAnthropicNarrative,
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function parseJsonPayload(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

export async function generateNarrative(input: NarrativeInput): Promise<NarrativeOutput | null> {
  const parsedInput = narrativeInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return null;
  }

  try {
    const systemPrompt = await getSystemPrompt();
    const raw = await narrativeEngineDeps.callAnthropicNarrative(systemPrompt, parsedInput.data);
    const parsed = parseJsonPayload(raw);
    if (!parsed) return null;

    const parsedModelOutput = modelNarrativeResponseSchema.safeParse(parsed);
    if (!parsedModelOutput.success) {
      return null;
    }

    const maybeSummary = parsedModelOutput.data.summaryText;
    const count = wordCount(maybeSummary);
    if (count < 150 || count > 250) {
      console.warn(`Narrative word count outside target range: ${count}`);
    }

    const payload: NarrativeOutput = {
      success: true,
      summaryText: maybeSummary,
      highlights: parsedModelOutput.data.highlights,
      dataQualityFlags: parsedModelOutput.data.dataQualityFlags,
      disclaimer: parsedModelOutput.data.disclaimer,
      generatedAt: new Date().toISOString(),
      modelId: MODEL_ID,
      cached: false,
    };

    const validated = narrativeOutputSchema.safeParse(payload);
    if (!validated.success) {
      return null;
    }
    return validated.data;
  } catch {
    return null;
  }
}

export async function generateDigestSentence(input: NarrativeInput): Promise<string | null> {
  const parsedInput = narrativeInputSchema.safeParse(input);
  if (!parsedInput.success) return null;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    const client = new Anthropic({ apiKey });
    const result = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 120,
      system:
        "Write one direct sentence for CPA staff. Use only provided JSON facts. No disclaimer. No extra lines.",
      messages: [
        {
          role: "user",
          content: JSON.stringify(parsedInput.data),
        },
      ],
    });
    const textPart = result.content.find((c) => c.type === "text");
    const text = textPart?.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}
