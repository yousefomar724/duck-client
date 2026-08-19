"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { MoreVertical, Star, Trash2 } from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import StatCard from "@/components/shared/stat-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { DataCardList } from "@/components/dashboard/data-card-list"
import { FilterSheet } from "@/components/dashboard/filter-sheet"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import * as feedbackApi from "@/lib/api/feedback"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import type { Feedback, FeedbackStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "جديد",
  read: "مقروء",
  archived: "مؤرشف",
}

function formatDate(value?: string) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    })
  } catch {
    return value
  }
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} من 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "text-gray-200",
          )}
        />
      ))}
    </div>
  )
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">(
    "all",
  )
  const [ratingFilter, setRatingFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchFeedback = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await feedbackApi.getFeedback()
      if (res.error) {
        setError("فشل في تحميل الآراء")
        return
      }
      setItems(res.data || [])
    } catch {
      setError("فشل في تحميل الآراء")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchFeedback()
  }, [fetchFeedback])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false
      if (ratingFilter !== "all" && item.rating !== Number(ratingFilter)) {
        return false
      }
      if (!q) return true
      return (
        item.comment?.toLowerCase().includes(q) ||
        item.name?.toLowerCase().includes(q) ||
        item.contact?.toLowerCase().includes(q) ||
        item.booking_ref?.toLowerCase().includes(q)
      )
    })
  }, [items, search, statusFilter, ratingFilter])

  const averageRating = useMemo(() => {
    if (items.length === 0) return "—"
    const sum = items.reduce((acc, item) => acc + item.rating, 0)
    return (sum / items.length).toFixed(1)
  }, [items])

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    const res = await feedbackApi.updateFeedbackStatus(id, status)
    if (res.error) return
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    )
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    const res = await feedbackApi.deleteFeedback(deleteId)
    setIsDeleting(false)
    if (res.error) return
    setItems((prev) => prev.filter((item) => item.id !== deleteId))
    setDeleteId(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="آراء العملاء"
        description="عرض وإدارة ملاحظات العملاء"
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard title="إجمالي الآراء" value={items.length} icon={Star} />
        <StatCard
          title="متوسط التقييم"
          value={averageRating}
          icon={Star}
          tone="success"
        />
        <StatCard
          title="جديد"
          value={items.filter((item) => item.status === "new").length}
          icon={Star}
          tone="warning"
        />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="بحث في التعليقات أو الأسماء..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <FilterSheet
              activeCount={
                (statusFilter !== "all" ? 1 : 0) +
                (ratingFilter !== "all" ? 1 : 0)
              }
            >
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as FeedbackStatus | "all")
              }
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="new">جديد</SelectItem>
                <SelectItem value="read">مقروء</SelectItem>
                <SelectItem value="archived">مؤرشف</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="التقييم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التقييمات</SelectItem>
                {[5, 4, 3, 2, 1].map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r} نجوم
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </FilterSheet>
          </div>

          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : error ? (
            <ErrorDisplay error={error} onRetry={fetchFeedback} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Star}
              title="لا توجد آراء"
              description="لم يتم إرسال أي ملاحظات بعد"
            />
          ) : (
            <>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التقييم</TableHead>
                    <TableHead>التعليق</TableHead>
                    <TableHead>السياق</TableHead>
                    <TableHead>التواصل</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <RatingStars rating={item.rating} />
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate text-sm">
                          {item.comment || "—"}
                        </p>
                        {item.name ? (
                          <p className="text-xs text-text-muted">{item.name}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{item.context === "booking" ? "حجز" : "عام"}</div>
                        {item.booking_ref ? (
                          <div className="text-xs text-text-muted" dir="ltr">
                            #{item.booking_ref}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm" dir="ltr">
                        {item.contact || "—"}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(item.created_at || item.CreatedAt)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.status}
                          onValueChange={(v) =>
                            void handleStatusChange(
                              item.id,
                              v as FeedbackStatus,
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              Object.keys(STATUS_LABELS) as FeedbackStatus[]
                            ).map((status) => (
                              <SelectItem key={status} value={status}>
                                {STATUS_LABELS[status]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-11!">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteId(item.id)}
                            >
                              <Trash2 className="size-4 me-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataCardList
              items={filtered.map((item) => ({
                id: item.id,
                title: item.name || item.comment || "رأي",
                subtitle: item.comment || "—",
                fields: [
                  {
                    label: "التقييم",
                    value: <RatingStars rating={item.rating} />,
                  },
                  {
                    label: "السياق",
                    value: item.context === "booking" ? "حجز" : "عام",
                  },
                  {
                    label: "التاريخ",
                    value: formatDate(item.created_at || item.CreatedAt),
                  },
                ],
                actions: (
                  <div className="flex items-center gap-1">
                    <Select
                      value={item.status}
                      onValueChange={(v) =>
                        void handleStatusChange(item.id, v as FeedbackStatus)
                      }
                    >
                      <SelectTrigger className="h-11! w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABELS) as FeedbackStatus[]).map(
                          (status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11! text-red-600"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ),
              }))}
            />
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الملاحظة؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
