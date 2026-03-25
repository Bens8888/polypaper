import { requireAdminSession } from "@/lib/auth";
import { getAdminOverview } from "@/server/services/market-service";
import { AdminConsole } from "@/components/admin/admin-console";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  await requireAdminSession();
  const data = await getAdminOverview();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Monitor users and force provider syncs"
        description="A lightweight operational view for seeded user accounts, balances, and market synchronization state."
      />
      <AdminConsole users={data.users} lastSync={data.lastSync} />
    </div>
  );
}
