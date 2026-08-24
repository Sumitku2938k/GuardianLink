import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNavbar } from "@/components/dashboard/TopNavbar";

import { useAuth } from "@/context/AuthContext";

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Determine active tab for sidebar styling based on current path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "dashboard";
    if (path.startsWith("/parent/children")) return "children";
    if (path.startsWith("/parent/missing-cases")) return "missing";
    if (path.startsWith("/citizen/dashboard")) return "dashboard";
    if (path.startsWith("/citizen/reports")) return "notifications";
    if (path.startsWith("/citizen/notifications")) return "notifications";
    if (path.startsWith("/citizen/profile")) return "settings";
    
    // Fallback/check query params for other tabs
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get("tab");
    if (tabParam) return tabParam;

    return "dashboard";
  };

  const handleTabChange = (tabId) => {
    if (tabId === "dashboard") {
      navigate("/dashboard");
    } else if (tabId === "children") {
      navigate("/parent/children");
    } else if (tabId === "missing") {
      navigate("/parent/missing-cases");
    } else {
      navigate(`/dashboard?tab=${tabId}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex selection:bg-primary selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={getActiveTab()}
        setActiveTab={handleTabChange}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <TopNavbar
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onLogout={handleLogout}
          onOpenNotifications={() => navigate("/citizen/notifications")}
          unreadCount={3}
        />

        {/* Dynamic Outlet for Nested Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Dashboard Footer */}
        <footer className="border-t border-gray-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-4 px-6 text-center text-xs text-gray-400 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© 2026 GuardianLink. AI Neural Protection Engine Status: Operational</span>
            <div className="flex items-center gap-4">
              <button onClick={() => navigate("/dashboard?tab=help")} className="hover:underline">Support</button>
              <button onClick={() => navigate("/citizen/profile")} className="hover:underline">Privacy</button>
              <button onClick={() => navigate("/citizen/profile")} className="hover:underline font-bold text-teal-500">Citizen Mode</button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
