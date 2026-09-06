import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Minus,
  Send,
  MessageSquare,
  Bot,
  User,
  Loader2,
  Package,
  Search,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Tags,
  TrendingDown,
  Calendar,
  Trophy,
  ClipboardList,
} from 'lucide-react';
import { useAuthStore } from '../hooks/useAuth';
import { assistantApi, type AssistantResponse } from '../api/assistant';

const HISTORY_KEY = 'assistant_history';

function getHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(q: string) {
  const history = getHistory().filter((h) => h !== q);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([q, ...history].slice(0, 10)));
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestion?: string | null;
}

const assistantSuggestions = [
  { icon: Package, label: 'Stock d\'un produit', example: 'Stock de savon noir', color: 'text-accent' },
  { icon: Search, label: 'Chercher un produit', example: 'Cherche beurre', color: 'text-blue-600' },
  { icon: BarChart3, label: 'Ventes du jour', example: 'Ventes du jour', color: 'text-brand-orange' },
  { icon: AlertTriangle, label: 'Produits en rupture', example: 'Produits en rupture', color: 'text-stock-rupture' },
  { icon: TrendingUp, label: 'Produit le + vendu', example: 'Quel produit se vend le plus', color: 'text-stock-normal' },
  { icon: Tags, label: 'Catégories', example: 'Liste des catégories', color: 'text-purple-600' },
];

const adminSuggestions = [
  { icon: TrendingDown, label: 'Produit le - vendu', example: 'Quel produit se vend le moins', color: 'text-stock-critique' },
  { icon: Calendar, label: 'Ventes du mois', example: 'Ventes du mois', color: 'text-blue-600' },
  { icon: Trophy, label: 'Top 5 des ventes', example: 'Top 5 des ventes', color: 'text-brand-orange' },
  { icon: ClipboardList, label: 'Inventaire du jour', example: 'Inventaire du jour', color: 'text-accent' },
];

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

export function AssistantPanel({ isOpen, onClose, onMinimize }: AssistantPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (q: string) => {
    if (!q.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: q.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const res = await assistantApi.query(q);
      const assistantMessage: Message = {
        role: 'assistant',
        content: res.answer,
        suggestion: res.suggestion,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      saveHistory(q.trim());
      setHistory(getHistory());
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Erreur de connexion. Vérifiez votre réseau.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (path: string) => {
    navigate(path);
    onClose();
  };

  const suggestions = user?.role === 'ADMIN'
    ? [...assistantSuggestions, ...adminSuggestions]
    : assistantSuggestions;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="assistant-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
      {isOpen && (
        <motion.div
          key="assistant-panel"
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white dark:bg-[#1C1F22] z-50 flex flex-col shadow-2xl"
          style={{ boxShadow: '-8px 0 40px rgba(0,0,0,0.12)' }}
        >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-white/[0.08] bg-porcelaine/50 dark:bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent dark:bg-[#3ECF8E] flex items-center justify-center">
                  <Bot size={18} className="text-white dark:text-[#121416]" />
                </div>
                <div>
                  <h2 className="text-sm font-heading font-600 text-text-primary dark:text-[#E4E6E9]">
                    Assistant KET SKIN CARE
                  </h2>
                  <p className="text-xs text-text-secondary dark:text-[#8B9199]">
                    Posez vos questions sur le stock
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onMinimize}
                  className="p-2 text-text-secondary dark:text-[#8B9199] hover:text-text-primary dark:hover:text-[#E4E6E9] hover:bg-porcelaine dark:hover:bg-white/[0.05] rounded-button transition-colors"
                  title="Réduire"
                >
                  <Minus size={16} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-text-secondary dark:text-[#8B9199] hover:text-text-primary dark:hover:text-[#E4E6E9] hover:bg-porcelaine dark:hover:bg-white/[0.05] rounded-button transition-colors"
                  title="Fermer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="space-y-5">
                {messages.length === 0 && (
                  <div className="text-center py-2">
                    <div className="w-12 h-12 rounded-full bg-accent/10 dark:bg-[#3ECF8E]/10 flex items-center justify-center mx-auto mb-3">
                      <Bot size={24} className="text-accent dark:text-[#3ECF8E]" />
                    </div>
                    <p className="text-sm font-medium text-text-primary dark:text-[#E4E6E9]">
                      Bonjour {user?.username} !
                    </p>
                    <p className="text-xs text-text-secondary dark:text-[#8B9199] mt-1">
                      Comment puis-je vous aider aujourd'hui ?
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-text-secondary dark:text-[#8B9199] mb-2.5 uppercase tracking-wide">
                    Suggestions
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => handleSubmit(s.example)}
                        className="flex items-start gap-2.5 p-3 bg-porcelaine/60 dark:bg-white/[0.03] hover:bg-porcelaine dark:hover:bg-white/[0.06] border border-border dark:border-white/[0.08] hover:border-accent/20 dark:hover:border-[#3ECF8E]/20 rounded-card text-left transition-all group"
                      >
                        <s.icon size={16} className={`${s.color} mt-0.5 shrink-0 group-hover:scale-110 transition-transform`} />
                        <div>
                          <p className="text-xs font-medium text-text-primary dark:text-[#E4E6E9] leading-tight">{s.label}</p>
                          <p className="text-[10px] text-text-secondary dark:text-[#8B9199] mt-0.5 leading-tight">"{s.example}"</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {messages.length === 0 && history.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-text-secondary dark:text-[#8B9199] mb-2 uppercase tracking-wide">
                      Questions récentes
                    </p>
                    <div className="space-y-1">
                      {history.slice(0, 4).map((h, i) => (
                        <button
                          key={i}
                          onClick={() => handleSubmit(h)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary dark:text-[#8B9199] hover:text-text-primary dark:hover:text-[#E4E6E9] hover:bg-porcelaine dark:hover:bg-white/[0.05] rounded-button transition-colors text-left"
                        >
                          <MessageSquare size={12} className="shrink-0 opacity-40" />
                          <span className="truncate">{h}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-accent dark:bg-[#3ECF8E] text-white dark:text-[#121416] rounded-2xl rounded-br-md'
                        : 'bg-porcelaine dark:bg-white/[0.05] text-text-primary dark:text-[#E4E6E9] border border-border dark:border-white/[0.08] rounded-2xl rounded-bl-md'
                    } px-4 py-3`}
                  >
                    <div className="flex items-start gap-2">
                      {msg.role === 'assistant' && (
                        <Bot size={14} className="text-accent dark:text-[#3ECF8E] mt-0.5 shrink-0" />
                      )}
                      {msg.role === 'user' && (
                        <User size={14} className="text-white/70 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                        {msg.suggestion && (
                          <button
                            onClick={() => handleSuggestion(msg.suggestion!)}
                            className="mt-2 text-xs font-medium underline opacity-80 hover:opacity-100 transition-opacity"
                          >
                            Voir la page →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bot size={14} className="text-accent dark:text-[#3ECF8E]" />
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-accent/40 dark:bg-[#3ECF8E]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-accent/40 dark:bg-[#3ECF8E]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-accent/40 dark:bg-[#3ECF8E]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="px-5 py-4 border-t border-border dark:border-white/[0.08] bg-white dark:bg-[#1C1F22]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(query);
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') onClose();
                  }}
                  placeholder="Tapez votre question..."
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm outline-none focus:border-accent/40 dark:focus:border-[#3ECF8E]/40 transition-colors placeholder:text-text-secondary/50 dark:placeholder:text-[#8B9199]/50 disabled:opacity-50 text-text-primary dark:text-[#E4E6E9]"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className="w-11 h-11 bg-accent hover:bg-accent-hover disabled:bg-accent/40 dark:bg-[#3ECF8E] dark:hover:bg-[#5BE8A8] dark:disabled:bg-[#3ECF8E]/40 text-white dark:text-[#121416] rounded-button flex items-center justify-center transition-colors shrink-0"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
