"use client"

import { apiClient, ApiResponse } from "./client"
import type { SetStorageRequest, SupplierStorage } from "@/lib/types"

function isNotFound(err: string | null): boolean {
  if (!err) return false
  const lower = err.toLowerCase()
  return lower.includes("not found") || lower.includes("404")
}

export async function getStorage(
  supplierId: number,
): Promise<ApiResponse<SupplierStorage>> {
  const primary = await apiClient<SupplierStorage>(
    `/supplier-storage/${supplierId}`,
    {
      method: "GET",
    },
  )
  if (!isNotFound(primary.error)) return primary

  // Backward compatibility for older backend route naming.
  const legacy = await apiClient<SupplierStorage>(
    `/supplier_storage/${supplierId}`,
    {
      method: "GET",
    },
  )
  return legacy
}

export async function setStorage(
  data: SetStorageRequest,
): Promise<ApiResponse<SupplierStorage>> {
  const primary = await apiClient<SupplierStorage>("/supplier-storage", {
    method: "PUT",
    body: JSON.stringify(data),
  })
  if (!isNotFound(primary.error)) return primary

  // Some running backend instances may expose these legacy variants.
  const withTrailingSlash = await apiClient<SupplierStorage>("/supplier-storage/", {
    method: "PUT",
    body: JSON.stringify(data),
  })
  if (!isNotFound(withTrailingSlash.error)) return withTrailingSlash

  const legacyUnderscore = await apiClient<SupplierStorage>("/supplier_storage", {
    method: "PUT",
    body: JSON.stringify(data),
  })
  if (!isNotFound(legacyUnderscore.error)) return legacyUnderscore

  // Last fallback: older deployments that used POST for create/upsert.
  const legacyPost = await apiClient<SupplierStorage>("/supplier-storage", {
    method: "POST",
    body: JSON.stringify(data),
  })
  if (!isNotFound(legacyPost.error)) return legacyPost

  return primary
}
