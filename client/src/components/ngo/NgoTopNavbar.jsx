import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Menu, Building2, User, LogOut, ChevronDown, Heart } from "lucide-react";
import { NgoSearchModal } from "./NgoSearchModal";

export const NgoTopNavbar = ({ onOpenMobileSidebar, currentNgo, onLogout }) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 text-slate-800 dark:text-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors">
        {/* Left Section: Mobile Menu & Shelter Selector */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-200">
            <Building2 className="w-4 h-4 text-teal-500 dark:text-teal-400 shrink-0" />
            <select
              value="Helping Hands Shelter - Sector 12"
              onChange={() => {}}
              className="bg-transparent outline-none cursor-pointer text-xs font-bold text-slate-800 dark:text-white pr-2"
            >
              <option value="Helping Hands Shelter - Sector 12" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                Helping Hands Shelter - Sector 12
              </option>
              <option value="Bachpan Safe Haven Kiosk - Sector 18" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                Bachpan Safe Haven Kiosk - Sector 18
              </option>
            </select>
          </div>
        </div>

        {/* Center: Global Search Trigger Button */}
        <div className="flex-1 max-w-md mx-4">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate text-slate-500 dark:text-slate-400">Search Case ID, Child Reference, Intake ID, or Transfer...</span>
            <span className="hidden sm:inline-block ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200 dark:bg-slate-750 text-slate-600 dark:text-slate-300">
              Ctrl+K
            </span>
          </button>
        </div>

        {/* Right Section: Active Care Status, Notifications & Profile */}
        <div className="flex items-center gap-3">
          {/* Active Care Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-300 text-xs font-bold">
            <Heart className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400 fill-current" />
            <span>Active Shelter Care</span>
          </div>

          {/* Notifications */}
          <button
            onClick={() => navigate("/ngo/notifications")}
            className="relative p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400 ring-2 ring-white dark:ring-slate-900" />
          </button>

          {/* NGO Profile Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <img
                src={currentNgo.logo}
                alt={currentNgo.name}
                className="w-8 h-8 rounded-xl object-cover ring-2 ring-teal-500/30"
              />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-800 z-50 py-1.5 text-xs text-slate-700 dark:text-slate-205">
                <div className="px-3 py-2 border-b border-gray-150 dark:border-slate-800">
                  <strong className="block text-slate-850 dark:text-white font-bold truncate">{currentNgo.name}</strong>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">Verified NGO Shelter</span>
                </div>

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate("/ngo/profile");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                >
                  <User className="w-4 h-4 text-teal-500 dark:text-teal-400" /> Organization Profile
                </button>

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-105 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-450 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Logout Duty
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Overlay Modal */}
      <NgoSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
