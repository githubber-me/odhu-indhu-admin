"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpenText, LayoutDashboard, UsersRound } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Learners", icon: UsersRound },
  { href: "/dashboard/learning", label: "Learning", icon: BookOpenText },
  { href: "/dashboard/operations", label: "Operations", icon: Activity },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="dashboard-nav" aria-label="Dashboard navigation">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={active ? "active" : undefined}>
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
