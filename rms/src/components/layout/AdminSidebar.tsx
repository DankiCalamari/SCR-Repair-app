import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store";
import { usePushNotifications } from "../../hooks/use-push-notifications";
import { usePublicSettings } from "../../hooks/use-settings";
import {
  LayoutDashboard, Wrench, Users, FileText, Receipt,
  MessageSquare, Shield, Settings, BarChart3, Package,
  LogOut, ChevronLeft, ChevronRight, Bell, BellOff, Globe, Menu, X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useState, useEffect } from "react";

// PRIMARY NAVIGATION
const primaryNavItems: { to: string; label: string; icon: React.ElementType; end?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/repairs", label: "Repairs", icon: Wrench },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/communications", label: "Messages", icon: MessageSquare },
  { to: "/admin/quotes", label: "Quotes", icon: FileText },
  { to: "/admin/invoices", label: "Invoices", icon: Receipt },
  { to: "/admin/warranty", label: "Warranty", icon: Shield },
];

// MANAGEMENT NAVIGATION
const managementNavItems: { to: string; label: string; icon: React.ElementType; end?: boolean }[] = [
  { to: "/admin/inventory", label: "Inventory", icon: Package },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
];

// ADMINISTRATION NAVIGATION
const adminNavItems: { to: string; label: string; icon: React.ElementType; end?: boolean }[] = [
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/system-health", label: "System Health", icon: Shield },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

function NavSection({ title, items }: { title: string; items: { to: string; label: string; icon: React.ElementType; end?: boolean }[] }) {
  return (
    <div>
      <p className="px-3 text-xs font-semibold uppercase text-rms-text-secondary">{title}</p>
      <ul className="mt-2 space-y-1 px-2">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-brand-500/15 text-brand-500"
                    : "text-rms-text-secondary hover:bg-rms-raised hover:text-rms-text"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminSidebar() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const { isSupported, isSubscribed, isLoading, toggle } = usePushNotifications();
  
  // Fetch logo from public settings
  const { data: settings } = usePublicSettings();
  
  const logoUrl = settings?.admin_logo_url || settings?.logo_url || "/app/static/logo.svg";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Navigation items in correct order based on user role
  const navigationItems = [
    ...primaryNavItems,
    ...(isAdmin ? managementNavItems : []),
    ...(isAdmin ? adminNavItems : []),
  ];

  // Mobile drawer overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-rms-border bg-rms-sidebar px-4 md:hidden">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-5 w-auto object-contain" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500">
                <Wrench className="h-4 w-4 text-white" />
              </div>
            )}
            <span className="font-heading text-base font-semibold text-rms-text">RMS</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-rms-text-secondary hover:bg-rms-raised"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div 
              className="absolute inset-0 bg-black/50" 
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-rms-border bg-rms-sidebar">
              {/* Mobile Header */}
              <div className="flex h-14 items-center justify-between border-b border-rms-border px-4">
                <div className="flex items-center gap-2">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-5 w-auto object-contain" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500">
                      <Wrench className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <span className="font-heading text-base font-semibold text-rms-text">RMS</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-1.5 text-rms-text-secondary hover:bg-rms-raised"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto py-4 space-y-6">
                <NavSection title="PRIMARY" items={primaryNavItems} />
                {isAdmin && <NavSection title="MANAGEMENT" items={managementNavItems} />}
                {isAdmin && <NavSection title="ADMINISTRATION" items={adminNavItems} />}
              </nav>

              {/* Footer Actions */}
              <div className="border-t border-rms-border space-y-1 p-2">
                {isSupported && (
                  <button
                    onClick={toggle}
                    disabled={isLoading}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isSubscribed
                        ? "text-brand-500 hover:bg-rms-raised"
                        : "text-rms-text-secondary hover:bg-rms-raised hover:text-rms-text"
                    )}
                  >
                    {isSubscribed ? (
                      <Bell className="h-5 w-5 shrink-0" />
                    ) : (
                      <BellOff className="h-5 w-5 shrink-0" />
                    )}
                    <span>{isSubscribed ? "Notifications On" : "Enable Notifications"}</span>
                  </button>
                )}
                <a
                  href="/"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rms-text-secondary transition-colors hover:bg-rms-raised hover:text-rms-text"
                >
                  <Globe className="h-5 w-5 shrink-0" />
                  <span>Back to Website</span>
                </a>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rms-text-secondary transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Desktop Sidebar (hidden on mobile) */}
        <aside
          className="hidden h-screen w-60 flex-col border-r border-rms-border bg-rms-sidebar md:flex"
        >
          {/* Header */}
          <div className="flex h-16 items-center border-b border-rms-border px-4">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-6 w-auto object-contain" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
                  <Wrench className="h-5 w-5 text-white" />
                </div>
              )}
              <span className="font-heading text-lg font-semibold text-rms-text">RMS</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 space-y-6">
            <NavSection title="PRIMARY" items={primaryNavItems} />
            {isAdmin && <NavSection title="MANAGEMENT" items={managementNavItems} />}
            {isAdmin && <NavSection title="ADMINISTRATION" items={adminNavItems} />}
          </nav>

          {/* Footer Actions */}
          <div className="border-t border-rms-border space-y-1 p-2">
            {isSupported && (
              <button
                onClick={toggle}
                disabled={isLoading}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isSubscribed
                    ? "text-brand-500 hover:bg-rms-raised"
                    : "text-rms-text-secondary hover:bg-rms-raised hover:text-rms-text"
                )}
              >
                {isSubscribed ? (
                  <Bell className="h-5 w-5 shrink-0" />
                ) : (
                  <BellOff className="h-5 w-5 shrink-0" />
                )}
                <span>{isSubscribed ? "Notifications On" : "Enable Notifications"}</span>
              </button>
            )}
            <a
              href="/"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rms-text-secondary transition-colors hover:bg-rms-raised hover:text-rms-text"
            >
              <Globe className="h-5 w-5 shrink-0" />
              <span>Back to Website</span>
            </a>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rms-text-secondary transition-colors hover:bg-rms-raised hover:text-rms-text",
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
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rms-text-secondary transition-colors hover:bg-red-500/10 hover:text-red-400",
                collapsed && "justify-center px-2.5"
              )}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Desktop sidebar (collapsed state) */}
        <aside
          className={cn(
            "hidden h-screen flex-col border-r border-rms-border bg-rms-sidebar transition-all duration-300 md:flex",
            collapsed ? "w-16" : "w-0"
          )}
        >
          <div className="flex h-16 items-center justify-center border-b border-rms-border px-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-5 w-auto object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
                <Wrench className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          <nav className="flex-1 overflow-y-auto py-4 space-y-6">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-brand-500/15 text-brand-500"
                      : "text-rms-text-secondary hover:bg-rms-raised hover:text-rms-text"
                  )
                }
                title={item.label}
              >
                <item.icon className="h-5 w-5" />
              </NavLink>
            ))}
          </nav>
        </aside>
      </>
    );
  }

  // Desktop sidebar (normal expanded/collapsed behavior)
  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-rms-border bg-rms-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-rms-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-6 w-auto object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
                <Wrench className="h-5 w-5 text-white" />
              </div>
            )}
            <span className="font-heading text-lg font-semibold text-rms-text">RMS</span>
          </div>
        )}
        {collapsed && (
          logoUrl ? (
            <img src={logoUrl} alt="Logo" className="mx-auto h-5 w-auto object-contain" />
          ) : (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
              <Wrench className="h-4 w-4 text-white" />
            </div>
          )
        )}
      </div>

      {/* Navigation */}
      {!collapsed && (
        <nav className="flex-1 overflow-y-auto py-4 space-y-6">
          <NavSection title="PRIMARY" items={primaryNavItems} />
          {isAdmin && <NavSection title="MANAGEMENT" items={managementNavItems} />}
          {isAdmin && <NavSection title="ADMINISTRATION" items={adminNavItems} />}
        </nav>
      )}
      {collapsed && (
        <nav className="flex-1 overflow-y-auto py-4 space-y-6">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-brand-500/15 text-brand-500"
                    : "text-rms-text-secondary hover:bg-rms-raised hover:text-rms-text"
                )
              }
              title={item.label}
            >
              <item.icon className="h-5 w-5" />
            </NavLink>
          ))}
        </nav>
      )}

      {/* Footer Actions */}
      <div className="border-t border-rms-border space-y-1 p-2">
        {isSupported && !collapsed ? (
          <button
            onClick={toggle}
            disabled={isLoading}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isSubscribed
                ? "text-brand-500 hover:bg-rms-raised"
                : "text-rms-text-secondary hover:bg-rms-raised hover:text-rms-text"
            )}
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
        ) : isSupported ? (
          <button
            onClick={toggle}
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium text-brand-500 hover:bg-rms-raised"
            title={isSubscribed ? "Disable notifications" : "Enable notifications"}
          >
            {isSubscribed ? (
              <Bell className="h-5 w-5" />
            ) : (
              <BellOff className="h-5 w-5" />
            )}
          </button>
        ) : null}
        <a
          href="/"
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rms-text-secondary transition-colors hover:bg-rms-raised hover:text-rms-text",
            collapsed && "justify-center px-2.5"
          )}
        >
          <Globe className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Back to Website</span>}
        </a>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rms-text-secondary transition-colors hover:bg-rms-raised hover:text-rms-text",
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
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rms-text-secondary transition-colors hover:bg-red-500/10 hover:text-red-400",
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