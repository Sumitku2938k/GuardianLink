import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";

const ChildrenContext = createContext();

export const useChildren = () => {
  const context = useContext(ChildrenContext);
  if (!context) {
    throw new Error("useChildren must be used within a ChildrenProvider");
  }
  return context;
};

const normalizeChildForUi = (c) => {
  if (!c) return null;
  const id = c.id || (c._id ? c._id.toString() : String(c));
  const name = c.fullName || c.name || "Child";
  const dob = c.dateOfBirth
    ? new Date(c.dateOfBirth).toISOString().split("T")[0]
    : c.dob || "";

  let age = c.age;
  if (age === undefined || age === null) {
    if (dob) {
      const birth = new Date(dob);
      const today = new Date();
      age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      age = Math.max(0, age);
    } else {
      age = 0;
    }
  }

  const defaultPhoto =
    "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=400&auto=format&fit=crop&q=80";
  const persistentPhoto = c.photoUrl || (Array.isArray(c.photos) && c.photos[0]) || "";
  const photo = persistentPhoto || c.photo || defaultPhoto;
  const photos = Array.isArray(c.photos) && c.photos.length > 0 ? c.photos : (persistentPhoto ? [persistentPhoto] : [photo]);

  const uiStatus =
    c.status === "inactive"
      ? "Inactive"
      : c.status === "active"
      ? "Safe"
      : c.status || "Safe";

  return {
    ...c,
    id,
    _id: id,
    name,
    fullName: name,
    dob,
    dateOfBirth: c.dateOfBirth || dob,
    age,
    gender: c.gender ? c.gender.charAt(0).toUpperCase() + c.gender.slice(1).toLowerCase() : "Male",
    status: uiStatus,
    rawStatus: c.status || "active",
    photo,
    photoUrl: persistentPhoto,
    cloudinaryPublicId: c.cloudinaryPublicId || "",
    hasPersistentPhoto: Boolean(persistentPhoto),
    photos,
    emergencyPin: c.emergencyPin || `GL-${id.slice(-4).toUpperCase()}`,
    schoolName: c.schoolName || "N/A",
    lastLocation: c.lastLocation || "Home / Registered Area",
    height: c.height || "N/A",
    weight: c.weight || "N/A",
    bloodGroup: c.bloodGroup || "Unknown",
    languages: c.languages || "Hindi, English",
    distinctiveMarks: c.distinctiveMarks || "None",
    scars: c.scars || "None",
    birthmarks: c.birthmarks || "None",
    otherMarks: c.otherMarks || "None",
    hasMedicalInfo: Boolean(c.hasMedicalInfo),
    medicalConditions: c.medicalConditions || "None",
    allergies: c.allergies || "None",
    medications: c.medications || "None",
    doctorName: c.doctorName || "",
    doctorContact: c.doctorContact || "",
    medicalNotes: c.medicalNotes || "",
    emergencyContacts: Array.isArray(c.emergencyContacts) ? c.emergencyContacts : [],
    updatedAt: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "Recently",
    createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "Recently",
    timeline: c.timeline || [
      {
        id: `t-${id}-1`,
        title: "Profile Created",
        desc: `${name}'s primary safety profile is registered with GuardianLink.`,
        time: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "Recently",
        icon: "Plus"
      }
    ]
  };
};

export const ChildrenProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [childrenList, setChildrenList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchChildren = useCallback(async () => {
    if (!isAuthenticated || !user || user.role !== "parent") {
      setChildrenList([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/children");
      if (res.data && res.data.success) {
        const rawChildren = res.data.children || [];
        setChildrenList(rawChildren.map(normalizeChildForUi));
      }
    } catch (err) {
      console.warn("Could not fetch children from backend API:", err.message);
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const addChild = async (childPayload) => {
    try {
      const res = await api.post("/api/children", childPayload);
      if (res.data && res.data.success && res.data.child) {
        const normalized = normalizeChildForUi(res.data.child);
        setChildrenList((prev) => [normalized, ...prev]);
        return normalized;
      }
      throw new Error(res.data?.message || "Failed to register child");
    } catch (err) {
      console.error("API error in addChild:", err);
      throw err;
    }
  };

  const updateChild = async (childId, updatedFields) => {
    try {
      const res = await api.patch(`/api/children/${childId}`, updatedFields);
      if (res.data && res.data.success && res.data.child) {
        const normalized = normalizeChildForUi(res.data.child);
        setChildrenList((prev) =>
          prev.map((c) => (c.id === childId || c._id === childId ? normalized : c))
        );
        return normalized;
      }
      throw new Error(res.data?.message || "Failed to update child");
    } catch (err) {
      console.error("API error in updateChild:", err);
      throw err;
    }
  };

  const updateChildPhoto = async (childId, photoFile) => {
    try {
      const formData = new FormData();
      formData.append("photo", photoFile);
      const res = await api.patch(`/api/children/${childId}/photo`, formData);
      if (res.data && res.data.success && res.data.child) {
        const normalized = normalizeChildForUi(res.data.child);
        setChildrenList((prev) =>
          prev.map((c) => (c.id === childId || c._id === childId ? normalized : c))
        );
        return normalized;
      }
      throw new Error(res.data?.message || "Failed to update child photo");
    } catch (err) {
      console.error("API error in updateChildPhoto:", err);
      throw err;
    }
  };

  const removeChildPhoto = async (childId) => {
    try {
      const res = await api.delete(`/api/children/${childId}/photo`);
      if (res.data && res.data.success && res.data.child) {
        const normalized = normalizeChildForUi(res.data.child);
        setChildrenList((prev) =>
          prev.map((c) => (c.id === childId || c._id === childId ? normalized : c))
        );
        return normalized;
      }
      throw new Error(res.data?.message || "Failed to remove child photo");
    } catch (err) {
      console.error("API error in removeChildPhoto:", err);
      throw err;
    }
  };

  const archiveChild = async (childId) => {
    try {
      const res = await api.patch(`/api/children/${childId}/status`, { status: "inactive" });
      if (res.data && res.data.success && res.data.child) {
        const normalized = normalizeChildForUi(res.data.child);
        setChildrenList((prev) =>
          prev.map((c) => (c.id === childId || c._id === childId ? normalized : c))
        );
        return normalized;
      }
      throw new Error(res.data?.message || "Failed to deactivate child");
    } catch (err) {
      console.error("API error in archiveChild:", err);
      throw err;
    }
  };

  const getChildById = (childId) => {
    return childrenList.find((c) => c.id === childId || c._id === childId);
  };

  return (
    <ChildrenContext.Provider
      value={{
        children: childrenList,
        isLoading,
        error,
        fetchChildren,
        addChild,
        updateChild,
        updateChildPhoto,
        removeChildPhoto,
        archiveChild,
        getChildById
      }}
    >
      {children}
    </ChildrenContext.Provider>
  );
};
