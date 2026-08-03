import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '@/server/models/user';
import { Supplier } from '@/server/models/supplier';
import { Wallet } from '@/server/models/wallet';
import { Destination } from '@/server/models/destination';
import { Trip } from '@/server/models/trip';
import { Booking } from '@/server/models/booking';
import { SupplierStorage } from '@/server/models/supplier-storage';
import { TourGuide } from '@/server/models/tourguide';
import { signAuthToken } from '@/server/auth/jwt';

export async function createUser(overrides: Record<string, unknown> = {}) {
  const password = (overrides.password as string) ?? 'TestPassword123!';
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    username: (overrides.username as string) ?? `user_${Date.now()}`,
    email: (overrides.email as string) ?? `user_${Date.now()}@test.com`,
    role: (overrides.role as number) ?? 0,
    first_name: 'Test',
    last_name: 'User',
    active: true,
    ...overrides,
    password: hash,
  });
  return { user, password };
}

export async function createSupplierUser(overrides: Record<string, unknown> = {}) {
  const { user, password } = await createUser({
    role: 1,
    email: `supplier_${Date.now()}@test.com`,
    username: `supplier_${Date.now()}`,
    ...overrides,
  });

  const supplier = await Supplier.create({
    user_id: user._id,
    email: user.email,
    name: { en: 'Test Supplier', ar: 'مورد تجريبي' },
    about: { en: 'About', ar: 'حول' },
    icon: '',
    rate: 5,
  });

  const wallet = await Wallet.create({
    user_id: user._id,
    amount: 0,
    supplier_id: supplier._id,
  });

  user.supplier_id = supplier._id;
  user.wallet_id = wallet._id;
  await user.save();

  return { user, supplier, wallet, password };
}

export async function createAdminUser() {
  return createUser({
    role: 2,
    email: `admin_${Date.now()}@test.com`,
    username: `admin_${Date.now()}`,
  });
}

export async function createDestination(overrides: Record<string, unknown> = {}) {
  return Destination.create({
    name: { en: 'Test Destination', ar: 'وجهة تجريبية' },
    description: { en: 'Desc', ar: 'وصف' },
    image: '/test.jpg',
    status: 'active',
    lat: 24.0,
    lng: 32.0,
    activities: ['kayak'],
    public_status: 'open',
    ...overrides,
  });
}

export async function createTrip(supplierId: mongoose.Types.ObjectId, overrides: Record<string, unknown> = {}) {
  return Trip.create({
    supplier_id: supplierId,
    is_tour: false,
    price: 180,
    foreigner_price: 500,
    guide_mandatory: false,
    guide_price: 0,
    display_order: 0,
    currency: 'EGP',
    destination: true,
    location: true,
    from: new Date('2024-01-01'),
    to: new Date('2027-12-31'),
    duration: 1,
    itinerary: { en: 'Itinerary', ar: 'مسار' },
    name: { en: 'Test Trip', ar: 'رحلة تجريبية' },
    description: { en: 'Desc', ar: 'وصف' },
    availability: { en: 'Daily', ar: 'يومياً' },
    images: ['/kayak.webp'],
    cancelation_policy: { en: 'Policy', ar: 'سياسة' },
    max_guests: 10,
    refundable: true,
    destination_ids: [],
    ...overrides,
  });
}

export async function createSupplierStorage(supplierId: mongoose.Types.ObjectId, resources: Record<string, number> = { kayak: 12 }) {
  return SupplierStorage.create({ supplier_id: supplierId, resources });
}

export async function createTourGuide(overrides: Record<string, unknown> = {}) {
  return TourGuide.create({
    name: 'Test Guide',
    price: 0,
    phone_number: '01100000000',
    ...overrides,
  });
}

export async function createBooking(overrides: Record<string, unknown> = {}) {
  return Booking.create({
    session_id: 'test-session',
    user_id: null,
    trip_id: new mongoose.Types.ObjectId(),
    supplier_id: new mongoose.Types.ObjectId(),
    amount: 180,
    currency: 'EGP',
    full_name: 'Test Guest',
    phone_number: '+201000000000',
    status: 'PENDING',
    payment_method: 'MANUAL',
    booking_date: new Date(Date.now() + 48 * 60 * 60 * 1000),
    quantity: 1,
    local_guests: 1,
    foreigner_guests: 0,
    resource_type: 'kayak',
    wants_guide: false,
    hear_about_us: '',
    referral_text: '',
    order_ref: `ref-${Date.now()}`,
    ...overrides,
  });
}

export function authHeader(userId: string, role: number) {
  const token = signAuthToken({ user_id: userId, role: role as 0 | 1 | 2 });
  return { Authorization: `Bearer ${token}` };
}
