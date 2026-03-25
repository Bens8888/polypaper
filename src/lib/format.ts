import { format, formatDistanceToNowStrict } from "date-fns";

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatPercentFromBps(bps: number) {
  return `${(bps / 100).toFixed(2)}%`;
}

export function formatPercentFromProbability(priceCents: number) {
  return `${priceCents}%`;
}

export function formatShares(shares: number) {
  return new Intl.NumberFormat("en-US").format(shares);
}

export function formatTimestamp(date: Date | string) {
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export function formatShortDate(date: Date | string) {
  return format(new Date(date), "MMM d");
}

export function formatRelative(date: Date | string) {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}
