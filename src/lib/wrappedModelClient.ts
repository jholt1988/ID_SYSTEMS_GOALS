/**
 * Wrapped Model Client
 * Wraps the Google Gemini AI client with Model Interference capabilities
 */

import { GoogleGenAI } from '@google/genai';
import {
  modelInterference,
  ModelRequest,
  ModelResponse,
} from './modelInterference';

export class WrappedModelClient {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Wrapped generateContent method with interference
   */
  async generateContent(
    model: string,
    contents: any[],
    config: any = {}
  ): Promise<any> {
    const requestId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const request: ModelRequest = {
      model,
      contents,
      config,
      timestamp: startTime,
      requestId,
    };

    try {
      // Intercept request
      const interceptedRequest = await modelInterference.interceptRequest(request);

      if (!interceptedRequest) {
        throw new Error('Request blocked by interference hooks');
      }

      // Make actual call
      const response = await this.client.models.generateContent({
        model: interceptedRequest.model,
        contents: interceptedRequest.contents || contents,
        config: interceptedRequest.config || config,
      });

      const latency = Date.now() - startTime;

      const modelResponse: ModelResponse = {
        text: response.text,
        originalResponse: response,
        timestamp: Date.now(),
        requestId,
        latency,
      };

      // Intercept response
      const interceptedResponse = await modelInterference.interceptResponse(
        modelResponse,
        request
      );

      if (!interceptedResponse) {
        throw new Error('Response blocked by interference hooks');
      }

      return interceptedResponse.originalResponse;
    } catch (error) {
      await modelInterference.handleError(error, request);
      throw error;
    }
  }

  /**
   * Wrapped generateVideos method with interference
   */
  async generateVideos(payload: any): Promise<any> {
    const requestId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const request: ModelRequest = {
      model: payload.model,
      config: payload,
      timestamp: startTime,
      requestId,
    };

    try {
      // Intercept request
      const interceptedRequest = await modelInterference.interceptRequest(request);

      if (!interceptedRequest) {
        throw new Error('Request blocked by interference hooks');
      }

      // Make actual call
      const response = await this.client.models.generateVideos(
        interceptedRequest.config || payload
      );

      const latency = Date.now() - startTime;

      const modelResponse: ModelResponse = {
        operationName: response.name,
        originalResponse: response,
        timestamp: Date.now(),
        requestId,
        latency,
      };

      // Intercept response
      const interceptedResponse = await modelInterference.interceptResponse(
        modelResponse,
        request
      );

      if (!interceptedResponse) {
        throw new Error('Response blocked by interference hooks');
      }

      return interceptedResponse.originalResponse;
    } catch (error) {
      await modelInterference.handleError(error, request);
      throw error;
    }
  }

  /**
   * Wrapped interactions.create method with interference
   */
  async createInteraction(payload: any): Promise<any> {
    const requestId = `inter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const request: ModelRequest = {
      model: payload.model,
      config: payload,
      timestamp: startTime,
      requestId,
    };

    try {
      // Intercept request
      const interceptedRequest = await modelInterference.interceptRequest(request);

      if (!interceptedRequest) {
        throw new Error('Request blocked by interference hooks');
      }

      // Make actual call
      const response = await this.client.interactions.create(
        interceptedRequest.config || payload
      );

      const latency = Date.now() - startTime;

      let imageUrl = null;
      for (const step of response.steps) {
        if (step.type === 'model_output') {
          const imageContent = step.content?.find((c: any) => c.type === 'image');
          if (imageContent && imageContent.data) {
            const base64EncodeString = imageContent.data;
            const mimeType = imageContent.mime_type || 'image/png';
            imageUrl = `data:${mimeType};base64,${base64EncodeString}`;
          }
        }
      }

      const modelResponse: ModelResponse = {
        imageUrl,
        originalResponse: response,
        timestamp: Date.now(),
        requestId,
        latency,
      };

      // Intercept response
      const interceptedResponse = await modelInterference.interceptResponse(
        modelResponse,
        request
      );

      if (!interceptedResponse) {
        throw new Error('Response blocked by interference hooks');
      }

      return interceptedResponse.originalResponse;
    } catch (error) {
      await modelInterference.handleError(error, request);
      throw error;
    }
  }

  /**
   * Get access to the underlying client for advanced use cases
   */
  getUnderlyingClient(): GoogleGenAI {
    return this.client;
  }
}
