import { ALLOWED_RESOURCE_TYPES } from '../models/supplier-storage';

export function isValidResourceType(value: string): boolean {
  return (ALLOWED_RESOURCE_TYPES as readonly string[]).includes(value);
}
