"use client"

import { apiClient, type ApiResponse } from "./client"

export interface DiscountCodeRecord {
  id: string
  ID?: string
  code: string
  description: string
  type: "percentage" | "fixed"
  value: number
  currency: string
  max_discount: number | null
  min_booking_amount: number | null
  starts_at: string | null
  expires_at: string
  usage_limit_total: number | null
  once_per_customer: boolean
  used_count: number
  supplier_id: string | null
  trip_ids: string[]
  funded_by: "supplier" | "platform"
  created_by_role: number
  status: "active" | "disabled"
  display_status: "active" | "scheduled" | "expired" | "exhausted" | "disabled"
  pending_uses: number
  read_only: boolean
}

export interface DiscountCodeInput {
  code: string
  description?: string
  type: "percentage" | "fixed"
  value: number
  currency?: string
  max_discount?: number | null
  min_booking_amount?: number | null
  starts_at?: string | null
  expires_at: string
  usage_limit_total?: number | null
  once_per_customer?: boolean
  supplier_id?: string | null
  trip_ids?: string[]
  status?: "active" | "disabled"
}

export interface DiscountValidation {
  subtotal: number
  discount: number
  total: number
  min_deposit: number
  code: string
  funded_by: "supplier" | "platform"
}

export function listDiscountCodes(query?: {
  supplierId?: string
  status?: string
  creator?: string
}): Promise<ApiResponse<DiscountCodeRecord[]>> {
  const search = new URLSearchParams()
  if (query?.supplierId) search.set("supplier_id", query.supplierId)
  if (query?.status) search.set("status", query.status)
  if (query?.creator) search.set("creator", query.creator)
  const qs = search.toString()
  return apiClient<DiscountCodeRecord[]>(`/discount-codes${qs ? `?${qs}` : ""}`)
}

export function createDiscountCode(body: DiscountCodeInput) {
  return apiClient<DiscountCodeRecord>("/discount-codes", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function updateDiscountCode(id: string, body: Partial<DiscountCodeInput>) {
  return apiClient<DiscountCodeRecord>(`/discount-codes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export function deleteDiscountCode(id: string) {
  return apiClient<{ deleted: boolean; disabled: boolean }>(`/discount-codes/${id}`, {
    method: "DELETE",
  })
}

export function listDiscountRedemptions(id: string) {
  return apiClient<
    {
      id: string
      customer_key: string
      discount_amount: number
      status: string
      pending: boolean
      booking: {
        id: string
        full_name: string
        phone_number: string
        status: string
        amount: number
        currency: string
      } | null
    }[]
  >(`/discount-codes/${id}/redemptions`)
}

export function validateDiscountCode(body: {
  code: string
  trip_id: string
  phone_number?: string
  quantity?: number
  local_guests?: number
  foreigner_guests?: number
  duration?: number
  wants_guide?: boolean
}) {
  return apiClient<DiscountValidation>("/discount-codes/validate", {
    method: "POST",
    body: JSON.stringify(body),
  })
}
