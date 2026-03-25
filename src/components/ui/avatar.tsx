import Image from "next/image";

import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  image?: string | null;
  className?: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ name, image, className }: AvatarProps) {
  if (image) {
    return (
      <div
        className={cn(
          "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-1 ring-border",
          className,
        )}
      >
        <Image alt={name} fill src={image} className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-chart-2/25 text-xs font-semibold text-foreground ring-1 ring-border",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
