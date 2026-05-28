import React, { useState } from 'react';
import { TrendingUp, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

const TOKEN_KEY = 'empire-access-token';

interface Props {
  onUnlocked: () => void;
}

export function AccessGate({ onUnlocked }: Props) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem(TOKEN_KEY, token);
        onUnlocked();
      } else {
        setError('Contraseña incorrecta. Intenta de nuevo.');
        setPassword('');
      }
    } catch {
      setError('Error de conexión. Verifica tu internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6">
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #f59e0b 0%, transparent 70%)' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full space-y-8 relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center shadow-[0_0_60px_rgba(245,158,11,0.2)]">
            <TrendingUp className="w-12 h-12 text-black" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Empire Finance</h1>
            <p className="text-zinc-500 text-sm font-medium mt-1">Acceso privado</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Contraseña de acceso
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                placeholder="••••••••••••••••"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 pl-5 pr-12 text-base font-mono focus:outline-none focus:border-amber-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-xs font-bold text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="w-full py-4 bg-amber-500 text-black font-black rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer uppercase tracking-widest text-sm"
          >
            {loading ? 'Verificando...' : 'Entrar al Imperio'}
          </button>
        </form>

        <p className="text-center text-[10px] text-zinc-700 font-bold uppercase tracking-widest">
          Acceso protegido · Empire Finance
        </p>
      </motion.div>
    </div>
  );
}
