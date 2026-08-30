import mongoose, { Schema, Types } from 'mongoose';
import { softDeletePlugin, schemaOptions } from '../db/plugins';
import type { LocalizedText } from './supplier';

export interface TripFaq {
  q: LocalizedText;
  a: LocalizedText;
}

export interface TripDoc extends mongoose.Document {
  supplier_id: Types.ObjectId;
  is_tour: boolean;
  price: number;
  foreigner_price: number;
  guide_mandatory: boolean;
  guide_price: number;
  display_order: number;
  currency: string;
  rate: number;
  destination: boolean;
  location: boolean;
  from: Date;
  to?: Date | null;
  duration: number;
  /** Occupancy length in minutes. Authoritative for hourly capacity. */
  activity_minutes?: number | null;
  duration_text: LocalizedText;
  itinerary: LocalizedText;
  name: LocalizedText;
  description: LocalizedText;
  availability: LocalizedText;
  images: string[];
  cancelation_policy: LocalizedText;
  meeting_point: LocalizedText;
  map_url: string;
  faqs: TripFaq[];
  hide_default_faqs: boolean;
  max_guests: number;
  refundable: boolean;
  tour_guide_id?: Types.ObjectId | null;
  destination_ids: Types.ObjectId[];
  deletedAt: Date | null;
}

const LocalizedSchema = new Schema<LocalizedText>(
  {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
  },
  { _id: false },
);

const TripFaqSchema = new Schema<TripFaq>(
  {
    q: { type: LocalizedSchema, required: true },
    a: { type: LocalizedSchema, required: true },
  },
  { _id: false },
);

const TripSchema = new Schema<TripDoc>(
  {
    supplier_id: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    is_tour: { type: Boolean, required: true, default: false },
    price: { type: Number, required: true },
    foreigner_price: { type: Number, default: 0 },
    guide_mandatory: { type: Boolean, required: true, default: false },
    guide_price: { type: Number, default: 0 },
    display_order: { type: Number, default: 0 },
    currency: { type: String, required: true, default: 'EGP' },
    rate: { type: Number, required: true, default: 0 },
    destination: { type: Boolean, required: true },
    location: { type: Boolean, required: true },
    from: { type: Date, required: true },
    to: { type: Date, default: null },
    duration: { type: Number, default: 1 },
    activity_minutes: { type: Number, default: null },
    duration_text: { type: LocalizedSchema, default: () => ({ en: '', ar: '' }) },
    itinerary: { type: LocalizedSchema, default: () => ({ en: '', ar: '' }) },
    name: { type: LocalizedSchema, required: true },
    description: { type: LocalizedSchema, required: true },
    availability: { type: LocalizedSchema, default: () => ({ en: '', ar: '' }) },
    images: { type: [String], default: [] },
    cancelation_policy: { type: LocalizedSchema, default: () => ({ en: '', ar: '' }) },
    meeting_point: { type: LocalizedSchema, default: () => ({ en: '', ar: '' }) },
    map_url: { type: String, default: '' },
    faqs: { type: [TripFaqSchema], default: [] },
    hide_default_faqs: { type: Boolean, default: false },
    max_guests: { type: Number, required: true },
    refundable: { type: Boolean, required: true, default: true },
    tour_guide_id: { type: Schema.Types.ObjectId, ref: 'TourGuide', default: null },
    // Replaces the Go `trip_destinations` many2many join table.
    destination_ids: { type: [Schema.Types.ObjectId], ref: 'Destination', default: [] },
  },
  schemaOptions,
);

TripSchema.plugin(softDeletePlugin);

TripSchema.set('toJSON', {
  ...schemaOptions.toJSON,
  // `doc` typed loosely: we need Document#populated(path), which raw ObjectId
  // fields don't have. An *unpopulated* ObjectId is also `typeof === 'object'`
  // and — critically — BSON's ObjectId has its own internal `.id` Buffer
  // property, so a naive `typeof ret.x === 'object'` check would collide with
  // it and corrupt the field. `doc.populated(path)` is the correct way to
  // distinguish "populated document" from "raw ObjectId".
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(doc: any, ret: Record<string, unknown>) {
    schemaOptions.toJSON.transform(doc, ret);
    if (doc.populated('destination_ids') && Array.isArray(ret.destination_ids)) {
      const ids = ret.destination_ids as unknown[];
      // Expose populated destinations under `destinations` (Go's preloaded field name).
      ret.destinations = ids;
      ret.destination_ids = ids.map((d) => (d as { id?: string })?.id).filter(Boolean);
    }
    if (doc.populated('supplier_id') && ret.supplier_id) {
      ret.supplier = ret.supplier_id;
      ret.supplier_id = (ret.supplier as { id?: string })?.id;
    }
    if (doc.populated('tour_guide_id') && ret.tour_guide_id) {
      ret.tour_guide = ret.tour_guide_id;
      ret.tour_guide_id = (ret.tour_guide as { id?: string; ID?: string })?.id;
    }
    return ret;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

export const Trip = mongoose.models.Trip || mongoose.model<TripDoc>('Trip', TripSchema, 'trips');
