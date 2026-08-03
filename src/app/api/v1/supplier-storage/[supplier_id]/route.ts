import { getStorage } from '@/server/handlers/supplier-storage';

export async function GET(_request: Request, { params }: { params: Promise<{ supplier_id: string }> }) {
  const { supplier_id: supplierId } = await params;
  return getStorage(supplierId);
}
