import { AlertTriangle, XCircle, CheckCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  action?: ToastAction;
}

let toastId = 0;
let listeners: ((toasts: Toast[]) => void)[] = [];
let toastsState: Toast[] = [];

function notify(message: string, type: Toast['type'] = 'info', action?: ToastAction) {
  const id = ++toastId;
  const toast = { id, message, type, action };
  toastsState = [...toastsState, toast];
  listeners.forEach((l) => l(toastsState));
  setTimeout(() => {
    toastsState = toastsState.filter((t) => t.id !== id);
    listeners.forEach((l) => l(toastsState));
  }, action ? 6000 : 4000);
}

function dismiss(id: number) {
  toastsState = toastsState.filter((t) => t.id !== id);
  listeners.forEach((l) => l(toastsState));
}

export const toast = {
  success: (msg: string, action?: ToastAction) => notify(msg, 'success', action),
  error: (msg: string, action?: ToastAction) => notify(msg, 'error', action),
  warning: (msg: string, action?: ToastAction) => notify(msg, 'warning', action),
  info: (msg: string, action?: ToastAction) => notify(msg, 'info', action),
};

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'bg-stock-normal/10 text-stock-normal border-stock-normal/20',
  error: 'bg-stock-rupture/10 text-stock-rupture border-stock-rupture/20',
  warning: 'bg-stock-faible/10 text-stock-faible border-stock-faible/20',
  info: 'bg-accent/10 text-accent border-accent/20',
};

const actionColors = {
  success: 'text-stock-normal hover:bg-stock-normal/20',
  error: 'text-stock-rupture hover:bg-stock-rupture/20',
  warning: 'text-stock-faible hover:bg-stock-faible/20',
  info: 'text-accent hover:bg-accent/20',
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`flex flex-col gap-2 px-4 py-3 rounded-button border ${colors[t.type]} shadow-sm dark:bg-[#1C1F22]`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} />
                <span className="text-sm font-body font-medium flex-1">{t.message}</span>
              </div>
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-button border border-current/20 transition-colors ml-7 ${actionColors[t.type]}`}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
