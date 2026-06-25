import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { WritableStream } from 'stream/web'; // Ensure WritableStream is available

// Initialize SDK conditionally (lazy init) to avoid crashing on start if missing
let ai: GoogleGenAI | null = null;
function getAI() {
  if (!ai) {
    // Use process.env to access environment variables like your API key
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

async function startServer() {
  const app = express();
  // Use a port that's accessible within the Studio, often 3000 or 8000 is fine.
  // The platform will handle external exposure if needed via deployments or port forwarding.
  const PORT = 3000;

  // Limit for JSON request body size
  app.use(express.json({ limit: '50mb' }));

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

      const response = await aiClient.getGenerativeModel({ model: 'gemini-3.5-flash' }).generateContentStream({
        contents: [
          { role: 'user', parts: [{ text: systemInstruction }] }, // System instruction as user content for stream
          ...history,
          { role: 'user', parts: [{ text: message }] }
        ],
      });

      let responseText = '';
      for await (const chunk of response.stream) {
        responseText += chunk.text();
      }

      res.json({ text: responseText });

    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for generating reflection questions
  app.post('/api/generate-reflection-questions', async (req, res) => {
    try {
      const { systemsContext } = req.body;
      const aiClient = getAI();
      
      const prompt = `You are an elite Life Operating System architect. The user is doing their weekly reflection.
Based on their current systems context, generate exactly 3 brief, thought-provoking questions to help them reflect on their identity progress and adjust future microtasks.
Return ONLY a JSON array of 3 strings. No markdown formatting outside of the array.

Systems context: ${systemsContext}`;

      const response = await aiClient.getGenerativeModel({ model: 'gemini-3.5-flash' }).generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.response.candidates?.[0]?.content?.parts?.[0]?.text;
      res.json({ questions: JSON.parse(responseText || '[]') });

    } catch (error: any) {
      console.error("Reflection Gen Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for processing reflection answers
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

      const response = await aiClient.getGenerativeModel({ model: 'gemini-3.5-flash' }).generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const responseText = response.response.candidates?.[0]?.content?.parts?.[0]?.text;
      res.json({ summary: responseText });

    } catch (error: any) {
      console.error("Reflection Process Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for generating images
  app.post('/api/generate-image', async (req, res) => {
    try {
      const { prompt } = req.body;
      const aiClient = getAI();
      
      const model = aiClient.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                fileData: {
                  mime_type: 'image/png', // Adjust if you expect other types or get it from request
                  fileUri: `data:image/png;base64,` // Placeholder, actual base64 data needs to be sent in request body
                },
              },
            ],
          },
        ],
        generationConfig: {
          image_config: {
            aspect_ratio: "16:9",
          },
        },
        responseMimeType: "application/json"
      });

      let imageUrl = null;
      const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        const responseJson = JSON.parse(responseText);
        imageUrl = responseJson.imageUrl; // Assuming the response format is { imageUrl: 'data:...' }
      }
      
      res.json({ imageUrl });

    } catch (error: any) {
      console.error("Image Gen Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for generating videos
  app.post('/api/generate-video', async (req, res) => {
    try {
      const aiClient = getAI();
      let payload: any = {
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
      
      // Note: The @google/genai SDK might have changed. Check docs for `generateVideos` and `Operation` objects.
      // This part might need adjustment based on the latest SDK version.
      const operation = await aiClient.models.generateVideos(payload);
      res.json({ operationName: operation.name });

    } catch (error: any) {
      console.error("Video Gen Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for video status
  app.post('/api/video-status', async (req, res) => {
    try {
      // Dynamically import GenerateVideosOperation if needed, but it might be part of the main aiClient import
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

  // API Route for video download
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

      // Fetch the video directly using the provided URI and API key
      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      });

      if (!videoRes.ok) {
        throw new Error(`Failed to fetch video: ${videoRes.statusText}`);
      }

      res.setHeader('Content-Type', videoRes.headers.get('Content-Type') || 'video/mp4');
      // Use node's stream API to pipe to response
      const reader = videoRes.body?.getReader();
      if (!reader) {
          throw new Error("Could not get video body reader.");
      }

      async function streamToResponse() {
          let result;
          while (!(result = await reader.read()).done) {
              res.write(result.value);
          }
          res.end();
      }
      await streamToResponse();

    } catch (error: any) {
      console.error("Video Download Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log("Starting Vite in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      // If you have a specific build directory for Vite, configure it here
      // e.g., buildDir: 'dist-dev'
    });
    app.use(vite.middlewares);
    console.log("Vite middleware attached.");
  } else {
    // For production, assume 'dist' is your build output directory
    console.log("Running in production mode. Serving static files from dist.");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve index.html for all other routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();