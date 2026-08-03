import { setStorage } from '@/server/handlers/supplier-storage';

// Backward-compat route alias for deployments using underscore naming.
export const PUT = setStorage;
export const POST = setStorage;
