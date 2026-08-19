/**
 * Backfill adults / kids_1_6 / kids_7_12 on existing bookings.
 * Legacy rows treated all quantity as adults.
 *
 * Usage: node --env-file=.env.local scripts/backfill-booking-kids.mjs
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const BookingSchema = new Schema(
  {
    quantity: { type: Number, default: 1 },
    adults: { type: Number },
    kids_1_6: { type: Number },
    kids_7_12: { type: Number },
    deletedAt: { type: Date, default: null },
  },
  { collection: 'bookings' },
);

const Booking = models.Booking || model('Booking', BookingSchema);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const result = await Booking.updateMany(
    { adults: { $exists: false } },
    [{ $set: { adults: '$quantity', kids_1_6: 0, kids_7_12: 0 } }],
  );

  console.log(`Matched ${result.matchedCount}, modified ${result.modifiedCount}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
