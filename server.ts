import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Initialize SDK conditionally (lazy init) to avoid crashing on start if missing
let ai: GoogleGenAI | null = null;
function getAI() {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body limit kept modest to reduce DoS surface. Image/video uploads are
  // base64 data URLs; 10mb comfortably covers a 16:9 still. Raise only if a
  // concrete payload needs it.
  app.use(express.json({ limit: '10mb' }));

  // Safely parse a model response that is expected to be JSON. Models can wrap
  // JSON in markdown fences or emit prose, so JSON.parse() must never be called
  // unguarded on response.text.
  const safeJsonParse = <T>(raw: string | undefined | null, fallback: T): T => {
    if (!raw) return fallback;
    let text = raw.trim();
    // Strip ```json ... ``` or ``` ... ``` fences if present.
    const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fence) text = fence[1].trim();
    try {
      return JSON.parse(text) as T;
    } catch {
      console.error('safeJsonParse: response was not valid JSON:', raw.slice(0, 200));
      return fallback;
    }
  };

  // API Route for AI Onboarding Chat
  app.post('/api/chat', async (req, res) => {
    try {
      const { history, message } = req.body;
      const aiClient = getAI();
      
      const systemInstruction = `You are an elite productivity and Life Operating System architect.
Your goal is to help the user define their core identity, their ultimate goals, and break those goals down into daily and weekly microtasks (systems).
First, naturally acknowledge the user's name, then ask them about the main goal they want to achieve right now.
These systems exist in three states: LOCKED, ACTIVE, and MAINTAIN.
Ask the user clarifying questions one at a time. Once you have a good understanding of their goal and the identity required to achieve it, output a clear plan breaking the goal down into specific actionable systems. 
Make sure your final output includes the recommended daily/weekly microtasks categorized into the 5 core verticals (Health, Work, Wealth, Relationships, Growth) and states (ACTIVE, MAINTAIN, LOCKED).`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          ...history,
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/generate-reflection-questions', async (req, res) => {
    try {
      const { systemsContext } = req.body;
      const aiClient = getAI();
      
      const prompt = `You are an elite Life Operating System architect. The user is doing their weekly reflection.
Based on their current systems context, generate exactly 3 brief, thought-provoking questions to help them reflect on their identity progress and adjust future microtasks.
Return ONLY a JSON array of 3 strings. No markdown formatting outside of the array.
Systems context: ${systemsContext}`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json"
        }
      });

      res.json({ questions: safeJsonParse<string[]>(response.text, []) });
    } catch (error: any) {
      console.error("Reflection Gen Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/process-reflection', async (req, res) => {
    try {
      const { answers } = req.body;
      const aiClient = getAI();
      
      const prompt = `You are an elite Life Operating System architect. The user has completed their weekly reflection.
Here are their answers:
1. ${answers[0]}
2. ${answers[1]}
3. ${answers[2]}

Provide a short, encouraging summary of their progress and 1-2 brief suggestions for adjusting their microtasks for the upcoming week based on their reflection. Keep it under 4 sentences.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      res.json({ summary: response.text });
    } catch (error: any) {
      console.error("Reflection Process Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/generate-image', async (req, res) => {
    try {
      const { prompt } = req.body;
      const aiClient = getAI();
      
      // NOTE: verify this model id against the live Gemini API. Google's docs
      // list `gemini-3.1-flash-image` (the `-preview` alias may or may not
      // resolve). If image generation 404s, drop the `-preview` suffix.
      const interaction = await aiClient.interactions.create({
        model: 'gemini-3.1-flash-image-preview',
        input: prompt,
        response_modalities: ['image', 'text'],
        generation_config: {
          image_config: {
            aspect_ratio: "16:9",
          },
        },
      });

      let imageUrl = null;
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          const imageContent = step.content?.find(c => c.type === 'image');
          if (imageContent && imageContent.data) {
            const base64EncodeString = imageContent.data;
            const mimeType = imageContent.mime_type || 'image/png';
            imageUrl = `data:${mimeType};base64,${base64EncodeString}`;
          }
        }
      }
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Image Gen Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/generate-video', async (req, res) => {
    try {
      const aiClient = getAI();
      let payload: any = {
        // NOTE: verify this model id against the live Veo API. Google's docs
        // list `veo-3.1-generate-preview` and `veo-3.1-lite-generate-preview`
        // (no `-fast-` variant). If video generation 404s, switch to
        // `veo-3.1-generate-preview`.
        model: 'veo-3.1-fast-generate-preview',
        prompt: req.body.prompt || 'A video showing progress and a day in the life',
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
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
            mimeTypeStr = 'image/png'; // default
        }
        
        let mimeType = 'image/png';
        const match = mimeTypeStr.match(/:(.*?);/);
        if (match && match[1]) {
            mimeType = match[1];
        }

        payload.image = {
          imageBytes: base64Data,
          mimeType: mimeType
        };
      }
      
      const operation = await aiClient.models.generateVideos(payload);
      res.json({ operationName: operation.name });
    } catch (error: any) {
      console.error("Video Gen Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/video-status', async (req, res) => {
    try {
      const { GenerateVideosOperation } = await import('@google/genai');
      const aiClient = getAI();
      const op = new GenerateVideosOperation();
      op.name = req.body.operationName;
      const updated = await aiClient.operations.getVideosOperation({ operation: op });
      res.json({ done: updated.done });
    } catch (error: any) {
      console.error("Video Status Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/video-download', async (req, res) => {
    try {
      const { GenerateVideosOperation } = await import('@google/genai');
      const aiClient = getAI();
      const op = new GenerateVideosOperation();
      op.name = req.body.operationName;
      const updated = await aiClient.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) {
        res.status(404).json({ error: 'Video URI not found' });
        return;
      }
      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      });
      res.setHeader('Content-Type', 'video/mp4');
      videoRes.body!.pipeTo(
        new WritableStream({
          write(chunk) { res.write(chunk); },
          close() { res.end(); },
        })
      );
    } catch (error: any) {
      console.error("Video Download Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express v5 uses *all instead of * (Wait, express is ^4.21.2, so * is fine)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
