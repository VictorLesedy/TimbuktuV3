import * as repo from "../lib/repo";
import { setSession } from "../lib/session";

repo.network.minLatency = 0;
repo.network.maxLatency = 1;
const ok = (c: boolean, m: string) => {
  console.log(c ? "PASS" : "FAIL", m);
  if (!c) process.exitCode = 1;
};
const home = await repo.getHome("Dar es Salaam");
ok(
  home.trending.length > 0 && home.nearYou.length > 0,
  `home rails: trending ${home.trending.length}, busy ${home.busyToday.length}, near ${home.nearYou.length}`,
);
const ev = await repo.listActivations({
  type: "event",
  city: null,
  date: null,
  minPrice: null,
  maxPrice: 30000,
  vibe: null,
  sort: "top_rated",
  near: "Dar es Salaam",
});
ok(
  ev.every((c) => c.activation.type === "event" && c.fromPrice <= 30000),
  `explore filter events<=30k: ${ev.length}`,
);
const vibe = await repo.listActivations({
  type: null,
  city: null,
  date: null,
  minPrice: null,
  maxPrice: null,
  vibe: 0,
  sort: "trending",
  near: "Dar es Salaam",
});
ok(
  vibe.some((c) => c.activation.slug === "mwezi-lounge"),
  `vibe Monday includes Mwezi (${vibe.length})`,
);
// event purchase
const d = await repo.getActivation("amapiano-on-the-dhow");
const early = d.activation.event!.tiers[0]!;
const before = early.sold;
const o = await repo.createOrder({
  activationId: d.activation.id,
  kind: "ticket",
  lines: [{ label: "x", unitPrice: 1, qty: 2, tierId: early.id }],
  promoCode: "KARIBU10",
  phone: "+255712345678",
  network: "M-Pesa",
});
ok(o.status === "pending" && o.discount > 0 && o.total === early.price * 2 - o.discount, `order pending with promo total ${o.total}`);
const paid = await repo.confirmPayment(o.id, "success");
const d2 = await repo.getActivation("amapiano-on-the-dhow");
ok(paid.status === "paid" && d2.activation.event!.tiers[0]!.sold === before + 2, "inventory updated after payment");
const f = await repo.createOrder({
  activationId: d.activation.id,
  kind: "ticket",
  lines: [{ label: "x", unitPrice: 1, qty: 1, tierId: "vip" }],
  phone: "+255712345678",
  network: "M-Pesa",
});
ok((await repo.confirmPayment(f.id, "failure")).status === "failed", "failure path");
const e = await repo.createOrder({
  activationId: d.activation.id,
  kind: "ticket",
  lines: [{ label: "x", unitPrice: 1, qty: 1, tierId: "vip" }],
  phone: "+255712345678",
  network: "M-Pesa",
});
ok((await repo.expireOrder(e.id)).status === "expired", "expiry path");
try {
  await repo.createOrder({
    activationId: d.activation.id,
    kind: "ticket",
    lines: [{ label: "x", unitPrice: 1, qty: 999, tierId: "vip" }],
    phone: "x",
    network: "M-Pesa",
  });
  ok(false, "oversell blocked");
} catch (err) {
  ok(String(err).includes("left") || String(err).includes("sold out"), `oversell blocked: ${(err as Error).message}`);
}
// venue reservation
const v = await repo.getActivation("kilele-rooftop");
const vo = await repo.createOrder({
  activationId: v.activation.id,
  kind: "reservation",
  lines: [{ label: "", unitPrice: 0, qty: 1, tableId: "table" }],
  scheduledFor: new Date(Date.now() + 86400000).toISOString(),
  phone: "+255712345678",
  network: "M-Pesa",
});
ok((await repo.confirmPayment(vo.id, "success")).total === v.activation.venue!.tableOptions[1]!.deposit, "venue deposit charged");
// service slot
const s = await repo.getActivation("sunset-dhow-cruise");
const slot = s.activation.service!.slots.find((x) => x.booked + 3 <= x.capacity)!;
const so = await repo.createOrder({
  activationId: s.activation.id,
  kind: "slot",
  lines: [{ label: "Slot", unitPrice: 0, qty: 3, slotId: slot.id }],
  scheduledFor: slot.startsAt,
  phone: "+255712345678",
  network: "M-Pesa",
});
await repo.confirmPayment(so.id, "success");
const s2 = await repo.getActivation("sunset-dhow-cruise");
ok(s2.activation.service!.slots.find((x) => x.id === slot.id)!.booked === slot.booked + 3, "slot booked updated");
// hire round trip
const pro = await repo.getActivation("dj-kivuli");
const hr = await repo.createHireRequest(pro.activation.id, {
  date: pro.activation.professional!.availability[0]!,
  location: "Masaki house",
  durationHours: 3,
  budget: 500000,
  note: "hi",
});
const inbox = await repo.listIncomingHireRequests();
ok(
  inbox.some((h) => h.id === hr.id),
  "entertainer sees request",
);
await repo.sendQuote(hr.id, {
  price: 480000,
  terms: "Three hours with sound",
  expiresAt: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
});
const acc = await repo.respondToQuote(hr.id, "accept");
ok(acc.status === "accepted", "fan accepts");
const ho = await repo.createOrder({
  activationId: pro.activation.id,
  kind: "hire",
  lines: [{ label: "Hire fee", unitPrice: 0, qty: 1 }],
  hireRequestId: hr.id,
  phone: "+255712345678",
  network: "M-Pesa",
});
await repo.confirmPayment(ho.id, "success");
ok((await repo.listMyHireRequests()).find((h) => h.id === hr.id)!.status === "paid" && ho.total === 480000, "hire paid at quote price");
// check-in + review + level
const meBefore = await repo.getMe();
const targets = await repo.listCheckInTargets();
ok(targets.length > 0, `check-in targets: ${targets.map((t) => `${t.title} (${t.expected})`).join(", ")}`);
const sunsetId = targets.find((t) => t.title.startsWith("Sunset"))!.id;
const queue = await repo.listCheckInQueue(sunsetId, "asha");
const mine = queue.find((q) => q.userId === "u_me" && !q.checkedInAt)!;
const ratingBefore = (await repo.getActivation("sunset-sessions-rooftop")).signals;
await repo.checkInTicket(mine.code);
try {
  await repo.checkInTicket(mine.code);
  ok(false, "double scan blocked");
} catch {
  ok(true, "double scan blocked");
}
const reviewable = await repo.listReviewable();
ok(reviewable.length >= 2, `reviewable orders: ${reviewable.length}`);
const target = reviewable.find((r) => r.slug === "sunset-sessions-rooftop")!;
await repo.createReview(target.orderId, { rating: 1, text: "Testing that ratings move after a review." });
const after = (await repo.getActivation("sunset-sessions-rooftop")).signals;
ok(after.reviewCount === ratingBefore.reviewCount + 1, `rating ${ratingBefore.rating} -> ${after.rating}`);
for (let i = 0; i < 3; i++) await repo.recordShare(pro.activation.id, "whatsapp");
const meAfter = await repo.getMe();
ok(
  meAfter.progress.ratio > meBefore.progress.ratio,
  `level progress ${meBefore.progress.ratio.toFixed(2)} -> ${meAfter.progress.ratio.toFixed(2)} canUnlock=${meAfter.progress.canUnlock}`,
);
const unlocked = await repo.unlockAmbassador();
ok(unlocked.user!.fanLevel === "ambassador", "ambassador unlocked");
const amb = await repo.getAmbassadorStats();
ok(amb.balance > 0, `ambassador balance ${amb.balance}, sales ${amb.salesDriven}`);
// wizard -> approvals -> explore
const created = await repo.createActivation({
  type: "event",
  title: "Wizard test night",
  description: "d",
  media: [],
  location: { area: "Masaki", lat: -6.75, lng: 39.27 },
  event: {
    startsAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    endsAt: new Date(Date.now() + 5.2 * 86400000).toISOString(),
    tiers: [{ id: "t1", name: "General", price: 10000, capacity: 100, sold: 0 }],
    lineup: [],
  },
  submit: true,
});
ok(
  (await repo.listApprovals()).some((a) => a.id === created.id),
  "wizard listing in approvals",
);
await repo.decideApproval("activation", created.id, "approve");
const exp = await repo.listActivations({
  type: null,
  city: null,
  date: null,
  minPrice: null,
  maxPrice: null,
  vibe: null,
  sort: "newest",
  near: "Dar es Salaam",
});
ok(exp[0]?.activation.id === created.id && exp[0].badges.some((b) => b.id === "new"), "approved listing first in newest with New badge");
// settings flag
const st = await repo.getSettings();
await repo.updateSettings({ ...st, crowdLabels: { enabled: false, threshold: 30 } });
ok((await repo.getActivation("kilele-rooftop")).crowdLabel === null, "crowd label hidden when flag off");
// revenue reconciles
const rev = await repo.getRevenueReport({ days: 90, city: null });
const t = rev.totals;
ok(
  t.gross === t.provider + t.platform + t.government + t.partner + t.ambassador && rev.rows.reduce((x, r) => x + r.gross, 0) === t.gross,
  `revenue reconciles: ${t.gross} over ${rev.rows.length} rows`,
);
// live tick
const tick = repo.simulateCrowdTick();
ok(!!tick, `live tick: ${tick?.text}`);
// explorer gate
setSession({ signedIn: false });
try {
  await repo.toggleSave(pro.activation.id, true);
  ok(false, "explorer save blocked");
} catch {
  ok(true, "explorer save blocked");
}
const ov = await repo.getStudioOverview();
ok(
  ov.sales.month > 0 && ov.activations.length >= 5,
  `studio month ${ov.sales.month}, upcoming ${ov.upcoming.length}, pendingHire ${ov.pendingHire}`,
);
const pay = await repo.getStudioPayouts();
ok(pay.balance > 0, `studio balance ${pay.balance}`);
