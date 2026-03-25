import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <AppShell
      user={{
        name: session.user.name,
        username: session.user.username,
        role: session.user.role,
        image: session.user.image,
      }}
    >
      {children}
    </AppShell>
  );
}
