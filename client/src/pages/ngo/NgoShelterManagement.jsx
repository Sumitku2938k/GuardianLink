import React, { useState, useMemo } from "react";
import { Building2, CheckCircle2, Users, Heart, Plus, MapPin, Phone } from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { CapacityCard } from "@/components/ngo/CapacityCard";
import { LocationDisplay } from "@/components/common/map/LocationDisplay";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import * as ngoService from "@/services/ngoService";

export default function NgoShelterManagement() {
  const { shelterInfo, shelters, refreshNgoData } = useNgo();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "Delhi",
    latitude: "",
    longitude: "",
    capacity: 15,
    contactPhone: "+91 11 2617 2000"
  });

  const shelterMarkers = useMemo(() => {
    return (shelters || [])
      .filter(
        (s) =>
          s.latitude !== undefined &&
          s.longitude !== undefined &&
          Number.isFinite(Number(s.latitude)) &&
          Number.isFinite(Number(s.longitude))
      )
      .map((s) => ({
        id: `shelter-${s.id}`,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        type: "shelter",
        title: s.name,
        subtitle: `${s.occupied || 0}/${s.totalCapacity || s.capacity || 0} Beds Occupied`,
        address: typeof s.address === "object" ? s.address.address : s.address
      }));
  }, [shelters]);

  const handleCreateShelter = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      await ngoService.createShelter({
        name: formData.name,
        address: {
          address: formData.address,
          city: formData.city,
          latitude: formData.latitude !== "" ? Number(formData.latitude) : undefined,
          longitude: formData.longitude !== "" ? Number(formData.longitude) : undefined
        },
        capacity: Number(formData.capacity),
        contactPhone: formData.contactPhone
      });
      setIsModalOpen(false);
      setFormData({
        name: "",
        address: "",
        city: "Delhi",
        latitude: "",
        longitude: "",
        capacity: 15,
        contactPhone: "+91 11 2617 2000"
      });
      refreshNgoData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to create shelter facility.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-850 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-teal-500 dark:text-teal-400 shrink-0" />
            <span>Shelter Capacity & Facilities Management</span>
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400">Monitor bed occupancy, shelter facilities, and active care staff.</p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          variant="primary"
          size="sm"
          className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 text-xs"
          leftIcon={Plus}
        >
          Add Shelter Facility
        </Button>
      </div>

      <CapacityCard shelterInfo={shelterInfo} />

      {/* Shelter Network Interactive Map */}
      <Card className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 space-y-3 shadow-md">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-500" />
            <span>Shelter Facility Network Map</span>
          </h3>
          <span className="text-xs text-slate-500">
            {shelterMarkers.length} of {shelters.length} facilities mapped
          </span>
        </div>
        <LocationDisplay
          markers={shelterMarkers}
          height="280px"
          isPrivacyRedacted={shelterMarkers.length === 0}
        />
      </Card>

      {/* Shelters List */}
      {shelters && shelters.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white font-mono uppercase tracking-wider">
            Registered Shelters ({shelters.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shelters.map((s) => (
              <Card key={s.id} className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 space-y-3 shadow-md">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                  <h4 className="font-bold text-slate-850 dark:text-white text-sm">{s.name}</h4>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-500/15 text-teal-600 dark:text-teal-300">
                    {s.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  <span>{s.address}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-300">
                    <span>Occupancy: {s.occupied} / {s.totalCapacity} beds</span>
                    <span>{s.available} available</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full"
                      style={{ width: `${s.occupancyPercentage}%` }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-855 dark:text-white space-y-4 shadow-md">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Shelter Facilities Status
          </h3>
          <div className="space-y-3 text-xs">
            {Array.isArray(shelterInfo?.facilities) && shelterInfo.facilities.length > 0 ? (
              shelterInfo.facilities.map((f, idx) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-slate-955 rounded-xl border border-gray-150 dark:border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-slate-850 dark:text-white">{f.name}</span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {f.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs italic bg-gray-50 dark:bg-slate-950 rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
                No custom facilities configured for this shelter.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-805 text-slate-855 dark:text-white space-y-4 shadow-md">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Care Staff Roster
          </h3>
          <div className="p-4 bg-gray-50 dark:bg-slate-955 rounded-2xl border border-gray-150 dark:border-slate-800 text-xs space-y-2">
            <div className="flex justify-between items-center text-teal-650 dark:text-teal-300 font-bold">
              <span>Active Staff On Duty</span>
              <span>{shelterInfo.staffCount} Staff Members</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Including pediatric nurses, child counselors, shelter supervisors, and nutrition coordinators.
            </p>
          </div>
        </Card>
      </div>

      {/* Add Shelter Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Shelter Facility" maxWidth="max-w-md">
        <form onSubmit={handleCreateShelter} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-xl">
              {errorMsg}
            </div>
          )}
          <Input label="Shelter Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
          <div className="grid grid-cols-2 gap-2">
            <Input label="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
            <Input label="Bed Capacity" type="number" min="1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Latitude (Optional)"
              placeholder="e.g. 28.5355"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
            />
            <Input
              label="Longitude (Optional)"
              placeholder="e.g. 77.3910"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
            />
          </div>
          <Input label="Contact Phone" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} />
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-150 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="bg-teal-500 text-slate-950 font-bold">Register Facility</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
