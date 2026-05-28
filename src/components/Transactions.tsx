import React, { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, deleteDoc,
  doc, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Transaction, Account, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type NewTx = { amount: number; category: string; type: 'income' | 'expense'; accountId: string; notes: string };
const EMPTY_TX: NewTx = { amount: 0, category: '', type: 'expense', accountId: '', notes: '' };

export function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [newTx, setNewTx] = useState<NewTx>(EMPTY_TX);

  useEffect(() => {
    if (!user) return;

    const qAcc = query(collection(db, 'accounts'), where('ownerId', '==', user.uid));
    const unsubAcc = onSnapshot(qAcc, snap => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
    });

    const qTx = query(
      collection(db, 'transactions'),
      where('ownerId', '==', user.uid),
      orderBy('date', 'desc')
    );
    const unsubTx = onSnapshot(qTx, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    return () => { unsubAcc(); unsubTx(); };
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTx.category || !newTx.accountId) return;
    try {
      await addDoc(collection(db, 'transactions'), {
        ...newTx,
        amount: Number(newTx.amount),
        ownerId: user.uid,
        date: serverTimestamp(),
      });
      setIsAdding(false);
      setNewTx(EMPTY_TX);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'transactions');
    }
  };

  const categories = newTx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const filtered = transactions.filter(tx =>
    tx.category.toLowerCase().includes(search.toLowerCase()) ||
    (tx.notes || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar movimientos..."
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-zinc-600 transition-all font-medium"
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4" />
          NUEVO MOVIMIENTO
        </button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-6 shadow-2xl"
          >
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Type first — drives categories */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['income', 'expense'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewTx({ ...newTx, type: t, category: '' })}
                      className={cn(
                        'py-2.5 rounded-xl font-black text-xs uppercase tracking-wide transition-all cursor-pointer border',
                        newTx.type === t
                          ? t === 'income'
                            ? 'bg-green-500/10 border-green-500/40 text-green-400'
                            : 'bg-red-500/10 border-red-500/40 text-red-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      )}
                    >
                      {t === 'income' ? 'Ingreso' : 'Gasto'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Categoría</label>
                <select
                  required
                  value={newTx.category}
                  onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="">Seleccionar...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Monto (COP)</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={newTx.amount || ''}
                  onChange={e => setNewTx({ ...newTx, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="500000"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-lg font-black italic focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Cuenta</label>
                <select
                  required
                  value={newTx.accountId}
                  onChange={e => setNewTx({ ...newTx, accountId: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="">Seleccionar cuenta...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Notas</label>
                <input
                  value={newTx.notes}
                  onChange={e => setNewTx({ ...newTx, notes: e.target.value })}
                  placeholder="Descripción adicional..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-3 flex justify-end gap-3 pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setNewTx(EMPTY_TX); }}
                  className="px-6 py-2 text-zinc-500 font-bold uppercase text-xs hover:text-zinc-200"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 text-black px-8 py-2 rounded-xl font-black uppercase text-xs shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:bg-amber-400"
                >
                  Registrar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Categoría</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Cuenta</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 italic text-right">Monto</th>
                <th className="px-6 py-4 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filtered.map(tx => {
                const accountName = accounts.find(a => a.id === tx.accountId)?.name || '—';
                const txDate = tx.date instanceof Timestamp ? tx.date.toDate() : new Date();
                return (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={tx.id}
                    className="hover:bg-zinc-900/40 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-zinc-300">
                        {format(txDate, "d 'de' MMM yyyy", { locale: es })}
                      </p>
                      <p className="text-[10px] text-zinc-600 font-bold">{format(txDate, 'HH:mm')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
                          tx.type === 'income'
                            ? 'bg-green-500/5 text-green-500 border-green-500/10'
                            : 'bg-red-500/5 text-red-500 border-red-500/10'
                        )}>
                          {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-black italic tracking-tight text-zinc-200 uppercase">{tx.category}</p>
                          <p className="text-[10px] text-zinc-500 font-bold truncate max-w-[160px]">{tx.notes || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight">
                        {accountName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        'font-mono font-black text-sm',
                        tx.type === 'income' ? 'text-green-400' : 'text-zinc-200'
                      )}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-500 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-zinc-600 italic font-mono uppercase text-xs tracking-widest">
              {search ? 'Sin resultados para tu búsqueda.' : 'Sin movimientos. Inicia el registro de capital.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
