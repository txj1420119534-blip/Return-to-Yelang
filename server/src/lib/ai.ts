import Anthropic from '@anthropic-ai/sdk';
import { z, ZodTypeAny } from 'zod';

const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 3000);

const client = apiKey ? new Anthropic({ apiKey }) : null;

export interface CallAIArgs<T extends ZodTypeAny> {
  /** Zod schema for the expected JSON response */
  schema: T;
  /** System prompt for role/style */
  system?: string;
  /** User prompt */
  prompt: string;
  /** Timeout override in ms */
  timeoutMs?: number;
  /** Deterministic fallback if AI fails/times out/schema mismatches */
  fallback: z.infer<T>;
  /** Max tokens */
  maxTokens?: number;
}

export interface CallAIResult<T> {
  data: T;
  usedFallback: boolean;
  reason?: 'NO_KEY' | 'TIMEOUT' | 'PARSE' | 'HTTP' | 'SCHEMA';
}

/** 统一 AI 调用封装：3s 超时 + zod 校验 + 模板兜底。所有 AI 场景必须走此函数。 */
export async function callAI<T extends ZodTypeAny>(
  args: CallAIArgs<T>
): Promise<CallAIResult<z.infer<T>>> {
  const { schema, prompt, system, fallback } = args;
  const timeoutMs = args.timeoutMs ?? TIMEOUT_MS;
  const maxTokens = args.maxTokens ?? 512;

  if (!client) {
    return { data: fallback, usedFallback: true, reason: 'NO_KEY' };
  }

  let timer: NodeJS.Timeout | undefined;
  try {
    const call = client.messages.create({
      model,
      max_tokens: maxTokens,
      system:
        (system ?? '') +
        '\n\n严格返回单个 JSON 对象，不要解释，不要包裹 markdown 代码块。',
      messages: [{ role: 'user', content: prompt }]
    });

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    });

    const res = (await Promise.race([call, timeout])) as Awaited<typeof call>;

    // 拼接所有 text block
    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n')
      .trim();

    // 剥离可能的 ```json ... ``` 包裹
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return { data: fallback, usedFallback: true, reason: 'PARSE' };
    }

    const check = schema.safeParse(parsed);
    if (!check.success) {
      return { data: fallback, usedFallback: true, reason: 'SCHEMA' };
    }
    return { data: check.data as z.infer<T>, usedFallback: false };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const reason = msg === 'TIMEOUT' ? 'TIMEOUT' : 'HTTP';
    return { data: fallback, usedFallback: true, reason };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
