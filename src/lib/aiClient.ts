/**
 * Client-side AI settings + fetch wrapper for BYOK (Bring Your Own Key).
 *
 * - The API key lives in sessionStorage (cleared when the tab closes). It is
 *   sent per-request to our own server, which proxies to the chosen provider.
 *   The key is NEVER persisted to localStorage or to our backend.
 * - Provider + model selection live in localStorage (not sensitive).
 */

export type Capability = 'text' | 'image' | 'video';

export interface ModelInfo {
  id: string;
  label: string;
  capabilities: Capability[];
}
export interface ProviderInfo {
  id: string;
  label: string;
  capabilities: Capability[];
  models: ModelInfo[];
  keyUrl: string;
}

const KEY_STORAGE = 'ai.apiKey';            // sessionStorage
const PROVIDER_STORAGE = 'ai.provider';     // localStorage
const MODELS_STORAGE = 'ai.models';         // localStorage: { [cap]: modelId }

export interface AISettings {
  provider: string;
  apiKey: string;
  /** Chosen model per capability, e.g. { text: 'gpt-4o', image: 'gpt-image-1' }. */
  models: Partial<Record<Capability, string>>;
}

export function loadSettings(): AISettings {
  return {
    provider: localStorage.getItem(PROVIDER_STORAGE) || '',
    apiKey: sessionStorage.getItem(KEY_STORAGE) || '',
    models: JSON.parse(localStorage.getItem(MODELS_STORAGE) || '{}'),
  };
}

export function saveSettings(s: AISettings): void {
  localStorage.setItem(PROVIDER_STORAGE, s.provider);
  localStorage.setItem(MODELS_STORAGE, JSON.stringify(s.models));
  if (s.apiKey) sessionStorage.setItem(KEY_STORAGE, s.apiKey);
  else sessionStorage.removeItem(KEY_STORAGE);
}

export function clearKey(): void {
  sessionStorage.removeItem(KEY_STORAGE);
}

export function isConfigured(): boolean {
  const s = loadSettings();
  return Boolean(s.provider && s.apiKey);
}

let _providersCache: ProviderInfo[] | null = null;
export async function fetchProviders(): Promise<ProviderInfo[]> {
  if (_providersCache) return _providersCache;
  const res = await fetch('/api/providers');
  const data = await res.json();
  _providersCache = data.providers as ProviderInfo[];
  return _providersCache;
}

/** Models available for a given capability under the current provider. */
export async function modelsFor(cap: Capability): Promise<ModelInfo[]> {
  const s = loadSettings();
  const providers = await fetchProviders();
  const p = providers.find((x) => x.id === s.provider);
  if (!p) return [];
  return p.models.filter((m) => m.capabilities.includes(cap));
}

/** Does the current provider support a capability at all? */
export async function providerSupports(cap: Capability): Promise<boolean> {
  const s = loadSettings();
  const providers = await fetchProviders();
  const p = providers.find((x) => x.id === s.provider);
  return Boolean(p?.capabilities.includes(cap));
}

export class NotConfiguredError extends Error {
  constructor() {
    super('AI provider not configured. Open Settings to add your API key.');
  }
}

/**
 * POST to one of our /api/* endpoints, injecting provider + model + apiKey.
 * `capability` selects which model to send (text/image/video).
 */
export async function aiPost<T = any>(
  endpoint: string,
  body: Record<string, any>,
  capability: Capability = 'text',
): Promise<T> {
  const s = loadSettings();
  if (!s.provider || !s.apiKey) throw new NotConfiguredError();
  const model = s.models[capability];

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, provider: s.provider, model, apiKey: s.apiKey }),
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

/** Validate the current key via the server (cheap ping). */
export async function validateKey(): Promise<{ valid: boolean; error?: string }> {
  const s = loadSettings();
  if (!s.provider || !s.apiKey) return { valid: false, error: 'Not configured' };
  const res = await fetch('/api/validate-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: s.provider, model: s.models.text, apiKey: s.apiKey }),
  });
  return res.json();
}
