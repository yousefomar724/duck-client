"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useGoogleLogin } from "@react-oauth/google"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth/auth-context"

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error: loginError } = await login(email, password)
    if (loginError) {
      setError(loginError)
      setIsLoading(false)
    } else {
      router.replace("/supplier/my-trips")
    }
  }

  const handleGoogleSuccess = useCallback(
    async (tokenResponse: { access_token: string }) => {
      setIsGoogleLoading(true)
      setError(null)

      const { error: googleError } = await loginWithGoogle(
        tokenResponse.access_token,
      )

      if (googleError) {
        setError(googleError)
        setIsGoogleLoading(false)
      } else {
        router.replace("/supplier/my-trips")
      }
    },
    [loginWithGoogle, router],
  )

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setError("فشل تسجيل الدخول بحساب جوجل")
      setIsGoogleLoading(false)
    },
  })

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center text-duck-navy">
          تسجيل الدخول
        </CardTitle>
        <CardDescription className="text-center text-text-muted">
          أدخل بريدك الإلكتروني وكلمة المرور للدخول إلى حسابك
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/50 border-gray-200 focus:border-duck-cyan focus:ring-duck-cyan/20"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">كلمة المرور</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-duck-cyan hover:text-duck-cyan-light transition-colors"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/50 border-gray-200 focus:border-duck-cyan focus:ring-duck-cyan/20"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover font-bold shadow-md transition-all hover:shadow-lg"
          >
            {isLoading ? "جاري التحميل..." : "تسجيل الدخول"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <Separator className="bg-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-text-muted rounded-full border border-gray-100">
              او المتابعة عبر
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full bg-white hover:bg-gray-50 border-gray-200 text-text-body"
          type="button"
          disabled={isGoogleLoading || isLoading}
          onClick={() => googleLogin()}
        >
          <svg className="ml-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {isGoogleLoading ? "جاري التحميل..." : "تسجيل الدخول بحساب جوجل"}
        </Button>

        <p className="text-center text-sm text-text-muted mt-4">
          ليس لديك حساب؟{" "}
          <Link
            href="/register"
            className="text-duck-cyan hover:text-duck-cyan-light font-bold transition-colors"
          >
            سجل كمزود خدمة
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
