import React, { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, deleteDoc,
  doc, updateDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Client, ClientStatus } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Trash2, CheckCircle, Clock, AlertTriangle, DollarSign, Users, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: 'Pendiente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',  icon: Clock },
  partial:  { label: 'Parcial',   color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',     icon: DollarSign },
  paid:     { label: 'Pagado',    color: 'text-green-400 bg-green-500/10 border-green-500/20',  icon: CheckCircle },
  overdue:  { label: 'Vencido',   color: 'text-red-400 bg-red-500/10 border-red-500/20',        icon: AlertTriangle },
};

const EMPTY_CLIENT = {
  name: '',
  projectDescription: '',
  totalValue: 0,
  amountPaid: 0,
  status: 'pending' as ClientStatus,
  dueDate: '',
};

export function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [newClient, setNewClient] = useState(EMPTY_CLIENT);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'clients'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      snap => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client))),
      err => handleFirestoreError(err, OperationType.LIST, 'clients')
    );
    return unsub;
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newClient.name || !newClient.projectDescription) return;
    try {
      await addDoc(collection(db, 'clients'), {
        ...newClient,
        totalValue: Number(newClient.totalValue),
        amountPaid: 0,
        status: 'pending',
        dueDate: newClient.dueDate ? Timestamp.fromDate(new Date(newClient.dueDate)) : null,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      setIsAdding(false);
      setNewClient(EMPTY_CLIENT);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'clients');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'clients');
    }
  };

  const handleRegisterPayment = async (client: Client) => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;

    const newPaid = Math.min(client.amountPaid + amount, client.totalValue);
    const newStatus: ClientStatus = newPaid >= client.totalValue ? 'paid' : 'partial';

    try {
      await updateDoc(doc(db, 'clients', client.id), {
        amountPaid: newPaid,
        status: newStatus,
      });
      setPayingId(null);
      setPaymentAmount('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'clients');
    }
  };

  const totalReceivable = clients
    .filter(c => c.status !== 'paid')
    .reduce((s, c) => s + (c.totalValue - c.amountPaid), 0);

  const totalCollectedAllTime = clients.reduce((s, c) => s + c.amountPaid, 0);
  const activeCount = clients.filter(c => c.status === 'pending' || c.status === 'partial').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Por Cobrar"
          value={formatCurrency(totalReceivable)}
          sub={`${activeCount} proyecto${activeCount !== 1 ? 's' : ''} activo${activeCount !== 1 ? 's' : ''}`}
          icon={Clock}
          accent="amber"
        />
        <SummaryCard
          label="Cobrado Total"
          value={formatCurrency(totalCollectedAllTime)}
          sub="Todos los tiempos"
          icon={TrendingUp}
          accent="green"
        />
        <SummaryCard
          label="Clientes"
          value={String(clients.length)}
          sub={`${clients.filter(c => c.status === 'overdue').length} vencido${clients.filter(c => c.status === 'overdue').length !== 1 ? 's' : ''}`}
          icon={Users}
          accent="zinc"
        />
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold italic text-zinc-400 uppercase tracking-widest">
          Tus Clientes & Proyectos
        </h3>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded-xl font-bold text-sm hover:bg-amber-400 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          NUEVO CLIENTE
        </button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleAdd}
              className="bg-[#0a0a0a] border border-amber-500/30 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Nombre del Cliente</label>
                <input
                  required
                  value={newClient.name}
                  onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Ej. Empresa XYZ / Juan Pérez"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Descripción del Proyecto</label>
                <input
                  required
                  value={newClient.projectDescription}
                  onChange={e => setNewClient({ ...newClient, projectDescription: e.target.value })}
                  placeholder="Ej. Diseño web, App móvil, Consultoría..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Valor Total del Proyecto (COP)</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={newClient.totalValue || ''}
                  onChange={e => setNewClient({ ...newClient, totalValue: parseFloat(e.target.value) || 0 })}
                  placeholder="5000000"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Fecha de Pago Esperada</label>
                <input
                  type="date"
                  value={newClient.dueDate}
                  onChange={e => setNewClient({ ...newClient, dueDate: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 pt-2 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setNewClient(EMPTY_CLIENT); }}
                  className="px-4 py-2 text-zinc-400 font-bold text-xs uppercase hover:text-zinc-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 text-black px-6 py-2 rounded-xl font-black uppercase text-xs hover:bg-amber-400"
                >
                  Registrar Cliente
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Cards */}
      {clients.length === 0 ? (
        <div className="py-16 text-center text-zinc-600 italic font-mono uppercase text-xs tracking-widest">
          Sin clientes registrados. Agrega tu primer proyecto.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map(client => {
            const pending = client.totalValue - client.amountPaid;
            const pct = client.totalValue > 0 ? Math.round((client.amountPaid / client.totalValue) * 100) : 0;
            const StatusIcon = STATUS_CONFIG[client.status].icon;
            const dueDate = client.dueDate instanceof Timestamp
              ? client.dueDate.toDate()
              : client.dueDate ? new Date(client.dueDate) : null;

            return (
              <motion.div
                layout
                key={client.id}
                className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-6 space-y-4 group relative overflow-hidden"
              >
                {/* Status + Delete */}
                <div className="flex items-start justify-between">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border',
                    STATUS_CONFIG[client.status].color
                  )}>
                    <StatusIcon className="w-3 h-3" />
                    {STATUS_CONFIG[client.status].label}
                  </span>
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-500 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Info */}
                <div>
                  <h4 className="text-lg font-black italic tracking-tighter text-zinc-100 truncate">{client.name}</h4>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5 truncate">{client.projectDescription}</p>
                  {dueDate && (
                    <p className={cn(
                      'text-[10px] font-bold uppercase tracking-widest mt-1',
                      client.status === 'overdue' ? 'text-red-400' : 'text-zinc-600'
                    )}>
                      Vence: {format(dueDate, 'dd MMM yyyy', { locale: es })}
                    </p>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500">
                    <span>Cobrado</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={cn(
                        'h-full rounded-full',
                        client.status === 'paid' ? 'bg-green-500' :
                        client.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'
                      )}
                    />
                  </div>
                </div>

                {/* Values */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
                  <div>
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Total</p>
                    <p className="text-sm font-black italic text-zinc-300">{formatCurrency(client.totalValue)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Por Cobrar</p>
                    <p className={cn(
                      'text-sm font-black italic',
                      pending > 0 ? 'text-amber-400' : 'text-green-400'
                    )}>
                      {formatCurrency(pending)}
                    </p>
                  </div>
                </div>

                {/* Payment action */}
                {client.status !== 'paid' && (
                  <AnimatePresence mode="wait">
                    {payingId === client.id ? (
                      <motion.div
                        key="paying"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-2"
                      >
                        <input
                          type="number"
                          autoFocus
                          placeholder="Monto recibido"
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-amber-500/50 rounded-lg px-3 py-2 text-sm focus:outline-none font-mono"
                        />
                        <button
                          onClick={() => handleRegisterPayment(client)}
                          className="bg-amber-500 text-black px-3 py-2 rounded-lg font-black text-xs"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => { setPayingId(null); setPaymentAmount(''); }}
                          className="px-3 py-2 text-zinc-500 hover:text-zinc-200 text-xs font-bold"
                        >
                          ✕
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => { setPayingId(client.id); setPaymentAmount(''); }}
                        className="w-full py-2.5 border border-zinc-700 text-zinc-400 rounded-xl text-xs font-black uppercase tracking-widest hover:border-amber-500 hover:text-amber-400 transition-all cursor-pointer"
                      >
                        + Registrar Pago
                      </motion.button>
                    )}
                  </AnimatePresence>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string; sub: string; icon: React.ElementType;
  accent: 'amber' | 'green' | 'zinc';
}) {
  const colors = {
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    green: 'bg-green-500/10 text-green-500 border-green-500/20',
    zinc:  'bg-zinc-800 text-zinc-300 border-zinc-700',
  };
  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border', colors[accent])}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black italic tracking-tighter text-zinc-100">{value}</p>
        <p className="text-[10px] text-zinc-600 font-bold uppercase">{sub}</p>
      </div>
    </div>
  );
}
