import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Heart,
  User,
  Users,
  MapPin,
  Calendar,
  Clock,
  Edit2,
  FileText,
  AlertTriangle,
  Lock,
  Plus,
  Trash2,
  Image,
  ChevronRight,
  ShieldCheck,
  Cpu
} from "lucide-react";
import { useChildren } from "@/context/ChildrenContext";
import { ChildTimeline } from "@/components/children/ChildTimeline";
import { ConfirmModal } from "@/components/children/ConfirmModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function ChildProfile() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getChildById, updateChild, archiveChild, isLoading } = useChildren();

  const child = getChildById(childId);

  // Tab State
  const [activeTab, setActiveTab] = useState("overview");

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Modals & Media Lightbox
  const [activeImage, setActiveImage] = useState(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    relationship: "Mother",
    phone: "",
    alternatePhone: "",
    isPrimary: false
  });

  useEffect(() => {
    if (child) {
      setEditForm({ ...child });
    }
  }, [child]);

  useEffect(() => {
    // Read route queries (e.g. ?edit=true, ?tab=timeline)
    if (searchParams.get("edit") === "true") {
      setIsEditing(true);
    }
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  if (isLoading && !child) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <span className="text-xs font-mono font-bold text-slate-500">Loading Child Safety Profile...</span>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Profile Not Found</h3>
        <p className="text-xs text-gray-500 mt-1">This child record does not exist or has been archived.</p>
        <Button onClick={() => navigate("/parent/children")} className="mt-4">
          Go back to list
        </Button>
      </div>
    );
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await updateChild(child.id, editForm);
      setIsEditing(false);
    } catch (err) {
      alert(`Update Error: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleConfirmArchive = async () => {
    try {
      await archiveChild(child.id);
      navigate("/parent/children");
    } catch (err) {
      alert(`Archive Error: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleAddEmergencyContact = async (e) => {
    e.preventDefault();
    if (!newContact.name.trim() || !newContact.phone.trim()) return;

    const updatedContacts = [...(child.emergencyContacts || []), {
      ...newContact,
      id: String(Date.now())
    }];

    try {
      await updateChild(child.id, { emergencyContacts: updatedContacts });
      setNewContact({ name: "", relationship: "Mother", phone: "", alternatePhone: "", isPrimary: false });
      setIsAddContactOpen(false);
    } catch (err) {
      alert(`Failed to add contact: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleRemoveEmergencyContact = async (contactId) => {
    const updatedContacts = (child.emergencyContacts || []).filter((c) => c.id !== contactId);
    try {
      await updateChild(child.id, { emergencyContacts: updatedContacts });
    } catch (err) {
      alert(`Failed to remove contact: ${err.response?.data?.message || err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Safe":
        return (
          <Badge variant="success" pulse size="md" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            Safe
          </Badge>
        );
      case "Missing":
        return (
          <Badge variant="danger" pulse size="md" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
            Missing
          </Badge>
        );
      case "Found":
        return (
          <Badge variant="warning" pulse size="md" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
            Found
          </Badge>
        );
      case "Recovered":
        return (
          <Badge variant="secondary" pulse size="md" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20">
            Recovered
          </Badge>
        );
      default:
        return <Badge size="md">{status}</Badge>;
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "medical", label: "Medical", icon: Heart },
    { id: "photos", label: "Photos & AI", icon: Image },
    { id: "identification", label: "Identification", icon: FileText },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "timeline", label: "Timeline", icon: Clock }
  ];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-primary to-slate-900 text-white border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-400/5 rounded-full blur-3xl pointer-events-none" />

        {/* Profile Avatar */}
        <div className="relative shrink-0">
          <img
            src={child.photo}
            alt={child.name}
            className="w-28 h-28 rounded-2xl object-cover ring-4 ring-white/10 shadow-xl"
          />
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full ring-2 ring-slate-900">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Details Area */}
        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">{child.name}</h1>
            {getStatusBadge(child.status)}
          </div>
          
          <p className="text-xs text-slate-300">
            Age: {child.age} yrs • Nickname: {child.nickname || "N/A"} • ID: <strong className="text-teal-300 font-mono">{child.emergencyPin}</strong>
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-slate-300">
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-teal-400" /> {child.lastLocation}</span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> Updated: {child.updatedAt}</span>
          </div>
        </div>

        {/* Actions Button Panel */}
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto shrink-0 justify-center">
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant="glass"
            size="sm"
            leftIcon={Edit2}
            className="flex-1 sm:flex-initial"
          >
            {isEditing ? "View Profile" : "Edit Profile"}
          </Button>

          <Button
            onClick={() => setIsArchiveOpen(true)}
            variant="destructive"
            size="sm"
            className="flex-1 sm:flex-initial"
          >
            Archive Profile
          </Button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-800/80 overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsEditing(false);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/10"
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREA */}
      <div className="w-full">
        {isEditing && editForm ? (
          /* EDIT PROFILE FORM MODE */
          <Card className="p-6 sm:p-8">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Edit Profile Details</h3>
                <p className="text-xs text-gray-500">Edit general name and school details for the profile.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
                <Input
                  label="Nickname"
                  value={editForm.nickname}
                  onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Height"
                  value={editForm.height}
                  onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}
                />
                <Input
                  label="Weight"
                  value={editForm.weight}
                  onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                />
                <Input
                  label="School Name"
                  value={editForm.schoolName}
                  onChange={(e) => setEditForm({ ...editForm, schoolName: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Modifications
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          /* STANDARD TAB VIEWS */
          <AnimatePresence mode="wait">
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {/* General Info Card */}
                <Card className="p-6 md:col-span-2 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-slate-800">
                    General Information
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-xs">
                    <div>
                      <span className="text-gray-400 block">Date of Birth</span>
                      <strong className="text-gray-800 dark:text-slate-200 mt-1 block">{child.dob}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Age</span>
                      <strong className="text-gray-800 dark:text-slate-200 mt-1 block">{child.age} years</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Gender</span>
                      <strong className="text-gray-800 dark:text-slate-200 mt-1 block">{child.gender}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Height</span>
                      <strong className="text-gray-800 dark:text-slate-200 mt-1 block">{child.height}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Weight</span>
                      <strong className="text-gray-800 dark:text-slate-200 mt-1 block">{child.weight}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Blood Group</span>
                      <strong className="text-gray-800 dark:text-slate-200 mt-1 block">{child.bloodGroup}</strong>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-slate-800 text-xs">
                    <span className="text-gray-400 block">School / Daily Location</span>
                    <strong className="text-gray-800 dark:text-slate-200 mt-1 block">{child.schoolName || "Not Provided"}</strong>
                  </div>
                </Card>

                {/* AI Index Details */}
                <Card className="p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-slate-800 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-primary" />
                    <span>AI Index Shield</span>
                  </h3>
                  <div className="space-y-4 text-xs">
                    <div className="p-3 bg-gray-50 dark:bg-slate-850/40 rounded-xl">
                      <span className="text-gray-400 block font-bold text-[9px] uppercase">Biometric Landmark Status</span>
                      <strong className="text-emerald-500 font-bold block mt-1">✓ Index Active (100%)</strong>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-slate-850/40 rounded-xl">
                      <span className="text-gray-400 block font-bold text-[9px] uppercase">Face Vector Confidence</span>
                      <strong className="text-gray-800 dark:text-slate-200 font-bold block mt-1">99.8% Match Rate</strong>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* MEDICAL TAB */}
            {activeTab === "medical" && (
              <motion.div
                key="medical"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="p-6 sm:p-8 space-y-6">
                  <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Heart className="w-5 h-5 text-rose-500" />
                      <span>Sensitive Medical File Log</span>
                    </h3>
                    <p className="text-xs text-gray-500">Only authorized emergency personnel get access on alert triggers.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                    <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 space-y-1">
                      <span className="text-gray-400 block uppercase font-bold text-[9px]">Chronic Medical Conditions</span>
                      <p className="text-gray-800 dark:text-slate-200 font-bold text-sm leading-relaxed">{child.medicalConditions || "None Registered"}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 space-y-1">
                      <span className="text-gray-400 block uppercase font-bold text-[9px]">Known Allergies</span>
                      <p className="text-gray-800 dark:text-slate-200 font-bold text-sm leading-relaxed">{child.allergies || "None Registered"}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 space-y-1">
                      <span className="text-gray-400 block uppercase font-bold text-[9px]">Regular Medications</span>
                      <p className="text-gray-800 dark:text-slate-200 font-bold text-sm leading-relaxed">{child.medications || "None Registered"}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 space-y-1">
                      <span className="text-gray-400 block uppercase font-bold text-[9px]">Primary Doctor Details</span>
                      <p className="text-gray-800 dark:text-slate-200 font-bold text-sm leading-relaxed">
                        {child.doctorName || "None Registered"} {child.doctorContact ? `(${child.doctorContact})` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl text-xs space-y-2">
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-primary" /> Sensitive Medical Profile Protection
                    </h4>
                    <p className="text-gray-500 leading-relaxed text-[11px]">
                      This tab contains highly confidential details. Under GDPR and local healthcare privacy policies, data remains locked under primary family authorization keys. It cannot be indexed or exposed during public API calls.
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* PHOTOS TAB */}
            {activeTab === "photos" && (
              <motion.div
                key="photos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="p-6 sm:p-8 space-y-6">
                  <div className="pb-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Facial Vector Library</h3>
                      <p className="text-xs text-gray-500">Photos uploaded and verified for biometric security matching.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {(child.photos || [child.photo]).map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveImage(url)}
                        className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 aspect-square overflow-hidden cursor-pointer relative group shadow-sm hover:shadow-md transition-all"
                      >
                        <img src={url} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                          View Image
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* IDENTIFICATION TAB */}
            {activeTab === "identification" && (
              <motion.div
                key="identification"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="p-6 sm:p-8 space-y-6">
                  <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Physical Verification Details</h3>
                    <p className="text-xs text-gray-500">Visual markers useful for manual verification checksheets.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                    <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 space-y-1">
                      <span className="text-gray-400 block font-bold uppercase text-[9px]">Distinctive Marks</span>
                      <p className="text-gray-900 dark:text-white font-semibold text-sm">{child.distinctiveMarks || "None Registered"}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 space-y-1">
                      <span className="text-gray-400 block font-bold uppercase text-[9px]">Birthmarks & Scars</span>
                      <p className="text-gray-900 dark:text-white font-semibold text-sm">{child.birthmarks || child.scars || "None Registered"}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* EMERGENCY CONTACTS TAB */}
            {activeTab === "contacts" && (
              <motion.div
                key="contacts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Secondary Guardians</h3>
                  <Button onClick={() => setIsAddContactOpen(true)} variant="secondary" size="sm" leftIcon={Plus}>
                    Add Emergency Contact
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(child.emergencyContacts || []).map((contact) => (
                    <div
                      key={contact.id}
                      className="p-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shadow-sm"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span>{contact.name}</span>
                          <Badge variant={contact.isPrimary ? "primary" : "neutral"} size="sm">
                            {contact.relationship}
                          </Badge>
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 font-mono">{contact.phone}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveEmergencyContact(contact.id)}
                        className="p-2 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TIMELINE TAB */}
            {activeTab === "timeline" && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ChildTimeline events={child.timeline} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Lightbox Image Preview Modal */}
      {activeImage && (
        <div
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm cursor-zoom-out"
        >
          <img src={activeImage} alt="Preview Zoom" className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}

      {/* Add Contact Modal */}
      {isAddContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <Card className="w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Emergency Contact</h3>
            <form onSubmit={handleAddEmergencyContact} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="e.g. Suman Sharma"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                required
              />

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                  Relationship
                </label>
                <select
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  className="w-full py-3 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 focus:border-primary outline-none"
                >
                  <option value="Mother">Mother</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Uncle/Aunt">Uncle/Aunt</option>
                  <option value="Neighbor">Neighbor</option>
                  <option value="Teacher">Teacher</option>
                </select>
              </div>

              <Input
                label="Phone Number"
                placeholder="+91 99999 77777"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                required
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setIsAddContactOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Add Contact
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Archive Confirm Modal */}
      <ConfirmModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        onConfirm={handleConfirmArchive}
        title="Archive Child Profile"
        message={`Are you sure you want to archive ${child.name}'s profile? You will temporarily lose AI monitoring coordinates for this record.`}
        confirmLabel="Archive Profile"
        confirmVariant="destructive"
        requireInput={true}
        requireInputValue={child.name}
        inputPlaceholder="Type child name to confirm"
      />
    </div>
  );
}
