import mongoose, { Schema } from 'mongoose';
import { softDeletePlugin, schemaOptions } from '../db/plugins';

export type FeedbackContext = 'booking' | 'general';
export type FeedbackStatus = 'new' | 'read' | 'archived';

export interface FeedbackDoc extends mongoose.Document {
  rating: number;
  comment?: string;
  name?: string;
  contact?: string;
  context: FeedbackContext;
  booking_ref?: string;
  page?: string;
  locale?: string;
  status: FeedbackStatus;
  deletedAt: Date | null;
}

const FeedbackSchema = new Schema<FeedbackDoc>(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000 },
    name: { type: String, maxlength: 120 },
    contact: { type: String, maxlength: 200 },
    context: { type: String, enum: ['booking', 'general'], default: 'general' },
    booking_ref: { type: String, maxlength: 64 },
    page: { type: String, maxlength: 500 },
    locale: { type: String, maxlength: 8 },
    status: { type: String, enum: ['new', 'read', 'archived'], default: 'new' },
  },
  schemaOptions,
);

FeedbackSchema.plugin(softDeletePlugin);

export const Feedback =
  mongoose.models.Feedback ||
  mongoose.model<FeedbackDoc>('Feedback', FeedbackSchema, 'feedback');
