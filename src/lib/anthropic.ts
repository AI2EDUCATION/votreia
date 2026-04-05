import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool, ContentBlock } from "@anthropic-ai/sdk/resources/messages";

// ============================================
// Model tiering strategy (from architecture doc)
// ============================================
export const MODELS = {
  /** Triage rapide, classification — ~0.80€/1000 tâches */
  fast: "claude-haiku-4-5-20251001",
  /** Rédaction, qualification, réponse — ~12€/1000 tâches */
  standard: "claude-sonnet-4-20250514",
  /** Analyse complexe, résumés longs — ~25€/1000 tâches */
  extended: "claude-sonnet-4-20250514",
} as const;

export type ModelTier = keyof typeof MODELS;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AgentCallOptions {
  model?: ModelTier;
  systemPrompt: string;
  messages: MessageParam[];
  tools?: Tool[];
  maxTokens?: number;
  temperature?: number;
}

export interface AgentCallResult {
  content: ContentBlock[];
  stopReason: string | null;
  tokensInput: number;
  tokensOutput: number;
  modelUsed: string;
  costCents: number;
}

/** Estimate cost in cents based on token usage and model */
function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Pricing per million tokens (approximate, EUR cents)
  const pricing: Record<string, { input: number; output: number }> = {
    [MODELS.fast]: { input: 80, output: 400 },
    [MODELS.standard]: { input: 300, output: 1500 },
  };
  const p = pricing[model] ?? pricing[MODELS.standard];
  return Math.ceil(
    (inputTokens * p.input + outputTokens * p.output) / 1_000_000
  );
}

export async function callAgent(options: AgentCallOptions): Promise<AgentCallResult> {
  const modelId = MODELS[options.model ?? "standard"];
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: modelId,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.3,
        system: options.systemPrompt,
        messages: options.messages,
        tools: options.tools,
      });

      return {
        content: response.content,
        stopReason: response.stop_reason,
        tokensInput: response.usage.input_tokens,
        tokensOutput: response.usage.output_tokens,
        modelUsed: modelId,
        costCents: estimateCost(
          modelId,
          response.usage.input_tokens,
          response.usage.output_tokens
        ),
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on auth errors or invalid requests
      const errorMessage = lastError.message.toLowerCase();
      if (
        errorMessage.includes("authentication") ||
        errorMessage.includes("invalid_api_key") ||
        errorMessage.includes("invalid_request")
      ) {
        throw lastError;
      }

      // Retry on rate limits and server errors
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(
          `[Anthropic] Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms:`,
          lastError.message
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error("Claude API call failed after retries");
}

/** Extract text from agent response */
export function extractText(content: ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

/** Extract tool use calls from agent response */
export function extractToolUse(content: ContentBlock[]) {
  return content.filter(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
}

export { client as anthropic };
