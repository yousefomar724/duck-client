"use client"

import Link from "next/link"
import { AlertCircle, ArrowRight, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function BookingFailedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-duck-cyan/5 to-duck-yellow/5">
      <div className="w-full max-w-md">
        <Card className="border-destructive/30 bg-white shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-destructive" />
            </div>
            <CardTitle className="text-3xl text-duck-navy">فشل الحجز</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-text-dark font-medium">
                للأسف، لم يتمكن النظام من معالجة حجزك
              </p>
              <p className="text-text-body text-sm">
                قد يكون هناك مشكلة في عملية الدفع أو انقطاع في الاتصال. يرجى المحاولة مرة أخرى.
              </p>
            </div>

            <div className="bg-off-white rounded-lg p-4 border border-destructive/20 space-y-3">
              <h3 className="font-semibold text-duck-navy">أسباب محتملة:</h3>
              <ul className="space-y-2 text-sm text-text-body">
                <li className="flex gap-2">
                  <span className="text-destructive">⚠</span>
                  <span>بيانات بطاقة الائتمان غير صحيحة</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-destructive">⚠</span>
                  <span>عدم توفر رصيد كافي</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-destructive">⚠</span>
                  <span>انقطاع في الاتصال بالإنترنت</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-destructive">⚠</span>
                  <span>انقضاء صلاحية الجلسة</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                asChild
                className="w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover font-medium rounded-full"
              >
                <Link href="/book">
                  <RefreshCw className="w-4 h-4 ms-1" />
                  حاول مجددا
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-duck-navy/30 text-duck-navy hover:bg-duck-navy/5 rounded-full"
              >
                <Link href="/">
                  العودة إلى الصفحة الرئيسية
                  <ArrowRight className="w-4 h-4 ms-1" />
                </Link>
              </Button>
            </div>

            <div className="text-center space-y-2 text-xs text-text-muted border-t border-border pt-4">
              <p>هل تحتاج إلى مساعدة؟</p>
              <a
                href="https://wa.me/201550061006"
                target="_blank"
                rel="noopener noreferrer"
                className="text-duck-cyan hover:text-duck-cyan-light font-medium"
              >
                اتصل بنا عبر WhatsApp
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
