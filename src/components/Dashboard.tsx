import React, { useCallback, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Account, Transaction, Client } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { TrendingUp, Wallet, CreditCard, ArrowUpRight, ArrowDownRight, BrainCircuit, ReceiptText, Sparkles, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import {
  BarChart, Bar, XAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, YAxis, Legend,
} from 'recharts';
import { getDashboardInsight, buildFinancialContext } from '../lib/openaiService';
import { format, subMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

export function Dashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const qAcc = query(collection(db, 'accounts'), where('ownerId', '==', user.uid));
    const unsubAcc = onSnapshot(qAcc, snap => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'accounts'));

    const qTx = query(
      collection(db, 'transactions'),
      where('ownerId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(200)
    );
    const unsubTx = onSnapshot(qTx, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    const qClients = query(collection(db, 'clients'), where('ownerId', '==', user.uid));
    const unsubClients = onSnapshot(qClients, snap => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'clients'));

    return () => { unsubAcc(); unsubTx(); unsubClients(); };
  }, [user]);

  const fetchInsight = useCallback(async (force = false) => {
    if (!user || accounts.length === 0) return;

    const cacheKey = `empire-insight-${user.uid}-${format(new Date(), 'yyyy-MM-dd')}`;
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) { setInsight(cached); return; }
    }

    setInsightLoading(true);
    const context = buildFinancialContext(accounts, transactions, clients);
    getDashboardInsight(context)
      .then(text => {
        setInsight(text);
        sessionStorage.setItem(cacheKey, text);
      })
      .catch(() => setInsight(null))
      .finally(() => setInsightLoading(false));
  }, [user, accounts, transactions, clients]);

  useEffect(() => {
    if (!loading) fetchInsight();
  }, [loading]);

  const now = new Date();
  const monthStart = startOfMonth(now);

  const toDate = (d: any): Date => d instanceof Timestamp ? d.toDate() : new Date(d);

  const thisMonthTx = transactions.filter(tx => toDate(tx.date) >= monthStart);
  const monthIncome = thisMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpenses = thisMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const totalAssets = accounts
    .filter(a => a.type !== 'debt' && a.type !== 'credit_card')
    .reduce((s, a) => s + a.balance, 0);

  const totalLiabilities = accounts
    .filter(a => a.type === 'debt' || a.type === 'credit_card')
    .reduce((s, a) => s + a.balance, 0);

  const netWorth = totalAssets - totalLiabilities;

  const totalReceivable = clients
    .filter(c => c.status !== 'paid')
    .reduce((s, c) => s + (c.totalValue - c.amountPaid), 0);

  // Capital distribution chart
  const capitalChartData = [
    { name: 'Activos', value: totalAssets, color: '#f59e0b' },
    { name: 'Pasivos', value: totalLiabilities, color: '#ef4444' },
    { name: 'Por Cobrar', value: totalReceivable, color: '#3b82f6' },
  ];

  // 6-month income vs expenses trend
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const mStart = startOfMonth(subMonths(now, 5 - i));
    const mEnd = i === 5 ? now : startOfMonth(subMonths(now, 4 - i));
    const mTx = transactions.filter(tx => {
      const d = toDate(tx.date);
      return d >= mStart && d < mEnd;
    });
    return {
      mes: format(mStart, 'MMM', { locale: es }),
      ingresos: mTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      gastos: mTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  });

  const recentTx = transactions.slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 font-mono animate-pulse text-xs tracking-widest uppercase">
        Analizando tu imperio...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Patrimonio Neto" value={netWorth} icon={TrendingUp} accent="amber" sub="Activos − Pasivos" />
        <StatCard label="Activos Totales" value={totalAssets} icon={Wallet} accent="zinc" sub="Cuentas & Inversiones" />
        <StatCard label="Pasivos" value={totalLiabilities} icon={CreditCard} accent="red" sub="Deudas & Tarjetas" />
        <StatCard label="Por Cobrar" value={totalReceivable} icon={ArrowUpRight} accent="blue" sub={`${clients.filter(c => c.status !== 'paid').length} cliente(s) activos`} />
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Ingresos — {format(now, 'MMMM', { locale: es })}
            </p>
            <p className="text-2xl font-black italic tracking-tighter text-green-400">{formatCurrency(monthIncome)}</p>
          </div>
        </div>
        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <ArrowDownRight className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Gastos — {format(now, 'MMMM', { locale: es })}
            </p>
            <p className="text-2xl font-black italic tracking-tighter text-zinc-300">{formatCurrency(monthExpenses)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 6-month trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-6"
        >
          <h3 className="text-base font-black italic mb-5 flex items-center gap-2 uppercase tracking-tight">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            Tendencia 6 Meses
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="mes" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} fontWeight={700} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ fontWeight: 'bold', fontSize: 12 }}
                  formatter={(v: number) => formatCurrency(v)}
                  cursor={{ stroke: '#27272a' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ color: '#71717a', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="ingresos"
                  name="Ingresos"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  dot={{ fill: '#22c55e', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="gastos"
                  name="Gastos"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ fill: '#ef4444', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-6"
        >
          <h3 className="text-base font-black italic mb-5 flex items-center gap-2 uppercase tracking-tight">
            <ReceiptText className="w-4 h-4 text-zinc-400" />
            Flujo Reciente
          </h3>
          <div className="space-y-3">
            {recentTx.length === 0 ? (
              <p className="text-zinc-600 text-xs font-mono italic">Sin movimientos aún...</p>
            ) : (
              recentTx.map(tx => (
                <div key={tx.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      'p-1.5 rounded-lg shrink-0',
                      tx.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    )}>
                      {tx.type === 'income' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-zinc-200 truncate">{tx.category}</p>
                      <p className="text-[10px] text-zinc-600 font-bold truncate">{tx.notes || '—'}</p>
                    </div>
                  </div>
                  <p className={cn(
                    'font-mono font-black text-xs shrink-0 ml-2',
                    tx.type === 'income' ? 'text-green-400' : 'text-zinc-300'
                  )}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Capital distribution */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-6"
      >
        <h3 className="text-base font-black italic mb-5 flex items-center gap-2 uppercase tracking-tight">
          <Wallet className="w-4 h-4 text-zinc-400" />
          Distribución de Capital
        </h3>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={capitalChartData} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} fontWeight={700} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                itemStyle={{ color: '#f59e0b', fontWeight: 'bold', fontSize: 12 }}
                formatter={(v: number) => formatCurrency(v)}
                cursor={{ fill: '#18181b' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {capitalChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* AI Proactive Insight */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-7 flex items-start gap-5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-6 opacity-[0.04] pointer-events-none">
          <BrainCircuit className="w-40 h-40" />
        </div>
        <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
          {insightLoading
            ? <Sparkles className="w-7 h-7 text-black animate-pulse" />
            : <BrainCircuit className="w-7 h-7 text-black" />
          }
        </div>
        <div className="space-y-2 relative z-10 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">
              Mentor AI — Insight del Día
            </p>
            {!insightLoading && accounts.length > 0 && (
              <button
                onClick={() => fetchInsight(true)}
                className="p-1.5 text-zinc-600 hover:text-amber-500 transition-colors rounded-lg hover:bg-zinc-800 cursor-pointer"
                title="Actualizar insight"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {insightLoading ? (
            <div className="space-y-2 pt-1">
              <div className="h-4 bg-zinc-800 rounded animate-pulse w-full" />
              <div className="h-4 bg-zinc-800 rounded animate-pulse w-4/5" />
              <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/5" />
            </div>
          ) : insight ? (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-strong:text-amber-400 text-zinc-200 italic tracking-tight leading-relaxed">
              <ReactMarkdown>{insight}</ReactMarkdown>
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-base font-semibold italic tracking-tight text-zinc-400 leading-relaxed">
              Agrega tus cuentas y transacciones para que el Mentor analice tu imperio.
            </p>
          ) : (
            <p className="text-sm text-zinc-500 italic">Insight no disponible — verifica tu conexión al Mentor AI.</p>
          )}
          <p className="text-[10px] font-bold text-zinc-600 uppercase">— Billionaire Mentor · GPT-4o-mini</p>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, accent, sub,
}: {
  label: string; value: number; icon: React.ElementType;
  accent: 'amber' | 'zinc' | 'red' | 'blue'; sub: string;
}) {
  const colors = {
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    zinc:  'bg-zinc-800 text-zinc-200 border-zinc-700',
    red:   'bg-red-500/10 text-red-500 border-red-500/20',
    blue:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  return (
    <motion.div whileHover={{ y: -4 }} className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-5 space-y-3">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center border', colors[accent])}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-2xl font-black italic tracking-tighter">{formatCurrency(value)}</p>
        <p className="text-[10px] text-zinc-600 font-bold uppercase mt-0.5">{sub}</p>
      </div>
    </motion.div>
  );
}
