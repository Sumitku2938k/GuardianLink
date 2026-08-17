import React from "react";
import { Settings, Shield, Lock, Bell, Cpu, Save, CheckCircle2 } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminSettings() {
  const { systemSettings, setSystemSettings } = useAdmin();

  const handleToggle = (key) => {
    setSystemSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>Platform System Settings</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Configure platform security, AI similarity bounds, and notification preferences.</p>
        </div>

        <Button
          onClick={() => alert("Administrative settings saved successfully.")}
          variant="primary"
          size="sm"
          className="bg-indigo-600 text-white font-bold hover:bg-indigo-700"
          leftIcon={Save}
        >
          Save Configuration
        </Button>
      </div>

      {/* AI SAFETY & HUMAN VERIFICATION REQUIREMENT SETTINGS */}
      <Card className="p-6 bg-white border-gray-200 text-slate-900 space-y-4 shadow-sm">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 border-b border-gray-150 pb-2 flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          <span>AI Engine & Human-in-the-Loop Safeguards</span>
        </h3>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-gray-200">
            <div>
              <strong className="text-slate-900 block font-bold">Mandatory Human Verification Requirement</strong>
              <p className="text-slate-500 text-[11px]">Enforces police or NGO staff approval before any AI match is marked confirmed.</p>
            </div>
            <input
              type="checkbox"
              checked={systemSettings.requireHumanVerification}
              onChange={() => handleToggle("requireHumanVerification")}
              className="w-5 h-5 accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1 p-3 bg-slate-50 rounded-xl border border-gray-200">
            <label className="text-slate-900 font-bold block">AI Facial Similarity Candidate Threshold ({systemSettings.aiSimilarityThreshold}%)</label>
            <input
              type="range"
              min={70}
              max={95}
              value={systemSettings.aiSimilarityThreshold}
              onChange={(e) => setSystemSettings({ ...systemSettings, aiSimilarityThreshold: Number(e.target.value) })}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 font-mono block">Candidates below {systemSettings.aiSimilarityThreshold}% will be flagged for low confidence.</span>
          </div>
        </div>
      </Card>

      {/* SECURITY SETTINGS */}
      <Card className="p-6 bg-white border-gray-200 text-slate-900 space-y-4 shadow-sm">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 border-b border-gray-150 pb-2 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          <span>Security & Access Control Settings</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-gray-200">
            <div>
              <strong className="text-slate-900 block font-bold">Enforce Two-Factor Authentication (2FA)</strong>
              <p className="text-slate-500 text-[11px]">Mandatory 2FA for all Police and NGO Admin accounts.</p>
            </div>
            <input
              type="checkbox"
              checked={systemSettings.twoFactorEnforced}
              onChange={() => handleToggle("twoFactorEnforced")}
              className="w-5 h-5 accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-gray-200">
            <div>
              <strong className="text-slate-900 block font-bold">Session Idle Timeout ({systemSettings.sessionTimeoutMinutes} Mins)</strong>
              <p className="text-slate-500 text-[11px]">Automatically locks active administrative consoles after inactivity.</p>
            </div>
            <span className="font-mono font-bold text-indigo-700">{systemSettings.sessionTimeoutMinutes}m</span>
          </div>
        </div>
      </Card>

      {/* NOTIFICATION SETTINGS */}
      <Card className="p-6 bg-white border-gray-200 text-slate-900 space-y-4 shadow-sm">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 border-b border-gray-150 pb-2 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          <span>Notification & Alert Gateway</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-gray-200">
            <div>
              <strong className="text-slate-900 block font-bold">Push Notifications Gateway</strong>
              <p className="text-slate-500 text-[11px]">Dispatch real-time FCM alerts to parent & citizen mobile apps.</p>
            </div>
            <input
              type="checkbox"
              checked={systemSettings.pushNotificationsEnabled}
              onChange={() => handleToggle("pushNotificationsEnabled")}
              className="w-5 h-5 accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-gray-200">
            <div>
              <strong className="text-slate-900 block font-bold">Automated Email Alerts</strong>
              <p className="text-slate-500 text-[11px]">Send formal intake and verification notifications via SMTP.</p>
            </div>
            <input
              type="checkbox"
              checked={systemSettings.autoEmailAlerts}
              onChange={() => handleToggle("autoEmailAlerts")}
              className="w-5 h-5 accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
