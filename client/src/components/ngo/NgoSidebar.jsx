import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  Heart,
  FileCheck,
  Building2,
  ArrowLeftRight,
  Bell,
  BarChart3,
  User,
  HelpCircle,
  LogOut,
  X,
  Sparkles,
  HeartHandshake
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export const NGO_MENU_ITEMS = [
  { id: "dashboard", path: "/ngo/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "children", path: "/ngo/children", label: "Children in Care", icon: Heart, badge: "8", badgeVariant: "primary" },
  { id: "intake", path: "/ngo/intake", label: "Safe Intake Wizard", icon: FileCheck, badge: "New" },
  { id: "cases", path: "/ngo/cases", label: "Active Cases", icon: HeartHandshake, badge: "3" },
  { id: "shelter", path: "/ngo/shelter", label: "Shelter Capacity", icon: Building2 },
  { id: "transfers", path: "/ngo/transfers", label: "Shelter Transfers", icon: ArrowLeftRight, badge: "1" },
  { id: "notifications", path: "/ngo/notifications", label: "Notifications", icon: Bell, badge: "3" },
  { id: "analytics", path: "/ngo/analytics", label: "Care Analytics", icon: BarChart3 },
  { id: "profile", path: "/ngo/profile", label: "Organization Profile", icon: User }
];

export const NgoSidebar = ({ isOpen, onClose, currentNgo, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Shell */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 w-64 bg-white dark:bg-slate-900 text-slate-850 dark:text-white border-r border-gray-200 dark:border-slate-800 z-50 transition-transform duration-300 flex flex-col justify-between ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top Section */}
        <div>
          {/* NGO Brand Header */}
          <div className="p-5 flex items-center justify-between border-b border-gray-200 dark:border-slate-800/80 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/ngo/dashboard")}>
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 via-emerald-500 to-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20 ring-2 ring-teal-500/30">
                <Heart className="w-6 h-6 text-slate-950 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">GuardianLink</span>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold bg-teal-500/20 text-teal-600 dark:text-teal-300 px-1.5 py-0.5 rounded border border-teal-500/30">
                    NGO
                  </span>
                </div>
                <span className="text-[10px] text-teal-600 dark:text-teal-400/80 font-mono">Child Shelter Care</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Shelter Badge Box */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-b border-gray-200 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <Building2 className="w-4 h-4 text-teal-500 dark:text-teal-400 shrink-0" />
            <span className="truncate font-semibold text-[11px]">Helping Hands Shelter - Sector 12</span>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {NGO_MENU_ITEMS.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== "/ngo/dashboard" && location.pathname.startsWith(item.path));
              const ItemIcon = item.icon;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-teal-500/10 text-teal-600 dark:text-teal-300 border border-teal-500/20 shadow-sm font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-905 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ItemIcon className={`w-4 h-4 ${isActive ? "text-teal-600 dark:text-teal-400" : "text-slate-400 dark:text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <Badge variant={item.badgeVariant || "neutral"} size="sm" className="text-[10px]">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Account Bar */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden cursor-pointer" onClick={() => navigate("/ngo/profile")}>
            <img
              src={currentNgo.logo}
              alt={currentNgo.name}
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-teal-500/30 shrink-0"
            />
            <div className="truncate">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{currentNgo.name}</h4>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono block truncate">Verified NGO Shelter</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Logout"
            className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
