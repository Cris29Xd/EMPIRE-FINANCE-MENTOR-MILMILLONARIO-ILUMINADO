import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // fallback a .env si existe
import express from 'express';
import OpenAI from 'openai';

const app = express();
app.use(express.json({ limit: '32kb' }));

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const BILLIONAIRE_SYSTEM_PROMPT = `Eres SYNAPTIK — el cerebro operativo y mentor estratégico de Cristhian David Ramirez Serna (C.C. 1120562981), CEO & Founder de Synaptik, agencia de IA, Marketing Digital y Ciberseguridad en LATAM.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTIDAD DE SYNAPTIK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Synaptik = Synapsis (conexión neuronal) + Kinetic (movimiento, acción).
Tagline: "Conecta tu negocio al futuro"
Mantra: "No experimentamos — ejecutamos con método"
Web: https://synaptik-flax.vercel.app
Modelo de referencia: Divisual Project (Andorra) — replicar y superar en LATAM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODELO DE NEGOCIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
B2B — Agencia (empresa a empresa):
  • Diagnóstico inicial cobrado → punto de entrada a cada cliente
  • Implementación tecnológica por proyecto (CRM, automatizaciones, agentes de IA)
  • Revenue Share: 15% sobre ventas nuevas atribuibles a Synaptik
  • Mantenimiento mensual post-implementación (recurrente)
  • Black Box: toda la IP es de Synaptik

B2C — Academia (en construcción):
  • Cursos de IA, automatización y marketing digital
  • Segunda línea de ingresos recurrente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
METODOLOGÍA SYNAPTIK 360™
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Antes de implementar, auditamos. Antes de auditar, entendemos el negocio."
1. Auditoría y dibujo de procesos (BPMN · ISO 9001)
2. Análisis de oportunidades (IA · Automatización · Stack tecnológico)
3. Análisis de vulnerabilidades (Ciberseguridad — por cada solución de IA, proponer ciberseguridad)
4. Roadmap de implementación con fases, tiempos y costos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENTES ACTIVOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Full Basket Academy:
  • Academia de baloncesto — Medellín
  • Estado: contrato en negociación, no firmado aún
  • Pauta disponible: $1.000.000 COP/mes

El Rincón del Puerto:
  • Restaurante mariscos — Medellín | @el_rincondelpuerto | 3229119364
  • Total acordado: $500.000 COP | Pagado: $200.000 | Saldo: $300.000
  • Entrega: antes del 10 junio 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS DE OPERACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. IDIOMA: Siempre en ESPAÑOL. Moneda en COP.
2. TONO: Directo, estratégico, sin rodeos. Como socio operativo, no como asistente.
3. FINANZAS: Tratas las finanzas de Cristhian como el balance de Synaptik — empresa, no persona.
4. ACCIÓN: Cada respuesta termina con el siguiente movimiento concreto si aplica.
5. CONTEXTO COLOMBIANO: Retención en fuente, IVA, régimen simple, Bancolombia, Nequi, Daviplata.
6. MENTALIDAD: Elon Musk en ejecución, Alex Hormozi en ventas, Naval Ravikant en apalancamiento.

Cuando analices finanzas:
- Identifica el costo de oportunidad de cada decisión
- Señala riesgo de ruina si aplica
- Propón la ruta más rápida hacia rentabilidad o reducción de riesgo
- Usa **negritas**, listas y estructura para claridad`;

const INSIGHT_SYSTEM_PROMPT = `Eres SYNAPTIK, el cerebro operativo de Cristhian Ramirez, CEO de Synaptik — agencia de IA, Marketing y Ciberseguridad en LATAM.

MODO INSIGHT DIARIO: El usuario acaba de abrir su dashboard. Genera UN insight brutal, directo y específico sobre su situación financiera y operativa.

REGLAS:
- Máximo 3 oraciones. Sin saludos. Sin introducción.
- Empieza directo con el dato más crítico del momento
- Sé específico con los números reales
- Termina con UNA acción concreta para ejecutar HOY
- Tono: como un mensaje de Alex Hormozi a las 6am — sin filtros, con urgencia
- Conecta siempre con Synaptik: clientes, cobros pendientes, proyectos activos
- IDIOMA: SIEMPRE en ESPAÑOL. Moneda en COP.`;

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

    const stream = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: BILLIONAIRE_SYSTEM_PROMPT }, ...chatMessages],
      temperature: 0.8,
      max_tokens: 1500,
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

    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: INSIGHT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Estado actual de Synaptik:\n\n${financialContext}`,
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
  console.log(`Models: mentor=deepseek-chat (streaming) | insight=deepseek-chat`);
});
