import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres un Mentor Financiero de élite para emprendedores colombianos.

MODO INSIGHT DIARIO: El usuario acaba de abrir su dashboard financiero. Genera UN insight brutal, directo y específico.

REGLAS:
- Máximo 3 oraciones. Sin saludos. Sin introducción.
- Empieza directo con el análisis del dato más importante
- Sé específico con los números reales del usuario
- Termina con UNA acción concreta que deben ejecutar HOY o esta semana
- Tono: como un WhatsApp de Alex Hormozi a las 6am — sin filtros, con urgencia
- IDIOMA: SIEMPRE en ESPAÑOL`;

function isAuthorized(req: VercelRequest): boolean {
  const token = process.env.ACCESS_TOKEN;
  if (!token) return true;
  return req.headers['x-access-token'] === token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { financialContext } = req.body as { financialContext: string };

  if (!financialContext) {
    return res.status(400).json({ error: 'financialContext required' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analiza mi situación y dame el insight del día:\n\n${financialContext}` },
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
