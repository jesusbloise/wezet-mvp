import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const bodySchema = z.object({
  message: z.string().min(1, "El mensaje es obligatorio"),
});

router.post("/chat", requireAuth, async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: parsed.error.flatten(),
    });
  }

  const { message } = parsed.data;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: "Falta GROQ_API_KEY en el backend",
    });
  }

  try {
    const systemPrompt = `
Eres el asistente de WEZET, una plataforma para gestionar proyectos creativos, talentos, acuerdos, cotizaciones y negociaciones.

Reglas:
- Responde siempre en español.
- Sé claro, útil y directo.
- Ayuda con redacción, organización, ideas, resúmenes y apoyo operativo.
- Puedes ayudar en temas como proyectos, talentos, contactos, acuerdos, cotizaciones y negociaciones.
- No inventes datos del sistema que no hayan sido proporcionados.
- Si el usuario pide algo que depende de información no disponible, dilo claramente y ofrece una alternativa útil.
`;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: systemPrompt.trim(),
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const raw = await groqResponse.text();
    const data = raw ? JSON.parse(raw) : null;

    if (!groqResponse.ok) {
      return res.status(500).json({
        ok: false,
        error: data?.error?.message || "Error consultando Groq",
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "No pude generar una respuesta en este momento.";

    return res.json({
      ok: true,
      reply,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e?.message || String(e),
    });
  }
});

export default router;