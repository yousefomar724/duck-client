import { NextResponse } from 'next/server';
import { dbConnect } from '../db/connect';
import { requireAuth } from '../auth/guard';
import { Supplier } from '../models/supplier';
import { SupplierStorage } from '../models/supplier-storage';
import { Booking } from '../models/booking';
import { isValidResourceType } from '../services/resource-type';
import { OCCUPYING_STATUSES } from '../services/availability';
import { errorResponse } from '../lib/json';
import { isValidObjectId } from '../lib/object-id';
import type { SetStorageRequest } from '@/lib/types';

function mapToRecord(map: Map<string, number> | undefined): Record<string, number> {
  return map ? Object.fromEntries(map.entries()) : {};
}

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

  let body: SetStorageRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  const existing = await SupplierStorage.findOne({ supplier_id: supplier._id });
  const resources = { ...(body.resources ?? {}) };
  const maintenancePatch = { ...(body.maintenance ?? {}) };
  const remove = [...new Set(body.remove ?? [])];

  for (const key of [...Object.keys(resources), ...Object.keys(maintenancePatch), ...remove]) {
    if (!isValidResourceType(key)) {
      return errorResponse(
        400,
        `invalid resource type: ${key}. Allowed types: kayak, water_cycle, sup`,
      );
    }
  }

  for (const key of Object.keys(resources)) {
    resources[key] = Math.max(0, Math.floor(Number(resources[key]) || 0));
  }

  const mergedResources = { ...mapToRecord(existing?.resources), ...resources };
  const mergedMaintenance = mapToRecord(existing?.maintenance);
  for (const [key, raw] of Object.entries(maintenancePatch)) {
    const cap = mergedResources[key] ?? 0;
    mergedMaintenance[key] = Math.max(0, Math.min(cap, Math.floor(Number(raw) || 0)));
  }
  for (const key of Object.keys(resources)) {
    mergedMaintenance[key] = Math.max(
      0,
      Math.min(mergedResources[key], mergedMaintenance[key] ?? 0),
    );
  }
  for (const key of remove) {
    delete mergedResources[key];
    delete mergedMaintenance[key];
  }

  if (Object.keys(mergedResources).length === 0) {
    return errorResponse(400, 'Resources cannot be empty');
  }

  for (const resourceType of remove) {
    if (!(resourceType in mapToRecord(existing?.resources))) continue;
    const now = new Date();
    const blocking = await Booking.exists({
      supplier_id: supplier._id,
      resource_type: resourceType,
      status: { $in: [...OCCUPYING_STATUSES] },
      $or: [
        { ends_at: { $gt: now } },
        { ends_at: null, booking_date: { $gte: now } },
      ],
    });
    if (blocking) {
      return errorResponse(
        409,
        `cannot remove ${resourceType} while future occupying bookings exist`,
      );
    }
  }

  try {
    if (!existing) {
      const storage = await SupplierStorage.create({
        supplier_id: supplier._id,
        resources: mergedResources,
        maintenance: mergedMaintenance,
        ...(body.turnaround_minutes != null
          ? {
              turnaround_minutes: Math.max(
                0,
                Math.floor(Number(body.turnaround_minutes) || 0),
              ),
            }
          : {}),
      });
      return NextResponse.json(storage);
    }

    const set: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(resources)) {
      set[`resources.${key}`] = value;
      set[`maintenance.${key}`] = mergedMaintenance[key] ?? 0;
    }
    for (const key of Object.keys(maintenancePatch)) {
      set[`maintenance.${key}`] = mergedMaintenance[key] ?? 0;
    }
    if (body.turnaround_minutes != null) {
      set.turnaround_minutes = Math.max(
        0,
        Math.floor(Number(body.turnaround_minutes) || 0),
      );
    }
    const unset: Record<string, 1> = {};
    for (const key of remove) {
      unset[`resources.${key}`] = 1;
      unset[`maintenance.${key}`] = 1;
    }

    const storage = await SupplierStorage.findOneAndUpdate(
      { supplier_id: supplier._id },
      {
        ...(Object.keys(set).length > 0 ? { $set: set } : {}),
        ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
      },
      { new: true },
    );
    return NextResponse.json(storage);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to set storage';
    return errorResponse(500, message);
  }
}
