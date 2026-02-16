/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback } from "react"
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
import * as destinationsApi from "@/lib/api/destinations"
import { DetailPageSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import type { Trip, Destination } from "@/lib/types"

interface EditTripPageProps {
  params: Promise<{ id: string }>
}

export default function EditTripPage({ params }: EditTripPageProps) {
  const router = useRouter()
  const [tripId, setTripId] = useState<number | null>(null)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDestinationIds, setSelectedDestinationIds] = useState<
    number[]
  >([])
  const [formData, setFormData] = useState({
    name_ar: "",
    name_en: "",
    description_ar: "",
    description_en: "",
    destination_toggle: false,
    location_toggle: false,
    price: "",
    currency: "EGP",
    refundable: true,
    cancelation_policy_ar: "",
    cancelation_policy_en: "",
    from: "",
    to: "",
    max_guests: "",
    images: ["", "", ""],
  })

  const populateForm = (tripData: Trip) => {
    const tripName =
      typeof tripData.name === "string"
        ? { ar: tripData.name, en: "" }
        : tripData.name
    const tripDesc =
      typeof tripData.description === "string"
        ? { ar: tripData.description, en: "" }
        : tripData.description
    const tripPolicy =
      typeof tripData.cancelation_policy === "string"
        ? { ar: tripData.cancelation_policy, en: "" }
        : tripData.cancelation_policy

    const imageUrls: string[] = []
    if (Array.isArray(tripData.images)) {
      imageUrls.push(...tripData.images)
    } else if (typeof tripData.images === "string") {
      imageUrls.push(tripData.images)
    }

    setFormData({
      name_ar: tripName.ar || "",
      name_en: tripName.en || "",
      description_ar: tripDesc.ar || "",
      description_en: tripDesc.en || "",
      destination_toggle: tripData.destination || false,
      location_toggle: tripData.location || false,
      price: tripData.price.toString(),
      currency: tripData.currency,
      refundable: tripData.refundable,
      cancelation_policy_ar: tripPolicy.ar || "",
      cancelation_policy_en: tripPolicy.en || "",
      from: tripData.from,
      to: tripData.to || "",
      max_guests: tripData.max_guests.toString(),
      images: [imageUrls[0] || "", imageUrls[1] || "", imageUrls[2] || ""],
    })
  }

  const fetchTrip = useCallback(async (id: number) => {
    setIsLoading(true)
    setError(null)
    const { data, error: fetchError } = await tripsApi.getTrip(id, "ar")
    if (fetchError) {
      setError(fetchError)
    } else if (data) {
      setTrip(data)
      populateForm(data)
      if (data.destinations) {
        setSelectedDestinationIds(data.destinations.map((d) => d.id))
      }
    }
    setIsLoading(false)
  }, [])

  const fetchDestinations = useCallback(async () => {
    const { data, error: fetchError } = await destinationsApi.getDestinations(
      "ar",
      "active",
    )
    if (!fetchError && data) {
      setDestinations(data)
    }
  }, [])

  useEffect(() => {
    params.then((resolvedParams) => {
      const id = parseInt(resolvedParams.id)
      setTripId(id)
      fetchTrip(id)
      fetchDestinations()
    })
  }, [params, fetchTrip, fetchDestinations])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!tripId) return

    setIsSubmitting(true)
    setError(null)

    const imageMap: { [key: string]: string } = {}
    formData.images.forEach((img, index) => {
      if (img.trim()) {
        imageMap[`image_${index + 1}`] = img
      }
    })

    const updateData: Partial<any> = {
      name: { ar: formData.name_ar, en: formData.name_en },
      description: { ar: formData.description_ar, en: formData.description_en },
      destination: formData.destination_toggle,
      location: formData.location_toggle,
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
      images: imageMap,
      destination_ids: selectedDestinationIds,
    }

    const { error: updateError } = await tripsApi.updateTrip(tripId, updateData)
    if (updateError) {
      setError(updateError)
    } else {
      router.push("/supplier/my-trips")
    }
    setIsSubmitting(false)
  }

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images]
    newImages[index] = value
    setFormData({ ...formData, images: newImages })
  }

  const toggleDestination = (destId: number) => {
    setSelectedDestinationIds((prev) =>
      prev.includes(destId)
        ? prev.filter((id) => id !== destId)
        : [...prev, destId],
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="تعديل الرحلة" />
        <Card>
          <CardContent className="p-6">
            <DetailPageSkeleton />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="تعديل الرحلة" />
        <ErrorDisplay
          error={error}
          onRetry={() => tripId && fetchTrip(tripId)}
        />
      </div>
    )
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
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name_ar">اسم الرحلة (العربية)</Label>
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
                    <Label htmlFor="name_en">اسم الرحلة (الإنجليزية)</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) =>
                        setFormData({ ...formData, name_en: e.target.value })
                      }
                      placeholder="Example: Nile Kayak Tour"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="description_ar">الوصف (العربية)</Label>
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

                  <div className="space-y-2">
                    <Label htmlFor="description_en">الوصف (الإنجليزية)</Label>
                    <Textarea
                      id="description_en"
                      value={formData.description_en}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description_en: e.target.value,
                        })
                      }
                      placeholder="Detailed trip description..."
                      rows={4}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="destination_toggle">هل تتضمن وجهة؟</Label>
                    <Switch
                      id="destination_toggle"
                      checked={formData.destination_toggle}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          destination_toggle: checked,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="location_toggle">هل تتضمن موقع؟</Label>
                    <Switch
                      id="location_toggle"
                      checked={formData.location_toggle}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          location_toggle: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Destinations Section */}
            {destinations.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-duck-navy border-b pb-2">
                  الوجهات
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {destinations.map((dest) => (
                    <div key={dest.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`dest-${dest.id}`}
                        checked={selectedDestinationIds.includes(dest.id)}
                        onChange={() => toggleDestination(dest.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <label
                        htmlFor={`dest-${dest.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {typeof dest.name === "string"
                          ? dest.name
                          : dest.name.ar}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                      dir="rtl"
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

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cancelation_policy_ar">
                      سياسة الإلغاء (العربية)
                    </Label>
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
                    <Label htmlFor="cancelation_policy_en">
                      سياسة الإلغاء (الإنجليزية)
                    </Label>
                    <Textarea
                      id="cancelation_policy_en"
                      value={formData.cancelation_policy_en}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cancelation_policy_en: e.target.value,
                        })
                      }
                      placeholder="Example: Can be cancelled 24 hours before the trip"
                      rows={3}
                    />
                  </div>
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
                disabled={isSubmitting}
                className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy font-bold"
              >
                {isSubmitting ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
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
