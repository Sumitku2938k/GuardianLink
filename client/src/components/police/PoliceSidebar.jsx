import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  AlertTriangle,
  FileText,
  Cpu,
  UserCheck,
  Users,
  BarChart3,
  Bell,
  User,
  HelpCircle,
  LogOut,
  X,
  Building2
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export const POLICE_MENU_ITEMS = [
  { id: "dashboard", path: "/police/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "cases", path: "/police/cases", label: "Active Cases", icon: AlertTriangle, badge: "12", badgeVariant: "danger" },
  { id: "reports", path: "/police/reports", label: "Case Queue / Reports", icon: FileText, badge: "5", badgeVariant: "warning" },
  { id: "matches", path: "/police/cases/MC-2026-8821/matches", label: "Potential Matches", icon: Cpu, badge: "3", badgeVariant: "primary" },
  { id: "assignments", path: "/police/assignments", label: "Officer Roster", icon: Users },
  { id: "analytics", path: "/police/analytics", label: "Station Analytics", icon: BarChart3 },
  { id: "notifications", path: "/police/notifications", label: "Notifications", icon: Bell, badge: "3" },
  { id: "profile", path: "/police/profile", label: "Officer Profile", icon: User }
];

export const PoliceSidebar = ({ isOpen, onClose, currentOfficer, onLogout }) => {
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
        className={`fixed lg:static top-0 left-0 bottom-0 w-64 bg-slate-950 text-white border-r border-slate-800/80 z-50 transition-transform duration-300 flex flex-col justify-between ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top Section */}
        <div>
          {/* Police Brand Header */}
          <div className="p-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/police/dashboard")}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-primary to-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/30">
                <Shield className="w-6 h-6 text-teal-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-white">GuardianLink</span>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
                    POLICE
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Law Enforcement Desk</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Station Badge Box */}
          <div className="p-4 bg-slate-900/40 border-b border-slate-800/60 flex items-center gap-2 text-xs text-slate-300">
            <Building2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="truncate font-semibold text-[11px]">Delhi Central Metro Post</span>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {POLICE_MENU_ITEMS.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== "/police/dashboard" && location.pathname.startsWith(item.path));
              const ItemIcon = item.icon;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ItemIcon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
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

        {/* Footer Officer Account Bar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden cursor-pointer" onClick={() => navigate("/police/profile")}>
            <img
              src={currentOfficer.avatar}
              alt={currentOfficer.name}
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-blue-500/30 shrink-0"
            />
            <div className="truncate">
              <h4 className="text-xs font-bold text-white truncate">{currentOfficer.name}</h4>
              <span className="text-[10px] text-teal-400 font-mono block truncate">{currentOfficer.badgeNumber}</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Logout"
            className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
