"use client"

import { apiClient, ApiResponse } from "./client"
import type { SetStorageRequest, SupplierStorage } from "@/lib/types"

export async function getStorage(
  supplierId: number,
): Promise<ApiResponse<SupplierStorage>> {
  return apiClient<SupplierStorage>(`/supplier-storage/${supplierId}`, {
    method: "GET",
  })
}

export async function setStorage(
  data: SetStorageRequest,
): Promise<ApiResponse<SupplierStorage>> {
  return apiClient<SupplierStorage>("/supplier-storage", {
    method: "PUT",
    body: JSON.stringify(data),
  })
}
