import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Account, AccountType } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Trash2, Wallet, CreditCard, Landmark, Briefcase, MinusCircle, Edit2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Accounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Account>>({});
  const [newAccount, setNewAccount] = useState<Partial<Account>>({
    name: '',
    type: 'checking',
    balance: 0,
    limit: 0,
    interestRate: 0,
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'accounts'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAccounts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'accounts'));
    return () => unsubscribe();
  }, [user]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAccount.name) return;
    try {
      await addDoc(collection(db, 'accounts'), {
        ...newAccount,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      setIsAdding(false);
      setNewAccount({ name: '', type: 'checking', balance: 0, limit: 0, interestRate: 0 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'accounts');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta cuenta?')) return;
    try {
      await deleteDoc(doc(db, 'accounts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'accounts');
    }
  };

  const startEdit = (acc: Account) => {
    setEditingId(acc.id);
    setEditValues({ name: acc.name, balance: acc.balance, interestRate: acc.interestRate, limit: acc.limit });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async (id: string) => {
    try {
      await updateDoc(doc(db, 'accounts', id), {
        name: editValues.name,
        balance: Number(editValues.balance),
        interestRate: Number(editValues.interestRate ?? 0),
        limit: Number(editValues.limit ?? 0),
      });
      setEditingId(null);
      setEditValues({});
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'accounts');
    }
  };

  const getIcon = (type: AccountType) => {
    switch (type) {
      case 'checking':    return Landmark;
      case 'savings':     return Wallet;
      case 'credit_card': return CreditCard;
      case 'debt':        return MinusCircle;
      case 'investment':  return Briefcase;
      default:            return Wallet;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold italic text-zinc-400 uppercase tracking-widest">Tus Activos y Pasivos</h3>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded-xl font-bold text-sm hover:bg-amber-400 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          AGREGAR ENTIDAD
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddAccount} className="bg-[#0a0a0a] border border-amber-500/30 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Nombre</label>
                <input
                  required
                  value={newAccount.name}
                  onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="Ej. Bancolombia, Visa Platinum..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Tipo</label>
                <select
                  value={newAccount.type}
                  onChange={e => setNewAccount({ ...newAccount, type: e.target.value as AccountType })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="checking">Cuenta Corriente</option>
                  <option value="savings">Ahorros</option>
                  <option value="credit_card">Tarjeta de Crédito</option>
                  <option value="debt">Deuda / Préstamo</option>
                  <option value="investment">Inversión</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Balance Actual (COP)</label>
                <input
                  type="number"
                  required
                  value={newAccount.balance}
                  onChange={e => setNewAccount({ ...newAccount, balance: parseFloat(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              {(newAccount.type === 'credit_card' || newAccount.type === 'debt') && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Tasa de Interés (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newAccount.interestRate}
                      onChange={e => setNewAccount({ ...newAccount, interestRate: parseFloat(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  {newAccount.type === 'credit_card' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Límite de Crédito (COP)</label>
                      <input
                        type="number"
                        value={newAccount.limit}
                        onChange={e => setNewAccount({ ...newAccount, limit: parseFloat(e.target.value) })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </>
              )}
              <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-zinc-400 font-bold text-xs uppercase hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-white text-black px-6 py-2 rounded-lg font-bold text-xs uppercase hover:bg-zinc-200"
                >
                  Confirmar Empire Asset
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => {
          const Icon = getIcon(acc.type);
          const isLiability = acc.type === 'debt' || acc.type === 'credit_card';
          const isEditing = editingId === acc.id;

          return (
            <motion.div
              layout
              key={acc.id}
              className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-6 relative group overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  isLiability
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                    : 'bg-green-500/10 text-green-500 border border-green-500/20'
                )}>
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEdit(acc.id)}
                        className="p-1.5 text-green-500 hover:text-green-400 transition-colors cursor-pointer"
                        title="Guardar"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(acc)}
                        className="p-1.5 text-zinc-600 hover:text-amber-500 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="p-1.5 text-zinc-600 hover:text-red-500 transition-all cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">{acc.type}</p>

                {isEditing ? (
                  <div className="space-y-2 mt-1">
                    <input
                      value={editValues.name ?? ''}
                      onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:border-amber-500"
                      placeholder="Nombre"
                    />
                    <input
                      type="number"
                      value={editValues.balance ?? 0}
                      onChange={e => setEditValues({ ...editValues, balance: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm font-black italic focus:outline-none focus:border-amber-500"
                      placeholder="Balance"
                    />
                    {isLiability && (
                      <input
                        type="number"
                        step="0.01"
                        value={editValues.interestRate ?? 0}
                        onChange={e => setEditValues({ ...editValues, interestRate: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
                        placeholder="Tasa de interés %"
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <h4 className="text-lg font-bold text-zinc-200 mb-2 truncate">{acc.name}</h4>
                    <p className={cn(
                      'text-2xl font-black italic tracking-tighter',
                      isLiability ? 'text-zinc-400' : 'text-amber-500'
                    )}>
                      {formatCurrency(acc.balance)}
                    </p>
                  </>
                )}
              </div>

              {isLiability && !isEditing && (
                <div className="mt-4 pt-4 border-t border-zinc-900 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Tasa</p>
                    <p className="text-sm font-bold text-red-400">{acc.interestRate ?? 0}%</p>
                  </div>
                  {acc.limit ? (
                    <div>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Utilización</p>
                      <p className={cn(
                        'text-sm font-bold',
                        (acc.balance / acc.limit) > 0.7 ? 'text-red-400' : 'text-zinc-400'
                      )}>
                        {Math.round((acc.balance / acc.limit) * 100)}%
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {accounts.length === 0 && !isAdding && (
        <div className="text-center py-16 text-zinc-600 italic font-mono uppercase text-xs tracking-widest">
          Sin cuentas registradas. Agrega tu primera entidad de capital.
        </div>
      )}
    </div>
  );
}
