"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { setToken, getToken, clearToken, isTokenExpired, decodeToken } from "./token"
import * as authApi from "@/lib/api/auth"
import type { User, RegisterInput } from "@/lib/types"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

/** Resolve effective role: user.role (coerced to number) or JWT token role as fallback */
function getEffectiveRole(user: User | null, token: string | null): number | null {
  const fromUser = user?.role != null ? Number(user.role) : NaN
  if (!Number.isNaN(fromUser)) return fromUser
  const decoded = token ? decodeToken(token) : null
  return decoded?.role ?? null
}

export interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  /** Resolved role (0=user, 1=supplier, 2=admin) from user or JWT token */
  effectiveRole: number | null
  login: (email: string, password: string) => Promise<{ error?: string; user?: User }>
  loginWithGoogle: (googleToken: string) => Promise<{ error?: string; user?: User }>
  register: (input: RegisterInput) => Promise<{ error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Sync state when API client signals 401 (e.g. after clearToken + redirect)
  useEffect(() => {
    if (typeof window === "undefined") return
    const handleUnauthorized = () => {
      clearToken()
      setTokenState(null)
      setUser(null)
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized)
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized)
  }, [])

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getToken()

      if (storedToken && !isTokenExpired(storedToken)) {
        setTokenState(storedToken)

        // Fetch user profile
        const { data: userData, error } = await authApi.getMe()
        if (!error && userData) {
          setUser(userData)
        } else {
          // Token invalid or user not found
          clearToken()
          setTokenState(null)
          setUser(null)
        }
      } else if (storedToken) {
        // Token expired
        clearToken()
        setTokenState(null)
        setUser(null)
      }

      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (
    email: string,
    password: string,
  ): Promise<{ error?: string; user?: User }> => {
    setIsLoading(true)
    const { data, error } = await authApi.login(email, password)

    if (error) {
      setIsLoading(false)
      return { error }
    }

    if (data?.token) {
      setToken(data.token)
      setTokenState(data.token)

      // Fetch user profile
      const { data: userData, error: userError } = await authApi.getMe()
      if (!userError && userData) {
        setUser(userData)
      }

      setIsLoading(false)
      return { user: userData ?? undefined }
    }

    setIsLoading(false)
    return { error: "Login failed" }
  }

  const loginWithGoogle = async (
    googleToken: string,
  ): Promise<{ error?: string; user?: User }> => {
    setIsLoading(true)
    const { data, error } = await authApi.loginWithGoogle(googleToken)

    if (error) {
      setIsLoading(false)
      return { error }
    }

    if (data?.token) {
      setToken(data.token)
      setTokenState(data.token)

      // Fetch user profile
      const { data: userData, error: userError } = await authApi.getMe()
      if (!userError && userData) {
        setUser(userData)
      }

      setIsLoading(false)
      return { user: userData ?? undefined }
    }

    setIsLoading(false)
    return { error: "Login failed" }
  }

  const register = async (
    input: RegisterInput,
  ): Promise<{ error?: string }> => {
    setIsLoading(true)
    const { error } = await authApi.register(input)

    if (error) {
      setIsLoading(false)
      return { error }
    }

    // Auto-login after registration
    const loginResult = await login(input.email, input.password)
    setIsLoading(false)
    return loginResult
  }

  const logout = () => {
    clearToken()
    setTokenState(null)
    setUser(null)
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
  }

  const effectiveRole = getEffectiveRole(user, token)

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    effectiveRole,
    login,
    loginWithGoogle,
    register,
    logout,
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </GoogleOAuthProvider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
