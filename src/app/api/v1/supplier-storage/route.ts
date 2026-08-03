import { setStorage } from '@/server/handlers/supplier-storage';

export const PUT = setStorage;
// Backward-compat: allow POST upsert, same as the Go API.
export const POST = setStorage;
