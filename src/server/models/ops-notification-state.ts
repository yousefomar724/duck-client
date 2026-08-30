import mongoose, { Schema, Types } from 'mongoose';
import { schemaOptions } from '../db/plugins';

export interface OpsNotificationStateDoc extends mongoose.Document {
  user_id: Types.ObjectId;
  last_seen_at: Date;
  dismissed_keys: string[];
}

const OpsNotificationStateSchema = new Schema<OpsNotificationStateDoc>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    last_seen_at: { type: Date, default: () => new Date(0) },
    dismissed_keys: { type: [String], default: [] },
  },
  schemaOptions,
);

export const OpsNotificationState =
  mongoose.models.OpsNotificationState ||
  mongoose.model<OpsNotificationStateDoc>(
    'OpsNotificationState',
    OpsNotificationStateSchema,
    'ops_notification_states',
  );
