import { Account, Transaction, Client } from '../types';
import { format, subMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

const TOKEN_KEY = 'empire-access-token';
const getToken = () => localStorage.getItem(TOKEN_KEY) ?? '';
const authHeaders = () => ({ 'Content-Type': 'application/json', 'x-access-token': getToken() });

// Streams the mentor response token-by-token, calling onDelta for each chunk.
export async function getMentorAdvice(
  history: { role: 'user' | 'model'; content: string }[],
  financialContext: string,
  onDelta: (delta: string) => void
): Promise<string> {
  const res = await fetch('/api/mentor', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ messages: history, financialContext }),
  });

  if (!res.ok) throw new Error('Mentor API error');

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  if (!reader) throw new Error('No response stream');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const json = JSON.parse(line.slice(6));
        if (json.delta) {
          fullText += json.delta;
          onDelta(json.delta);
        }
        if (json.done) return json.text ?? fullText;
        if (json.error) throw new Error(json.error);
      } catch {
        // skip malformed chunks
      }
    }
  }

  return fullText || 'No se pudo procesar la respuesta. Intenta de nuevo.';
}

export async function getDashboardInsight(financialContext: string): Promise<string> {
  const res = await fetch('/api/insight', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ financialContext }),
  });

  if (!res.ok) throw new Error('Insight API error');
  const data = await res.json();
  return data.insight ?? '';
}

export function buildFinancialContext(
  accounts: Account[],
  transactions: Transaction[],
  clients: Client[] = []
): string {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));

  const cop = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  const toDate = (d: any): Date =>
    d instanceof Timestamp ? d.toDate() : new Date(d);

  const thisMonthTx = transactions.filter(tx => toDate(tx.date) >= monthStart);
  const prevMonthTx = transactions.filter(tx => {
    const d = toDate(tx.date);
    return d >= prevMonthStart && d < monthStart;
  });

  const sumType = (txs: Transaction[], type: 'income' | 'expense') =>
    txs.filter(tx => tx.type === type).reduce((s, tx) => s + tx.amount, 0);

  const monthIncome = sumType(thisMonthTx, 'income');
  const monthExpenses = sumType(thisMonthTx, 'expense');
  const prevIncome = sumType(prevMonthTx, 'income');

  const totalAssets = accounts
    .filter(a => a.type !== 'debt' && a.type !== 'credit_card')
    .reduce((s, a) => s + a.balance, 0);

  const totalLiabilities = accounts
    .filter(a => a.type === 'debt' || a.type === 'credit_card')
    .reduce((s, a) => s + a.balance, 0);

  const investmentBalance = accounts
    .filter(a => a.type === 'investment')
    .reduce((s, a) => s + a.balance, 0);

  const expenseByCategory: Record<string, number> = {};
  thisMonthTx
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + tx.amount;
    });
  const topExpenses = Object.entries(expenseByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([cat, amount]) => `${cat}: ${cop(amount)}`)
    .join(' | ');

  const pendingClients = clients.filter(c => c.status !== 'paid');
  const totalReceivable = pendingClients.reduce((s, c) => s + (c.totalValue - c.amountPaid), 0);
  const overdueClients = clients.filter(c => c.status === 'overdue');

  const incomeDelta = prevIncome > 0
    ? ` (${((monthIncome - prevIncome) / prevIncome * 100).toFixed(1)}% vs mes anterior)`
    : '';

  const savingsRate = monthIncome > 0
    ? `${(((monthIncome - monthExpenses) / monthIncome) * 100).toFixed(1)}%`
    : null;

  const lines: (string | null)[] = [
    `ESTADO DEL IMPERIO — ${format(now, "d 'de' MMMM yyyy", { locale: es }).toUpperCase()}`,
    '',
    'BALANCE GENERAL:',
    `  Patrimonio Neto: ${cop(totalAssets - totalLiabilities)}`,
    `  Activos totales: ${cop(totalAssets)} | Pasivos: ${cop(totalLiabilities)}`,
    investmentBalance > 0 ? `  Inversiones: ${cop(investmentBalance)}` : null,
    '',
    `FLUJO DE CAJA — ${format(now, 'MMMM', { locale: es }).toUpperCase()}:`,
    `  Ingresos: ${cop(monthIncome)}${incomeDelta}`,
    `  Gastos: ${cop(monthExpenses)}`,
    `  Balance: ${cop(monthIncome - monthExpenses)} (${monthIncome >= monthExpenses ? 'superávit' : 'DÉFICIT'})`,
    savingsRate ? `  Tasa de ahorro: ${savingsRate}` : null,
    topExpenses ? `  Top gastos: ${topExpenses}` : null,
    '',
    clients.length > 0 ? 'CLIENTES & COBROS:' : null,
    clients.length > 0 ? `  Por cobrar: ${cop(totalReceivable)} (${pendingClients.length} activos)` : null,
    overdueClients.length > 0
      ? `  VENCIDOS: ${overdueClients.map(c => `${c.name} - ${cop(c.totalValue - c.amountPaid)}`).join(', ')}`
      : null,
    '',
    'CUENTAS REGISTRADAS:',
    ...accounts.map(
      a => `  ${a.name} [${a.type}]: ${cop(a.balance)}${a.interestRate ? ` @ ${a.interestRate}%` : ''}`
    ),
  ];

  return lines.filter((l): l is string => l !== null).join('\n');
}
