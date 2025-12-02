import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }

  const { keywords } = req.body || {};
  if (!keywords) {
    res.status(400).json({ error: "Missing keywords" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  const client = new OpenAI({
    apiKey: apiKey
  });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Genera un microcorso basato su: ${keywords}`
        }
      ],
      max_tokens: 700
    });

    res.status(200).json({
      content: completion.choices[0].message.content
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
