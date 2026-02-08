"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import PageHeader from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { mockTrips } from "@/lib/mock-data"
import { currencies } from "@/lib/constants"

interface EditTripPageProps {
  params: Promise<{ id: string }>
}

export default function EditTripPage({ params }: EditTripPageProps) {
  const router = useRouter()
  const [tripId, setTripId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name_ar: "",
    description_ar: "",
    destination: "",
    location: "",
    price: "",
    currency: "EGP",
    refundable: true,
    cancelation_policy_ar: "",
    from: "",
    to: "",
    max_guests: "",
    images: ["", "", ""],
  })

  useEffect(() => {
    params.then((resolvedParams) => {
      const id = resolvedParams.id
      setTripId(id)

      // Find the trip from mock data
      const trip = mockTrips.find((t) => t.id === parseInt(id))

      if (trip) {
        setFormData({
          name_ar: trip.name.ar,
          description_ar: trip.description.ar,
          destination: trip.destination,
          location: trip.location,
          price: trip.price.toString(),
          currency: trip.currency,
          refundable: trip.refundable,
          cancelation_policy_ar: trip.cancelation_policy.ar,
          from: trip.from,
          to: trip.to,
          max_guests: trip.max_guests.toString(),
          images: [
            trip.images[0] || "",
            trip.images[1] || "",
            trip.images[2] || "",
          ],
        })
      }
    })
  }, [params])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would call an API to update the trip
    console.log("Update trip:", tripId, formData)
    router.push("/supplier/my-trips")
  }

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images]
    newImages[index] = value
    setFormData({ ...formData, images: newImages })
  }

  return (
    <div className="p-6">
      <PageHeader title="تعديل الرحلة" />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-duck-navy border-b pb-2">
                المعلومات الأساسية
              </h2>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name_ar">اسم الرحلة</Label>
                  <Input
                    id="name_ar"
                    value={formData.name_ar}
                    onChange={(e) =>
                      setFormData({ ...formData, name_ar: e.target.value })
                    }
                    placeholder="مثال: جولة الكاياك على النيل"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description_ar">الوصف</Label>
                  <Textarea
                    id="description_ar"
                    value={formData.description_ar}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description_ar: e.target.value,
                      })
                    }
                    placeholder="وصف تفصيلي للرحلة..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="destination">الوجهة</Label>
                    <Input
                      id="destination"
                      value={formData.destination}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          destination: e.target.value,
                        })
                      }
                      placeholder="مثال: نهر النيل - أسوان"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">الموقع</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      placeholder="مثال: جزيرة الفنتين"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-duck-navy border-b pb-2">
                الأسعار والإلغاء
              </h2>
              <div className="grid gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">السعر</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="180"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">العملة</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) =>
                        setFormData({ ...formData, currency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem
                            key={currency.value}
                            value={currency.value}
                          >
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="refundable">قابل للاسترداد</Label>
                  <Switch
                    id="refundable"
                    checked={formData.refundable}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, refundable: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancelation_policy_ar">سياسة الإلغاء</Label>
                  <Textarea
                    id="cancelation_policy_ar"
                    value={formData.cancelation_policy_ar}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cancelation_policy_ar: e.target.value,
                      })
                    }
                    placeholder="مثال: يمكن الإلغاء قبل 24 ساعة من موعد الرحلة"
                    rows={3}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-duck-navy border-b pb-2">
                الجدول الزمني
              </h2>
              <div className="grid gap-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from">من تاريخ</Label>
                    <Input
                      id="from"
                      type="date"
                      value={formData.from}
                      onChange={(e) =>
                        setFormData({ ...formData, from: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="to">إلى تاريخ</Label>
                    <Input
                      id="to"
                      type="date"
                      value={formData.to}
                      onChange={(e) =>
                        setFormData({ ...formData, to: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_guests">عدد الضيوف الأقصى</Label>
                    <Input
                      id="max_guests"
                      type="number"
                      value={formData.max_guests}
                      onChange={(e) =>
                        setFormData({ ...formData, max_guests: e.target.value })
                      }
                      placeholder="10"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Images Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-duck-navy border-b pb-2">
                الصور
              </h2>
              <div className="grid gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="space-y-2">
                    <Label htmlFor={`image-${index}`}>
                      رابط الصورة {index + 1}
                    </Label>
                    <Input
                      id={`image-${index}`}
                      type="url"
                      value={image}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy font-bold"
              >
                حفظ التغييرات
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
