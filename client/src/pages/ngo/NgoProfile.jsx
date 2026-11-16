import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Building2, ShieldCheck, Heart, ArrowLeft, Edit3, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

export default function NgoProfile() {
  const navigate = useNavigate();
  const { currentNgo, updateProfile } = useNgo();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    organization: currentNgo?.name || "",
    phone: currentNgo?.phone || "",
    address: currentNgo?.address || "",
    city: currentNgo?.city || "",
    state: currentNgo?.state || "",
    pinCode: currentNgo?.pinCode || "",
    registrationNumber: currentNgo?.registrationNumber || "",
    registrationAuthority: currentNgo?.registrationAuthority || "",
    darpanId: currentNgo?.darpanId || ""
  });

  const handleOpenEdit = () => {
    setFormData({
      organization: currentNgo?.name || "",
      phone: currentNgo?.phone || "",
      address: currentNgo?.address || "",
      city: currentNgo?.city || "",
      state: currentNgo?.state || "",
      pinCode: currentNgo?.pinCode || "",
      registrationNumber: currentNgo?.registrationNumber || "",
      registrationAuthority: currentNgo?.registrationAuthority || "",
      darpanId: currentNgo?.darpanId || ""
    });
    setErrorMsg("");
    setSuccessMsg("");
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (updateProfile) {
        await updateProfile(formData);
      }
      setSuccessMsg("Profile details updated successfully.");
      setIsEditModalOpen(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isApproved = currentNgo?.status === "approved" || currentNgo?.isVerified;
  const isPending = currentNgo?.status === "pending";
  const isRejected = currentNgo?.status === "rejected";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-655 dark:text-teal-400 flex items-center justify-center shrink-0">
            <User className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-850 dark:text-white">NGO Organization Profile & Licensing</h1>
            <p className="text-xs text-slate-550 dark:text-slate-400">Non-Profit Child Shelter Credentials & Verification Status.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/ngo/dashboard")} leftIcon={ArrowLeft}>
            Dashboard
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenEdit} leftIcon={Edit3} className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400">
            Edit Details
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Account Verification Warning Banner if Pending */}
      {isPending && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-3">
          <Clock className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-1">
            <strong className="block text-sm font-bold">Verification Review in Progress</strong>
            <p className="text-[11px] leading-relaxed">
              Your organization credentials and licensing documents have been submitted and are awaiting review by GuardianLink administrators. Operational care records and intake access will become available upon approval.
            </p>
          </div>
        </div>
      )}

      {/* Rejection Alert if Rejected */}
      {isRejected && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="space-y-1">
            <strong className="block text-sm font-bold">Organization Verification Rejected</strong>
            <p className="text-[11px] leading-relaxed">
              Reason: {currentNgo?.rejectionReason || "Submitted licensing documentation was insufficient or could not be verified."}
            </p>
          </div>
        </div>
      )}

      <Card className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white space-y-6 shadow-md">
        <div className="flex items-center gap-4">
          {currentNgo.logo ? (
            <img
              src={currentNgo.logo}
              alt={currentNgo.name}
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-900 shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-300 flex items-center justify-center font-bold text-2xl ring-4 ring-white dark:ring-slate-900 shrink-0">
              <Building2 className="w-10 h-10" />
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">{currentNgo.name || "NGO Organization"}</h2>
              {isApproved ? (
                <Badge variant="success" size="sm" className="bg-teal-500/20 text-teal-650 dark:text-teal-350 font-bold border border-teal-500/30">
                  Verified NGO
                </Badge>
              ) : isPending ? (
                <Badge variant="warning" size="sm" className="bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold border border-amber-500/30">
                  Pending Verification
                </Badge>
              ) : (
                <Badge variant="danger" size="sm" className="bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold border border-rose-500/30">
                  Verification Rejected
                </Badge>
              )}
            </div>

            <span className="text-xs text-slate-500 dark:text-slate-400 block font-mono">
              Reg #{currentNgo.registrationNumber || "Pending Submission"}
            </span>

            {isApproved && (
              <span className="text-[11px] text-teal-650 dark:text-teal-300 font-bold flex items-center gap-1 pt-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Certified Child Shelter Care Provider
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-gray-150 dark:border-slate-800">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Shelter Address</span>
            <strong className="text-slate-850 dark:text-white text-sm block mt-0.5">{currentNgo.address || "Not specified"}</strong>
            {currentNgo.city && <span className="text-[11px] text-slate-400 block">{currentNgo.city}, {currentNgo.state} {currentNgo.pinCode}</span>}
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Contact Phone & Email</span>
            <strong className="text-teal-655 text-sm block mt-0.5">{currentNgo.phone || "Not specified"}</strong>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">{currentNgo.email || "Not specified"}</span>
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Registration Authority</span>
            <strong className="text-slate-850 dark:text-white text-xs block mt-0.5">
              {currentNgo.registrationAuthority || "Registrar of Societies"}
            </strong>
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">NGO Darpan ID</span>
            <strong className="text-slate-850 dark:text-white text-xs block mt-0.5 font-mono">
              {currentNgo.darpanId || "Not Registered"}
            </strong>
          </div>
        </div>
      </Card>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Update Organization Details" maxWidth="max-w-md">
        <form onSubmit={handleUpdate} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-xl">
              {errorMsg}
            </div>
          )}

          <Input
            label="Organization Name"
            value={formData.organization}
            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
            required
          />

          <Input
            label="Contact Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="Pin Code"
              value={formData.pinCode}
              onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Reg Number"
              value={formData.registrationNumber}
              onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
            />
            <Input
              label="Darpan ID"
              value={formData.darpanId}
              onChange={(e) => setFormData({ ...formData, darpanId: e.target.value })}
            />
          </div>

          <Input
            label="Registration Authority"
            placeholder="e.g. Registrar of Societies, Delhi"
            value={formData.registrationAuthority}
            onChange={(e) => setFormData({ ...formData, registrationAuthority: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-150 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="bg-teal-500 text-slate-950 font-bold">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
