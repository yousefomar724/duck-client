"use client"

import Link from "next/link"
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
import { ArrowRight } from "lucide-react"

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">نسيت كلمة المرور</CardTitle>
        <CardDescription className="text-center">
          أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            dir="ltr"
          />
        </div>

        <Button className="w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover font-medium">
          إرسال رابط إعادة التعيين
        </Button>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-duck-cyan hover:text-duck-cyan-light"
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            العودة إلى تسجيل الدخول
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
