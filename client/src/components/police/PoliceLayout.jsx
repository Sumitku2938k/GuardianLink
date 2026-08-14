import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { usePolice } from "@/context/PoliceContext";
import { PoliceSidebar } from "./PoliceSidebar";
import { PoliceTopNavbar } from "./PoliceTopNavbar";

export const PoliceLayout = () => {
  const navigate = useNavigate();
  const { currentOfficer, currentStation, setCurrentStation } = usePolice();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex selection:bg-blue-600 selection:text-white">
      {/* Specialized Police Sidebar Navigation */}
      <PoliceSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        currentOfficer={currentOfficer}
        onLogout={handleLogout}
      />

      {/* Main Operational Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <PoliceTopNavbar
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          currentOfficer={currentOfficer}
          currentStation={currentStation}
          onLogout={handleLogout}
        />

        {/* Dynamic Outlet View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>

        {/* Operational Footer */}
        <footer className="border-t border-slate-900 bg-slate-950 py-3.5 px-6 text-center text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="font-mono text-[11px]">
              © 2026 GuardianLink Police Desk • Neural CCTV Vector Engine: <strong className="text-emerald-400">Active</strong>
            </span>
            <div className="flex items-center gap-4 text-[11px]">
              <button onClick={() => navigate("/police/notifications")} className="hover:underline text-slate-400">System Logs</button>
              <button onClick={() => navigate("/police/profile")} className="hover:underline text-slate-400">Security Clearance Level 3</button>
              <span className="text-teal-400 font-bold">Encrypted Command Channel</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
