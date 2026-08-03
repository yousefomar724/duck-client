import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { Supplier } from '@/server/models/supplier';
import { formatSupplierResponse } from '@/server/services/supplier';
import { errorResponse } from '@/server/lib/json';

export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') ?? '';

  try {
    const suppliers = await Supplier.find();
    return NextResponse.json(suppliers.map((s) => formatSupplierResponse(s, lang)));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to list suppliers';
    return errorResponse(403, message);
  }
}
