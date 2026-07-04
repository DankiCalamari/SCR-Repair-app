import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store";
import { useSettings } from "../../hooks/use-settings";
import { usePushNotifications } from "../../hooks/use-push-notifications";
import {
  LayoutDashboard, Wrench, Users, FileText, Receipt,
  MessageSquare, Mail, Shield, Settings,
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
        "flex h-screen flex-col border-r border-warm-800/50 bg-gradient-to-b from-warm-950 to-warm-900 transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-warm-800/50 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-6 w-auto object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-copper-500">
                <Wrench className="h-5 w-5 text-white" />
              </div>
            )}
            <span className="font-heading text-lg font-semibold text-warm-100">RMS</span>
          </div>
        )}
        {collapsed && (
          logoUrl ? (
            <img src={logoUrl} alt="Logo" className="mx-auto h-5 w-auto object-contain" />
          ) : (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-copper-500">
              <Wrench className="h-4 w-4 text-white" />
            </div>
          )
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {allItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-copper-500/15 text-copper-400 shadow-inner"
                      : "text-warm-400 hover:bg-warm-800/50 hover:text-warm-200",
                    collapsed && "justify-center px-2.5"
                  )
                }
              >
                <item.icon className={cn("h-5 w-5 shrink-0", collapsed ? "mx-auto" : "")} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer Actions */}
      <div className="border-t border-warm-800/50 space-y-1 p-2">
        {isSupported && (
          <button
            onClick={toggle}
            disabled={isLoading}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isSubscribed
                ? "text-copper-400 hover:bg-warm-800/50"
                : "text-warm-400 hover:bg-warm-800/50 hover:text-warm-200",
              collapsed && "justify-center px-2.5"
            )}
            title={isSubscribed ? "Push notifications enabled — click to disable" : "Enable push notifications"}
          >
            {isSubscribed ? (
              <Bell className="h-5 w-5 shrink-0" />
            ) : (
              <BellOff className="h-5 w-5 shrink-0" />
            )}
            {!collapsed && (
              <span>{isSubscribed ? "Notifications On" : "Enable Notifications"}</span>
            )}
          </button>
        )}
        <a
          href="/"
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-warm-400 transition-colors hover:bg-warm-800/50 hover:text-warm-200",
            collapsed && "justify-center px-2.5"
          )}
        >
          <Globe className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Back to Website</span>}
        </a>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-warm-400 transition-colors hover:bg-warm-800/50 hover:text-warm-200",
            collapsed && "justify-center px-2.5"
          )}
        >
          {collapsed ? (
            <ChevronRight className="mx-auto h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-warm-400 transition-colors hover:bg-red-500/10 hover:text-red-400",
            collapsed && "justify-center px-2.5"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
