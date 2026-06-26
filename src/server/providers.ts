/**
 * Provider abstraction for BYOK (Bring Your Own Key) multi-provider support.
 *
 * Keys are NEVER stored or logged server-side. Every request carries the
 * user's provider + model + apiKey, and this module forwards to the chosen
 * provider. The server is a thin proxy: it keeps keys out of the browser
 * bundle (they travel per-request over HTTPS) without persisting them.
 *
 * Capabilities per provider:
 *   - text:  chat + JSON generation  (OpenAI, Anthropic, Gemini)
 *   - image: image generation        (OpenAI, Gemini)
 *   - video: video generation        (Gemini only)
 */
import { GoogleGenAI } from '@google/genai';

export type Capability = 'text' | 'image' | 'video';
export type ProviderId = 'gemini' | 'openai' | 'anthropic';

export interface ModelInfo {
  id: string;
  label: string;
  capabilities: Capability[];
}

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  capabilities: Capability[];
  models: ModelInfo[];
  /** URL where a user can get an API key (shown in the UI). */
  keyUrl: string;
}

/**
 * Provider + model catalog. The UI fetches this via GET /api/providers so the
 * picker is data-driven — add a model here and it shows up in the dropdown.
 *
 * NOTE: model ids should be verified against each provider's live API. The
 * Gemini ids match Google's docs as of 2026-06; OpenAI/Anthropic ids are the
 * current stable lines — adjust if a provider deprecates one.
 */
export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    capabilities: ['text', 'image', 'video'],
    keyUrl: 'https://aistudio.google.com/apikey',
    models: [
      { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', capabilities: ['text'] },
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', capabilities: ['text'] },
      { id: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image', capabilities: ['image'] },
      { id: 'veo-3.1-generate-preview', label: 'Veo 3.1 (video)', capabilities: ['video'] },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    capabilities: ['text', 'image'],
    keyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o', capabilities: ['text'] },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', capabilities: ['text'] },
      { id: 'gpt-image-1', label: 'GPT Image 1', capabilities: ['image'] },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    capabilities: ['text'],
    keyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-sonnet-4', label: 'Claude Sonnet 4', capabilities: ['text'] },
      { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', capabilities: ['text'] },
    ],
  },
];

export function getProvider(id: string): ProviderInfo | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export interface AICreds {
  provider: ProviderId;
  model: string;
  apiKey: string;
}

/** Pull + validate {provider, model, apiKey} from a request body/headers. */
export function extractCreds(req: any): AICreds {
  const provider = (req.body?.provider || req.headers['x-provider'] || '').toString().trim();
  const model = (req.body?.model || req.headers['x-model'] || '').toString().trim();
  const apiKey = (req.body?.apiKey || req.headers['x-api-key'] || '').toString().trim();
  if (!provider) throw new HttpError(400, 'Missing "provider"');
  if (!getProvider(provider)) throw new HttpError(400, `Unknown provider "${provider}"`);
  if (!apiKey) throw new HttpError(401, 'Missing API key — set one in Settings');
  if (!model) throw new HttpError(400, 'Missing "model"');
  return { provider: provider as ProviderId, model, apiKey };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Strip markdown fences and safely parse JSON from a model response. */
export function safeJsonParse<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback;
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) text = fence[1].trim();
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Unified TEXT generation
// ---------------------------------------------------------------------------

export interface ChatTurn {
  role: 'user' | 'model' | 'assistant' | 'system';
  parts?: { text: string }[];
  content?: string;
}

export interface TextRequest {
  creds: AICreds;
  system?: string;
  /** Prior conversation turns (optional). */
  history?: ChatTurn[];
  /** The new user message. */
  message: string;
  /** Ask the model to return JSON. */
  json?: boolean;
}

/** Normalize mixed history shapes to {role, text}. */
function normalizeHistory(history: ChatTurn[] = []): { role: string; text: string }[] {
  return history.map((t) => ({
    role: t.role === 'assistant' ? 'model' : t.role,
    text: t.content ?? t.parts?.map((p) => p.text).join('') ?? '',
  }));
}

export async function generateText(reqData: TextRequest): Promise<string> {
  const { creds, system, history, message, json } = reqData;
  switch (creds.provider) {
    case 'gemini':
      return geminiText(creds, system, history, message, json);
    case 'openai':
      return openaiText(creds, system, history, message, json);
    case 'anthropic':
      return anthropicText(creds, system, history, message, json);
    default:
      throw new HttpError(400, `Provider ${creds.provider} cannot generate text`);
  }
}

async function geminiText(
  creds: AICreds, system: string | undefined,
  history: ChatTurn[] | undefined, message: string, json?: boolean,
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: creds.apiKey });
  const contents = [
    ...normalizeHistory(history).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: message }] },
  ];
  const response = await ai.models.generateContent({
    model: creds.model,
    contents,
    config: {
      ...(system ? { systemInstruction: system } : {}),
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  });
  return response.text ?? '';
}

async function openaiText(
  creds: AICreds, system: string | undefined,
  history: ChatTurn[] | undefined, message: string, json?: boolean,
): Promise<string> {
  const messages: any[] = [];
  if (system) messages.push({ role: 'system', content: system });
  for (const h of normalizeHistory(history)) {
    messages.push({ role: h.role === 'model' ? 'assistant' : h.role, content: h.text });
  }
  messages.push({ role: 'user', content: message });

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creds.apiKey}`,
    },
    body: JSON.stringify({
      model: creds.model,
      messages,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!resp.ok) throw new HttpError(resp.status, `OpenAI error: ${await resp.text()}`);
  const data: any = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function anthropicText(
  creds: AICreds, system: string | undefined,
  history: ChatTurn[] | undefined, message: string, json?: boolean,
): Promise<string> {
  const messages: any[] = [];
  for (const h of normalizeHistory(history)) {
    messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text });
  }
  // Nudge JSON output for Anthropic (no native json mode on messages API).
  const sys = json
    ? `${system ?? ''}\n\nRespond ONLY with valid JSON, no markdown fences.`.trim()
    : system;
  messages.push({ role: 'user', content: message });

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': creds.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: creds.model,
      max_tokens: 4096,
      ...(sys ? { system: sys } : {}),
      messages,
    }),
  });
  if (!resp.ok) throw new HttpError(resp.status, `Anthropic error: ${await resp.text()}`);
  const data: any = await resp.json();
  return data.content?.map((c: any) => c.text).join('') ?? '';
}

// ---------------------------------------------------------------------------
// Unified IMAGE generation -> returns a data URL (or null)
// ---------------------------------------------------------------------------

export async function generateImage(creds: AICreds, prompt: string): Promise<string | null> {
  switch (creds.provider) {
    case 'gemini':
      return geminiImage(creds, prompt);
    case 'openai':
      return openaiImage(creds, prompt);
    default:
      throw new HttpError(400, `Provider ${creds.provider} does not support image generation`);
  }
}

async function geminiImage(creds: AICreds, prompt: string): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: creds.apiKey });
  const interaction = await (ai as any).interactions.create({
    model: creds.model,
    input: prompt,
    response_modalities: ['image', 'text'],
    generation_config: { image_config: { aspect_ratio: '16:9' } },
  });
  for (const step of interaction.steps ?? []) {
    if (step.type === 'model_output') {
      const img = step.content?.find((c: any) => c.type === 'image');
      if (img?.data) {
        const mime = img.mime_type || 'image/png';
        return `data:${mime};base64,${img.data}`;
      }
    }
  }
  return null;
}

async function openaiImage(creds: AICreds, prompt: string): Promise<string | null> {
  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creds.apiKey}`,
    },
    body: JSON.stringify({
      model: creds.model,
      prompt,
      size: '1792x1024',
      n: 1,
    }),
  });
  if (!resp.ok) throw new HttpError(resp.status, `OpenAI image error: ${await resp.text()}`);
  const data: any = await resp.json();
  const b64 = data.data?.[0]?.b64_json;
  if (b64) return `data:image/png;base64,${b64}`;
  const url = data.data?.[0]?.url;
  return url ?? null;
}
