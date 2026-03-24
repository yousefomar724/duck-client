"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { GoogleLogin } from "@react-oauth/google"
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

function getRedirectPath(returnUrl: string | null, userRole?: unknown): string {
  if (returnUrl) {
    try {
      const decoded = decodeURIComponent(returnUrl)
      if (decoded.startsWith("/")) return decoded
    } catch {
      // invalid URL, fall through to default
    }
  }
  const role = userRole != null ? Number(userRole) : NaN
  if (role === 2) return "/admin/dashboard"
  if (role === 1) return "/supplier/my-trips"
  return "/"
}

function LoginFormContent() {
  const t = useTranslations("auth.login")
  const { login, loginWithGoogle } = useAuth()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error: loginError, user } = await login(email, password)
    if (loginError) {
      setError(loginError)
      setIsLoading(false)
    } else {
      const returnUrl = searchParams.get("returnUrl")
      const path = getRedirectPath(returnUrl, user?.role)
      window.location.assign(path)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string
  }) => {
    if (!credentialResponse.credential) return
    setIsGoogleLoading(true)
    setError(null)

    const { error: googleError, user } = await loginWithGoogle(
      credentialResponse.credential,
    )

    if (googleError) {
      setError(googleError)
      setIsGoogleLoading(false)
    } else {
      const returnUrl = searchParams.get("returnUrl")
      const path = getRedirectPath(returnUrl, user?.role)
      window.location.assign(path)
    }
  }

  const handleGoogleError = () => {
    setError(t("googleError"))
    setIsGoogleLoading(false)
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center text-duck-navy">
          {t("title")}
        </CardTitle>
        <CardDescription className="text-center text-text-muted">
          {t("description")}
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
            <Label htmlFor="email">{t("email")}</Label>
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
              <Label htmlFor="password">{t("password")}</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-duck-cyan hover:text-duck-cyan-light transition-colors"
              >
                {t("forgotPassword")}
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
            {isLoading ? t("loading") : t("submit")}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <Separator className="bg-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-text-muted rounded-full border border-gray-100">
              {t("orContinueWith")}
            </span>
          </div>
        </div>

        <div
          className="relative flex justify-center [&_iframe]:max-w-full!"
          style={{
            pointerEvents: isGoogleLoading || isLoading ? "none" : undefined,
          }}
        >
          {isGoogleLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/80 text-sm text-text-muted">
              {t("loading")}
            </div>
          )}
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            text="signin_with"
            shape="rectangular"
            width="320"
          />
        </div>

        <p className="text-center text-sm text-text-muted mt-4">
          {t("noAccount")}{" "}
          <Link
            href="/register"
            className="text-duck-cyan hover:text-duck-cyan-light font-bold transition-colors"
          >
            {t("createAccount")}
          </Link>{" "}
          |{" "}
          <Link
            href="/register?type=supplier"
            className="text-duck-cyan hover:text-duck-cyan-light font-bold transition-colors"
          >
            {t("registerAsSupplier")}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

function LoginFormFallback() {
  return (
    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl animate-pulse">
      <CardHeader className="space-y-1">
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
        <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded" />
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginFormContent />
    </Suspense>
  )
}
