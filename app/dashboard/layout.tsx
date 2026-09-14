import { Bell, Search } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { DashboardNav } from "@/components/dashboard-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { requireAdmin } from "@/lib/admin";
import { initials } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const userName = user.name || "Administrator";

  return (
    <div className="dashboard-frame">
      <aside className="sidebar">
        <div className="sidebar-brand"><BrandMark /></div>
        <DashboardNav />
        <div className="sidebar-user">
          <span className="avatar">{initials(userName) || "A"}</span>
          <span className="sidebar-user-copy">
            <strong>{userName}</strong>
            <small>{user.email}</small>
          </span>
          <SignOutButton compact />
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="topbar">
          <div className="mobile-brand"><BrandMark compact /></div>
          <label className="search-box">
            <Search size={17} />
            <input aria-label="Search dashboard" placeholder="Search dashboard" disabled />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications" disabled><Bell size={18} /></button>
            <span className="topbar-avatar">{initials(userName) || "A"}</span>
          </div>
        </header>
        <div className="mobile-nav"><DashboardNav /></div>
        <div className="dashboard-content">{children}</div>
      </div>
    </div>
  );
}
