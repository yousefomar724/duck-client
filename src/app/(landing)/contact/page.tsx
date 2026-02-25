"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod/v3"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle } from "lucide-react"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import Footer from "@/components/landing/Footer"

const schema = z.object({
  companyName: z
    .string()
    .min(2, "اسم الشركة مطلوب ويجب أن يحتوي على حرفين على الأقل"),
  phone: z.string().min(7, "رقم الهاتف مطلوب"),
  email: z
    .string()
    .email("البريد الإلكتروني غير صالح")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .min(10, "يرجى إدخال تفاصيل الاستفسار (١٠ أحرف على الأقل)"),
  cooperationType: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: "",
      phone: "",
      email: "",
      message: "",
      cooperationType: "",
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function onSubmit(_values: FormValues) {
    setSubmitted(true)
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-duck-navy pt-28 md:pt-44 pb-20 px-4 md:px-10 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="text-duck-cyan text-base block mb-4">
            شراكات وتعاون
          </span>
          <h1 className="text-white text-4xl md:text-6xl font-bold mb-5">
            تواصل معنا
          </h1>
          <p className="text-white/70 text-base md:text-lg leading-relaxed">
            هل تمثل شركة أو مؤسسة وتبحث عن شراكة استراتيجية أو حجوزات جماعية؟
            نحن هنا لنبني معك تجربة فريدة تليق بضيوفك.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="bg-off-white py-20 px-4 md:px-10">
        <div className="max-w-2xl mx-auto">
          {submitted ? (
            <div
              className="bg-white rounded-3xl shadow-lg p-10 text-center"
              dir="rtl"
            >
              <div className="flex justify-center mb-6">
                <CheckCircle className="w-16 h-16 text-duck-yellow" />
              </div>
              <h2 className="text-text-dark text-2xl font-bold mb-3">
                تم إرسال رسالتك بنجاح!
              </h2>
              <p className="text-text-body">
                شكراً على تواصلك معنا. سيتواصل معك فريقنا في أقرب وقت ممكن.
              </p>
            </div>
          ) : (
            <div
              className="bg-white rounded-3xl shadow-lg p-8 md:p-10"
              dir="rtl"
            >
              <h2 className="text-text-dark text-2xl font-bold mb-8">
                أرسل استفسارك
              </h2>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="flex flex-col gap-6"
                >
                  {/* Company Name */}
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-text-dark font-medium">
                          اسم الشركة <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="مثال: شركة الأفق للسياحة"
                            className="rounded-lg border-black/20 focus-visible:ring-duck-cyan focus-visible:border-duck-cyan"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-text-dark font-medium">
                          رقم الهاتف <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+20 100 000 0000"
                            dir="ltr"
                            className="rounded-lg border-black/20 focus-visible:ring-duck-cyan focus-visible:border-duck-cyan text-right"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-text-dark font-medium">
                          البريد الإلكتروني{" "}
                          <span className="text-text-muted text-sm font-normal">
                            (اختياري)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="info@company.com"
                            dir="ltr"
                            className="rounded-lg border-black/20 focus-visible:ring-duck-cyan focus-visible:border-duck-cyan text-right"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Cooperation Type */}
                  <FormField
                    control={form.control}
                    name="cooperationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-text-dark font-medium">
                          نوع التعاون{" "}
                          <span className="text-text-muted text-sm font-normal">
                            (اختياري)
                          </span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          dir="rtl"
                        >
                          <FormControl>
                            <SelectTrigger className="rounded-lg border-black/20 focus:ring-duck-cyan">
                              <SelectValue placeholder="اختر نوع التعاون" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="partnership">
                              شراكة استراتيجية
                            </SelectItem>
                            <SelectItem value="group">حجوزات جماعية</SelectItem>
                            <SelectItem value="media">تغطية إعلامية</SelectItem>
                            <SelectItem value="other">أخرى</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Message */}
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-text-dark font-medium">
                          تفاصيل الاستفسار{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="أخبرنا عن متطلباتك وكيف يمكننا مساعدتك..."
                            rows={5}
                            className="rounded-lg border-black/20 focus-visible:ring-duck-cyan focus-visible:border-duck-cyan resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="bg-duck-yellow text-duck-navy rounded-full px-10 py-3 font-medium hover:bg-duck-yellow/80 transition-colors w-full md:w-auto md:self-start text-base h-auto cursor-pointer"
                  >
                    أرسل الاستفسار
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  )
}
