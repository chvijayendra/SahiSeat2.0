'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9)
    
    setToasts((prev) => [...prev, { id, message, type }])

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      removeToast(id)
    }, 4000)
  }, [removeToast])

  // Convenience methods
  const toast = {
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    info: (msg) => showToast(msg, 'info'),
    warning: (msg) => showToast(msg, 'warning'),
  }

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-rose-400" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-400" />
      default:
        return <Info className="h-5 w-5 text-[#A855F7]" />
    }
  }

  const getBorderColorClass = (type) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/35 bg-[#13131A]/95 shadow-[0_0_20px_rgba(16,185,129,0.07)]'
      case 'error':
        return 'border-rose-500/35 bg-[#13131A]/95 shadow-[0_0_20px_rgba(244,63,94,0.07)]'
      case 'warning':
        return 'border-amber-500/35 bg-[#13131A]/95 shadow-[0_0_20px_rgba(245,158,11,0.07)]'
      default:
        return 'border-[#7C3AED]/35 bg-[#13131A]/95 shadow-[0_0_20px_rgba(124,58,237,0.07)]'
    }
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'success':
        return 'Success'
      case 'error':
        return 'Error'
      case 'warning':
        return 'Warning'
      default:
        return 'Notification'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}

      {/* Toast container floating at the top-right */}
      <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(({ id, message, type }) => (
          <div
            key={id}
            className={`pointer-events-auto flex items-start gap-3 w-full border rounded-2xl p-4 shadow-2xl transition-all duration-350 ease-out transform translate-x-0 animate-in slide-in-from-right duration-300 relative overflow-hidden backdrop-blur-xl ${getBorderColorClass(
              type
            )}`}
            role="alert"
          >
            {/* Type Accent Color Indicator Line */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-[4px] ${
                type === 'success'
                  ? 'bg-emerald-500'
                  : type === 'error'
                  ? 'bg-rose-500'
                  : type === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-[#7C3AED]'
              }`}
            />

            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">{getIcon(type)}</div>

            {/* Content */}
            <div className="flex-1 min-w-0 pl-1">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block ${
                  type === 'success'
                    ? 'text-emerald-400'
                    : type === 'error'
                    ? 'text-rose-400'
                    : type === 'warning'
                    ? 'text-amber-400'
                    : 'text-[#A855F7]'
                }`}
              >
                {getTypeLabel(type)}
              </span>
              <p className="text-xs text-[#FAFAFA] font-medium leading-relaxed mt-1 break-words">
                {message}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(id)}
              className="flex-shrink-0 text-[#A1A1AA] hover:text-white transition duration-200 p-0.5 rounded-lg hover:bg-white/5 focus:outline-none cursor-pointer"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
