import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  PROVIDERS,
  extractCreds,
  generateText,
  generateImage,
  safeJsonParse,
  HttpError,
} from './src/server/providers';

// Body limit kept modest to reduce DoS surface. Image uploads are base64 data
// URLs; 10mb comfortably covers a 16:9 still.
const JSON_LIMIT = '10mb';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: JSON_LIMIT }));

  // Centralized error -> HTTP mapping. Never logs the API key.
  const sendError = (res: express.Response, err: any, label: string) => {
    const status = err instanceof HttpError ? err.status : 500;
    // Scrub anything key-like from the message before logging/returning.
    const msg = String(err?.message ?? 'Unknown error').replace(
      /(sk-|key-|AIza)[A-Za-z0-9_\-]{8,}/g,
      '$1***',
    );
    console.error(`${label}:`, msg);
    res.status(status).json({ error: msg });
  };

  // ---- Provider catalog (data-driven UI) ----------------------------------
  app.get('/api/providers', (_req, res) => {
    res.json({ providers: PROVIDERS });
  });

  // ---- Optional: validate a key by listing models / cheap call ------------
  app.post('/api/validate-key', async (req, res) => {
    try {
      const creds = extractCreds(req);
      // Cheap validation: a 1-token text generation.
      await generateText({ creds, message: 'ping', system: 'Reply with "ok".' });
      res.json({ valid: true });
    } catch (err: any) {
      const status = err instanceof HttpError ? err.status : 401;
      res.status(status).json({ valid: false, error: String(err?.message ?? 'Invalid key') });
    }
  });

  // ---- Onboarding chat ----------------------------------------------------
  app.post('/api/chat', async (req, res) => {
    try {
      const creds = extractCreds(req);
      const { history, message } = req.body;

      const systemInstruction = `You are an elite productivity and Life Operating System architect.
Your goal is to help the user define their core identity, their ultimate goals, and break those goals down into daily and weekly microtasks (systems).
First, naturally acknowledge the user's name, then ask them about the main goal they want to achieve right now.
These systems exist in three states: LOCKED, ACTIVE, and MAINTAIN.
Ask the user clarifying questions one at a time. Once you have a good understanding of their goal and the identity required to achieve it, output a clear plan breaking the goal down into specific actionable systems.
Make sure your final output includes the recommended daily/weekly microtasks categorized into the 5 core verticals (Health, Work, Wealth, Relationships, Growth) and states (ACTIVE, MAINTAIN, LOCKED).`;

      const text = await generateText({ creds, system: systemInstruction, history, message });
      res.json({ text });
    } catch (err) {
      sendError(res, err, 'Chat Error');
    }
  });

  // ---- Weekly reflection: generate questions (JSON) -----------------------
  app.post('/api/generate-reflection-questions', async (req, res) => {
    try {
      const creds = extractCreds(req);
      const { systemsContext } = req.body;
      const prompt = `You are an elite Life Operating System architect. The user is doing their weekly reflection.
Based on their current systems context, generate exactly 3 brief, thought-provoking questions to help them reflect on their identity progress and adjust future microtasks.
Return ONLY a JSON array of 3 strings. No markdown formatting outside of the array.
Systems context: ${systemsContext}`;

      const text = await generateText({ creds, message: prompt, json: true });
      res.json({ questions: safeJsonParse<string[]>(text, []) });
    } catch (err) {
      sendError(res, err, 'Reflection Gen Error');
    }
  });

  // ---- Weekly reflection: process answers ---------------------------------
  app.post('/api/process-reflection', async (req, res) => {
    try {
      const creds = extractCreds(req);
      const { answers } = req.body;
      const prompt = `You are an elite Life Operating System architect. The user has completed their weekly reflection.
Here are their answers:
1. ${answers?.[0] ?? ''}
2. ${answers?.[1] ?? ''}
3. ${answers?.[2] ?? ''}

Provide a short, encouraging summary of their progress and 1-2 brief suggestions for adjusting their microtasks for the upcoming week based on their reflection. Keep it under 4 sentences.`;

      const summary = await generateText({ creds, message: prompt });
      res.json({ summary });
    } catch (err) {
      sendError(res, err, 'Reflection Process Error');
    }
  });

  // ---- Image generation (OpenAI or Gemini) --------------------------------
  app.post('/api/generate-image', async (req, res) => {
    try {
      const creds = extractCreds(req);
      const { prompt } = req.body;
      const imageUrl = await generateImage(creds, prompt);
      res.json({ imageUrl });
    } catch (err) {
      sendError(res, err, 'Image Gen Error');
    }
  });

  // ---- Video generation (Gemini/Veo only) ---------------------------------
  // Video is only supported by Gemini. We still require the user's key (BYOK).
  const requireGeminiVideo = (req: express.Request) => {
    const creds = extractCreds(req);
    if (creds.provider !== 'gemini') {
      throw new HttpError(
        400,
        'Video generation is only available with the Google Gemini provider. Switch provider in Settings.',
      );
    }
    return creds;
  };

  app.post('/api/generate-video', async (req, res) => {
    try {
      const creds = requireGeminiVideo(req);
      const ai = new GoogleGenAI({ apiKey: creds.apiKey });
      const payload: any = {
        // Default to a valid Veo model; the client may override via `model`.
        model: creds.model || 'veo-3.1-generate-preview',
        prompt: req.body.prompt || 'A video showing progress and a day in the life',
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' },
      };

      if (req.body.image) {
        const parts = req.body.image.split(',');
        let mimeTypeStr = '';
        let base64Data = '';
        if (parts.length > 1) {
          mimeTypeStr = parts[0];
          base64Data = parts[1];
        } else {
          base64Data = parts[0];
          mimeTypeStr = 'image/png';
        }
        let mimeType = 'image/png';
        const match = mimeTypeStr.match(/:(.*?);/);
        if (match && match[1]) mimeType = match[1];
        payload.image = { imageBytes: base64Data, mimeType };
      }

      const operation = await ai.models.generateVideos(payload);
      res.json({ operationName: operation.name });
    } catch (err) {
      sendError(res, err, 'Video Gen Error');
    }
  });

  app.post('/api/video-status', async (req, res) => {
    try {
      const creds = requireGeminiVideo(req);
      const { GenerateVideosOperation } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: creds.apiKey });
      const op = new GenerateVideosOperation();
      op.name = req.body.operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      res.json({ done: updated.done });
    } catch (err) {
      sendError(res, err, 'Video Status Error');
    }
  });

  app.post('/api/video-download', async (req, res) => {
    try {
      const creds = requireGeminiVideo(req);
      const { GenerateVideosOperation } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: creds.apiKey });
      const op = new GenerateVideosOperation();
      op.name = req.body.operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) {
        res.status(404).json({ error: 'Video URI not found' });
        return;
      }
      // Forward the user's key to fetch the rendered video bytes.
      const videoRes = await fetch(uri, { headers: { 'x-goog-api-key': creds.apiKey } });
      res.setHeader('Content-Type', 'video/mp4');
      (videoRes.body as any)!.pipeTo(
        new WritableStream({
          write(chunk) { res.write(chunk); },
          close() { res.end(); },
        }),
      );
    } catch (err) {
      sendError(res, err, 'Video Download Error');
    }
  });

  // ---- Static / Vite ------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
