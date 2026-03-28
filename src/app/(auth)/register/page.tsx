"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/stores/auth-store"

type RegisterKind = "user" | "supplier"

export default function RegisterPage() {
  const t = useTranslations("auth.register")
  const { register, loginWithGoogle } = useAuth()
  const searchParams = useSearchParams()
  const initialType: RegisterKind =
    searchParams.get("type") === "supplier" ? "supplier" : "user"

  const [registerType, setRegisterType] = useState<RegisterKind>(initialType)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    phone_number: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const content = useMemo(() => {
    const isSupplier = registerType === "supplier"
    return {
      role: isSupplier ? 1 : (0 as 0 | 1),
      title: isSupplier ? t("titleSupplier") : t("titleUser"),
      description: isSupplier ? t("descriptionSupplier") : t("descriptionUser"),
      usernameLabel: isSupplier ? t("usernameSupplier") : t("usernameUser"),
      usernamePlaceholder: isSupplier
        ? t("usernamePlaceholderSupplier")
        : t("usernamePlaceholderUser"),
      redirectPath: isSupplier ? "/supplier/onboarding" : "/",
    }
  }, [registerType, t])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    const fieldMap: Record<string, string> = {
      firstName: "first_name",
      lastName: "last_name",
      usernameField: "username",
      phone: "phone_number",
      confirmPassword: "confirmPassword",
    }
    const fieldName = fieldMap[id] || id
    setFormData((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError(t("passwordMismatch"))
      return
    }

    if (
      !formData.first_name ||
      !formData.last_name ||
      !formData.username ||
      !formData.email ||
      !formData.password
    ) {
      setError(t("fillRequired"))
      return
    }

    setIsLoading(true)

    const { error: registerError } = await register({
      first_name: formData.first_name,
      last_name: formData.last_name,
      username: formData.username,
      email: formData.email,
      phone_number: formData.phone_number || undefined,
      password: formData.password,
      role: content.role,
    })

    if (registerError) {
      setError(registerError)
      setIsLoading(false)
      return
    }

    window.location.assign(content.redirectPath)
  }

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string
  }) => {
    if (!credentialResponse.credential) return
    setIsGoogleLoading(true)
    setError(null)

    console.log(credentialResponse.credential)

    const { error: googleError } = await loginWithGoogle(
      credentialResponse.credential,
    )

    if (googleError) {
      setError(googleError)
      setIsGoogleLoading(false)
      return
    }

    window.location.assign("/supplier/onboarding")
  }

  const handleGoogleError = () => {
    setError(t("googleError"))
    setIsGoogleLoading(false)
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
      <CardHeader className="space-y-3">
        <Tabs
          value={registerType}
          onValueChange={(v) => setRegisterType(v as RegisterKind)}
        >
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="user">{t("userTab")}</TabsTrigger>
            <TabsTrigger value="supplier">{t("supplierTab")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <CardTitle className="text-2xl text-center text-duck-navy">
          {content.title}
        </CardTitle>
        <CardDescription className="text-center text-text-muted">
          {content.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t("firstName")}</Label>
              <Input
                id="firstName"
                placeholder={t("firstNamePlaceholder")}
                value={formData.first_name}
                onChange={handleChange}
                required
                className="bg-white/50 border-gray-200 focus:border-duck-cyan focus:ring-duck-cyan/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t("lastName")}</Label>
              <Input
                id="lastName"
                placeholder={t("lastNamePlaceholder")}
                value={formData.last_name}
                onChange={handleChange}
                required
                className="bg-white/50 border-gray-200 focus:border-duck-cyan focus:ring-duck-cyan/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="usernameField">{content.usernameLabel}</Label>
            <Input
              id="usernameField"
              placeholder={content.usernamePlaceholder}
              value={formData.username}
              onChange={handleChange}
              required
              className="bg-white/50 border-gray-200 focus:border-duck-cyan focus:ring-duck-cyan/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              dir="ltr"
              value={formData.email}
              onChange={handleChange}
              required
              className="bg-white/50 border-gray-200 focus:border-duck-cyan focus:ring-duck-cyan/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+20 123 456 7890"
              dir="ltr"
              value={formData.phone_number}
              onChange={handleChange}
              className="bg-white/50 border-gray-200 focus:border-duck-cyan focus:ring-duck-cyan/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              value={formData.password}
              onChange={handleChange}
              required
              className="bg-white/50 border-gray-200 focus:border-duck-cyan focus:ring-duck-cyan/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              dir="ltr"
              value={formData.confirmPassword}
              onChange={handleChange}
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

        {registerType === "supplier" && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <Separator className="bg-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-text-muted rounded-full border border-gray-100">
                  {t("orRegisterWith")}
                </span>
              </div>
            </div>

            <div
              className="relative flex justify-center [&_iframe]:max-w-full!"
              style={{
                pointerEvents:
                  isGoogleLoading || isLoading ? "none" : undefined,
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
                text="signup_with"
                shape="rectangular"
                width="320"
              />
            </div>
          </>
        )}

        <p className="text-center text-sm text-text-muted mt-4">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="text-duck-cyan hover:text-duck-cyan-light font-bold transition-colors"
          >
            {t("loginLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
