import mongoose, { Schema } from 'mongoose';
import { softDeletePlugin, schemaOptions } from '../db/plugins';
import type { LocalizedText } from './supplier';

export interface DestinationDoc extends mongoose.Document {
  name: LocalizedText;
  description: LocalizedText;
  image: string;
  images: string[];
  status: string;
  lat?: number;
  lng?: number;
  activities: string[];
  public_status?: string;
  operating_hours?: string;
  deletedAt: Date | null;
}

const LocalizedSchema = new Schema<LocalizedText>(
  {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
  },
  { _id: false },
);

const DestinationSchema = new Schema<DestinationDoc>(
  {
    name: { type: LocalizedSchema, required: true },
    description: { type: LocalizedSchema, required: true },
    image: { type: String, default: '' },
    images: { type: [String], default: [] },
    status: { type: String, default: 'active' },
    lat: { type: Number },
    lng: { type: Number },
    activities: { type: [String], default: [] },
    public_status: { type: String, default: 'open' },
    operating_hours: { type: String, default: '' },
  },
  schemaOptions,
);

DestinationSchema.plugin(softDeletePlugin);

export const Destination =
  mongoose.models.Destination ||
  mongoose.model<DestinationDoc>('Destination', DestinationSchema, 'destinations');
