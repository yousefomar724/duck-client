"use client"

import { create } from "zustand"

export type ToastType = "success" | "error" | "info" | "warning"

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (message: string, type: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message: string, type: ToastType, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    const toast: Toast = { id, message, type, duration }
    set((prev) => ({ toasts: [...prev.toasts, toast] }))

    if (duration) {
      window.setTimeout(() => {
        set((prev) => ({
          toasts: prev.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },
  removeToast: (id: string) =>
    set((prev) => ({ toasts: prev.toasts.filter((t) => t.id !== id) })),
}))

