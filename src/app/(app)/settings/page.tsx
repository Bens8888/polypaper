import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPortfolioSnapshot } from "@/server/services/portfolio";
import { SettingsForm } from "@/components/settings/settings-form";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await requireSession();
  const [user, portfolio] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: {
        id: session.user.id,
      },
    }),
    getPortfolioSnapshot(session.user.id),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Manage profile details and reset your paper account"
        description="Update the public identity attached to your paper trades or reset your account back to the original simulated balance."
      />
      <SettingsForm
        profile={{
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          email: user.email,
        }}
        accountSummary={{
          cashBalanceCents: portfolio.overview.cashBalanceCents,
          equityCents: portfolio.overview.equityCents,
        }}
      />
    </div>
  );
}
