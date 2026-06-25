/**
 * Model Interference API
 * Provides hooks and middleware for intercepting, monitoring, and modifying AI model calls
 */

export interface InterferenceConfig {
  enabled: boolean;
  logRequests: boolean;
  logResponses: boolean;
  requestTimeout?: number;
  rateLimitPerMinute?: number;
  contentFilters?: string[];
  responseModifiers?: ResponseModifier[];
}

export interface ModelRequest {
  model: string;
  prompt?: string;
  contents?: any[];
  config?: any;
  timestamp: number;
  requestId: string;
}

export interface ModelResponse {
  text?: string;
  imageUrl?: string;
  operationName?: string;
  originalResponse: any;
  timestamp: number;
  requestId: string;
  latency: number;
}

export interface InterferenceHook {
  beforeRequest?: (request: ModelRequest) => Promise<ModelRequest | null>;
  afterResponse?: (response: ModelResponse) => Promise<ModelResponse | null>;
  onError?: (error: any, request: ModelRequest) => Promise<void>;
}

export interface ResponseModifier {
  name: string;
  apply: (response: ModelResponse) => ModelResponse;
}

class ModelInterferenceAPI {
  private config: InterferenceConfig;
  private hooks: InterferenceHook[] = [];
  private requestLog: ModelRequest[] = [];
  private responseLog: ModelResponse[] = [];
  private rateLimitTracker: Map<string, number[]> = new Map();

  constructor(config: Partial<InterferenceConfig> = {}) {
    this.config = {
      enabled: true,
      logRequests: true,
      logResponses: true,
      requestTimeout: 30000,
      rateLimitPerMinute: 60,
      contentFilters: [],
      responseModifiers: [],
      ...config,
    };
  }

  /**
   * Register an interference hook
   */
  registerHook(hook: InterferenceHook): void {
    this.hooks.push(hook);
    console.log('Model Interference Hook registered');
  }

  /**
   * Unregister an interference hook
   */
  unregisterHook(hook: InterferenceHook): void {
    const index = this.hooks.indexOf(hook);
    if (index > -1) {
      this.hooks.splice(index, 1);
    }
  }

  /**
   * Intercept and process a model request
   */
  async interceptRequest(request: ModelRequest): Promise<ModelRequest | null> {
    if (!this.config.enabled) return request;

    // Check rate limiting
    if (!this.checkRateLimit(request.model)) {
      throw new Error(`Rate limit exceeded for model: ${request.model}`);
    }

    // Log request
    if (this.config.logRequests) {
      this.requestLog.push(request);
      console.log(`[Model Interference] Request to ${request.model}:`, request);
    }

    // Apply content filters
    if (this.config.contentFilters && this.config.contentFilters.length > 0) {
      request = this.applyContentFilters(request);
    }

    // Execute before hooks
    for (const hook of this.hooks) {
      if (hook.beforeRequest) {
        const modified = await hook.beforeRequest(request);
        if (modified === null) {
          console.warn('[Model Interference] Request blocked by hook');
          return null;
        }
        request = modified;
      }
    }

    return request;
  }

  /**
   * Intercept and process a model response
   */
  async interceptResponse(
    response: ModelResponse,
    request: ModelRequest
  ): Promise<ModelResponse | null> {
    if (!this.config.enabled) return response;

    // Log response
    if (this.config.logResponses) {
      this.responseLog.push(response);
      console.log(`[Model Interference] Response from ${request.model}:`, response);
    }

    // Apply response modifiers
    if (this.config.responseModifiers && this.config.responseModifiers.length > 0) {
      for (const modifier of this.config.responseModifiers) {
        response = modifier.apply(response);
      }
    }

    // Execute after hooks
    for (const hook of this.hooks) {
      if (hook.afterResponse) {
        const modified = await hook.afterResponse(response);
        if (modified === null) {
          console.warn('[Model Interference] Response blocked by hook');
          return null;
        }
        response = modified;
      }
    }

    return response;
  }

  /**
   * Handle model errors
   */
  async handleError(error: any, request: ModelRequest): Promise<void> {
    console.error('[Model Interference] Error occurred:', error);

    for (const hook of this.hooks) {
      if (hook.onError) {
        await hook.onError(error, request);
      }
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(model: string): boolean {
    if (!this.config.rateLimitPerMinute) return true;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const tracker = this.rateLimitTracker.get(model) || [];

    // Remove old timestamps
    const recentRequests = tracker.filter((ts) => ts > oneMinuteAgo);

    if (recentRequests.length >= this.config.rateLimitPerMinute) {
      return false;
    }

    recentRequests.push(now);
    this.rateLimitTracker.set(model, recentRequests);
    return true;
  }

  /**
   * Apply content filters to request
   */
  private applyContentFilters(request: ModelRequest): ModelRequest {
    if (!this.config.contentFilters) return request;

    let content = request.prompt || JSON.stringify(request.contents || '');

    for (const filter of this.config.contentFilters) {
      const regex = new RegExp(filter, 'gi');
      content = content.replace(regex, '[FILTERED]');
    }

    if (request.prompt) {
      request.prompt = content;
    } else if (request.contents) {
      request.contents = JSON.parse(content);
    }

    return request;
  }

  /**
   * Get request logs
   */
  getRequestLogs(limit: number = 100): ModelRequest[] {
    return this.requestLog.slice(-limit);
  }

  /**
   * Get response logs
   */
  getResponseLogs(limit: number = 100): ModelResponse[] {
    return this.responseLog.slice(-limit);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.requestLog = [];
    this.responseLog = [];
    console.log('[Model Interference] Logs cleared');
  }

  /**
   * Get interference statistics
   */
  getStats(): {
    totalRequests: number;
    totalResponses: number;
    averageLatency: number;
    modelsUsed: string[];
  } {
    const totalRequests = this.requestLog.length;
    const totalResponses = this.responseLog.length;
    const averageLatency =
      totalResponses > 0
        ? this.responseLog.reduce((sum, r) => sum + r.latency, 0) / totalResponses
        : 0;

    const modelsUsed = [...new Set(this.requestLog.map((r) => r.model))];

    return {
      totalRequests,
      totalResponses,
      averageLatency,
      modelsUsed,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<InterferenceConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[Model Interference] Configuration updated:', this.config);
  }

  /**
   * Enable/Disable interference
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`[Model Interference] ${enabled ? 'Enabled' : 'Disabled'}`);
  }
}

// Export singleton instance
export const modelInterference = new ModelInterferenceAPI();
