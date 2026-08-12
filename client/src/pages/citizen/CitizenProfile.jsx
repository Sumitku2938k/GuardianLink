import React from "react";
import { useNavigate } from "react-router-dom";
import { User, ShieldCheck, Lock, Bell, CheckCircle2, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function CitizenProfile() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
            <User className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">Citizen Helper Profile</h1>
            <p className="text-xs text-gray-500">Verified community helper credentials & privacy settings.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate("/citizen/dashboard")} leftIcon={ArrowLeft}>
          Back to Dashboard
        </Button>
      </div>

      {/* Helper Profile Card */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              alt="Citizen Helper"
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-teal-500/30"
            />
            <div className="absolute -bottom-1 -right-1 bg-teal-500 text-slate-950 p-1 rounded-full ring-2 ring-slate-900">
              <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sarah Jenkins</h2>
              <Badge variant="success" size="sm" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold">
                Verified Helper
              </Badge>
            </div>
            <span className="text-xs text-gray-500 block">Member since July 2026 • 3 Sightings Reported</span>
            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" /> KYC Identity Verified
            </span>
          </div>
        </div>

        {/* Account & Privacy Settings */}
        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-800 text-xs">
          <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">
            Privacy & Communication Preferences
          </h3>

          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40">
            <div>
              <span className="font-bold text-gray-900 dark:text-white block">
                Anonymous Proxy Identity Guard
              </span>
              <span className="text-gray-500 text-[11px]">
                Keep personal phone number hidden until guardian accepts proxy request
              </span>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 accent-teal-500" />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40">
            <div>
              <span className="font-bold text-gray-900 dark:text-white block">
                SMS Match Broadcast Notifications
              </span>
              <span className="text-gray-500 text-[11px]">
                Receive instant SMS when AI flags potential matches for your reports
              </span>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 accent-teal-500" />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="primary" size="sm" className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400">
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}
