"use client"

import { useRouter } from "next/navigation"
import PageHeader from "@/components/shared/page-header"
import TripForm from "@/components/shared/trip-form"

export default function CreateTripPage() {
  const router = useRouter()

  return (
    <div className="p-6">
      <PageHeader title="اضافة رحلة جديدة" />
      <TripForm
        mode="create"
        onSuccess={() => router.push("/supplier/my-trips")}
        onCancel={() => router.back()}
      />
    </div>
  )
}
