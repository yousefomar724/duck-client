// Real DUCK Aswan data — no fabricated bookings or payouts.
// Idempotent: upserts on natural keys (email / trip name), safe to re-run.
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model, models } = mongoose;

const localizedSchema = new Schema({ en: String, ar: String }, { _id: false });
const timestamps = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } };

const UserSchema = new Schema(
  {
    // No `default: null` here: a sparse unique index only skips documents
    // where the field is *absent*. A `null` default makes it present (as
    // null) on every user, so the second user ever created collides with
    // the first on the shared null value. Must match src/server/models/user.ts.
    wallet_id: { type: Schema.Types.ObjectId, unique: true, sparse: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    role: { type: Number, default: 0 },
    first_name: String,
    last_name: String,
    phone_number: { type: String, default: null },
    supplier_id: { type: Schema.Types.ObjectId, unique: true, sparse: true },
    google_id: { type: String, unique: true, sparse: true },
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  timestamps,
);

const SupplierSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, required: true },
    email: { type: String, required: true },
    name: localizedSchema,
    about: localizedSchema,
    icon: { type: String, default: '' },
    rate: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  timestamps,
);

const WalletSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, required: true },
    amount: { type: Number, default: 0 },
    supplier_id: { type: Schema.Types.ObjectId, required: true },
    deletedAt: { type: Date, default: null },
  },
  timestamps,
);

const DestinationSchema = new Schema(
  {
    name: localizedSchema,
    description: localizedSchema,
    image: String,
    images: { type: [String], default: [] },
    status: { type: String, default: 'active' },
    lat: Number,
    lng: Number,
    activities: { type: [String], default: [] },
    public_status: { type: String, default: 'open' },
    operating_hours: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
  },
  timestamps,
);

const TripSchema = new Schema(
  {
    supplier_id: { type: Schema.Types.ObjectId, required: true },
    is_tour: { type: Boolean, default: false },
    price: Number,
    foreigner_price: { type: Number, default: 0 },
    guide_mandatory: { type: Boolean, default: false },
    guide_price: { type: Number, default: 0 },
    display_order: { type: Number, default: 0 },
    currency: { type: String, default: 'EGP' },
    rate: { type: Number, default: 0 },
    destination: Boolean,
    location: Boolean,
    from: Date,
    to: Date,
    duration: { type: Number, default: 1 },
    itinerary: localizedSchema,
    name: localizedSchema,
    description: localizedSchema,
    availability: localizedSchema,
    images: { type: [String], default: [] },
    cancelation_policy: localizedSchema,
    max_guests: Number,
    refundable: { type: Boolean, default: true },
    tour_guide_id: { type: Schema.Types.ObjectId, default: null },
    destination_ids: { type: [Schema.Types.ObjectId], default: [] },
    deletedAt: { type: Date, default: null },
  },
  timestamps,
);

const TourGuideSchema = new Schema(
  {
    name: String,
    price: Number,
    phone_number: String,
    deletedAt: { type: Date, default: null },
  },
  timestamps,
);

const SupplierStorageSchema = new Schema(
  {
    supplier_id: { type: Schema.Types.ObjectId, required: true },
    resources: { type: Map, of: Number },
    deletedAt: { type: Date, default: null },
  },
  timestamps,
);

const User = models.User || model('User', UserSchema, 'users');
const Supplier = models.Supplier || model('Supplier', SupplierSchema, 'suppliers');
const Wallet = models.Wallet || model('Wallet', WalletSchema, 'wallets');
const Destination = models.Destination || model('Destination', DestinationSchema, 'destinations');
const Trip = models.Trip || model('Trip', TripSchema, 'trips');
const TourGuide = models.TourGuide || model('TourGuide', TourGuideSchema, 'tour_guides');
const SupplierStorage =
  models.SupplierStorage || model('SupplierStorage', SupplierStorageSchema, 'supplier_storages');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Add it to .env.local before seeding.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  // Repairs a bad index from an earlier version of this schema: `wallet_id`/
  // `supplier_id`/`google_id` used to default to `null`, which defeated their
  // sparse unique indexes (a sparse index only skips *absent* fields, not
  // explicit nulls) and caused a duplicate-key error on the second user ever
  // created. syncIndexes() drops the stale index and rebuilds it correctly
  // against the current schema — safe to run on every seed.
  await User.syncIndexes();

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'DuckAdmin123!';
  const supplierPassword = process.env.SEED_SUPPLIER_PASSWORD || 'DuckSupplier123!';
  if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_SUPPLIER_PASSWORD) {
    console.log(
      'SEED_ADMIN_PASSWORD / SEED_SUPPLIER_PASSWORD not set — using development defaults:',
    );
    console.log(`  admin@duckegy.com / ${adminPassword}`);
    console.log(`  duck.asw@gmail.com  / ${supplierPassword}`);
  }

  // --- Admin account -------------------------------------------------------
  const adminHash = await bcrypt.hash(adminPassword, 10);
  await User.findOneAndUpdate(
    { email: 'admin@duckegy.com' },
    {
      username: 'admin',
      email: 'admin@duckegy.com',
      password: adminHash,
      role: 2,
      first_name: 'Duck',
      last_name: 'Admin',
      active: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log('Seeded admin account.');

  // --- Supplier account + supplier + wallet --------------------------------
  const supplierHash = await bcrypt.hash(supplierPassword, 10);
  let supplierUser = await User.findOne({ email: 'duck.asw@gmail.com' });
  if (!supplierUser) {
    supplierUser = await User.create({
      username: 'duck_aswan',
      email: 'duck.asw@gmail.com',
      password: supplierHash,
      role: 1,
      first_name: 'DUCK',
      last_name: 'Aswan',
      phone_number: '01100255053',
      active: true,
    });
  } else {
    supplierUser.password = supplierHash;
    await supplierUser.save();
  }

  const supplierAbout = {
    en:
      'DUCK runs Nile kayaking experiences from Elephantine Island in Aswan, beside Makani Cafe. ' +
      'Two tours: a free-style session for experienced paddlers, and a private captain-led tour to ' +
      'hidden spots mid-Nile with photography included. Payment via InstaPay; booking confirmed via ' +
      'the online form. Contact: 01550061006 / 01100255053.',
    ar:
      'داك تقدم تجارب تجديف الكاياك في نيل أسوان من جزيرة أسوان بجوار مكاني كافيه. جولتان: جولة حرة ' +
      'للمحترفين، وجولة خاصة مع كابتن لأماكن مخفية وسط النيل مع تصوير. الدفع عبر إنستا باي، وتأكيد ' +
      'الحجز عبر النموذج الإلكتروني. للتواصل: 01550061006 - 01100255053.',
  };

  const supplier = await Supplier.findOneAndUpdate(
    { user_id: supplierUser._id },
    {
      user_id: supplierUser._id,
      email: 'duck.asw@gmail.com',
      name: { en: 'DUCK Aswan', ar: 'Duck Aswan' },
      about: supplierAbout,
      icon: '/logo-transparent.png',
      rate: 5,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  let wallet = await Wallet.findOne({ supplier_id: supplier._id });
  if (!wallet) {
    wallet = await Wallet.create({ user_id: supplierUser._id, amount: 0, supplier_id: supplier._id });
  }

  supplierUser.supplier_id = supplier._id;
  supplierUser.wallet_id = wallet._id;
  await supplierUser.save();
  console.log('Seeded supplier account, supplier profile, and wallet.');

  // --- Destination: Elephantine Island / Nagaa El Qibli Ferry --------------
  const destinationName = { en: 'Elephantine Island – Nagaa El Qibli Ferry, Aswan', ar: 'جزيرة أسوان – معدية النجع القبلي' };
  const destinationDescription = {
    en:
      'Meeting point for kayak tours beside Makani Cafe on Elephantine Island. Ask for "Amm Amir ' +
      'Mahgoub\'s house" on arrival. Map: https://maps.app.goo.gl/t4GVSBzuXVRoqhRs5',
    ar:
      'نقطة اللقاء لجولات الكاياك بجوار مكاني كافيه على جزيرة أسوان. عند الوصول يمكنك السؤال عن بيت ' +
      'عم أمير محجوب. الخريطة: https://maps.app.goo.gl/t4GVSBzuXVRoqhRs5',
  };

  const destination = await Destination.findOneAndUpdate(
    { 'name.en': destinationName.en },
    {
      name: destinationName,
      description: destinationDescription,
      image: '/kayak.webp',
      images: ['/kayak.webp', '/kayak2.webp', '/kayak3.webp', '/IMG_1713.jpg'],
      status: 'active',
      lat: 24.0867,
      lng: 32.8895,
      activities: ['kayak'],
      public_status: 'open',
      operating_hours: 'متاح من الفجر للمغرب بالحجز المسبق – جميع أيام الأسبوع',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log('Seeded destination.');

  // --- Tour guide: DUCK captain ---------------------------------------------
  const tourGuide = await TourGuide.findOneAndUpdate(
    { name: 'كابتن DUCK' },
    { name: 'كابتن DUCK', price: 0, phone_number: '01100255053' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log('Seeded tour guide.');

  const availability = {
    en: 'Available dawn to sunset by advance booking, seven days a week.',
    ar: 'متاح من الفجر للمغرب بالحجز المسبق – جميع أيام الأسبوع',
  };

  const cancelationPolicy = {
    en:
      'Free cancellation up to 24 hours before the activity (full refund). Cancelling less than 24 ' +
      'hours before: no refund. No-show: no refund. In case of bad weather or force majeure, DUCK may ' +
      'reschedule the activity or issue a full refund if rescheduling is not possible. For late ' +
      'arrivals, a limited wait time applies per the operating schedule; if the activity cannot run, ' +
      'it is treated as a no-show.',
    ar:
      'إلغاء مجاني قبل موعد النشاط بـ 24 ساعة (استرداد كامل للمبلغ). في حالة الإلغاء قبل أقل من 24 ' +
      'ساعة من موعد النشاط لا يتم استرداد المبلغ. عدم الحضور: لا يوجد استرداد. في حالة سوء الأحوال ' +
      'الجوية أو الظروف الخارجة عن الإرادة، يحق لـ DUCK إعادة جدولة النشاط أو استرداد كامل المبلغ في ' +
      'حال تعذر إعادة الجدولة. في حالة التأخير عن الموعد المحدد، يتم الانتظار لفترة محدودة حسب جدول ' +
      'التشغيل، وفي حال تعذر تنفيذ النشاط يتم التعامل مع الحالة كعدم حضور.',
  };

  const from = new Date('2024-03-01T00:00:00.000Z');
  const to = new Date('2027-12-31T23:59:59.999Z');

  // --- Trip 1: Free-style Nile Kayaking -------------------------------------
  await Trip.findOneAndUpdate(
    { 'name.en': 'Free-style Nile Kayaking' },
    {
      supplier_id: supplier._id,
      is_tour: false,
      price: 180,
      foreigner_price: 500,
      guide_mandatory: false,
      guide_price: 0,
      display_order: 0,
      currency: 'EGP',
      destination: true,
      location: true,
      from,
      to,
      duration: 1,
      itinerary: {
        en: 'A roughly one-hour self-guided kayak session on the Nile for experienced paddlers.',
        ar: 'جولة كاياك حرة لمدة ساعة تقريباً على النيل، مخصصة للمحترفين ولديهم خبرة سابقة في التحكم بالكاياك.',
      },
      name: { en: 'Free-style Nile Kayaking', ar: 'جولة الكاياك الحرة على النيل' },
      description: {
        en:
          'For confident paddlers with prior kayaking experience. EGP 180 for Egyptians, EGP 500 for ' +
          'foreigners. Meet at Elephantine Island – Nagaa El Qibli ferry, beside Makani Cafe.',
        ar:
          'للمحترفين الذين لديهم خبرة سابقة في التحكم في الكاياك. السعر 180 ج للمصريين، 500 ج ' +
          'للأجانب. نقطة اللقاء: جزيرة أسوان – معدية النجع القبلي بجوار مكاني كافيه.',
      },
      availability,
      images: ['/kayak.webp', '/kayak4.jpg'],
      cancelation_policy: cancelationPolicy,
      max_guests: 10,
      refundable: true,
      destination_ids: [destination._id],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // --- Trip 2: Private Captain Tour -----------------------------------------
  await Trip.findOneAndUpdate(
    { 'name.en': 'Private Captain Tour' },
    {
      supplier_id: supplier._id,
      is_tour: false,
      price: 275,
      foreigner_price: 850,
      guide_mandatory: true,
      guide_price: 0,
      display_order: 1,
      currency: 'EGP',
      destination: true,
      location: true,
      from,
      to,
      duration: 1,
      itinerary: {
        en:
          'A captain-led kayak route to hidden spots mid-Nile with photography included; edited ' +
          'photos delivered within 24 hours with the DUCK logo added. Ideal for beginners. Solo ' +
          'travellers pay EGP 300 instead of the EGP 275 per-person rate.',
        ar:
          'جولة مع كابتن محترف لأماكن مخفية وسط النيل مع تصوير؛ يتم تسليم الصور خلال 24 ساعة بعد ' +
          'إضافة الشعار والتعديلات. مثالية للمبتدئين. السعر للفرد الواحد 300 ج بدلاً من 275 ج.',
      },
      name: { en: 'Private Captain Tour', ar: 'الجولة الخاصة مع كابتن' },
      description: {
        en:
          'A comfortable, safe experience with a professional captain throughout. EGP 275 per person ' +
          'for Egyptians (EGP 300 if travelling solo), EGP 850 for foreigners. Includes photography ' +
          'with edited photos delivered within 24 hours.',
        ar:
          'اختيار مثالي للمبتدئين أو لمن يبحث عن تجربة مريحة وآمنة مع كابتن محترف طوال الجولة. السعر ' +
          '275 ج للمصريين (300 ج لو فرد واحد)، 850 ج للأجانب. يشمل التصوير مع تسليم الصور خلال 24 ' +
          'ساعة بعد التعديل.',
      },
      availability,
      images: ['/kayak2.webp', '/IMG_1846.jpg', '/IMG_1855.jpg'],
      cancelation_policy: cancelationPolicy,
      max_guests: 8,
      refundable: true,
      tour_guide_id: tourGuide._id,
      destination_ids: [destination._id],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log('Seeded 2 trips.');

  // --- Supplier storage: kayaks only ----------------------------------------
  await SupplierStorage.findOneAndUpdate(
    { supplier_id: supplier._id },
    { supplier_id: supplier._id, resources: { kayak: 12, water_cycle: 0, sup: 0 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log('Seeded supplier storage limits.');

  console.log('\nSeed complete:');
  console.log('  2 users (1 admin, 1 supplier)');
  console.log('  1 supplier profile + wallet');
  console.log('  1 destination');
  console.log('  2 trips');
  console.log('  1 tour guide');
  console.log('  1 supplier storage record');
  console.log('  0 bookings, 0 payouts (real data only, per project decision)');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
