import mongoose, { Schema } from 'mongoose';

/**
 * One row per (key, fixed time window). Kept in MongoDB rather than process
 * memory because Vercel runs many short-lived instances, and an in-memory
 * counter resets on every one of them. The TTL index drops a window once it
 * has expired.
 */
export interface RateLimitHitDoc extends mongoose.Document<string> {
  _id: string;
  count: number;
  expires_at: Date;
}

const RateLimitHitSchema = new Schema<RateLimitHitDoc>(
  {
    _id: { type: String, required: true },
    count: { type: Number, default: 0 },
    expires_at: { type: Date, required: true },
  },
  { versionKey: false },
);

RateLimitHitSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const RateLimitHit =
  mongoose.models.RateLimitHit ||
  mongoose.model<RateLimitHitDoc>('RateLimitHit', RateLimitHitSchema, 'rate_limit_hits');
