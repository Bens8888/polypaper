import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Home,
  LayoutDashboard,
  Medal,
  Settings,
  Shield,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const appNavigation: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: Home },
  { href: "/portfolio", label: "Portfolio", icon: BarChart3 },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/leaderboard", label: "Leaderboard", icon: Medal },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const adminNavigation: NavItem[] = [
  { href: "/admin", label: "Admin", icon: Shield },
];
