import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { signInWithGoogle, logOut } from './lib/firebase';
import { LayoutDashboard, Wallet, ReceiptText, BrainCircuit, LogOut, Menu, X, TrendingUp, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Dashboard } from './components/Dashboard';
import { Accounts } from './components/Accounts';
import { Transactions } from './components/Transactions';
import { Mentor } from './components/Mentor';
import { Clients } from './components/Clients';
import { cn } from './lib/utils';

type Tab = 'dashboard' | 'accounts' | 'transactions' | 'clients' | 'mentor';

const NAV_ITEMS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard',     label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'accounts',      label: 'Cuentas & Deudas', icon: Wallet },
  { id: 'transactions',  label: 'Transacciones',    icon: ReceiptText },
  { id: 'clients',       label: 'Clientes & Cobros', icon: Users },
  { id: 'mentor',        label: 'Mentor AI',        icon: BrainCircuit },
];

function AppContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/carbon-fibre.png)' }}
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8 relative z-10"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.25)]">
              <TrendingUp className="w-12 h-12 text-black" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic">Empire Finance</h1>
            <p className="text-zinc-400 font-medium">
              Construye tu legado. Optimiza tu capital. Consulta a los maestros.
            </p>
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-100 transition-colors flex items-center justify-center gap-3 active:scale-95 cursor-pointer"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg"
              className="w-5 h-5"
              alt="Google"
            />
            INICIAR SESIÓN CON GOOGLE
          </button>

          <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">
            Mentalidad de los más exitosos del mundo
          </p>
        </motion.div>
      </div>
    );
  }

  const activeItem = NAV_ITEMS.find(i => i.id === activeTab)!;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        'bg-[#0a0a0a] border-r border-zinc-800 transition-all duration-300 flex flex-col z-50 shrink-0',
        sidebarOpen ? 'w-60' : 'w-[72px]'
      )}>
        {/* Logo */}
        <div className="p-5 flex items-center gap-3 border-b border-zinc-800">
          <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-black" />
          </div>
          {sidebarOpen && (
            <span className="font-black italic tracking-tighter text-lg uppercase">Empire</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-5 px-2.5 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer group',
                activeTab === item.id
                  ? 'bg-zinc-800 text-amber-500'
                  : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && (
                <span className="font-bold text-sm tracking-tight truncate">{item.label}</span>
              )}
              {activeTab === item.id && sidebarOpen && (
                <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 space-y-2">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer rounded-xl hover:bg-zinc-900"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            {sidebarOpen && <span className="text-xs font-bold uppercase tracking-widest">Colapsar</span>}
          </button>

          <button
            onClick={logOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span className="font-bold text-sm tracking-tight">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.04),transparent_40%)]">
        <div className="p-7 max-w-7xl mx-auto w-full">
          {/* Header */}
          <header className="mb-8 flex justify-between items-end">
            <div>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                {activeTab === 'dashboard' ? 'Overview Status' : activeTab.toUpperCase()}
              </p>
              <h2 className="text-3xl font-black tracking-tighter italic">{activeItem.label}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-zinc-400">{user?.displayName}</p>
                <p className="text-[10px] text-amber-500/60 font-mono uppercase">Empire Status: Active</p>
              </div>
              {user?.photoURL && (
                <img
                  src={user.photoURL}
                  className="w-11 h-11 rounded-full border-2 border-zinc-700 p-0.5"
                  alt="Avatar"
                />
              )}
            </div>
          </header>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === 'dashboard'    && <Dashboard />}
              {activeTab === 'accounts'     && <Accounts />}
              {activeTab === 'transactions' && <Transactions />}
              {activeTab === 'clients'      && <Clients />}
              {activeTab === 'mentor'       && <Mentor />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
