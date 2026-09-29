"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as repo from "./repo";
import type { City, HireDetails, Quote, Settings } from "./schemas";
import { useAppStore } from "./store";

/*
 * Every component reads data through these hooks. Replacing lib/repo with real
 * fetch calls leaves this file, and every component, unchanged.
 */

export const qk = {
  home: (city: City) => ["activations", "home", city] as const,
  explore: (f: repo.ExploreFilters) => ["activations", "explore", f] as const,
  activation: (slug: string) => ["activations", "detail", slug] as const,
  me: ["me"] as const,
  orders: ["me", "orders"] as const,
  saved: ["me", "saved"] as const,
  hire: (activationId?: string) => ["me", "hire", activationId ?? "all"] as const,
  reviewable: ["me", "reviewable"] as const,
  myReviews: ["me", "reviews"] as const,
  activity: ["me", "activity"] as const,
  ambassador: ["me", "ambassador"] as const,
  studio: {
    overview: ["studio", "overview"] as const,
    activations: ["studio", "activations"] as const,
    bookings: ["studio", "bookings"] as const,
    hire: ["studio", "hire"] as const,
    payouts: ["studio", "payouts"] as const,
    targets: ["studio", "checkin-targets"] as const,
    queue: (id: string, q: string) => ["studio", "checkin", id, q] as const,
  },
  admin: {
    totals: ["admin", "totals"] as const,
    approvals: ["admin", "approvals"] as const,
    activations: (q: string) => ["admin", "activations", q] as const,
    revenue: (days: number, city: City | null) => ["admin", "revenue", days, city] as const,
    settings: ["settings"] as const,
  },
};

/* ---------- Fan ---------- */

export function useHome() {
  const city = useAppStore((s) => s.city);
  return useQuery({ queryKey: qk.home(city), queryFn: () => repo.getHome(city) });
}

export function useExplore(filters: repo.ExploreFilters) {
  return useQuery({ queryKey: qk.explore(filters), queryFn: () => repo.listActivations(filters) });
}

export function useActivation(slug: string) {
  return useQuery({
    queryKey: qk.activation(slug),
    queryFn: () => repo.getActivation(slug),
    retry: (count, err) => !(err instanceof repo.ApiError && err.code === "not_found") && count < 2,
  });
}

export function useMe() {
  return useQuery({ queryKey: qk.me, queryFn: repo.getMe });
}

export function useMyOrders() {
  return useQuery({ queryKey: qk.orders, queryFn: repo.listMyOrders });
}

export function useSaved() {
  return useQuery({ queryKey: qk.saved, queryFn: repo.listSaved });
}

export function useMyHireRequests(activationId?: string) {
  return useQuery({ queryKey: qk.hire(activationId), queryFn: () => repo.listMyHireRequests(activationId) });
}

export function useReviewable() {
  return useQuery({ queryKey: qk.reviewable, queryFn: repo.listReviewable });
}

export function useMyReviews() {
  return useQuery({ queryKey: qk.myReviews, queryFn: repo.listMyReviews });
}

export function useActivity() {
  return useQuery({ queryKey: qk.activity, queryFn: repo.listActivity });
}

export function useAmbassador() {
  return useQuery({ queryKey: qk.ambassador, queryFn: repo.getAmbassadorStats });
}

/* ---------- Studio ---------- */

export function useStudioOverview() {
  return useQuery({ queryKey: qk.studio.overview, queryFn: repo.getStudioOverview });
}
export function useStudioActivations() {
  return useQuery({ queryKey: qk.studio.activations, queryFn: repo.listStudioActivations });
}
export function useStudioBookings() {
  return useQuery({ queryKey: qk.studio.bookings, queryFn: repo.listStudioBookings });
}
export function useIncomingHire() {
  return useQuery({ queryKey: qk.studio.hire, queryFn: repo.listIncomingHireRequests });
}
export function useStudioPayouts() {
  return useQuery({ queryKey: qk.studio.payouts, queryFn: repo.getStudioPayouts });
}
export function useCheckInTargets() {
  return useQuery({ queryKey: qk.studio.targets, queryFn: repo.listCheckInTargets });
}
export function useCheckInQueue(activationId: string | null, q: string) {
  return useQuery({
    queryKey: qk.studio.queue(activationId ?? "", q),
    queryFn: () => repo.listCheckInQueue(activationId ?? "", q),
    enabled: Boolean(activationId),
    placeholderData: keepPreviousData,
  });
}

/* ---------- Admin ---------- */

export function useAdminTotals() {
  return useQuery({ queryKey: qk.admin.totals, queryFn: repo.getAdminTotals });
}
export function useApprovals() {
  return useQuery({ queryKey: qk.admin.approvals, queryFn: repo.listApprovals });
}
export function useAdminActivations(q: string) {
  return useQuery({ queryKey: qk.admin.activations(q), queryFn: () => repo.listAdminActivations(q), placeholderData: keepPreviousData });
}
export function useRevenue(days: number, city: City | null) {
  return useQuery({ queryKey: qk.admin.revenue(days, city), queryFn: () => repo.getRevenueReport({ days, city }) });
}
export function useSettings() {
  return useQuery({ queryKey: qk.admin.settings, queryFn: repo.getSettings, staleTime: 5_000 });
}

/* ---------- Mutations ----------
   The mock database broadcasts every write, and the provider invalidates all
   queries in response. Mutations therefore only need to await that refresh. */

function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function useToggleSave() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, save }: { id: string; save: boolean }) => repo.toggleSave(id, save), onSuccess: refresh });
}
export function useShare() {
  return useMutation({ mutationFn: ({ id, channel }: { id: string; channel: string }) => repo.recordShare(id, channel) });
}
export function useCreateHire() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, details }: { id: string; details: HireDetails }) => repo.createHireRequest(id, details),
    onSuccess: refresh,
  });
}
export function useRespondToQuote() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "accept" | "decline" }) => repo.respondToQuote(id, decision),
    onSuccess: refresh,
  });
}
export function useSendQuote() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, quote }: { id: string; quote: Quote }) => repo.sendQuote(id, quote), onSuccess: refresh });
}
export function useDeclineHire() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => repo.declineHireRequest(id), onSuccess: refresh });
}
export function useCheckIn() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (code: string) => repo.checkInTicket(code), onSuccess: refresh });
}
export function useUnlockAmbassador() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: repo.unlockAmbassador, onSuccess: refresh });
}
export function useSetPaused() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) => repo.setActivationPaused(id, paused),
    onSuccess: refresh,
  });
}
export function useQuickEdit() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, title, description }: { id: string; title: string; description: string }) =>
      repo.quickEditActivation(id, { title, description }),
    onSuccess: refresh,
  });
}
export function useSubmitDraft() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => repo.submitDraft(id), onSuccess: refresh });
}
export function useCreateActivation() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: repo.createActivation, onSuccess: refresh });
}
export function useStudioPayout() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ amount, phone }: { amount: number; phone: string }) => repo.requestStudioPayout(amount, phone),
    onSuccess: refresh,
  });
}
export function useAmbassadorPayout() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ amount, phone }: { amount: number; phone: string }) => repo.requestAmbassadorPayout(amount, phone),
    onSuccess: refresh,
  });
}
export function useDecide() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ kind, id, decision, note }: { kind: "activation" | "provider"; id: string; decision: repo.Decision; note?: string }) =>
      repo.decideApproval(kind, id, decision, note),
    onSuccess: refresh,
  });
}
export function useSetFeatured() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => repo.setFeatured(id, featured),
    onSuccess: refresh,
  });
}
export function useAdminPause() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) => repo.adminSetPaused(id, paused),
    onSuccess: refresh,
  });
}
export function useUpdateSettings() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (s: Settings) => repo.updateSettings(s), onSuccess: refresh });
}
export function useCompleteOnboarding() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: repo.completeOnboarding, onSuccess: refresh });
}
export function useQuickRegister() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: repo.quickRegister, onSuccess: refresh });
}

export function useValidatePromo() {
  return useMutation({ mutationFn: (code: string) => repo.validatePromo(code) });
}
export function useCreateOrder() {
  return useMutation({ mutationFn: (input: repo.CheckoutInput) => repo.createOrder(input) });
}
export function useConfirmPayment() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: repo.PaymentOutcome }) => repo.confirmPayment(id, outcome),
    onSettled: refresh,
  });
}
export function useExpireOrder() {
  return useMutation({ mutationFn: (id: string) => repo.expireOrder(id) });
}
export function useCreateReview() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ orderId, rating, text }: { orderId: string; rating: number; text: string }) =>
      repo.createReview(orderId, { rating, text }),
    onSuccess: refresh,
  });
}

export function errorMessage(err: unknown) {
  if (err instanceof repo.ApiError) return err.message;
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: { message: string }[] }).issues;
    return issues[0]?.message ?? "Some details are missing. Check the form and try again.";
  }
  return "Something went wrong on our side. Try again in a moment.";
}
