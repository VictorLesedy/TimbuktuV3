import { z } from "zod";

/* All entities are defined once here. Types are derived from the schemas so the
   mock repository and a future Node + PostgreSQL API share one contract. */

export const CitySchema = z.enum(["Dar es Salaam", "Arusha", "Zanzibar", "Dodoma"]);
export const RoleSchema = z.enum(["fan", "entertainer", "admin"]);
export const FanLevelSchema = z.enum(["explorer", "member", "ambassador"]);
export const MembershipSchema = z.enum(["standard", "gold", "platinum"]);
export const ExperiencePrefSchema = z.enum(["music_nightlife", "sport", "days_out", "arts_culture"]);
export const ActivationTypeSchema = z.enum(["event", "venue", "service", "professional"]);
export const ProviderCategorySchema = z.enum(["venue", "person", "service"]);
export const ProviderSubtypeSchema = z.enum([
  "club",
  "lounge",
  "dj",
  "musician",
  "photographer",
  "running_club",
  "tour_company",
  "caterer",
  "cinema",
  "arcade",
  "arts_centre",
  "sports_bar",
  "studio",
]);
export const ActivationStatusSchema = z.enum(["draft", "pending", "live", "paused", "rejected", "changes_requested"]);
export const ReviewStateSchema = z.enum(["pending", "approved", "rejected", "changes_requested"]);

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  phone: z.string(),
  city: CitySchema,
  roles: z.array(RoleSchema),
  fanLevel: FanLevelSchema,
  membership: MembershipSchema,
  favouriteArtists: z.array(z.string()),
  experiencePref: ExperiencePrefSchema.nullable(),
  followers: z.number().int(),
  referralCode: z.string(),
  joinedAt: z.string(),
  ambassadorSince: z.string().nullable(),
});

export const ProviderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  category: ProviderCategorySchema,
  subtype: ProviderSubtypeSchema,
  verified: z.boolean(),
  reviewState: ReviewStateSchema,
  city: CitySchema,
  createdAt: z.string(),
  payoutPhone: z.string(),
});

export const MediaSchema = z.object({ url: z.string(), alt: z.string(), hue: z.number() });
export const LocationSchema = z.object({ area: z.string(), lat: z.number(), lng: z.number() });

export const TierSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  price: z.number().int().nonnegative(),
  capacity: z.number().int().positive(),
  sold: z.number().int().nonnegative(),
  perks: z.string().optional(),
});
export const TableOptionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  minSpend: z.number().int().nonnegative(),
  deposit: z.number().int().nonnegative(),
  seats: z.number().int().positive(),
  kind: z.enum(["entry", "table", "vip"]),
});
export const SlotSchema = z.object({
  id: z.string(),
  startsAt: z.string(),
  capacity: z.number().int().positive(),
  booked: z.number().int().nonnegative(),
});

export const ActivationSchema = z.object({
  id: z.string(),
  slug: z.string(),
  providerId: z.string(),
  type: ActivationTypeSchema,
  title: z.string().min(3),
  description: z.string(),
  media: z.array(MediaSchema),
  city: CitySchema,
  location: LocationSchema,
  status: ActivationStatusSchema,
  featured: z.boolean(),
  createdAt: z.string(),
  moderationNote: z.string().optional(),
  event: z
    .object({
      startsAt: z.string(),
      endsAt: z.string(),
      tiers: z.array(TierSchema),
      lineup: z.array(z.string()),
    })
    .optional(),
  venue: z
    .object({
      hours: z.string(),
      openDays: z.array(z.number().int().min(0).max(6)),
      tableOptions: z.array(TableOptionSchema),
    })
    .optional(),
  service: z
    .object({
      durationMins: z.number().int().positive(),
      pricePerPerson: z.number().int().nonnegative(),
      slots: z.array(SlotSchema),
    })
    .optional(),
  professional: z
    .object({
      baseRate: z.number().int().nonnegative(),
      availability: z.array(z.string()),
    })
    .optional(),
});

export const InteractionKindSchema = z.enum(["view", "save", "share", "purchase", "booking", "checkin", "review", "referral_sale"]);
export const InteractionSchema = z.object({
  id: z.string(),
  activationId: z.string(),
  userId: z.string(),
  kind: InteractionKindSchema,
  amount: z.number().optional(),
  tier: z.enum(["general", "vip", "table"]).optional(),
  at: z.string(),
});

export const SignalsSchema = z.object({
  activationId: z.string(),
  rating: z.number(),
  reviewCount: z.number().int(),
  repeatRate: z.number(),
  rhythm: z.array(z.array(z.number())),
  crowd: z.object({
    tierShare: z.object({ general: z.number(), vip: z.number(), table: z.number() }),
    avgSpend: z.number(),
    sampleSize: z.number().int(),
  }),
  momentum48h: z.number(),
  momentumPrev48h: z.number(),
  saves48h: z.number().int(),
  sales48h: z.number().int(),
  busyNow: z.boolean(),
  isNew: z.boolean(),
});

export const OrderLineSchema = z.object({
  label: z.string(),
  unitPrice: z.number().int().nonnegative(),
  qty: z.number().int().positive(),
  tierId: z.string().optional(),
  tableId: z.string().optional(),
  slotId: z.string().optional(),
});
export const OrderKindSchema = z.enum(["ticket", "reservation", "slot", "hire"]);
export const OrderSchema = z.object({
  id: z.string(),
  code: z.string(),
  userId: z.string(),
  activationId: z.string(),
  kind: OrderKindSchema,
  lines: z.array(OrderLineSchema),
  promoCode: z.string().optional(),
  discount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  status: z.enum(["pending", "paid", "failed", "expired"]),
  createdAt: z.string(),
  scheduledFor: z.string().optional(),
  checkedInAt: z.string().optional(),
  hireRequestId: z.string().optional(),
  referrerId: z.string().optional(),
  phone: z.string().optional(),
  network: z.string().optional(),
});

export const HireDetailsSchema = z.object({
  date: z.string().min(1, "Pick a date from the calendar"),
  location: z.string().min(3, "Add where the event is happening"),
  durationHours: z.coerce.number().int().min(1, "At least 1 hour").max(12, "12 hours at most"),
  budget: z.coerce.number().int().min(50_000, "Budgets start at TSh 50,000"),
  note: z.string().max(400, "Keep the note under 400 characters").optional(),
});
export const QuoteSchema = z.object({
  price: z.coerce.number().int().min(10_000, "Quote at least TSh 10,000"),
  terms: z.string().min(5, "Add short terms, such as what is included"),
  expiresAt: z.string().min(1, "Choose when the quote expires"),
});
export const HireStatusSchema = z.enum(["sent", "quoted", "accepted", "declined", "paid"]);
export const HireRequestSchema = z.object({
  id: z.string(),
  fanId: z.string(),
  activationId: z.string(),
  details: HireDetailsSchema,
  status: HireStatusSchema,
  quote: QuoteSchema.optional(),
  declinedBy: z.enum(["fan", "entertainer"]).optional(),
  history: z.array(z.object({ status: HireStatusSchema, at: z.string() })),
  createdAt: z.string(),
});

export const LedgerPartySchema = z.enum(["platform", "government", "partner", "provider", "ambassador"]);
export const LedgerEntrySchema = z.object({
  id: z.string(),
  orderId: z.string(),
  party: LedgerPartySchema,
  amount: z.number().int(),
  at: z.string(),
  city: CitySchema,
  activationType: ActivationTypeSchema,
  partyId: z.string().optional(),
});

export const ReviewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  activationId: z.string(),
  orderId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  text: z.string(),
  verified: z.boolean(),
  at: z.string(),
});
export const ReviewInputSchema = z.object({
  rating: z.number().int().min(1, "Choose a rating").max(5),
  text: z.string().min(10, "Write at least 10 characters").max(500),
});

export const PayoutSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  amount: z.number().int().positive(),
  phone: z.string(),
  status: z.enum(["processing", "sent"]),
  at: z.string(),
});

export const SaveSchema = z.object({ userId: z.string(), activationId: z.string(), at: z.string() });

export const SettingsSchema = z.object({
  commission: z.record(ActivationTypeSchema, z.number().min(0).max(0.5)),
  governmentShare: z.number().min(0).max(1),
  partnerShare: z.number().min(0).max(1),
  ambassadorRate: z.number().min(0).max(0.2),
  crowdLabels: z.object({ enabled: z.boolean(), threshold: z.number().int().min(1) }),
  registrationGate: z.enum(["beforeSelection", "atCheckout"]),
});

export const PhoneSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, ""))
  .refine((v) => /^(\+255|0)?[67]\d{8}$/.test(v), {
    message: "Enter a Tanzanian mobile number, such as +255 712 345 678",
  });

export type City = z.infer<typeof CitySchema>;
export type Role = z.infer<typeof RoleSchema>;
export type FanLevel = z.infer<typeof FanLevelSchema>;
export type Membership = z.infer<typeof MembershipSchema>;
export type ExperiencePref = z.infer<typeof ExperiencePrefSchema>;
export type ActivationType = z.infer<typeof ActivationTypeSchema>;
export type ActivationStatus = z.infer<typeof ActivationStatusSchema>;
export type User = z.infer<typeof UserSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type Media = z.infer<typeof MediaSchema>;
export type Tier = z.infer<typeof TierSchema>;
export type TableOption = z.infer<typeof TableOptionSchema>;
export type Slot = z.infer<typeof SlotSchema>;
export type Activation = z.infer<typeof ActivationSchema>;
export type InteractionKind = z.infer<typeof InteractionKindSchema>;
export type Interaction = z.infer<typeof InteractionSchema>;
export type Signals = z.infer<typeof SignalsSchema>;
export type OrderLine = z.infer<typeof OrderLineSchema>;
export type OrderKind = z.infer<typeof OrderKindSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type HireDetails = z.infer<typeof HireDetailsSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type HireStatus = z.infer<typeof HireStatusSchema>;
export type HireRequest = z.infer<typeof HireRequestSchema>;
export type LedgerParty = z.infer<typeof LedgerPartySchema>;
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type Payout = z.infer<typeof PayoutSchema>;
export type Save = z.infer<typeof SaveSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
