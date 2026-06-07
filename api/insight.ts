import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const SYSTEM_PROMPT = `Eres SYNAPTIK, el cerebro operativo de Cristhian Ramirez, CEO de Synaptik — agencia de IA, Marketing y Ciberseguridad en LATAM.

MODO INSIGHT DIARIO: El usuario acaba de abrir su dashboard. Genera UN insight brutal, directo y específico sobre su situación financiera y operativa.

REGLAS:
- Máximo 3 oraciones. Sin saludos. Sin introducción.
- Empieza directo con el dato más crítico del momento
- Sé específico con los números reales
- Termina con UNA acción concreta para ejecutar HOY
- Tono: como un mensaje de Alex Hormozi a las 6am — sin filtros, con urgencia
- Conecta siempre con Synaptik: clientes, cobros pendientes, proyectos activos
- IDIOMA: SIEMPRE en ESPAÑOL. Moneda en COP.`;

function isAuthorized(req: VercelRequest): boolean {
  const token = process.env.ACCESS_TOKEN;
  if (!token) return true;
  return req.headers['x-access-token'] === token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { financialContext } = req.body as { financialContext: string };
  if (!financialContext) return res.status(400).json({ error: 'financialContext required' });

  try {
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Estado actual de Synaptik:\n\n${financialContext}` },
      ],
      temperature: 0.9,
      max_tokens: 220,
    });

    res.json({ insight: completion.choices[0].message.content });
  } catch (error) {
    console.error('insight error:', error);
    res.status(500).json({ error: 'Insight service unavailable' });
  }
}
