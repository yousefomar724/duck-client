"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { setToken, getToken, clearToken, isTokenExpired } from "./token"
import * as authApi from "@/lib/api/auth"
import type { User, RegisterInput } from "@/lib/types"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

export interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ error?: string }>
  loginWithGoogle: (googleToken: string) => Promise<{ error?: string }>
  register: (input: RegisterInput) => Promise<{ error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
  ): Promise<{ error?: string }> => {
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
      return {}
    }

    setIsLoading(false)
    return { error: "Login failed" }
  }

  const loginWithGoogle = async (
    googleToken: string,
  ): Promise<{ error?: string }> => {
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
      return {}
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

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
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
