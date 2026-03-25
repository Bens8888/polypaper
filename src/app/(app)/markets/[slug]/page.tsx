import { requireSession } from "@/lib/auth";
import { getMarketDetail } from "@/server/services/market-service";
import { MarketDetailClient } from "@/components/markets/market-detail-client";

type MarketDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function MarketDetailPage({ params }: MarketDetailPageProps) {
  const session = await requireSession();
  const { slug } = await params;
  const initialData = await getMarketDetail(session.user.id, slug);

  return <MarketDetailClient slug={slug} initialData={initialData} />;
}
