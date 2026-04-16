'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  action?: { label: string; onClick: () => void }
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], action?: Toast['action']) => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: Toast['type'] = 'info', action?: Toast['action']) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type, action }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, action ? 10000 : 4000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const bgColors = {
    success: 'bg-emerald-800 text-white',
    error: 'bg-red-700 text-white',
    info: 'bg-stone-800 text-white',
    warning: 'bg-amber-600 text-white',
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`${bgColors[toast.type]} px-5 py-3 rounded-lg shadow-lg flex items-center gap-4 text-sm animate-[slideUp_0.2s_ease-out]`}
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick()
                  dismiss(toast.id)
                }}
                className="font-semibold underline underline-offset-2 hover:opacity-80"
              >
                {toast.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(toast.id)}
              className="ml-1 opacity-60 hover:opacity-100"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
