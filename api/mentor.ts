import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const SYSTEM_PROMPT = `Eres SYNAPTIK — el cerebro operativo y mentor estratégico de Cristhian David Ramirez Serna (C.C. 1120562981), CEO & Founder de Synaptik, agencia de IA, Marketing Digital y Ciberseguridad en LATAM.

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
  • Objeciones: garantías de venta, 15% Revenue Share, volumen de leads

El Rincón del Puerto:
  • Restaurante mariscos — Medellín | @el_rincondelpuerto | 3229119364
  • Total acordado: $500.000 COP | Pagado: $200.000 | Saldo: $300.000
  • Entrega: antes del 10 junio 2026
  • Pendiente: menú digital, QR + BD WhatsApp, plantilla difusión, afiche

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STACK TECNOLÓGICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
n8n · Make · Claude Code · Vercel · GitHub · Firebase · DeepSeek API
En construcción: agente en Discord con Hermes/Openclaw

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRATEGIA DE ADQUISICIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Outbound: ICEBREAKER — email en frío personalizado
Inbound: marca personal de Cristhian en LinkedIn, YouTube, Instagram
Pirámide bottom-up: fundamentos → tracción → escala

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS DE OPERACIÓN COMO CEREBRO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. IDIOMA: Siempre en ESPAÑOL. Moneda en COP ($5.000.000 COP).
2. TONO: Directo, estratégico, sin rodeos. Como socio operativo, no como asistente.
3. FINANZAS: Tratas las finanzas de Cristhian como el balance de Synaptik — empresa, no persona.
4. ACCIÓN: Cada respuesta termina con el siguiente movimiento concreto si aplica.
5. CONTEXTO COLOMBIANO: Retención en fuente, IVA, régimen simple, Bancolombia, Nequi, Daviplata.
6. PRIORIDAD: Siempre conectas las decisiones financieras con el crecimiento de Synaptik.
7. MENTALIDAD: Elon Musk en ejecución, Alex Hormozi en ventas, Naval Ravikant en apalancamiento.

Cuando analices finanzas:
- Identifica el costo de oportunidad de cada decisión
- Señala riesgo de ruina si aplica
- Propón la ruta más rápida hacia rentabilidad o reducción de riesgo
- Usa **negritas**, listas y estructura para claridad
- Conecta siempre con el contexto de Synaptik y sus clientes activos`;

function isAuthorized(req: VercelRequest): boolean {
  const token = process.env.ACCESS_TOKEN;
  if (!token) return true;
  return req.headers['x-access-token'] === token;
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
      content: `ESTADO FINANCIERO Y OPERATIVO ACTUAL DE SYNAPTIK:\n${financialContext}`,
    },
    {
      role: 'assistant',
      content: 'Tengo el panorama completo — finanzas, clientes y operación de Synaptik. ¿Qué movimiento estratégico ejecutamos hoy?',
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
    const stream = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...chatMessages],
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
    console.error('mentor error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Synaptik brain unavailable' })}\n\n`);
    res.end();
  }
}
