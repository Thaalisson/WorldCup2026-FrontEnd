import { createContext, useContext, useState, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: number; type: ToastType; message: string };

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function toast(message: string, type: ToastType = 'info') {
    const id = ++counter;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }

  function remove(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  const ICONS = { success: CheckCircle, error: AlertCircle, info: Info };
  const COLORS = {
    success: { bg: '#22C55E18', border: '#22C55E40', text: '#22C55E' },
    error:   { bg: '#EF444418', border: '#EF444440', text: '#EF4444' },
    info:    { bg: '#F9731618', border: '#F9731640', text: '#F97316' },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          const c = COLORS[t.type];
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px',
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 10, backdropFilter: 'blur(8px)',
              color: c.text, fontSize: 13, fontWeight: 600,
              animation: 'fadeIn 0.2s ease',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}>
              <Icon size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, color: '#111827' }}>{t.message}</span>
              <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
