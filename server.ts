import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/chat", async (req, res) => {
    const { message, history, systemInstruction, model } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    try {
      const gkey = process.env.GEMINI_API_KEY;
      if (!gkey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({
        apiKey: gkey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // ✅ Valid models only — default: gemini-2.0-flash
      const validModels = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.5-flash-preview-05-20",
        "gemini-2.5-pro-preview-05-06",
      ];
      const modelName = (model && validModels.includes(model)) ? model : "gemini-2.0-flash";

      // ✅ Regular JSON response (Vercel-compatible, no SSE)
      const formattedHistory = (history || []).map((m: any) => ({
        role: m.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: m.parts?.[0]?.text || m.content || "" }]
      }));

      const chatSession = ai.chats.create({
        model: modelName,
        config: {
          systemInstruction: systemInstruction || "You are a helpful AI assistant."
        },
        history: formattedHistory
      });

      const response = await chatSession.sendMessage({ message });
      const fullText = response.text;

      return res.status(200).json({ text: fullText });

    } catch (error: any) {
      console.error("Gemini API error:", error);
      return res.status(500).json({ error: error.message || "An error occurred with the AI model" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
