import React, { useState, useEffect, useRef } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc,
  doc, orderBy, serverTimestamp, getDocs, deleteDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { MentorSession, Message, Account, Transaction, Client } from '../types';
import { getMentorAdvice, buildFinancialContext } from '../lib/openaiService';
import { BrainCircuit, Send, User, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

const WELCOME: Message = {
  role: 'model',
  content: 'Soy tu mentor financiero de élite. Tengo acceso a tu contexto financiero completo. ¿Qué movimiento estratégico ejecutamos hoy?',
  timestamp: new Date(),
};

export function Mentor() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<MentorSession | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const fetchContext = async () => {
      const [accSnap, txSnap, clientSnap] = await Promise.all([
        getDocs(query(collection(db, 'accounts'), where('ownerId', '==', user.uid))),
        getDocs(query(collection(db, 'transactions'), where('ownerId', '==', user.uid))),
        getDocs(query(collection(db, 'clients'), where('ownerId', '==', user.uid))),
      ]);
      setAccounts(accSnap.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
      setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      setClients(clientSnap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    };
    fetchContext();

    const q = query(
      collection(db, 'mentorship'),
      where('ownerId', '==', user.uid),
      orderBy('lastInteraction', 'desc')
    );

    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as MentorSession;
        setSession(data);
        // Don't overwrite messages while streaming
        if (!isTypingRef.current) setMessages(data.messages);
      } else {
        handleNewSession([WELCOME]);
      }
    }, err => handleFirestoreError(err, OperationType.LIST, 'mentorship'));

    return unsub;
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleNewSession = async (initial: Message[]) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'mentorship'), {
        ownerId: user.uid,
        messages: initial,
        lastInteraction: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'mentorship');
    }
  };

  const handleReset = async () => {
    if (!user || isTyping) return;
    try {
      const snap = await getDocs(
        query(collection(db, 'mentorship'), where('ownerId', '==', user.uid))
      );
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'mentorship', d.id))));
      setSession(null);
      setMessages([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'mentorship');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || isTyping) return;

    const userMsg: Message = { role: 'user', content: input, timestamp: new Date() };
    const historyWithUser = [...messages, userMsg];
    setMessages(historyWithUser);
    setInput('');
    setIsTyping(true);
    isTypingRef.current = true;
    setStreamingContent('');

    const context = buildFinancialContext(accounts, transactions, clients);

    try {
      let accumulated = '';
      const fullText = await getMentorAdvice(
        historyWithUser.map(m => ({ role: m.role, content: m.content })),
        context,
        (delta) => {
          accumulated += delta;
          setStreamingContent(accumulated);
        }
      );

      const aiMsg: Message = { role: 'model', content: fullText, timestamp: new Date() };
      const finalMessages = [...historyWithUser, aiMsg];
      setMessages(finalMessages);
      setStreamingContent('');

      if (session) {
        await updateDoc(doc(db, 'mentorship', session.id), {
          messages: finalMessages,
          lastInteraction: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Mentor error:', err);
      setStreamingContent('');
    } finally {
      setIsTyping(false);
      isTypingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-250px)] bg-[#0a0a0a] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-5 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <BrainCircuit className="w-7 h-7 text-black" />
          </div>
          <div>
            <h3 className="text-lg font-black italic uppercase tracking-tighter text-amber-500">Billionaire Mentor</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">GPT-4o · Streaming</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex gap-3">
            <Tag>Mindset: High Growth</Tag>
            <Tag>Colombia 🇨🇴</Tag>
          </div>
          <button
            onClick={handleReset}
            disabled={isTyping}
            title="Nueva sesión"
            className="p-2.5 rounded-xl text-zinc-500 hover:text-amber-500 hover:bg-zinc-800 transition-all disabled:opacity-40 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            key={i}
            className={cn('flex gap-3 max-w-[88%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}
          >
            <MsgAvatar role={msg.role} />
            <div className={cn('space-y-1', msg.role === 'user' ? 'text-right' : 'text-left')}>
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                {msg.role === 'model' ? 'Billionaire Mentor' : (user?.displayName ?? 'Tú')}
              </p>
              <div className={cn(
                'p-4 rounded-2xl text-sm leading-relaxed',
                msg.role === 'model'
                  ? 'bg-zinc-900 border border-zinc-800 text-zinc-200'
                  : 'bg-amber-500 text-black font-bold'
              )}>
                {msg.role === 'model' ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-amber-400">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Live streaming bubble */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 max-w-[88%]"
            >
              <MsgAvatar role="model" pulsing />
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-sm leading-relaxed text-zinc-200 flex-1 min-w-0">
                {streamingContent ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-strong:text-amber-400">
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-5 bg-zinc-900/30 border-t border-zinc-800">
        <div className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Analiza mi situación, evalúa mi idea, dame el siguiente movimiento... (Enter para enviar, Shift+Enter para nueva línea)"
            className="w-full bg-[#0a0a0a] border border-zinc-700 rounded-2xl py-4 pl-5 pr-14 text-sm focus:outline-none focus:border-amber-500 transition-all font-medium resize-none leading-relaxed"
            style={{ minHeight: '52px', maxHeight: '120px', overflowY: 'auto' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-3 top-3 w-10 h-10 bg-amber-500 text-black rounded-xl flex items-center justify-center hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-center text-zinc-600 font-bold uppercase tracking-widest">
          Powered by GPT-4o · Streaming · Contexto financiero real
        </p>
      </form>
    </div>
  );
}

function MsgAvatar({ role, pulsing }: { role: 'user' | 'model'; pulsing?: boolean }) {
  return (
    <div className={cn(
      'w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 mt-1',
      role === 'model'
        ? 'bg-black border-amber-500/40 text-amber-500'
        : 'bg-white border-zinc-700 text-black'
    )}>
      {role === 'model'
        ? <BrainCircuit className={cn('w-4 h-4', pulsing && 'animate-pulse')} />
        : <User className="w-4 h-4" />
      }
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-zinc-800/60 px-3 py-1.5 rounded-xl text-[10px] font-bold text-zinc-400 uppercase border border-zinc-700/50">
      {children}
    </span>
  );
}
