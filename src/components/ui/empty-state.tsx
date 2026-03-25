import { Badge } from "@/components/ui/badge";

type EmptyStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function EmptyState({ eyebrow, title, description }: EmptyStateProps) {
  return (
    <div className="panel-muted rounded-[28px] px-6 py-10 text-center">
      {eyebrow ? <Badge className="mx-auto mb-4">{eyebrow}</Badge> : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-foreground-muted">{description}</p>
    </div>
  );
}
