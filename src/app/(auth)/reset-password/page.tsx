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

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          إعادة تعيين كلمة المرور
        </CardTitle>
        <CardDescription className="text-center">
          أدخل كلمة المرور الجديدة لحسابك
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">كلمة المرور الجديدة</Label>
          <Input id="password" type="password" dir="ltr" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
          <Input id="confirmPassword" type="password" dir="ltr" />
        </div>

        <Button className="w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover font-medium">
          إعادة تعيين كلمة المرور
        </Button>

        <p className="text-center text-sm text-text-muted">
          تم إعادة التعيين بنجاح؟{" "}
          <Link
            href="/login"
            className="text-duck-cyan hover:text-duck-cyan-light font-medium"
          >
            تسجيل الدخول
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
