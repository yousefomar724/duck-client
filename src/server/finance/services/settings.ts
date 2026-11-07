import type { Model } from 'mongoose';
import type {
  CaptainItem,
  ChannelItem,
  CustomRoleItem,
  InternalControlSettings,
  LocationItem,
  PaymentMethodItem,
  ServiceItem,
  SettingsState,
  TourTypeItem,
} from '@/lib/finance/erp-types';
import { getBookings } from './bookings';
import { getActivityTypes, getOfficialTrips, nextSortOrder } from './catalog';
import { logAudit } from './audit';
import { badRequest, notFound, so, type FinCtx } from './context';
import { genId, num, toOut, toOutList } from './util';

const byOrder = { sortOrder: 1 as const, createdAt: 1 as const };

const DEFAULT_CONTROLS: InternalControlSettings = {
  maxApprovalLimit: 5000,
  requireTwoStepApproval: true,
  enforceSegregationOfDuties: true,
  blockLockedPeriodPostings: true,
  forbidDirectPostedEdits: true,
  autoDepreciationOnClose: true,
  baseCurrency: 'EGP',
};
const CONTROL_KEYS = Object.keys(DEFAULT_CONTROLS) as (keyof InternalControlSettings)[];

export async function getInternalControls(ctx: FinCtx): Promise<InternalControlSettings> {
  const doc = await ctx.m.InternalControls.findById('internal-controls').lean().session(ctx.session);
  const out = { ...DEFAULT_CONTROLS } as Record<string, unknown>;
  if (doc) for (const key of CONTROL_KEYS) if (doc[key] !== undefined) out[key] = doc[key];
  return out as unknown as InternalControlSettings;
}

export async function getCustomRoles(ctx: FinCtx): Promise<CustomRoleItem[]> {
  return toOutList<CustomRoleItem>(await ctx.m.CustomRole.find().sort(byOrder).lean().session(ctx.session));
}

/** The ERP's `settings` object, assembled from its collections. */
export async function getSettings(ctx: FinCtx): Promise<SettingsState> {
  const [activityTypes, officialTrips, bookings, customRoles, tourTypes, services, captains, locations, channels, paymentMethods, internalControls] =
    await Promise.all([
      getActivityTypes(ctx),
      getOfficialTrips(ctx),
      getBookings(ctx),
      getCustomRoles(ctx),
      ctx.m.TourType.find().sort(byOrder).lean().session(ctx.session),
      ctx.m.Service.find().sort(byOrder).lean().session(ctx.session),
      ctx.m.Captain.find().sort(byOrder).lean().session(ctx.session),
      ctx.m.Location.find().sort(byOrder).lean().session(ctx.session),
      ctx.m.Channel.find().sort(byOrder).lean().session(ctx.session),
      ctx.m.PaymentMethod.find().sort(byOrder).lean().session(ctx.session),
      getInternalControls(ctx),
    ]);
  return {
    activityTypes,
    officialTrips,
    bookings,
    customRoles,
    tourTypes: toOutList<TourTypeItem>(tourTypes),
    services: toOutList<ServiceItem>(services),
    captains: toOutList<CaptainItem>(captains),
    locations: toOutList<LocationItem>(locations),
    channels: toOutList<ChannelItem>(channels),
    paymentMethods: toOutList<PaymentMethodItem>(paymentMethods),
    internalControls,
  };
}

type ListModel = 'TourType' | 'Captain' | 'Service';

/**
 * The ERP's "save the whole list" settings endpoints: the stored list
 * becomes exactly `items`, in order. Items keep their ids; new ones get one.
 */
async function replaceList<T>(ctx: FinCtx, name: ListModel, items: unknown, prefix: string): Promise<T[]> {
  if (!Array.isArray(items)) throw badRequest('Expected a list.');
  const model = ctx.m[name] as unknown as Model<Record<string, unknown>>;
  const docs = items.map((raw, idx) => {
    const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const { id, _id, sortOrder, createdAt, updatedAt, ...rest } = item;
    void sortOrder;
    void createdAt;
    void updatedAt;
    return { ...rest, _id: String(id ?? _id ?? genId(prefix)), sortOrder: idx + 1 };
  });
  if (new Set(docs.map((d) => d._id)).size !== docs.length) throw badRequest('Duplicate ids in list.');
  await model.deleteMany({}, so(ctx));
  if (docs.length) await model.insertMany(docs, so(ctx));
  return toOutList<T>(await model.find().sort(byOrder).lean().session(ctx.session));
}

export async function updateTourTypes(ctx: FinCtx, tourTypes: unknown) {
  const list = await replaceList<TourTypeItem>(ctx, 'TourType', tourTypes, 'tt');
  await logAudit(ctx, 'UPDATE_TOUR_TYPES', 'Settings', 'tourTypes', `Updated tour types list (${list.length} types)`);
  return list;
}

export async function updateCaptains(ctx: FinCtx, captains: unknown) {
  const list = await replaceList<CaptainItem>(ctx, 'Captain', captains, 'cpt');
  await logAudit(ctx, 'UPDATE_CAPTAINS', 'Settings', 'captains', `Updated captains list (${list.length} captains)`);
  return list;
}

export async function updateServices(ctx: FinCtx, services: unknown) {
  const list = await replaceList<ServiceItem>(ctx, 'Service', services, 'srv');
  await logAudit(ctx, 'UPDATE_SERVICES', 'Settings', 'services', `Updated services & pricing (${list.length} services)`);
  return list;
}

export async function updateInternalControls(ctx: FinCtx, controls: Record<string, unknown>): Promise<InternalControlSettings> {
  const patch: Record<string, unknown> = {};
  for (const key of CONTROL_KEYS) if (controls[key] !== undefined) patch[key] = controls[key];
  await ctx.m.InternalControls.updateOne({ _id: 'internal-controls' }, { $set: patch }, { upsert: true, ...so(ctx) });
  await logAudit(ctx, 'UPDATE_INTERNAL_CONTROLS', 'Settings', 'internalControls', 'Updated enterprise internal control policies');
  return getInternalControls(ctx);
}

// --- Extra services ---------------------------------------------------------

export async function createService(ctx: FinCtx, data: Record<string, unknown>): Promise<ServiceItem> {
  const [srv] = await ctx.m.Service.create(
    [
      {
        nameEn: typeof data.nameEn === 'string' && data.nameEn ? data.nameEn : 'Additional Nile Service',
        nameAr: typeof data.nameAr === 'string' && data.nameAr ? data.nameAr : 'خدمة نيلية إضافية',
        defaultPrice: num(data.defaultPrice) || 100,
        revenueAccountCode:
          typeof data.revenueAccountCode === 'string' && data.revenueAccountCode ? data.revenueAccountCode : '4150',
        active: true,
        sortOrder: await nextSortOrder(ctx, 'Service'),
      },
    ],
    so(ctx),
  );
  await logAudit(ctx, 'CREATE_SERVICE', 'Service', srv._id, `Created extra service ${srv.nameEn}`);
  return toOut<ServiceItem>(srv);
}

export async function deleteService(ctx: FinCtx, id: string): Promise<void> {
  const srv = await ctx.m.Service.findByIdAndDelete(id, so(ctx));
  if (!srv) throw notFound(`Service ${id} not found.`);
  await logAudit(ctx, 'DELETE_SERVICE', 'Service', id, `Deleted service ${srv.nameEn}`);
}

// --- Custom roles -----------------------------------------------------------

export async function createCustomRole(ctx: FinCtx, data: Record<string, unknown>): Promise<CustomRoleItem> {
  const [role] = await ctx.m.CustomRole.create(
    [
      {
        name: typeof data.name === 'string' && data.name ? data.name : 'Custom Role',
        nameAr: typeof data.nameAr === 'string' && data.nameAr ? data.nameAr : 'دور مخصص جديد',
        description: typeof data.description === 'string' ? data.description : '',
        permissions: Array.isArray(data.permissions) ? data.permissions.map(String) : ['invoices:read', 'bookings:read'],
        active: true,
        isSystem: false,
        sortOrder: await nextSortOrder(ctx, 'CustomRole'),
      },
    ],
    so(ctx),
  );
  await logAudit(ctx, 'CREATE_CUSTOM_ROLE', 'CustomRole', role._id, `Created custom role ${role.name}`);
  return toOut<CustomRoleItem>(role);
}

export async function updateCustomRole(ctx: FinCtx, id: string, updates: Record<string, unknown>): Promise<CustomRoleItem> {
  const role = await ctx.m.CustomRole.findById(id).session(ctx.session);
  if (!role) throw notFound(`Role ${id} not found.`);
  const { name, nameAr, description, permissions, active } = updates;
  if (typeof name === 'string' && name) role.name = name;
  if (typeof nameAr === 'string') role.nameAr = nameAr;
  if (typeof description === 'string') role.description = description;
  if (Array.isArray(permissions)) role.permissions = permissions.map(String);
  if (typeof active === 'boolean') role.active = active;
  await role.save(so(ctx));
  await logAudit(ctx, 'UPDATE_CUSTOM_ROLE', 'CustomRole', id, `Updated custom role ${role.name}`);
  return toOut<CustomRoleItem>(role);
}

export async function deleteCustomRole(ctx: FinCtx, id: string): Promise<void> {
  const role = await ctx.m.CustomRole.findById(id).session(ctx.session);
  if (!role) throw notFound(`Role ${id} not found.`);
  if (role.isSystem) throw badRequest('System roles cannot be deleted.');
  await ctx.m.CustomRole.deleteOne({ _id: id }, so(ctx));
  // Users holding the role fall back to their built-in role's permissions.
  await ctx.m.User.updateMany({ customRoleId: id }, { $unset: { customRoleId: 1 } }, so(ctx));
  await logAudit(ctx, 'DELETE_CUSTOM_ROLE', 'CustomRole', id, `Deleted custom role ${role.name}`);
}
