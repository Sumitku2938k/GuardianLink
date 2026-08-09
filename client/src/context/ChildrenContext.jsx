import React, { createContext, useContext, useState } from "react";

const ChildrenContext = createContext();

export const useChildren = () => {
  const context = useContext(ChildrenContext);
  if (!context) {
    throw new Error("useChildren must be used within a ChildrenProvider");
  }
  return context;
};

export const ChildrenProvider = ({ children }) => {
  const [childrenList, setChildrenList] = useState([
    {
      id: "1",
      name: "Aarav Sharma",
      nickname: "Aaru",
      age: 8,
      gender: "Male",
      dob: "2018-05-12",
      height: "128 cm",
      weight: "26 kg",
      bloodGroup: "O+",
      schoolName: "Greenwood High School, Sec-14",
      languages: "Hindi, English",
      status: "Safe",
      emergencyPin: "GL-8821",
      lastLocation: "Greenwood High School, Delhi",
      photo: "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=400&auto=format&fit=crop&q=80",
      photos: [
        "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=400&auto=format&fit=crop&q=80"
      ],
      faceEnrollmentStatus: "Completed",
      medicalNotes: "No known allergies. Routine vaccinations up to date.",
      allergies: "None",
      medications: "None",
      medicalConditions: "None",
      doctorName: "Dr. K. K. Sen",
      doctorContact: "+91 98123 45678",
      hasMedicalInfo: false,
      emergencyContacts: [
        {
          id: "ec-1",
          name: "Suman Sharma",
          relationship: "Mother",
          phone: "+91 98765 43211",
          alternatePhone: "+91 98765 43212",
          isPrimary: true
        }
      ],
      distinctiveMarks: "Small mole on the right cheek near the eye.",
      scars: "Faint scratch mark on the left knee from soccer.",
      birthmarks: "None",
      otherMarks: "None",
      updatedAt: "Today, 10:30 AM",
      createdAt: "2026-06-15",
      timeline: [
        {
          id: "t-1",
          title: "Profile Created",
          desc: "Aarav's primary security profile was created by parent.",
          time: "2026-06-15, 11:00 AM",
          icon: "Plus"
        },
        {
          id: "t-2",
          title: "Biometric Face Indexing Completed",
          desc: "AI processed 5 front-facing and profile images.",
          time: "2026-06-15, 11:20 AM",
          icon: "Shield"
        },
        {
          id: "t-3",
          title: "Guardian Contacts Verified",
          desc: "Primary emergency contact verified via OTP.",
          time: "2026-06-15, 11:25 AM",
          icon: "UserCheck"
        }
      ]
    },
    {
      id: "2",
      name: "Ananya Sharma",
      nickname: "Anu",
      age: 5,
      gender: "Female",
      dob: "2021-09-04",
      height: "105 cm",
      weight: "16 kg",
      bloodGroup: "A+",
      schoolName: "Modern Little Angels Daycare",
      languages: "Hindi, English",
      status: "Safe",
      emergencyPin: "GL-9482",
      lastLocation: "Modern Little Angels Daycare, Delhi",
      photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
      photos: [
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80"
      ],
      faceEnrollmentStatus: "Completed",
      medicalNotes: "Has mild seasonal asthma. Inhaler kept in school bag.",
      allergies: "Dust and Pollen",
      medications: "Albuterol Inhaler (as needed)",
      medicalConditions: "Mild Asthma",
      doctorName: "Dr. Anjali Mehta",
      doctorContact: "+91 98111 22233",
      hasMedicalInfo: true,
      emergencyContacts: [
        {
          id: "ec-2",
          name: "Suman Sharma",
          relationship: "Mother",
          phone: "+91 98765 43211",
          alternatePhone: "+91 98765 43212",
          isPrimary: true
        }
      ],
      distinctiveMarks: "None",
      scars: "None",
      birthmarks: "Light brown birthmark on the back of the neck.",
      otherMarks: "None",
      updatedAt: "Yesterday, 04:15 PM",
      createdAt: "2026-06-20",
      timeline: [
        {
          id: "t-1",
          title: "Profile Created",
          desc: "Ananya's safety profile registered in database.",
          time: "2026-06-20, 09:00 AM",
          icon: "Plus"
        },
        {
          id: "t-2",
          title: "Medical Info Updated",
          desc: "Asthma details and inhaler usage directions added.",
          time: "2026-06-20, 09:15 AM",
          icon: "Heart"
        }
      ]
    },
    {
      id: "3",
      name: "Kabir Mehta",
      nickname: "Kabbu",
      age: 10,
      gender: "Male",
      dob: "2016-02-18",
      height: "140 cm",
      weight: "34 kg",
      bloodGroup: "B+",
      schoolName: "St. Xavier's Academy",
      languages: "English, Gujarati",
      status: "Recovered",
      emergencyPin: "GL-1209",
      lastLocation: "St. Xavier's Campus, Ahmedabad",
      photo: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80",
      photos: [
        "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80"
      ],
      faceEnrollmentStatus: "Completed",
      medicalNotes: "No chronic conditions.",
      allergies: "Peanuts",
      medications: "None",
      medicalConditions: "None",
      doctorName: "Dr. R. P. Mehta",
      doctorContact: "+91 99999 88888",
      hasMedicalInfo: true,
      emergencyContacts: [
        {
          id: "ec-3",
          name: "Rajesh Mehta",
          relationship: "Father",
          phone: "+91 99887 76655",
          alternatePhone: "",
          isPrimary: true
        }
      ],
      distinctiveMarks: "Scar on right forearm.",
      scars: "Scar on right forearm from bicycle accident.",
      birthmarks: "None",
      otherMarks: "None",
      updatedAt: "3 days ago",
      createdAt: "2026-05-10",
      timeline: [
        {
          id: "t-1",
          title: "Profile Created",
          desc: "Kabir's safety profile registered.",
          time: "2026-05-10, 10:00 AM",
          icon: "Plus"
        },
        {
          id: "t-2",
          title: "Reported Missing",
          desc: "Emergency Red Alert broadcasted after geofence breach.",
          time: "2026-07-04, 02:30 PM",
          icon: "AlertTriangle"
        },
        {
          id: "t-3",
          title: "AI Face Match Spotted",
          desc: "AI spotted Kabir near Metro Station Camera 4B.",
          time: "2026-07-04, 03:10 PM",
          icon: "Shield"
        },
        {
          id: "t-4",
          title: "Recovered Safely",
          desc: "Located by police patrol and successfully returned to verified guardians.",
          time: "2026-07-04, 04:00 PM",
          icon: "CheckCircle2"
        }
      ]
    },
    {
      id: "4",
      name: "Rhea Kapoor",
      nickname: "Rhe",
      age: 7,
      gender: "Female",
      dob: "2019-11-30",
      height: "120 cm",
      weight: "22 kg",
      bloodGroup: "AB-",
      schoolName: "DPS Public School",
      languages: "English, Punjabi",
      status: "Found",
      emergencyPin: "GL-4431",
      lastLocation: "Central Mall Play Zone, Delhi",
      photo: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=400&auto=format&fit=crop&q=80",
      photos: [
        "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=400&auto=format&fit=crop&q=80"
      ],
      faceEnrollmentStatus: "Completed",
      medicalNotes: "Allergies to dairy products.",
      allergies: "Lactose intolerance",
      medications: "None",
      medicalConditions: "None",
      doctorName: "Dr. Sonia Kapoor",
      doctorContact: "+91 97777 66666",
      hasMedicalInfo: true,
      emergencyContacts: [
        {
          id: "ec-4",
          name: "Amit Kapoor",
          relationship: "Father",
          phone: "+91 95555 44444",
          alternatePhone: "",
          isPrimary: true
        }
      ],
      distinctiveMarks: "None",
      scars: "None",
      birthmarks: "Birthmark on left calf.",
      otherMarks: "None",
      updatedAt: "2 hours ago",
      createdAt: "2026-07-01",
      timeline: [
        {
          id: "t-1",
          title: "Profile Created",
          desc: "Rhea's profile registered in system.",
          time: "2026-07-01, 04:00 PM",
          icon: "Plus"
        },
        {
          id: "t-2",
          title: "Found Sighted",
          desc: "Sighted by verified citizen and flagged to nearby police unit.",
          time: "2026-08-08, 01:10 PM",
          icon: "CheckCircle2"
        }
      ]
    }
  ]);

  const addChild = (child) => {
    const newChild = {
      ...child,
      id: child.id || String(Date.now()),
      status: child.status || "Safe",
      emergencyPin: child.emergencyPin || `GL-${Math.floor(1000 + Math.random() * 9000)}`,
      faceEnrollmentStatus: child.faceEnrollmentStatus || "Completed",
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: "Just Now",
      timeline: [
        {
          id: `t-${Date.now()}-1`,
          title: "Profile Created",
          desc: `${child.name}'s safety profile successfully registered.`,
          time: "Just Now",
          icon: "Plus"
        },
        {
          id: `t-${Date.now()}-2`,
          title: "Biometric AI Vector Mapping Enabled",
          desc: "AI processed front-face vector indexing.",
          time: "Just Now",
          icon: "Shield"
        }
      ]
    };
    setChildrenList((prev) => [newChild, ...prev]);
    return newChild;
  };

  const updateChild = (childId, updatedFields) => {
    setChildrenList((prev) =>
      prev.map((c) => {
        if (c.id === childId) {
          const timestamp = new Date().toLocaleString();
          return {
            ...c,
            ...updatedFields,
            updatedAt: "Just Now",
            timeline: [
              {
                id: `t-${Date.now()}`,
                title: "Profile Updated",
                desc: "Child profile details were edited by parent.",
                time: timestamp,
                icon: "RefreshCw"
              },
              ...c.timeline
            ]
          };
        }
        return c;
      })
    );
  };

  const archiveChild = (childId) => {
    setChildrenList((prev) => prev.filter((c) => c.id !== childId));
  };

  const getChildById = (childId) => {
    return childrenList.find((c) => c.id === childId);
  };

  return (
    <ChildrenContext.Provider
      value={{
        children: childrenList,
        addChild,
        updateChild,
        archiveChild,
        getChildById
      }}
    >
      {children}
    </ChildrenContext.Provider>
  );
};
