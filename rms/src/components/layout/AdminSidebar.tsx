import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store";
import { useSettings } from "../../hooks/use-settings";
import { usePushNotifications } from "../../hooks/use-push-notifications";
import {
  LayoutDashboard, Wrench, Users, FileText, Receipt,
  MessageSquare, Mail, Shield, UserPlus, Settings,
  LogOut, ChevronLeft, ChevronRight, Zap, Inbox, Globe, Bell, BellOff
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useState } from "react";

const navItems: { to: string; label: string; icon: React.ElementType; end?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/repairs", label: "Repairs", icon: Wrench },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/quotes", label: "Quotes", icon: FileText },
  { to: "/admin/invoices", label: "Invoices", icon: Receipt },
  { to: "/admin/sms", label: "SMS", icon: MessageSquare },
  { to: "/admin/email", label: "Email", icon: Mail },
  { to: "/admin/communications", label: "Unassigned", icon: Inbox },
  { to: "/admin/warranty", label: "Warranty", icon: Shield },
  { to: "/admin/leads", label: "Leads", icon: UserPlus },
  { to: "/admin/system-health", label: "System", icon: Zap },
];

const adminOnlyItems: { to: string; label: string; icon: React.ElementType; end?: boolean }[] = [
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [collapsed, setCollapsed] = useState(false);
  const { data: settings } = useSettings();
  const logoUrl = settings?.admin_logo_url || settings?.logo_url;
  const { isSupported, isSubscribed, isLoading, toggle } = usePushNotifications();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const allItems = isAdmin ? [...navItems, ...adminOnlyItems] : navItems;

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-surface-800 bg-surface-950 transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-surface-800 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-5 w-auto object-contain" />
            ) : (
              <img src="/app/static/logo.svg" alt="Logo" className="h-5 w-auto object-contain" />
            )}
          </div>
        )}
        {collapsed && (
          logoUrl ? (
            <img src={logoUrl} alt="Logo" className="mx-auto h-5 w-auto object-contain" />
          ) : (
            <img src="/app/static/logo.svg" alt="Logo" className="mx-auto h-5 w-auto object-contain" />
          )
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {allItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent-500/10 text-accent-500"
                      : "text-surface-400 hover:bg-surface-800 hover:text-surface-100",
                    collapsed && "justify-center px-1.5"
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-surface-800 p-1.5 space-y-0.5">
        {isSupported && (
          <button
            onClick={toggle}
            disabled={isLoading}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              isSubscribed
                ? "text-accent-500 hover:bg-surface-800"
                : "text-surface-400 hover:bg-surface-800 hover:text-surface-100",
              collapsed && "justify-center px-1.5"
            )}
            title={isSubscribed ? "Push notifications enabled — click to disable" : "Enable push notifications"}
          >
            {isSubscribed ? (
              <Bell className="h-4 w-4 shrink-0" />
            ) : (
              <BellOff className="h-4 w-4 shrink-0" />
            )}
            {!collapsed && (
              <span>{isSubscribed ? "Notifications On" : "Enable Notifications"}</span>
            )}
          </button>
        )}
        <a
          href="/"
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
        >
          <Globe className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Back to Website</span>}
        </a>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
        >
          {collapsed ? (
            <ChevronRight className="mx-auto h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-surface-400 transition-colors hover:bg-surface-800 hover:text-red-400"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
