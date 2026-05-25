import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history, systemInstruction, model, temperature } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // Set Gemini API Key
  const gkey = process.env.GEMINI_API_KEY;
  if (!gkey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server. Please check your environment variables." });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: gkey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Strict Model validation (Default to gemini-3.5-flash as recommended)
    let modelName = model || "gemini-3.5-flash";
    if (modelName === "gemini-2.0-flash") {
      modelName = "gemini-3.5-flash";
    }

    // Configure SSE response headers for chunk streaming
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    // Format history to match GoogleGenAI format
    const formattedHistory = (history || []).map((m: any) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.parts?.[0]?.text || m.content || "" }]
    }));

    const chatSession = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemInstruction || "You are a helpful AI assistant.",
        temperature: typeof temperature === "number" ? temperature : 0.7
      },
      history: formattedHistory
    });

    const responseStream = await chatSession.sendMessageStream({ message });

    for await (const chunk of responseStream) {
      const text = chunk.text || "";
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Gemini API error in Vercel handler:", error);
    res.write(`data: ${JSON.stringify({ error: error.message || "An error occurred with the AI model" })}\n\n`);
    res.end();
  }
}
