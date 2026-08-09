/**
 * Backfill pricing_snapshot and duration on existing bookings.
 * Tour bookings without a stored duration get pricing_locked=true.
 *
 * Usage: node --env-file=.env.local scripts/backfill-booking-pricing.mjs
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const TripSchema = new Schema(
  {
    is_tour: { type: Boolean, default: false },
    price: { type: Number, default: 0 },
    foreigner_price: { type: Number, default: 0 },
    guide_price: { type: Number, default: 0 },
    duration: { type: Number, default: 1 },
  },
  { collection: 'trips' },
);

const BookingSchema = new Schema(
  {
    trip_id: { type: Schema.Types.ObjectId, ref: 'Trip' },
    duration: { type: Number, default: 0 },
    pricing_snapshot: {
      price: { type: Number, default: 0 },
      foreigner_price: { type: Number, default: 0 },
      guide_price: { type: Number, default: 0 },
    },
    pricing_locked: { type: Boolean, default: false },
    refund_owed: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { collection: 'bookings' },
);

const Trip = models.Trip || model('Trip', TripSchema);
const Booking = models.Booking || model('Booking', BookingSchema);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const bookings = await Booking.find({ deletedAt: null }).lean();
  let updated = 0;
  let locked = 0;

  for (const booking of bookings) {
    const trip = await Trip.findById(booking.trip_id).lean();
    if (!trip) {
      console.warn(`Skipping booking ${booking._id}: trip not found`);
      continue;
    }

    const hasSnapshot =
      booking.pricing_snapshot &&
      (booking.pricing_snapshot.price > 0 ||
        booking.pricing_snapshot.foreigner_price > 0 ||
        booking.pricing_snapshot.guide_price > 0);

    const patch = {};

    if (!hasSnapshot) {
      patch.pricing_snapshot = {
        price: trip.price ?? 0,
        foreigner_price: trip.foreigner_price ?? 0,
        guide_price: trip.guide_price ?? 0,
      };
    }

    if (trip.is_tour) {
      if (!booking.duration || booking.duration <= 0) {
        patch.duration = 0;
        patch.pricing_locked = true;
        locked += 1;
      }
    } else if (booking.duration == null) {
      patch.duration = 0;
    }

    if (booking.refund_owed == null) {
      patch.refund_owed = 0;
    }

    if (Object.keys(patch).length > 0) {
      await Booking.updateOne({ _id: booking._id }, { $set: patch });
      updated += 1;
    }
  }

  console.log(`Backfill complete: ${updated} bookings updated, ${locked} tour bookings locked`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
