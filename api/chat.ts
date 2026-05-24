import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, history, systemInstruction, model } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const gkey = process.env.GEMINI_API_KEY;
    if (!gkey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const ai = new GoogleGenAI({ apiKey: gkey });

    const validModels = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-2.5-flash-preview-05-20",
    ];
    const modelName =
      model && validModels.includes(model) ? model : "gemini-2.0-flash";

    const formattedHistory = (history || []).map((m: any) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.parts?.[0]?.text || m.content || "" }],
    }));

    const chatSession = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemInstruction || "You are a helpful AI assistant.",
      },
      history: formattedHistory,
    });

    const response = await chatSession.sendMessage({ message });
    return res.status(200).json({ text: response.text });

  } catch (error: any) {
    console.error("Gemini API error:", error);
    return res.status(500).json({ error: error.message || "An error occurred" });
  }
}
