import React, { useState } from "react";
import { User, Calendar, Heart, Shield, Upload, FileText, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export const RegisterChildModal = ({ isOpen, onClose, onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "Male",
    bloodGroup: "O+",
    schoolName: "",
    emergencyContact: "",
    medicalNotes: "",
    photo: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
      setFormData({ ...formData, photo: file });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const form = new FormData();
      form.append("fullName", formData.name || "Aarav Sharma");
      form.append("name", formData.name || "Aarav Sharma");

      const ageNum = parseInt(formData.age, 10) || 5;
      const approxDob = new Date();
      approxDob.setFullYear(approxDob.getFullYear() - ageNum);
      form.append("dateOfBirth", approxDob.toISOString().split("T")[0]);
      form.append("gender", formData.gender || "Male");
      form.append("bloodGroup", formData.bloodGroup || "O+");
      form.append("schoolName", formData.schoolName || "N/A");
      form.append("medicalNotes", formData.medicalNotes || "None");

      if (formData.emergencyContact) {
        form.append(
          "emergencyContacts",
          JSON.stringify([
            {
              name: "Primary Contact",
              phone: formData.emergencyContact,
              relationship: "Guardian",
              isPrimary: true
            }
          ])
        );
      }

      if (formData.photo) {
        form.append("photo", formData.photo);
      }

      await onRegisterSuccess(form);
      onClose();
    } catch (err) {
      alert(`Registration failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Child Profile"
      subtitle="Add your child to GuardianLink AI protective monitoring network"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo Upload Zone */}
        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 hover:border-primary transition-colors">
          {photoPreview ? (
            <div className="relative group">
              <img
                src={photoPreview}
                alt="Child Preview"
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-primary/30"
              />
              <button
                type="button"
                onClick={() => setPhotoPreview(null)}
                className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 text-xs"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                Upload Child Photo
              </span>
              <span className="text-[11px] text-gray-400">
                Clear front face photo for AI biometric vector indexing
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            placeholder="e.g. Aarav Sharma"
            required
            icon={User}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Age (Years)"
            type="number"
            placeholder="e.g. 8"
            required
            icon={Calendar}
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full py-3 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 focus:border-primary outline-none"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
              Blood Group
            </label>
            <select
              value={formData.bloodGroup}
              onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              className="w-full py-3 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 focus:border-primary outline-none"
            >
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>
        </div>

        <Input
          label="School / Daily Location"
          placeholder="e.g. Modern Public School, Sector 15"
          icon={Shield}
          value={formData.schoolName}
          onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
        />

        <Input
          label="Secondary Emergency Contact Phone"
          placeholder="+91 98765 43210"
          icon={FileText}
          value={formData.emergencyContact}
          onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
        />

        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
            Medical Notes & Identification Marks
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Birthmark on left shoulder, allergic to peanuts..."
            value={formData.medicalNotes}
            onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
            className="w-full py-2.5 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 focus:border-primary outline-none resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
          <Button variant="outline" onClick={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={CheckCircle2}>
            Register Child
          </Button>
        </div>
      </form>
    </Modal>
  );
};
