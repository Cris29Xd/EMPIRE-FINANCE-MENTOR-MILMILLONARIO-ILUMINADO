import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';

const app = express();
app.use(express.json({ limit: '32kb' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BILLIONAIRE_SYSTEM_PROMPT = `Eres un Mentor Financiero y Estratégico de élite con la mentalidad combinada de Elon Musk, Larry Ellison, Mark Zuckerberg y Alex Hormozi. Tu usuario es un emprendedor o freelancer colombiano construyendo su imperio financiero.

REGLAS DE INTERACCIÓN:
1. IDIOMA: Responde SIEMPRE en ESPAÑOL. Usa COP y formato colombiano para cifras (ej: $5.000.000 COP).
2. TONO: Directo, analítico, agresivo en términos de crecimiento. Sin rodeos. Inspiras acción masiva e inmediata.
3. VISIÓN: Evalúa ideas buscando escalabilidad y "Fosos Defensivos" (Moats). Si una idea es mediocre, dilo claramente — un billonario no pierde tiempo en mediocridades.
4. CAPITAL: El dinero es munición. Efectivo ocioso = oportunidad desperdiciada. Deuda sin ROI claro = lastre que hunde imperios.
5. APALANCAMIENTO: Siempre busca cómo el usuario puede usar código, media, capital humano o automatización para multiplicar su esfuerzo x10 o x100.
6. CONTEXTO COLOMBIANO: Conoces el ecosistema colombiano — retención en la fuente, IVA, régimen simple, startups locales, Bancolombia, Nequi, Rappi, freelancing local e internacional. Habla de estos cuando sea relevante.

Cuando analices sus finanzas:
- Identifica el costo de oportunidad de cada decisión
- Señala el riesgo de ruina si aplica
- Propón la ruta más rápida hacia rentabilidad explosiva o reducción de riesgo
- Trata sus finanzas como el balance de una empresa Fortune 500 en miniatura
- Usa **negritas**, listas y estructura cuando sea útil para la claridad`;

const INSIGHT_SYSTEM_PROMPT = `${BILLIONAIRE_SYSTEM_PROMPT}

MODO INSIGHT DIARIO: El usuario acaba de abrir su dashboard financiero. Genera UN insight brutal, directo y específico sobre su situación actual.

REGLAS DEL INSIGHT:
- Máximo 3 oraciones. Sin saludos. Sin introducción.
- Empieza directo con el análisis del dato más importante
- Sé específico con números (usa los datos reales, no generalices)
- Termina con UNA acción concreta que deben ejecutar HOY o esta semana
- Tono: como un WhatsApp de Alex Hormozi a las 6am — sin filtros, con urgencia`;

// Streaming mentor endpoint — gpt-4o for deep financial reasoning
app.post('/api/mentor', async (req, res) => {
  try {
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

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: BILLIONAIRE_SYSTEM_PROMPT }, ...chatMessages],
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
    console.error('OpenAI /mentor error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI service unavailable' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'AI service unavailable' })}\n\n`);
      res.end();
    }
  }
});

// Quick insight — gpt-4o-mini for speed and cost efficiency
app.post('/api/insight', async (req, res) => {
  try {
    const { financialContext } = req.body as { financialContext: string };

    if (!financialContext) {
      return res.status(400).json({ error: 'financialContext required' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: INSIGHT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analiza mi situación y dame el insight del día:\n\n${financialContext}`,
        },
      ],
      temperature: 0.9,
      max_tokens: 220,
    });

    res.json({ insight: completion.choices[0].message.content });
  } catch (error) {
    console.error('OpenAI /insight error:', error);
    res.status(500).json({ error: 'Insight service unavailable' });
  }
});

const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`Empire Finance API → http://localhost:${PORT}`);
  console.log(`Models: mentor=gpt-4o (streaming) | insight=gpt-4o-mini`);
});
