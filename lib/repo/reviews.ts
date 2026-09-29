import { DEMO_IDS } from "../config";
import { db } from "../mock/db";
import { type Review, ReviewInputSchema } from "../schemas";
import { getSession } from "../session";
import { uid } from "../utils";
import { ApiError, read, write } from "./client";

export type ReviewableOrder = { orderId: string; activationId: string; title: string; slug: string; attendedAt: string };

/** Only a check-in, or a booking whose date has passed, earns a review. */
function eligibleOrders() {
  const w = db();
  const now = Date.now();
  const reviewedOrders = new Set(w.reviews.filter((r) => r.userId === DEMO_IDS.fan).map((r) => r.orderId));
  return w.orders.filter((o) => {
    if (o.userId !== DEMO_IDS.fan || o.status !== "paid" || reviewedOrders.has(o.id)) return false;
    if (o.checkedInAt) return true;
    const completedBooking = (o.kind === "slot" || o.kind === "hire") && o.scheduledFor && new Date(o.scheduledFor).getTime() < now;
    return Boolean(completedBooking);
  });
}

export async function listReviewable(): Promise<ReviewableOrder[]> {
  return read(() => {
    if (!getSession().signedIn) return [];
    const w = db();
    return eligibleOrders().map((o) => {
      const a = w.activations.find((x) => x.id === o.activationId);
      return {
        orderId: o.id,
        activationId: o.activationId,
        title: a?.title ?? "",
        slug: a?.slug ?? "",
        attendedAt: o.checkedInAt ?? o.scheduledFor ?? o.createdAt,
      };
    });
  });
}

export async function listMyReviews(): Promise<(Review & { title: string; slug: string })[]> {
  return read(() => {
    const w = db();
    return w.reviews
      .filter((r) => r.userId === DEMO_IDS.fan)
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((r) => {
        const a = w.activations.find((x) => x.id === r.activationId);
        return { ...r, title: a?.title ?? "", slug: a?.slug ?? "" };
      });
  });
}

export async function createReview(orderId: string, input: { rating: number; text: string }): Promise<Review> {
  return write(() => {
    const parsed = ReviewInputSchema.parse(input);
    const order = eligibleOrders().find((o) => o.id === orderId);
    if (!order) throw new ApiError("Only verified attendees can review. Check in at the door or finish your booking first.", "forbidden");
    const now = new Date().toISOString();
    const review: Review = {
      id: uid("rev"),
      userId: DEMO_IDS.fan,
      activationId: order.activationId,
      orderId,
      rating: parsed.rating,
      text: parsed.text,
      verified: true,
      at: now,
    };
    const w = db();
    w.reviews.push(review);
    w.interactions.push({ id: uid("int"), activationId: order.activationId, userId: DEMO_IDS.fan, kind: "review", at: now });
    return review;
  });
}
