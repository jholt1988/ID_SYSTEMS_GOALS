/**
 * Model Interference Middleware
 * Express middleware for intercepting and monitoring all AI model requests/responses
 */

import { Request, Response, NextFunction } from 'express';
import {
  modelInterference,
  ModelRequest,
  ModelResponse,
  InterferenceHook,
} from './modelInterference';

export interface InterferenceContext {
  requestId: string;
  startTime: number;
  modelName: string;
}

declare global {
  namespace Express {
    interface Request {
      modelInterference?: InterferenceContext;
    }
  }
}

/**
 * Create a Model Interference middleware for Express
 */
export function createModelInterferenceMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original response methods
    const originalJson = res.json;

    // Generate request ID
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.modelInterference = {
      requestId,
      startTime: Date.now(),
      modelName: 'unknown',
    };

    // Intercept response
    res.json = function (data: any) {
      if (req.modelInterference && req.path.includes('/api/')) {
        const latency = Date.now() - req.modelInterference.startTime;
        console.log(
          `[Model Interference Middleware] Response time: ${latency}ms for ${req.path}`
        );
      }

      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Create example hooks for specific use cases
 */

/**
 * Hook for logging all model calls to a database or external service
 */
export function createLoggingHook(): InterferenceHook {
  return {
    beforeRequest: async (request: ModelRequest) => {
      console.log(`[Logging Hook] Intercepted request to ${request.model}`);
      // Here you could send logs to an external service
      return request;
    },
    afterResponse: async (response: ModelResponse) => {
      console.log(
        `[Logging Hook] Intercepted response with latency ${response.latency}ms`
      );
      return response;
    },
  };
}

/**
 * Hook for content moderation
 */
export function createContentModerationHook(bannedKeywords: string[]): InterferenceHook {
  return {
    beforeRequest: async (request: ModelRequest) => {
      const content = request.prompt || JSON.stringify(request.contents || '');

      for (const keyword of bannedKeywords) {
        if (content.toLowerCase().includes(keyword.toLowerCase())) {
          console.warn(
            `[Content Moderation Hook] Banned keyword detected: ${keyword}`
          );
          return null; // Block the request
        }
      }

      return request;
    },
  };
}

/**
 * Hook for response validation and sanitization
 */
export function createResponseValidationHook(): InterferenceHook {
  return {
    afterResponse: async (response: ModelResponse) => {
      if (response.text && response.text.length > 10000) {
        console.warn('[Response Validation Hook] Response exceeds maximum length');
        response.text = response.text.substring(0, 10000) + '...';
      }

      return response;
    },
  };
}

/**
 * Hook for cost tracking and optimization
 */
export function createCostTrackingHook(): InterferenceHook {
  const costMap: { [model: string]: number } = {
    'gemini-3.5-flash': 0.075,
    'gemini-3.1-flash-image-preview': 0.15,
    'veo-3.1-fast-generate-preview': 0.5,
  };

  let totalCost = 0;

  return {
    afterResponse: async (response: ModelResponse) => {
      // Estimate tokens and cost based on response length
      const estimatedTokens = (response.text?.length || 0) / 4;
      const modelCostPerMToken = costMap['gemini-3.5-flash'] || 0.1;
      const estimatedCost = (estimatedTokens * modelCostPerMToken) / 1000000;

      totalCost += estimatedCost;

      console.log(
        `[Cost Tracking Hook] Estimated cost: $${estimatedCost.toFixed(6)}, Total: $${totalCost.toFixed(6)}`
      );

      return response;
    },
  };
}

/**
 * Hook for caching responses
 */
export function createCachingHook(): InterferenceHook {
  const cache = new Map<string, ModelResponse>();

  return {
    beforeRequest: async (request: ModelRequest) => {
      const cacheKey = `${request.model}-${request.prompt || JSON.stringify(request.contents)}`;

      if (cache.has(cacheKey)) {
        console.log('[Caching Hook] Cache hit for request');
      }

      return request;
    },
    afterResponse: async (response: ModelResponse) => {
      const cacheKey = `${response.requestId}`;
      cache.set(cacheKey, response);

      console.log('[Caching Hook] Response cached');

      return response;
    },
  };
}

/**
 * Hook for performance monitoring
 */
export function createPerformanceMonitoringHook(): InterferenceHook {
  const performanceData: { [model: string]: number[] } = {};

  return {
    afterResponse: async (response: ModelResponse) => {
      if (!performanceData[response.requestId]) {
        performanceData[response.requestId] = [];
      }

      performanceData[response.requestId].push(response.latency);

      const avgLatency =
        performanceData[response.requestId].reduce((a, b) => a + b, 0) /
        performanceData[response.requestId].length;

      console.log(
        `[Performance Monitoring] Average latency for ${response.requestId}: ${avgLatency.toFixed(2)}ms`
      );

      return response;
    },
  };
}

/**
 * Hook for A/B testing different prompts
 */
export function createABTestingHook(variantId: string): InterferenceHook {
  return {
    beforeRequest: async (request: ModelRequest) => {
      console.log(`[A/B Testing Hook] Variant ${variantId} - Processing request`);
      // Here you could modify the prompt based on variant
      return request;
    },
    afterResponse: async (response: ModelResponse) => {
      console.log(
        `[A/B Testing Hook] Variant ${variantId} - Response received`
      );
      // Here you could track the response for analysis
      return response;
    },
  };
}
