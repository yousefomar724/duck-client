import { NextResponse } from 'next/server';
import { dbConnect } from '../db/connect';
import { requireAuth } from '../auth/guard';
import { Supplier } from '../models/supplier';
import { SupplierStorage } from '../models/supplier-storage';
import { isValidResourceType } from '../services/resource-type';
import { errorResponse } from '../lib/json';
import { isValidObjectId } from '../lib/object-id';

export async function getStorage(supplierId: string) {
  await dbConnect();
  if (!isValidObjectId(supplierId)) return errorResponse(400, 'Invalid supplier ID');

  const storage = await SupplierStorage.findOne({ supplier_id: supplierId });
  if (!storage) return errorResponse(404, 'Storage not found for this supplier');

  return NextResponse.json(storage);
}

export async function setStorage(request: Request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const supplier = await Supplier.findOne({ user_id: session.user_id });
  if (!supplier) return errorResponse(400, 'User is not a supplier');

  let body: { resources?: Record<string, number>; maintenance?: Record<string, number>; turnaround_minutes?: number };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  const resources = body.resources ?? {};
  if (Object.keys(resources).length === 0) {
    return errorResponse(400, 'Resources cannot be empty');
  }

  for (const key of Object.keys(resources)) {
    if (!isValidResourceType(key)) {
      return errorResponse(
        500,
        `invalid resource type: ${key}. Allowed types: kayak, water_cycle, sup`,
      );
    }
    resources[key] = Math.max(0, Math.floor(Number(resources[key]) || 0));
  }

  const maintenance: Record<string, number> = {};
  for (const [key, raw] of Object.entries(body.maintenance ?? {})) {
    if (!isValidResourceType(key)) {
      return errorResponse(
        500,
        `invalid resource type: ${key}. Allowed types: kayak, water_cycle, sup`,
      );
    }
    const cap = resources[key] ?? 0;
    maintenance[key] = Math.max(0, Math.min(cap, Math.floor(Number(raw) || 0)));
  }

  try {
    const update: Record<string, unknown> = { supplier_id: supplier._id, resources, maintenance };
    if (body.turnaround_minutes != null) {
      update.turnaround_minutes = Math.max(0, Math.floor(Number(body.turnaround_minutes) || 0));
    }

    const storage = await SupplierStorage.findOneAndUpdate(
      { supplier_id: supplier._id },
      update,
      { upsert: true, new: true },
    );
    return NextResponse.json(storage);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to set storage';
    return errorResponse(500, message);
  }
}
