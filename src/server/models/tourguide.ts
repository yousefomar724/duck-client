import mongoose, { Schema } from 'mongoose';
import { softDeletePlugin, schemaOptions } from '../db/plugins';

export interface TourGuideDoc extends mongoose.Document {
  name: string;
  price: number;
  phone_number: string;
  deletedAt: Date | null;
}

const TourGuideSchema = new Schema<TourGuideDoc>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    phone_number: { type: String, required: true },
  },
  schemaOptions,
);

TourGuideSchema.plugin(softDeletePlugin);

export const TourGuide =
  mongoose.models.TourGuide || mongoose.model<TourGuideDoc>('TourGuide', TourGuideSchema, 'tour_guides');
