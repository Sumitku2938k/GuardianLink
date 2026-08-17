import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Menu, Shield, User, LogOut, ChevronDown, CheckCircle2, Lock } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { AdminSearchModal } from "./AdminSearchModal";

export const AdminTopNavbar = ({ onOpenMobileSidebar }) => {
  const navigate = useNavigate();
  const { currentAdmin } = useAdmin();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 text-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors">
        {/* Left Section: Mobile Menu Toggle & System Status Indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* System Status Indicator - Subtle Green Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>All Systems Operational</span>
          </div>
        </div>

        {/* Center: Global Search Trigger */}
        <div className="flex-1 max-w-md mx-4">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-gray-200 transition-colors"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate text-slate-500">Search Users, Cases, Orgs, Reports, Audit Logs...</span>
            <span className="hidden sm:inline-block ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200 text-slate-600">
              Ctrl+K
            </span>
          </button>
        </div>

        {/* Right Section: Notifications & Admin Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications Bell */}
          <button
            onClick={() => navigate("/admin/notifications")}
            className="relative p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {/* Admin Profile Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <img
                src={currentAdmin.avatar}
                alt={currentAdmin.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/30"
              />
              <div className="text-left hidden md:block leading-tight">
                <span className="block text-xs font-bold text-slate-800">{currentAdmin.name}</span>
                <span className="block text-[10px] text-indigo-600 font-mono font-semibold">{currentAdmin.role}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 py-1.5 text-xs text-slate-700">
                <div className="px-3 py-2 border-b border-gray-150">
                  <strong className="block text-slate-900 font-bold truncate">{currentAdmin.name}</strong>
                  <span className="text-[10px] text-indigo-600 font-mono block">{currentAdmin.email}</span>
                </div>

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate("/admin/profile");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-700"
                >
                  <User className="w-4 h-4 text-indigo-600" /> My Profile
                </button>

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate("/admin/settings");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-700"
                >
                  <Lock className="w-4 h-4 text-indigo-600" /> Security & Settings
                </button>

                <div className="border-t border-gray-150 my-1" />

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate("/login");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-semibold"
                >
                  <LogOut className="w-4 h-4" /> Logout Console
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Overlay Modal */}
      <AdminSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
