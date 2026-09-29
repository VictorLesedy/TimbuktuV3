"use client";

import { LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import * as React from "react";
import { ActivationCard, ActivationCardSkeleton } from "@/components/activation/activation-card";
import { Button } from "@/components/ui/button";
import { RangeSlider } from "@/components/ui/controls";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/field";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { CITIES, DAYS, PRICE_CEILING } from "@/lib/config";
import { tsh } from "@/lib/format";
import { useExplore } from "@/lib/queries";
import type { ExploreSort } from "@/lib/repo";
import type { City } from "@/lib/schemas";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

const TYPES = ["event", "venue", "service", "professional"] as const;
const SORTS = ["trending", "top_rated", "nearest", "newest"] as const;

const parsers = {
  type: parseAsStringLiteral(TYPES),
  city: parseAsStringLiteral(CITIES as readonly City[]),
  date: parseAsString,
  min: parseAsInteger,
  max: parseAsInteger,
  vibe: parseAsInteger,
  q: parseAsString,
  sort: parseAsStringLiteral(SORTS).withDefault("trending"),
  view: parseAsStringLiteral(["grid", "list"] as const).withDefault("grid"),
};

function useFilters() {
  return useQueryStates(parsers, { history: "replace", scroll: false });
}

function FilterForm({ idPrefix }: { idPrefix: string }) {
  const [f, set] = useFilters();
  const [price, setPrice] = React.useState<[number, number]>([f.min ?? 0, f.max ?? PRICE_CEILING]);
  React.useEffect(() => setPrice([f.min ?? 0, f.max ?? PRICE_CEILING]), [f.min, f.max]);

  return (
    <div className="flex flex-col gap-6">
      <Field label={t.explore.city} htmlFor={`${idPrefix}-city`}>
        <NativeSelect id={`${idPrefix}-city`} value={f.city ?? ""} onChange={(e) => set({ city: (e.target.value || null) as City | null })}>
          <option value="">{t.explore.anyCity}</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t.explore.date} htmlFor={`${idPrefix}-date`}>
        <Input id={`${idPrefix}-date`} type="date" value={f.date ?? ""} onChange={(e) => set({ date: e.target.value || null })} />
      </Field>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-medium">{t.explore.price}</legend>
        <RangeSlider
          min={0}
          max={PRICE_CEILING}
          step={5000}
          minStepsBetweenThumbs={1}
          value={price}
          labels={["Minimum price", "Maximum price"]}
          onValueChange={(v) => setPrice([v[0] ?? 0, v[1] ?? PRICE_CEILING])}
          onValueCommit={(v) => set({ min: v[0] ? v[0] : null, max: v[1] !== undefined && v[1] < PRICE_CEILING ? v[1] : null })}
        />
        <p className="text-sm text-muted tabular">{t.explore.priceRange(price[0], price[1])}</p>
      </fieldset>
      <Field label={t.explore.vibe} htmlFor={`${idPrefix}-vibe`} hint="Places that are usually busy on this day">
        <NativeSelect
          id={`${idPrefix}-vibe`}
          value={f.vibe ?? ""}
          onChange={(e) => set({ vibe: e.target.value === "" ? null : Number(e.target.value) })}
        >
          <option value="">{t.explore.anyDay}</option>
          {DAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </div>
  );
}

function activeFilterCount(f: ReturnType<typeof useFilters>[0]) {
  return [f.city, f.date, f.min, f.max, f.vibe].filter((v) => v !== null).length;
}

export function ExploreView() {
  const [f, set] = useFilters();
  const near = useAppStore((s) => s.city);
  const [search, setSearch] = React.useState(f.q ?? "");
  const deferredSearch = React.useDeferredValue(search);

  React.useEffect(() => {
    const next = deferredSearch.trim() || null;
    if (next !== f.q) void set({ q: next });
  }, [deferredSearch, f.q, set]);

  const query = useExplore({
    type: f.type,
    city: f.city,
    date: f.date,
    minPrice: f.min,
    maxPrice: f.max,
    vibe: f.vibe,
    sort: f.sort as ExploreSort,
    near,
    q: f.q,
  });
  const count = activeFilterCount(f);
  const clear = () => {
    setSearch("");
    void set({ city: null, date: null, min: null, max: null, vibe: null, q: null });
  };

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 pt-8 md:px-8 md:pt-12">
      <div className="flex flex-col gap-5">
        <h1 className="font-display text-display-lg">{t.explore.title}</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <label htmlFor="explore-search" className="sr-only">
            {t.common.search}
          </label>
          <Input
            id="explore-search"
            type="search"
            placeholder={t.explore.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>
        <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0" role="group" aria-label="Activation type">
          {[null, ...TYPES].map((type) => {
            const active = f.type === type;
            return (
              <button
                key={type ?? "all"}
                type="button"
                aria-pressed={active}
                onClick={() => set({ type })}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                  active ? "border-ink bg-ink text-canvas" : "border-line-strong text-ink hover:border-muted",
                )}
              >
                {type ? t.types[type].many : t.explore.all}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label={t.explore.filters}>
          <div className="sticky top-24 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t.explore.filters}</h2>
              {count ? (
                <Button variant="link" size="sm" onClick={clear}>
                  {t.explore.clear}
                </Button>
              ) : null}
            </div>
            <FilterForm idPrefix="desk" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {query.data ? t.explore.results(query.data.length) : t.common.loading}
            </p>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal />
                    {t.explore.filters}
                    {count ? <span className="rounded-full bg-accent px-1.5 text-xs text-on-accent tabular">{count}</span> : null}
                  </Button>
                </DialogTrigger>
                <DialogContent title={t.explore.filters}>
                  <div className="flex flex-col gap-6">
                    <FilterForm idPrefix="mob" />
                    <div className="flex gap-3">
                      {count ? (
                        <Button variant="outline" onClick={clear} className="flex-1">
                          {t.explore.clear}
                        </Button>
                      ) : null}
                      <DialogClose asChild>
                        <Button className="flex-1">
                          {query.data ? `${t.explore.showResults} (${query.data.length})` : t.explore.showResults}
                        </Button>
                      </DialogClose>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <label htmlFor="sort" className="sr-only">
                {t.explore.sort}
              </label>
              <select
                id="sort"
                value={f.sort}
                onChange={(e) => set({ sort: e.target.value as ExploreSort })}
                className="h-9 cursor-pointer rounded-full border border-line-strong bg-transparent px-3 text-sm text-ink"
              >
                {SORTS.map((s) => (
                  <option key={s} value={s} className="bg-surface">
                    {t.explore.sorts[s]}
                  </option>
                ))}
              </select>
              <div className="flex rounded-full border border-line-strong p-0.5" role="group" aria-label="Layout">
                {(
                  [
                    ["grid", LayoutGrid, t.explore.grid],
                    ["list", List, t.explore.list],
                  ] as const
                ).map(([v, Icon, label]) => (
                  <button
                    key={v}
                    type="button"
                    aria-label={label}
                    aria-pressed={f.view === v}
                    onClick={() => set({ view: v })}
                    className={cn(
                      "grid size-8 place-items-center rounded-full",
                      f.view === v ? "bg-raised text-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {count ? (
            <ul className="flex flex-wrap gap-2" aria-label="Active filters">
              {f.city ? <FilterChip label={f.city} onClear={() => set({ city: null })} /> : null}
              {f.date ? <FilterChip label={f.date} onClear={() => set({ date: null })} /> : null}
              {f.min !== null || f.max !== null ? (
                <FilterChip label={`${tsh(f.min ?? 0)} to ${tsh(f.max ?? PRICE_CEILING)}`} onClear={() => set({ min: null, max: null })} />
              ) : null}
              {f.vibe !== null ? <FilterChip label={`Busy on ${DAYS[f.vibe] ?? ""}`} onClear={() => set({ vibe: null })} /> : null}
            </ul>
          ) : null}

          {query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : query.isPending ? (
            <Results view={f.view}>
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i}>
                  <ActivationCardSkeleton layout={f.view} />
                </li>
              ))}
            </Results>
          ) : query.data.length === 0 ? (
            <EmptyState
              title={t.explore.emptyTitle}
              body={t.explore.emptyBody}
              action={
                <Button variant="outline" onClick={clear}>
                  {t.explore.clear}
                </Button>
              }
            />
          ) : (
            <Results view={f.view} className={cn(query.isFetching && "opacity-70 transition-opacity")}>
              {query.data.map((c, i) => (
                <li key={c.activation.id}>
                  <ActivationCard card={c} layout={f.view} priority={i < 3} />
                </li>
              ))}
            </Results>
          )}
        </div>
      </div>
    </div>
  );
}

function Results({ view, className, children }: { view: "grid" | "list"; className?: string; children: React.ReactNode }) {
  return (
    <ul className={cn(view === "grid" ? "grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-1", className)}>
      {children}
    </ul>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-tint/[0.07] pr-2.5 pl-3 text-sm text-ink hover:bg-tint/[0.12]"
      >
        {label}
        <X className="size-3.5 text-muted" aria-hidden="true" />
        <span className="sr-only">Remove filter</span>
      </button>
    </li>
  );
}
