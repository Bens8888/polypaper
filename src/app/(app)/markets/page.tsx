import { requireSession } from "@/lib/auth";
import { getMarketsFeed } from "@/server/services/market-service";
import { MarketsExplorer } from "@/components/markets/markets-explorer";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = {
  title: "Markets",
};

export default async function MarketsPage() {
  const session = await requireSession();
  const initialData = await getMarketsFeed({
    userId: session.user.id,
    sort: "trending",
    category: "All",
    limit: 12,
    offset: 0,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Market explorer"
        title="Discover paper markets by narrative, timing, and momentum"
        description="Search across active and resolved markets, sort by volume or movement, and keep scrolling through the live-style feed."
      />
      <MarketsExplorer initialData={initialData} />
    </div>
  );
}
