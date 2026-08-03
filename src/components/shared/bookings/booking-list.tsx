"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { CalendarCheck } from "lucide-react"
import type { Booking, Supplier, TourGuide, Trip } from "@/lib/types"
import { BookingTable } from "./booking-table"
import { BookingMobileCards } from "./booking-mobile-cards"
import { BookingPagination } from "./booking-pagination"

interface BookingListProps {
  bookings: Booking[]
  trips?: Trip[]
  suppliers?: Supplier[]
  tourGuides: TourGuide[]
  expandedId: number | null
  onToggleExpanded: (id: number) => void
  variant: "admin" | "supplier"
  guideUpdating?: number | null
  onGuideChange?: (tripId: number, guideId: string) => void
  renderAdminActions?: (booking: Booking) => React.ReactNode
  renderSupplierActions?: (booking: Booking) => React.ReactNode
  page: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
  emptyTitle: string
  emptyDescription?: string
  cardTitle: string
}

export function BookingList({
  bookings,
  trips,
  suppliers,
  tourGuides,
  expandedId,
  onToggleExpanded,
  variant,
  guideUpdating,
  onGuideChange,
  renderAdminActions,
  renderSupplierActions,
  page,
  totalPages,
  totalItems,
  onPageChange,
  emptyTitle,
  emptyDescription,
  cardTitle,
}: BookingListProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{cardTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-3 sm:p-6">
        {bookings.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            icon={CalendarCheck}
          />
        ) : (
          <>
            <BookingTable
              bookings={bookings}
              trips={trips}
              suppliers={suppliers}
              tourGuides={tourGuides}
              expandedId={expandedId}
              onToggleExpanded={onToggleExpanded}
              variant={variant}
              guideUpdating={guideUpdating}
              onGuideChange={onGuideChange}
              renderAdminActions={renderAdminActions}
              renderSupplierActions={renderSupplierActions}
            />
            <BookingMobileCards
              bookings={bookings}
              trips={trips}
              suppliers={suppliers}
              tourGuides={tourGuides}
              expandedId={expandedId}
              onToggleExpanded={onToggleExpanded}
              variant={variant}
              guideUpdating={guideUpdating}
              onGuideChange={onGuideChange}
              renderAdminActions={renderAdminActions}
              renderSupplierActions={renderSupplierActions}
            />
            <BookingPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={onPageChange}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
