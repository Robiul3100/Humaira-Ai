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

    const modelName = (model && [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro"
    ].includes(model)) ? model : "gemini-2.0-flash";

    // Build conversation history
    const contents = [
      ...(history || []).map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content || "" }]
      })),
      { role: "user", parts: [{ text: message }] }
    ];

    // Direct Gemini REST API call — no SDK needed
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${gkey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction
            ? { parts: [{ text: systemInstruction }] }
            : undefined,
          generationConfig: { temperature: 0.7 }
        })
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json();
      return res.status(500).json({ error: err.error?.message || "Gemini API error" });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.status(200).json({ text });

  } catch (error: any) {
    console.error("API error:", error);
    return res.status(500).json({ error: error.message || "An error occurred" });
  }
}
