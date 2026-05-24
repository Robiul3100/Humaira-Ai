export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, history, systemInstruction, model } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const gkey = process.env.GEMINI_API_KEY;
  if (!gkey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
  }

  const validModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  const modelName = (model && validModels.includes(model)) ? model : "gemini-2.0-flash";

  const contents = [
    ...(history || []).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || "" }]
    })),
    { role: "user", parts: [{ text: message }] }
  ];

  const body = {
    contents,
    generationConfig: { temperature: 0.7 }
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${gkey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(500).json({ error: data.error?.message || "Gemini API error" });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.status(200).json({ text });

  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: error.message || "An error occurred" });
  }
}
