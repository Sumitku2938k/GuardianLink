import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Building2, ArrowLeft, ShieldCheck, Phone, Mail, MapPin, Users, Heart, FolderOpen } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { OrgVerificationModal } from "@/components/admin/OrgVerificationModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminOrgDetails() {
  const { organizationId } = useParams();
  const navigate = useNavigate();

  const { organizations, handleVerifyOrganization } = useAdmin();
  const org = organizations.find((o) => o.id === organizationId) || organizations[0];

  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  if (!org) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-slate-800">Organization Record Not Found</h3>
        <Button onClick={() => navigate("/admin/organizations")} className="mt-4">
          Return to Organizations List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER toolbar */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/organizations")} leftIcon={ArrowLeft}>
          Back to Organizations List
        </Button>

        <Button
          onClick={() => setIsVerificationModalOpen(true)}
          variant="primary"
          size="sm"
          className="bg-indigo-600 text-white font-bold hover:bg-indigo-700"
          leftIcon={ShieldCheck}
        >
          Review Verification License
        </Button>
      </div>

      {/* ORG HEADER CARD */}
      <Card className="p-6 bg-white border-gray-200 text-slate-900 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold border border-indigo-100 shrink-0">
              <Building2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${org.type === "Police" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-teal-50 text-teal-700 border border-teal-100"}`}>
                  {org.type} Organization
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    org.verificationStatus === "Verified"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {org.verificationStatus}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900">{org.name}</h1>
              <span className="text-xs text-slate-500 font-mono block">Registered ID: {org.id} • Date: {org.registeredDate}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-4 border-t border-gray-150">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Location & Address</span>
            <strong className="text-slate-800 block mt-0.5">{org.location}</strong>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Contact Lead</span>
            <strong className="text-indigo-700 block mt-0.5">{org.contactPerson} ({org.phone})</strong>
            <span className="text-[10px] text-slate-400 block font-mono">{org.email}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Operational Metrics</span>
            {org.type === "NGO" ? (
              <strong className="text-teal-700 block mt-0.5">Shelter Capacity: {org.shelterCapacity} Beds (Occupied: {org.currentOccupancy})</strong>
            ) : (
              <strong className="text-blue-700 block mt-0.5">Active Station Cases: {org.activeCases} Cases</strong>
            )}
          </div>
        </div>
      </Card>

      {/* Verification Modal */}
      <OrgVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        org={org}
        onConfirmDecision={(oId, dec) => handleVerifyOrganization(oId, dec)}
      />
    </div>
  );
}
