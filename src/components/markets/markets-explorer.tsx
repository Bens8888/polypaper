"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { apiGet } from "@/lib/client-api";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarketCard, type MarketCardData } from "@/components/markets/market-card";

type MarketsResponse = {
  items: MarketCardData[];
  categories: string[];
  nextOffset: number | null;
  total: number;
};

type MarketsExplorerProps = {
  initialData: MarketsResponse;
};

export function MarketsExplorer({ initialData }: MarketsExplorerProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<"trending" | "new" | "ending" | "movers">("trending");
  const deferredSearch = useDeferredValue(search);

  const query = useInfiniteQuery({
    queryKey: ["markets", deferredSearch, category, sort],
    queryFn: ({ pageParam }) =>
      apiGet<MarketsResponse>(
        `/api/markets?search=${encodeURIComponent(
          deferredSearch,
        )}&category=${encodeURIComponent(category)}&sort=${sort}&offset=${pageParam}&limit=12`,
      ),
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    initialPageParam: 0,
    initialData: {
      pages: [initialData],
      pageParams: [0],
    },
  });

  const markets = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data?.pages],
  );

  useEffect(() => {
    const element = sentinelRef.current;

    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-foreground-muted" />
          <Input
            className="pl-11"
            placeholder="Search markets, sectors, and narratives..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="h-11 rounded-2xl border border-border bg-surface-soft px-4 text-sm text-foreground outline-none"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="All">All categories</option>
          {initialData.categories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {[
            ["trending", "Trending"],
            ["new", "Newest"],
            ["ending", "Ending soon"],
            ["movers", "Big movers"],
          ].map(([value, label]) => (
            <Button
              key={value}
              variant={sort === value ? "default" : "secondary"}
              size="sm"
              onClick={() => setSort(value as typeof sort)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {markets.length ? (
        <div className="market-grid">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <EmptyState
          eyebrow="No results"
          title="No markets matched your filters"
          description="Try another category, widen the search, or switch to trending to repopulate the feed."
        />
      )}

      <div ref={sentinelRef} />

      {query.hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? "Loading more..." : "Load more markets"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
