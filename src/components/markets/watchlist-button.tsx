"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiPost } from "@/lib/client-api";
import { Button } from "@/components/ui/button";

type WatchlistButtonProps = {
  marketId: string;
  initialWatchlisted: boolean;
  size?: "default" | "sm";
};

export function WatchlistButton({
  marketId,
  initialWatchlisted,
  size = "default",
}: WatchlistButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [watchlisted, setWatchlisted] = useState(initialWatchlisted);
  const [pending, setPending] = useState(false);

  async function toggleWatchlist() {
    const previous = watchlisted;

    try {
      setPending(true);
      setWatchlisted((current) => !current);
      const response = await apiPost<{ watchlisted: boolean }>("/api/watchlist", {
        marketId,
      });
      setWatchlisted(response.watchlisted);
      queryClient.invalidateQueries();
      router.refresh();
    } catch (error) {
      setWatchlisted(previous);
      toast.error(error instanceof Error ? error.message : "Unable to update watchlist.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant={watchlisted ? "default" : "ghost"}
      size={size === "sm" ? "sm" : "icon"}
      className={size === "sm" ? "" : "h-10 w-10"}
      disabled={pending}
      onClick={toggleWatchlist}
    >
      <Star className={`h-4 w-4 ${watchlisted ? "fill-current" : ""}`} />
    </Button>
  );
}
