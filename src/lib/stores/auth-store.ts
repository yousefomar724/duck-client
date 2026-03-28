"use client"

import { create } from "zustand"
import {
  clearToken,
  decodeToken,
  getToken,
  isTokenExpired,
  setToken,
} from "@/lib/auth/token"
import * as authApi from "@/lib/api/auth"
import * as suppliersApi from "@/lib/api/suppliers"
import * as supplierStorageApi from "@/lib/api/supplier-storage"
import type { RegisterInput, SupplierStorage, User } from "@/lib/types"

const ONBOARDING_SKIPPED_KEY_PREFIX = "duck_onboarding_skipped_"

function getEffectiveRole(user: User | null, token: string | null): number | null {
  const fromUser = user?.role != null ? Number(user.role) : NaN
  if (!Number.isNaN(fromUser)) return fromUser
  const decoded = token ? decodeToken(token) : null
  return decoded?.role ?? null
}

function isNotFoundError(err: string | null | undefined): boolean {
  if (!err) return false
  const lower = err.toLowerCase()
  return lower.includes("not found") || lower.includes("404")
}

async function fetchSupplierAboutAnyLang(supplierId: number): Promise<boolean> {
  const [arRes, enRes] = await Promise.all([
    suppliersApi.getSupplier(supplierId, "ar"),
    suppliersApi.getSupplier(supplierId, "en"),
  ])

  const arAbout = arRes.data?.about ?? ""
  const enAbout = enRes.data?.about ?? ""

  const aboutArFilled = typeof arAbout === "string" && arAbout.trim().length > 0
  const aboutEnFilled = typeof enAbout === "string" && enAbout.trim().length > 0
  return aboutArFilled || aboutEnFilled
}

function hasAnyResources(
  resources: SupplierStorage["resources"] | unknown | undefined | null,
): boolean {
  if (!resources || typeof resources !== "object") return false
  const vals = Object.values(resources as Record<string, unknown>)
  return vals.some((v) => {
    const n = typeof v === "number" ? v : parseInt(String(v), 10)
    return Number.isFinite(n) && n > 0
  })
}

type AuthStore = {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  effectiveRole: number | null

  onboardingComplete: boolean | null
  onboardingSkipped: boolean

  _initialized: boolean

  initialize: () => Promise<void>
  refreshUser: () => Promise<void>
  refreshOnboardingStatus: () => Promise<void>

  login: (
    email: string,
    password: string,
  ) => Promise<{ error?: string; user?: User }>
  /** Google Sign-In (supplier flows only in UI). Sends Google ID token as `google_token` to the API. */
  loginWithGoogle: (
    googleToken: string,
  ) => Promise<{ error?: string; user?: User }>
  register: (input: RegisterInput) => Promise<{ error?: string }>
  logout: () => void
  /** Clear stored token and user state without navigating (e.g. wrong role after Google). */
  clearSession: () => void

  markOnboardingSkipped: () => void
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  effectiveRole: null,

  onboardingComplete: null,
  onboardingSkipped: false,

  _initialized: false,

  initialize: async () => {
    if (get()._initialized) return
    set({ isLoading: true })

    const storedToken = getToken()
    if (storedToken && !isTokenExpired(storedToken)) {
      set({ token: storedToken, isAuthenticated: false })
      const { data: userData, error } = await authApi.getMe()
      if (!error && userData) {
        set({ user: userData, isAuthenticated: true })
        const effectiveRole = getEffectiveRole(userData, storedToken)
        set({ effectiveRole })
        await get().refreshOnboardingStatus()
      } else {
        clearToken()
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          effectiveRole: null,
          onboardingComplete: null,
        })
      }
    } else if (storedToken) {
      clearToken()
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        effectiveRole: null,
        onboardingComplete: null,
      })
    } else {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        effectiveRole: null,
        onboardingComplete: null,
      })
    }

    set({ isLoading: false, _initialized: true })
  },

  refreshUser: async () => {
    const token = getToken()
    if (!token || isTokenExpired(token)) {
      clearToken()
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        effectiveRole: null,
        onboardingComplete: null,
        onboardingSkipped: false,
      })
      return
    }

    set({ token })
    const { data: userData, error } = await authApi.getMe()
    if (error || !userData) {
      clearToken()
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        effectiveRole: null,
        onboardingComplete: null,
        onboardingSkipped: false,
      })
      return
    }

    const effectiveRole = getEffectiveRole(userData, token)
    set({
      user: userData,
      effectiveRole,
      isAuthenticated: true,
      onboardingComplete: null,
    })
    await get().refreshOnboardingStatus()
  },

  refreshOnboardingStatus: async () => {
    const { user } = get()
    if (!user) {
      set({ onboardingComplete: null, onboardingSkipped: false })
      return
    }

    if (user.role !== 1 || user.supplier_id == null) {
      set({ onboardingComplete: true, onboardingSkipped: false })
      return
    }

    const supplierId = user.supplier_id
    const skippedKey = `${ONBOARDING_SKIPPED_KEY_PREFIX}${supplierId}`
    const onboardingSkipped = typeof window !== "undefined" ? localStorage.getItem(skippedKey) === "1" : false

    // Storage completeness
    const { data: storageData, error: storageErr } = await supplierStorageApi.getStorage(supplierId)
    const storageComplete = storageData
      ? hasAnyResources(storageData.resources)
      : false
    if (!storageData && storageErr && !isNotFoundError(storageErr)) {
      // If storage endpoint fails for reasons other than "not found", be conservative.
      set({ onboardingComplete: false, onboardingSkipped })
      return
    }

    // About completeness
    let aboutComplete = false
    try {
      aboutComplete = await fetchSupplierAboutAnyLang(supplierId)
    } catch {
      aboutComplete = false
    }

    const onboardingComplete = storageComplete && aboutComplete
    if (onboardingComplete) {
      if (typeof window !== "undefined") localStorage.removeItem(skippedKey)
    }

    set({ onboardingComplete, onboardingSkipped: onboardingComplete ? false : onboardingSkipped })
  },

  login: async (email, password) => {
    set({ isLoading: true })
    const { data, error } = await authApi.login(email, password)
    if (error) {
      set({ isLoading: false })
      return { error }
    }
    if (!data?.token) {
      set({ isLoading: false })
      return { error: "Login failed" }
    }

    setToken(data.token)
    set({ token: data.token })
    const { data: userData, error: userError } = await authApi.getMe()
    if (userError || !userData) {
      clearToken()
      set({ token: null, user: null, isLoading: false })
      return { error: userError ?? "Login failed" }
    }

    const effectiveRole = getEffectiveRole(userData, data.token)
    set({ user: userData, effectiveRole, isAuthenticated: true })

    await get().refreshOnboardingStatus()
    set({ isLoading: false })
    return { user: userData }
  },

  loginWithGoogle: async (googleToken) => {
    const normalized = authApi.normalizeGoogleIdToken(googleToken)
    if (!normalized) {
      return { error: "Invalid Google sign-in. Please try again." }
    }

    set({ isLoading: true })
    const { data, error } = await authApi.loginWithGoogle(normalized)
    if (error) {
      set({ isLoading: false })
      return { error }
    }
    if (!data?.token) {
      set({ isLoading: false })
      return { error: "Login failed" }
    }

    setToken(data.token)
    set({ token: data.token })
    const { data: userData, error: userError } = await authApi.getMe()
    if (userError || !userData) {
      clearToken()
      set({ token: null, user: null, isLoading: false })
      return { error: userError ?? "Login failed" }
    }

    const effectiveRole = getEffectiveRole(userData, data.token)
    set({ user: userData, effectiveRole, isAuthenticated: true })

    await get().refreshOnboardingStatus()
    set({ isLoading: false })
    return { user: userData }
  },

  register: async (input) => {
    set({ isLoading: true })
    const { error } = await authApi.register(input)
    if (error) {
      set({ isLoading: false })
      return { error }
    }

    // Auto-login after registration.
    const loginResult = await get().login(input.email, input.password)
    set({ isLoading: false })
    return { error: loginResult.error }
  },

  logout: () => {
    clearToken()
    set({
      user: null,
      token: null,
      effectiveRole: null,
      isAuthenticated: false,
      onboardingComplete: null,
      onboardingSkipped: false,
    })
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
  },

  clearSession: () => {
    clearToken()
    set({
      user: null,
      token: null,
      effectiveRole: null,
      isAuthenticated: false,
      onboardingComplete: null,
      onboardingSkipped: false,
      isLoading: false,
    })
  },

  markOnboardingSkipped: () => {
    const { user } = get()
    if (!user || user.supplier_id == null) return
    const skippedKey = `${ONBOARDING_SKIPPED_KEY_PREFIX}${user.supplier_id}`
    if (typeof window !== "undefined") localStorage.setItem(skippedKey, "1")
    set({ onboardingSkipped: true })
  },
}))

