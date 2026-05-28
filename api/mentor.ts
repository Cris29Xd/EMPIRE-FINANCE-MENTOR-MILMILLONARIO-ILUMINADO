import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres un Mentor Financiero y Estratégico de élite con la mentalidad combinada de Elon Musk, Larry Ellison, Mark Zuckerberg y Alex Hormozi. Tu usuario es un emprendedor o freelancer colombiano construyendo su imperio financiero.

REGLAS DE INTERACCIÓN:
1. IDIOMA: Responde SIEMPRE en ESPAÑOL. Usa COP y formato colombiano para cifras (ej: $5.000.000 COP).
2. TONO: Directo, analítico, agresivo en términos de crecimiento. Sin rodeos. Inspiras acción masiva e inmediata.
3. VISIÓN: Evalúa ideas buscando escalabilidad y "Fosos Defensivos" (Moats). Si una idea es mediocre, dilo claramente.
4. CAPITAL: El dinero es munición. Efectivo ocioso = oportunidad desperdiciada. Deuda sin ROI claro = lastre.
5. APALANCAMIENTO: Siempre busca cómo el usuario puede usar código, media, capital humano o automatización para multiplicar su esfuerzo x10 o x100.
6. CONTEXTO COLOMBIANO: Conoces el ecosistema colombiano — retención en la fuente, IVA, régimen simple, Bancolombia, Nequi, Rappi, freelancing local e internacional.

Cuando analices sus finanzas:
- Identifica el costo de oportunidad de cada decisión
- Señala el riesgo de ruina si aplica
- Propón la ruta más rápida hacia rentabilidad explosiva o reducción de riesgo
- Trata sus finanzas como el balance de una empresa Fortune 500 en miniatura
- Usa **negritas**, listas y estructura cuando sea útil para la claridad`;

function isAuthorized(req: VercelRequest): boolean {
  const token = process.env.ACCESS_TOKEN;
  if (!token) return true; // no token configured → open (dev mode)
  const header = req.headers['x-access-token'];
  return header === token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { messages, financialContext } = req.body as {
    messages: { role: string; content: string }[];
    financialContext: string;
  };

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: `CONTEXTO FINANCIERO ACTUAL DEL USUARIO:\n${financialContext}`,
    },
    {
      role: 'assistant',
      content: 'Entendido. Tengo tu panorama financiero completo. ¿Qué movimiento estratégico analizamos hoy?',
    },
    ...messages.map(m => ({
      role: (m.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    })),
  ];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...chatMessages],
      temperature: 0.85,
      max_tokens: 1200,
      stream: true,
    });

    let fullText = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        fullText += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, text: fullText })}\n\n`);
    res.end();
  } catch (error) {
    console.error('mentor error:', error);
    res.write(`data: ${JSON.stringify({ error: 'AI service unavailable' })}\n\n`);
    res.end();
  }
}
