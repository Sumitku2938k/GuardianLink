import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useNgo } from "@/context/NgoContext";
import { NgoSidebar } from "./NgoSidebar";
import { NgoTopNavbar } from "./NgoTopNavbar";

import { useAuth } from "@/context/AuthContext";

export const NgoLayout = () => {
  const navigate = useNavigate();
  const { currentNgo } = useNgo();
  const { logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex selection:bg-teal-500 selection:text-slate-950">
      {/* Specialized NGO Sidebar Navigation */}
      <NgoSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        currentNgo={currentNgo}
        onLogout={handleLogout}
      />

      {/* Main Operational Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <NgoTopNavbar
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          currentNgo={currentNgo}
          onLogout={handleLogout}
        />

        {/* Dynamic Outlet View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>

        {/* Operational Footer */}
        <footer className="border-t border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 py-3.5 px-6 text-center text-xs text-gray-500 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="font-mono text-[11px]">
              © 2026 GuardianLink NGO Shelter Care • Child Protection Desk: <strong className="text-teal-600 dark:text-teal-400">Operational</strong>
            </span>
            <div className="flex items-center gap-4 text-[11px]">
              <button onClick={() => navigate("/ngo/notifications")} className="hover:underline text-gray-600 dark:text-slate-400">Care Logs</button>
              <button onClick={() => navigate("/ngo/profile")} className="hover:underline text-gray-600 dark:text-slate-400">Verified Shelter License</button>
              <span className="text-teal-600 dark:text-teal-400 font-bold">Child Protection Channel</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
