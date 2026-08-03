import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { Supplier } from '@/server/models/supplier';
import { User } from '@/server/models/user';
import { formatSupplierResponse } from '@/server/services/supplier';
import { errorResponse, messageResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') ?? '';

  if (!isValidObjectId(id)) return errorResponse(403, 'supplier not found');

  const supplier = await Supplier.findById(id);
  if (!supplier) return errorResponse(403, 'supplier not found');

  return NextResponse.json(formatSupplierResponse(supplier, lang));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') ?? '';

  let body: { name?: { en: string; ar: string }; about?: { en: string; ar: string }; icon?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  if (!isValidObjectId(id)) return errorResponse(403, 'unauthorized access to supplier');

  const supplier = await Supplier.findById(id);
  if (!supplier || supplier.user_id.toString() !== session.user_id) {
    return errorResponse(403, 'unauthorized access to supplier');
  }

  if (body.name) supplier.name = body.name;
  if (body.about) supplier.about = body.about;
  if (body.icon) supplier.icon = body.icon;
  await supplier.save();

  return NextResponse.json(formatSupplierResponse(supplier, lang));
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;

  try {
    if (!isValidObjectId(id)) throw new Error('unauthorized access to supplier');
    const supplier = await Supplier.findById(id);
    if (!supplier || supplier.user_id.toString() !== session.user_id) {
      throw new Error('unauthorized access to supplier');
    }
    // $unset, not `{ supplier_id: null }` — a sparse unique index only skips
    // documents where the field is absent, not ones explicitly set to null.
    await User.updateOne({ _id: session.user_id }, { $unset: { supplier_id: '' } });
    supplier.deletedAt = new Date();
    await supplier.save();
    return messageResponse('Supplier deleted successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to delete supplier';
    return errorResponse(500, message);
  }
}
