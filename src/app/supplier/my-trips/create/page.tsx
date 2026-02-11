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
import { currencies } from "@/lib/constants"
import * as tripsApi from "@/lib/api/trips"
import * as imagesApi from "@/lib/api/images"
import * as destinationsApi from "@/lib/api/destinations"
import { Destination } from "@/lib/types"
import { ErrorDisplay } from "@/components/shared/error-display"

export default function CreateTripPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name_ar: "",
    name_en: "",
    description_ar: "",
    description_en: "",
    destination: false,
    location: false,
    destination_ids: [] as number[],
    price: "",
    currency: "EGP",
    refundable: true,
    cancelation_policy_ar: "",
    cancelation_policy_en: "",
    from: "",
    to: "",
    max_guests: "",
  })
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDestinations = async () => {
      const { data, error: fetchError } = await destinationsApi.getDestinations("ar")
      if (fetchError) {
        setError(fetchError)
      } else {
        setDestinations(data || [])
      }
      setIsLoadingDestinations(false)
    }
    fetchDestinations()
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Upload images first
      const uploadedImages: { [key: string]: string } = {}
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        const { data: imageData, error: uploadError } = await imagesApi.uploadImage(file)
        if (uploadError) {
          throw new Error(`خطأ في تحميل الصورة: ${uploadError}`)
        }
        if (imageData?.image_url) {
          uploadedImages[`image_${i}`] = imageData.image_url
        }
      }

      // Create trip with uploaded image URLs
      const { error: createError } = await tripsApi.createTrip({
        name: {
          ar: formData.name_ar,
          en: formData.name_en,
        },
        description: {
          ar: formData.description_ar,
          en: formData.description_en,
        },
        destination: formData.destination,
        location: formData.location,
        price: parseFloat(formData.price),
        currency: formData.currency,
        refundable: formData.refundable,
        cancelation_policy: {
          ar: formData.cancelation_policy_ar,
          en: formData.cancelation_policy_en,
        },
        from: formData.from,
        to: formData.to,
        max_guests: parseInt(formData.max_guests),
        images: uploadedImages,
      })

      if (createError) {
        throw new Error(createError)
      }

      router.push("/supplier/my-trips")
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6">
      <PageHeader title="اضافة رحلة جديدة" />

      <Card>
        <CardContent className="p-6">
          {error && <ErrorDisplay error={error} onRetry={() => setError(null)} showRetry={false} />}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-duck-navy border-b pb-2">
                المعلومات الأساسية
              </h2>
              <div className="grid gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name_ar">اسم الرحلة (عربي)</Label>
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
                    <Label htmlFor="name_en">اسم الرحلة (English)</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) =>
                        setFormData({ ...formData, name_en: e.target.value })
                      }
                      placeholder="Example: Kayak Tour on the Nile"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description_ar">الوصف (عربي)</Label>
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
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description_en">الوصف (English)</Label>
                  <Textarea
                    id="description_en"
                    value={formData.description_en}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description_en: e.target.value,
                      })
                    }
                    placeholder="Detailed description of the trip..."
                    rows={3}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      id="destination"
                      type="checkbox"
                      checked={formData.destination}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          destination: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <Label htmlFor="destination" className="mb-0">هذه الرحلة لها وجهة محددة</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="location"
                      type="checkbox"
                      checked={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <Label htmlFor="location" className="mb-0">هذه الرحلة لها موقع محدد</Label>
                  </div>
                </div>

                {formData.destination && (
                  <div className="space-y-2">
                    <Label htmlFor="destination_ids">اختر الوجهات</Label>
                    {isLoadingDestinations ? (
                      <p className="text-sm text-text-muted">جاري التحميل...</p>
                    ) : destinations.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {destinations.map((dest) => (
                          <div key={dest.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`dest-${dest.id}`}
                              checked={formData.destination_ids.includes(dest.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    destination_ids: [...formData.destination_ids, dest.id],
                                  })
                                } else {
                                  setFormData({
                                    ...formData,
                                    destination_ids: formData.destination_ids.filter(
                                      (id) => id !== dest.id
                                    ),
                                  })
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <Label htmlFor={`dest-${dest.id}`} className="mb-0 text-sm">
                              {typeof dest.name === 'string' ? dest.name : dest.name?.ar || 'Destination'}
                            </Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted">لا توجد وجهات متاحة</p>
                    )}
                  </div>
                )}
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
                      step="0.01"
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
                  <Label htmlFor="cancelation_policy_ar">سياسة الإلغاء (عربي)</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="cancelation_policy_en">سياسة الإلغاء (English)</Label>
                  <Textarea
                    id="cancelation_policy_en"
                    value={formData.cancelation_policy_en}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cancelation_policy_en: e.target.value,
                      })
                    }
                    placeholder="Example: Cancellation allowed 24 hours before trip"
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
                <div className="space-y-2">
                  <Label htmlFor="images">اختر صور الرحلة</Label>
                  <Input
                    id="images"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-text-muted">
                    يمكنك اختيار عدة صور. سيتم تحميلها تلقائياً عند حفظ الرحلة.
                  </p>
                </div>
                {imageFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">الصور المختارة:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {imageFiles.map((file, index) => (
                        <div
                          key={index}
                          className="relative w-full aspect-square bg-gray-100 rounded border border-gray-300 flex items-center justify-center overflow-hidden"
                        >
                          {file.type.startsWith('image/') && (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-50 text-white text-xs p-1 rounded truncate">
                            {file.name.substring(0, 15)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy font-bold"
              >
                {isLoading ? "جاري الحفظ..." : "حفظ الرحلة"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
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
