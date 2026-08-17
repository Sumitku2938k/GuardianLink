import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderOpen,
  FileText,
  Cpu,
  Bell,
  History,
  BarChart3,
  Settings,
  User,
  HelpCircle,
  LogOut,
  Shield,
  X
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

export const AdminSidebar = ({ isOpen, onCloseMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { platformStats, users, adminCases, adminReports } = useAdmin();

  const navItems = [
    {
      name: "Dashboard",
      path: "/admin/dashboard",
      icon: LayoutDashboard
    },
    {
      name: "Users",
      path: "/admin/users",
      icon: Users,
      badge: users.length,
      pending: platformStats.pendingVerifications
    },
    {
      name: "Organizations",
      path: "/admin/organizations",
      icon: Building2,
      badge: platformStats.verifiedOrganizations
    },
    {
      name: "Cases",
      path: "/admin/cases",
      icon: FolderOpen,
      badge: platformStats.activeMissingCases,
      isAlert: true
    },
    {
      name: "Reports",
      path: "/admin/reports",
      icon: FileText,
      badge: platformStats.activeFoundReports
    },
    {
      name: "AI Monitoring",
      path: "/admin/ai-monitoring",
      icon: Cpu
    },
    {
      name: "Notifications",
      path: "/admin/notifications",
      icon: Bell,
      badge: 3
    },
    {
      name: "Audit Logs",
      path: "/admin/audit-logs",
      icon: History
    },
    {
      name: "Analytics",
      path: "/admin/analytics",
      icon: BarChart3
    },
    {
      name: "Settings",
      path: "/admin/settings",
      icon: Settings
    },
    {
      name: "Profile",
      path: "/admin/profile",
      icon: User
    }
  ];

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header / Brand */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-gray-150">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-base font-black text-slate-900 tracking-tight block leading-none">
                GuardianLink
              </strong>
              <span className="text-[10px] font-mono font-bold text-indigo-600 tracking-wider uppercase block mt-0.5">
                Admin Console
              </span>
            </div>
          </Link>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
            Platform Administration
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onCloseMobile}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4.5 h-4.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </div>

                <div className="flex items-center gap-1">
                  {item.pending > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {item.pending} pending
                    </span>
                  )}
                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isActive
                          ? "bg-indigo-200/60 text-indigo-800"
                          : item.isAlert
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer Support & Logout */}
        <div className="p-3 border-t border-gray-150 space-y-1 bg-slate-50/50">
          <button
            onClick={() => {
              window.location.href = "mailto:support@guardianlink.gov.in";
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-white transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Admin Help & Support</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 rounded-xl hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Logout Console</span>
          </button>
        </div>
      </aside>
    </>
  );
};
