import React from "react";
import { motion } from "framer-motion";
import {
  Shield,
  LayoutDashboard,
  Users,
  AlertTriangle,
  Bell,
  Clock,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "children", label: "My Children", icon: Users, badge: "2" },
  { id: "missing", label: "Missing Cases", icon: AlertTriangle, badge: "Live", badgeVariant: "danger" },
  { id: "notifications", label: "Notifications", icon: Bell, badge: "3", badgeVariant: "primary" },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "help", label: "Help & Support", icon: HelpCircle },
];

export const Sidebar = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  user = { name: "John Doe", role: "Parent Guardian", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
  onLogout,
}) => {
  const handleNavClick = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-6 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavClick("dashboard")}>
          <div className="w-10 h-10 bg-gradient-to-br from-primary via-blue-600 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-white">GuardianLink</span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/30">
                AI
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Child Safety Portal</span>
          </div>
        </div>

        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1 custom-scrollbar">
        <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Main Navigation
        </div>

        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${
                isActive
                  ? "bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/25"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-teal-400"
                  }`}
                />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-2">
                {item.badge && (
                  <Badge
                    variant={item.badgeVariant || "neutral"}
                    size="sm"
                    className={isActive ? "bg-white/20 text-white border-transparent" : ""}
                  >
                    {item.badge}
                  </Badge>
                )}
                {isActive && <ChevronRight className="w-4 h-4 text-white/80" />}
              </div>
            </button>
          );
        })}

        {/* AI Protection Card Widget */}
        <div className="pt-6 px-1">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-700/50 text-left">
            <div className="flex items-center gap-2 text-teal-400 mb-1.5 font-semibold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>AI Protection Active</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Facial indexing & location surveillance online 24/7.
            </p>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-teal-400 to-blue-500 h-full w-[94%]" />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">System Health: 99.8%</span>
          </div>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/40">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-teal-500/30 shrink-0"
            />
            <div className="truncate">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0 shrink-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-80 h-full max-w-[85vw] z-10 shadow-2xl"
          >
            {sidebarContent}
          </motion.aside>
        </div>
      )}
    </>
  );
};
