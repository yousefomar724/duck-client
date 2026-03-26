"use client"

import { useState, useEffect } from "react"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import Image from "next/image"
import PageHeader from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import * as destinationsApi from "@/lib/api/destinations"
import * as imagesApi from "@/lib/api/images"
import { CardGridSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import type {
  Destination,
  DestinationActivity,
  DestinationPublicStatus,
} from "@/lib/types"

const ACTIVITY_OPTIONS: { id: DestinationActivity; label: string }[] = [
  { id: "kayak", label: "كاياك" },
  { id: "sup", label: "تجديف واقف" },
  { id: "waterbike", label: "دراجة مائية" },
]

const emptyForm = {
  name_ar: "",
  name_en: "",
  description_ar: "",
  description_en: "",
  image: "",
  images: [] as string[],
  status: "active",
  lat: "" as number | "",
  lng: "" as number | "",
  activities: [] as DestinationActivity[],
  public_status: "" as "" | DestinationPublicStatus,
  operating_hours: "",
}

export default function AdminDestinations() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDestination, setEditingDestination] =
    useState<Destination | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(imageFile)
    setImagePreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [imageFile])

  useEffect(() => {
    if (imageFiles.length === 0) {
      setImagePreviewUrls([])
      return
    }
    const urls = imageFiles.map((f) => URL.createObjectURL(f))
    setImagePreviewUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [imageFiles])

  useEffect(() => {
    fetchDestinations()
  }, [])

  const fetchDestinations = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await destinationsApi.getDestinations()

      if (res.error) {
        setError("فشل في تحميل الوجهات")
        return
      }

      setDestinations(res.data || [])
    } catch (err) {
      setError("حدث خطأ أثناء تحميل الوجهات")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      setIsDeleting(true)
      const res = await destinationsApi.deleteDestination(id)

      if (res.error) {
        setError("فشل في حذف الوجهة")
        return
      }

      setDestinations(destinations.filter((d) => d.id !== id))
      setDeleteId(null)
    } catch (err) {
      setError("حدث خطأ أثناء حذف الوجهة")
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  const openCreateDialog = () => {
    setEditingDestination(null)
    setFormData(emptyForm)
    setImageFile(null)
    setImageFiles([])
    setDialogError(null)
    setDialogOpen(true)
  }

  const openEditDialog = (destination: Destination) => {
    const name =
      typeof destination.name === "string"
        ? { ar: destination.name, en: "" }
        : destination.name
    const description =
      typeof destination.description === "string"
        ? { ar: destination.description, en: "" }
        : destination.description
    const images =
      destination.images && destination.images.length > 0
        ? destination.images
        : destination.image
          ? [destination.image]
          : []
    setEditingDestination(destination)
    setFormData({
      name_ar: name?.ar ?? "",
      name_en: name?.en ?? "",
      description_ar: description?.ar ?? "",
      description_en: description?.en ?? "",
      image: destination.image ?? "",
      images,
      status: destination.status ?? "active",
      lat: destination.lat ?? ("" as number | ""),
      lng: destination.lng ?? ("" as number | ""),
      activities: destination.activities ?? [],
      public_status: (destination.public_status ?? "") as
        | ""
        | DestinationPublicStatus,
      operating_hours: destination.operating_hours ?? "",
    })
    setImageFile(null)
    setImageFiles([])
    setDialogError(null)
    setDialogOpen(true)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    setImageFile(selected)
  }

  const handleMultipleImagesChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? [])
    setImageFiles((prev) => [...prev, ...files])
    e.target.value = ""
  }

  const removeNewImageAt = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingImageAt = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
      image:
        formData.images[index] === formData.image && formData.images.length > 1
          ? (formData.images[0] ?? "")
          : formData.image,
    })
  }

  const removeExistingImage = () => {
    setFormData({ ...formData, image: "" })
  }

  const removeNewImage = () => {
    setImageFile(null)
  }

  const toggleActivity = (activity: DestinationActivity) => {
    setFormData((prev) => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter((a) => a !== activity)
        : [...prev.activities, activity],
    }))
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setImageFile(null)
      setImageFiles([])
      setDialogError(null)
    }
  }

  const resolveImageUrl = (url: string) => {
    if (!url) return ""
    if (url.startsWith("http")) return url
    const normalized = url.startsWith("/") ? url : `/${url}`
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "https://duckapi.alefmenu.com/api/v1"
    if (!apiUrl) return normalized
    try {
      const parsedUrl = new URL(apiUrl)
      if (parsedUrl.hostname === "localhost" && parsedUrl.port === "8080") {
        return normalized
      }
      return `${parsedUrl.origin}${normalized}`
    } catch {
      return normalized
    }
  }

  const handleDialogSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDialogError(null)
    setIsSubmitting(true)
    try {
      let imageUrl = formData.image
      if (imageFile) {
        const { data: uploadedImage, error: uploadError } =
          await imagesApi.uploadImageForAdmin(imageFile)
        if (uploadError || !uploadedImage?.image_url) {
          setDialogError(uploadError || "فشل في تحميل الصورة")
          return
        }
        imageUrl = uploadedImage.image_url
      }

      const uploadedMulti: string[] = []
      for (const file of imageFiles) {
        const { data: uploadedImage, error: uploadError } =
          await imagesApi.uploadImageForAdmin(file)
        if (uploadError || !uploadedImage?.image_url) {
          setDialogError(uploadError || "فشل في تحميل إحدى الصور")
          return
        }
        uploadedMulti.push(uploadedImage.image_url)
      }

      const images = [...formData.images, ...uploadedMulti]
      const primaryImage = imageUrl || images[0] || ""

      const payload = {
        name: { ar: formData.name_ar, en: formData.name_en },
        description: {
          ar: formData.description_ar,
          en: formData.description_en,
        },
        image: primaryImage,
        images: images.length > 0 ? images : undefined,
        status: formData.status,
        lat: formData.lat === "" ? undefined : Number(formData.lat),
        lng: formData.lng === "" ? undefined : Number(formData.lng),
        activities:
          formData.activities.length > 0 ? formData.activities : undefined,
        public_status:
          formData.public_status === ""
            ? undefined
            : (formData.public_status as DestinationPublicStatus),
        operating_hours: formData.operating_hours || undefined,
      }
      if (editingDestination) {
        const res = await destinationsApi.updateDestination(
          editingDestination.id,
          payload,
        )
        if (res.error) {
          setDialogError(res.error)
          return
        }
        setDestinations(
          destinations.map((d) =>
            d.id === editingDestination.id ? (res.data as Destination) : d,
          ),
        )
      } else {
        const res = await destinationsApi.createDestination(payload)
        if (res.error) {
          setDialogError(res.error)
          return
        }
        setDestinations([...(res.data ? [res.data] : []), ...destinations])
      }
      setImageFile(null)
      setImageFiles([])
      setDialogOpen(false)
    } catch (err) {
      setDialogError("حدث خطأ غير متوقع")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="الوجهات">
          <Button disabled>+ اضافة وجهة</Button>
        </PageHeader>
        <CardGridSkeleton count={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="الوجهات">
          <Button>+ اضافة وجهة</Button>
        </PageHeader>
        <ErrorDisplay error={error} onRetry={fetchDestinations} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الوجهات">
        <Button
          onClick={openCreateDialog}
          className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy"
        >
          + اضافة وجهة
        </Button>
      </PageHeader>

      {/* Destinations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {destinations.map((destination) => {
          const primaryImage =
            destination.images?.[0] ?? destination.image ?? ""
          const fullImageUrl = primaryImage ? resolveImageUrl(primaryImage) : ""

          return (
            <Card
              key={destination.id}
              className="overflow-hidden py-0! hover:shadow-lg transition-all duration-200 gap-0!"
            >
              <div className="relative h-48 w-full bg-gray-200">
                {fullImageUrl ? (
                  <Image
                    src={fullImageUrl}
                    alt={
                      typeof destination.name === "string"
                        ? destination.name
                        : (destination.name?.ar ?? "")
                    }
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-text-muted">
                    لا توجد صورة
                  </div>
                )}
                {destination.public_status && (
                  <span className="absolute top-2 end-2 rounded-full bg-duck-navy/80 text-white text-xs px-2 py-0.5">
                    {destination.public_status === "coming-soon"
                      ? "قريباً"
                      : "متاح"}
                  </span>
                )}
              </div>
              <CardContent className="p-3! pt-0!">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-text-dark">
                      {typeof destination.name === "string"
                        ? destination.name
                        : (destination.name?.ar ?? "")}
                    </h3>
                    <p className="text-sm text-text-muted mt-1 line-clamp-2">
                      {typeof destination.description === "string"
                        ? destination.description
                        : (destination.description?.ar ?? "")}
                    </p>
                    {destination.activities &&
                      destination.activities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {destination.activities.map((a) => (
                            <span
                              key={a}
                              className="text-xs px-2 py-0.5 rounded-full bg-duck-cyan/20 text-duck-navy"
                            >
                              {ACTIVITY_OPTIONS.find((o) => o.id === a)
                                ?.label ?? a}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                  <DropdownMenu dir="rtl">
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ms-2 rounded-full! p-1!"
                        disabled={isDeleting}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => openEditDialog(destination)}
                      >
                        <Pencil className="me-2 h-4 w-4" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteId(destination.id)}
                      >
                        <Trash2 className="me-2 h-4 w-4" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-300">
                  <span className="text-sm text-text-muted">عدد الرحلات</span>
                  <span className="text-lg font-bold text-duck-cyan">
                    {destination.trip_count || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {destinations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-muted">لا توجد وجهات متاحة</p>
        </div>
      )}

      {/* Create/Edit Destination Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDestination ? "تعديل الوجهة" : "اضافة وجهة جديدة"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDialogSubmit} className="space-y-4">
            {dialogError && (
              <p className="text-sm text-red-600">{dialogError}</p>
            )}
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name_ar">الاسم (عربي)</Label>
                  <Input
                    id="name_ar"
                    value={formData.name_ar}
                    onChange={(e) =>
                      setFormData({ ...formData, name_ar: e.target.value })
                    }
                    placeholder="اسم الوجهة"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_en">الاسم (English)</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) =>
                      setFormData({ ...formData, name_en: e.target.value })
                    }
                    placeholder="Destination name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                    placeholder="وصف الوجهة"
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
                    placeholder="Description"
                    rows={3}
                  />
                </div>
              </div>
              <div className="space-y-4">
                {formData.image && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">الصورة الحالية</p>
                    <div className="relative w-32 h-32 rounded border border-gray-300 overflow-hidden bg-gray-100">
                      <Image
                        src={resolveImageUrl(formData.image)}
                        alt="Current destination"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={removeExistingImage}
                        className="absolute top-1 start-1 rounded bg-red-500 text-white text-xs px-2 py-1"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="image">
                    {editingDestination
                      ? "اختيار صورة جديدة"
                      : "اختيار صورة الوجهة"}
                  </Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-text-muted">
                    سيتم تحميل الصورة تلقائياً عند حفظ الوجهة.
                  </p>
                </div>

                {imagePreviewUrl && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">الصورة المختارة</p>
                    <div className="relative w-32 h-32 rounded border border-gray-300 overflow-hidden bg-gray-100">
                      <Image
                        src={imagePreviewUrl}
                        alt="Selected destination"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={removeNewImage}
                        className="absolute top-1 start-1 rounded bg-red-500 text-white text-xs px-2 py-1"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lat">خط العرض (Lat)</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    value={formData.lat === "" ? "" : formData.lat}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lat:
                          e.target.value === ""
                            ? ("" as number | "")
                            : Number(e.target.value),
                      })
                    }
                    placeholder="24.0889"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">خط الطول (Lng)</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    value={formData.lng === "" ? "" : formData.lng}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lng:
                          e.target.value === ""
                            ? ("" as number | "")
                            : Number(e.target.value),
                      })
                    }
                    placeholder="32.8998"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الأنشطة</Label>
                <div className="flex flex-wrap gap-3">
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={formData.activities.includes(opt.id)}
                        onChange={() => toggleActivity(opt.id)}
                        className="rounded border-gray-300"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="public_status">الحالة العامة (للخريطة)</Label>
                <Select
                  dir="rtl"
                  value={formData.public_status || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      public_status:
                        value === "none"
                          ? ""
                          : (value as DestinationPublicStatus),
                    })
                  }
                >
                  <SelectTrigger id="public_status">
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="open">متاح الآن</SelectItem>
                    <SelectItem value="coming-soon">قريباً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="operating_hours">ساعات العمل (اختياري)</Label>
                <Input
                  id="operating_hours"
                  value={formData.operating_hours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      operating_hours: e.target.value,
                    })
                  }
                  placeholder="٨ ص - ٥ م"
                />
              </div>
              <div className="space-y-2">
                <Label>صور إضافية</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.images.map((url, i) => (
                    <div
                      key={`existing-${i}`}
                      className="relative w-20 h-20 rounded border overflow-hidden bg-gray-100"
                    >
                      <Image
                        src={resolveImageUrl(url)}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImageAt(i)}
                        className="absolute top-0.5 start-0.5 rounded bg-red-500 text-white text-xs px-1.5 py-0.5"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                  {imagePreviewUrls.map((url, i) => (
                    <div
                      key={`new-${i}`}
                      className="relative w-20 h-20 rounded border overflow-hidden bg-gray-100"
                    >
                      <Image
                        src={url}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImageAt(i)}
                        className="absolute top-0.5 start-0.5 rounded bg-red-500 text-white text-xs px-1.5 py-0.5"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleMultipleImagesChange}
                  className="cursor-pointer mt-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">الحالة (إداري)</Label>
                <Select
                  dir="rtl"
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy"
              >
                {isSubmitting
                  ? "جاري الحفظ..."
                  : editingDestination
                    ? "حفظ التغييرات"
                    : "اضافة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الوجهة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الوجهة؟ لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
