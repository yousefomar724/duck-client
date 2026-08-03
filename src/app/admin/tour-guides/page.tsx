"use client"

import { useState, useEffect } from "react"
import { MoreVertical, Pencil, Trash2, User } from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import * as tourGuidesApi from "@/lib/api/tour-guides"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import { formatCurrency } from "@/lib/constants"
import type { TourGuide } from "@/lib/types"

const emptyForm = {
  ID: "",
  name: "",
  price: "" as number | "",
  phone_number: "",
}

export default function AdminTourGuides() {
  const [tourGuides, setTourGuides] = useState<TourGuide[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGuide, setEditingGuide] = useState<TourGuide | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchTourGuides()
  }, [])

  const fetchTourGuides = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await tourGuidesApi.getTourGuides()
      if (res.error) {
        setError("فشل في تحميل المرشدين")
        return
      }
      setTourGuides(res.data || [])
    } catch (err) {
      setError("حدث خطأ أثناء تحميل المرشدين")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true)
      const res = await tourGuidesApi.deleteTourGuide(id)
      if (res.error) {
        setError("فشل في حذف المرشد")
        return
      }
      setTourGuides(tourGuides.filter((g) => g.ID !== id))
      setDeleteId(null)
    } catch (err) {
      setError("حدث خطأ أثناء حذف المرشد")
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  const openCreateDialog = () => {
    setEditingGuide(null)
    setFormData(emptyForm)
    setDialogError(null)
    setDialogOpen(true)
  }

  const openEditDialog = (guide: TourGuide) => {
    setEditingGuide(guide)
    setFormData({
      name: guide.name,
      price: guide.price,
      phone_number: guide.phone_number,
      ID: guide.ID,
    })
    setDialogError(null)
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setDialogError(null)
    }
  }

  const handleDialogSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDialogError(null)
    setIsSubmitting(true)
    try {
      const payload = {
        name: formData.name,
        price: Number(formData.price),
        phone_number: formData.phone_number,
        ID: formData.ID,
      }

      if (editingGuide) {
        const res = await tourGuidesApi.updateTourGuide(
          editingGuide.ID,
          payload,
        )
        if (res.error) {
          setDialogError(res.error)
          return
        }
        setTourGuides(
          tourGuides.map((g) =>
            g.ID === editingGuide.ID ? { ...g, ...payload } : g,
          ),
        )
      } else {
        const res = await tourGuidesApi.createTourGuide(payload)
        if (res.error) {
          setDialogError(res.error)
          return
        }
        await fetchTourGuides()
      }
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
        <PageHeader title="المرشدين">
          <Button disabled>+ اضافة مرشد</Button>
        </PageHeader>
        <TableSkeleton rows={5} columns={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="المرشدين"
          description="إدارة المرشدين السياحيين المتاحين للجولات"
        >
          <Button onClick={openCreateDialog}>+ اضافة مرشد</Button>
        </PageHeader>
        <ErrorDisplay error={error} onRetry={fetchTourGuides} />
      </div>
    )
  }

  const filteredGuides = tourGuides.filter((g) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      g.name.toLowerCase().includes(q) ||
      g.phone_number.includes(q) ||
      g.ID.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="المرشدين"
        description="إدارة المرشدين السياحيين المتاحين للجولات"
      >
        <Button
          onClick={openCreateDialog}
          className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy"
        >
          + اضافة مرشد
        </Button>
      </PageHeader>

      <div className="max-w-md">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف..."
        />
      </div>

      <Card>
        <CardContent className="p-0!">
          {filteredGuides.length === 0 ? (
            <EmptyState
              icon={User}
              title={search ? "لا توجد نتائج" : "لا يوجد مرشدين سياحيين"}
              description={
                search
                  ? "جرّب تعديل البحث."
                  : "أضف مرشد سياحي لربطه مع الجولات."
              }
              actionLabel={search ? "مسح البحث" : "+ اضافة مرشد"}
              onAction={
                search
                  ? () => setSearch("")
                  : openCreateDialog
              }
            />
          ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-start">الاسم</TableHead>
                <TableHead className="text-start">السعر</TableHead>
                <TableHead className="text-start">رقم الهاتف</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuides.map((guide) => (
                  <TableRow key={guide.ID}>
                    <TableCell className="font-medium">{guide.name}</TableCell>
                    <TableCell>{formatCurrency(guide.price)}</TableCell>
                    <TableCell dir="ltr" className="text-end">
                      {guide.phone_number}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu dir="rtl">
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full!"
                            disabled={isDeleting}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(guide)}
                          >
                            <Pencil className="me-2 h-4 w-4" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteId(guide.ID)}
                          >
                            <Trash2 className="me-2 h-4 w-4" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGuide ? "تعديل المرشد" : "اضافة مرشد جديد"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDialogSubmit} className="space-y-4">
            {dialogError && (
              <p className="text-sm text-red-600">{dialogError}</p>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="اسم المرشد"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">السعر</Label>
                <Input
                  id="price"
                  type="number"
                  step="any"
                  min="0"
                  value={formData.price === "" ? "" : formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price:
                        e.target.value === ""
                          ? ("" as number | "")
                          : Number(e.target.value),
                    })
                  }
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">رقم الهاتف</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  dir="ltr"
                  className="text-end"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                  placeholder="+20123456789"
                  required
                />
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
                  : editingGuide
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
            <AlertDialogTitle>حذف المرشد</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المرشد؟ لا يمكن التراجع عن هذه العملية.
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
