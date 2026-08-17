import React from "react";
import { Cpu, CheckCircle2, ShieldAlert, Activity, AlertTriangle, Eye, Lock } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminAiMonitoring() {
  const { aiMetrics, aiIncidents } = useAdmin();

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>AI System & Facial Recognition Monitoring</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time AI facial matching pipelines, processing latency, match quality distributions, and safety bounds.
          </p>
        </div>
      </div>

      {/* AI PRIVACY & ASSISTIVE SAFETY PRINCIPLE NOTICE */}
      <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-3 shadow-sm">
        <Lock className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="block text-sm font-bold">Assistive AI & Human Verification Requirement</strong>
          <p className="leading-relaxed text-[11px]">
            AI-generated facial similarity results serve purely as assistive candidate signals. Final legal identity verification requires mandatory human review by authorized police officers and verified NGO shelter staff.
          </p>
        </div>
      </div>

      {/* METRICS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Daily Facial Scans"
          value={aiMetrics.totalAttemptsToday}
          subtitle="Processed Image Sets"
          icon={Cpu}
          colorScheme="blue"
        />

        <StatCard
          title="Candidates Generated"
          value={aiMetrics.potentialMatchesFound}
          subtitle="Above 85% Similarity"
          icon={Activity}
          colorScheme="teal"
        />

        <StatCard
          title="Human Verification Rate"
          value={aiMetrics.humanVerifiedRate}
          subtitle="Police Confirmed Matches"
          icon={CheckCircle2}
          colorScheme="teal"
        />

        <StatCard
          title="System Error Rate"
          value={aiMetrics.errorRate}
          subtitle="Avg Latency: 1.4s"
          icon={Activity}
          colorScheme="amber"
        />
      </div>

      {/* SYSTEM PIPELINE & MATCH QUALITY DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subsystem Operational Status */}
        <Card className="p-6 bg-white border-gray-200 text-slate-900 space-y-4 shadow-sm">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-gray-150">
            Subsystem Operational Status
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block font-bold">Facial Landmark Detection Engine</strong>
                <span className="text-[10px] text-slate-400 font-mono">Dlib / ResNet-50 Pipeline</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-200">
                {aiMetrics.faceDetectionStatus}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block font-bold">Vector Similarity Search</strong>
                <span className="text-[10px] text-slate-400 font-mono">Cosine Embedding Distance</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-200">
                {aiMetrics.faceMatchingStatus}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block font-bold">Asynchronous Processing Queue</strong>
                <span className="text-[10px] text-slate-400 font-mono">Active Backlog: {aiMetrics.processingQueue}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-200">
                Healthy Queue
              </span>
            </div>
          </div>
        </Card>

        {/* Match Quality Breakdown */}
        <Card className="p-6 bg-white border-gray-200 text-slate-900 space-y-4 shadow-sm">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-gray-150">
            Similarity Confidence Distribution
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-700 font-semibold mb-1">
                <span>High Similarity (&gt;90%)</span>
                <strong className="text-emerald-700">{aiMetrics.matchQuality.highSimilarity}%</strong>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${aiMetrics.matchQuality.highSimilarity}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-semibold mb-1">
                <span>Medium Similarity (80% - 90%)</span>
                <strong className="text-amber-700">{aiMetrics.matchQuality.mediumSimilarity}%</strong>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${aiMetrics.matchQuality.mediumSimilarity}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-semibold mb-1">
                <span>Low Similarity (&lt;80%)</span>
                <strong className="text-slate-600">{aiMetrics.matchQuality.lowSimilarity}%</strong>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 rounded-full" style={{ width: `${aiMetrics.matchQuality.lowSimilarity}%` }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* AI INCIDENTS LOG */}
      <Card className="p-6 bg-white border-gray-200 text-slate-900 space-y-4 shadow-sm">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-gray-150">
          Recent AI Processing Alerts & Quality Logs
        </h3>

        <div className="space-y-3 text-xs">
          {aiIncidents.map((inc) => (
            <div key={inc.id} className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <strong className="text-slate-900 font-bold text-xs">{inc.title}</strong>
                <p className="text-slate-600 text-[11px] font-mono">{inc.details}</p>
                <span className="text-[10px] text-slate-400 font-mono block">{inc.timestamp}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                {inc.status}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
