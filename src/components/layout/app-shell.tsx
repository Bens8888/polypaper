"use client";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";

type AppShellProps = {
  user: {
    name?: string | null;
    username: string;
    role: "USER" | "ADMIN";
    image?: string | null;
  };
  children: React.ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="min-h-screen px-4 py-4 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1580px] gap-4 xl:gap-6">
        <SidebarNav isAdmin={user.role === "ADMIN"} />
        <div className="flex min-w-0 flex-1 flex-col gap-4 xl:gap-6">
          <Topbar user={user} />
          <main className="panel min-h-[calc(100vh-7.5rem)] rounded-[32px] p-4 md:p-6 xl:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
