import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import MyChildren from "@/pages/parent/MyChildren";
import AddChild from "@/pages/parent/AddChild";
import ChildProfile from "@/pages/parent/ChildProfile";
import MissingCasesList from "@/pages/parent/MissingCasesList";
import ReportMissingCase from "@/pages/parent/ReportMissingCase";
import CaseDetails from "@/pages/parent/CaseDetails";

import CitizenDashboard from "@/pages/citizen/CitizenDashboard";
import FoundChildStart from "@/pages/citizen/FoundChildStart";
import FoundChildPhoto from "@/pages/citizen/FoundChildPhoto";
import FoundChildMatching from "@/pages/citizen/FoundChildMatching";
import FoundChildResult from "@/pages/citizen/FoundChildResult";
import FoundChildReportForm from "@/pages/citizen/FoundChildReportForm";
import FoundChildLocationSharing from "@/pages/citizen/FoundChildLocationSharing";
import CitizenReportsList from "@/pages/citizen/CitizenReportsList";
import CitizenReportDetails from "@/pages/citizen/CitizenReportDetails";
import CitizenNotifications from "@/pages/citizen/CitizenNotifications";
import CitizenProfile from "@/pages/citizen/CitizenProfile";

import NotFound from "@/pages/NotFound";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ChildrenProvider } from "@/context/ChildrenContext";
import { MissingCasesProvider } from "@/context/MissingCasesContext";
import { CitizenProvider } from "@/context/CitizenContext";
import "@/styles/global.css";

export default function App() {
  return (
    <BrowserRouter>
      <ChildrenProvider>
        <MissingCasesProvider>
          <CitizenProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Parent & Citizen Dashboard Frame */}
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                
                {/* Children Module Routes */}
                <Route path="/parent/children" element={<MyChildren />} />
                <Route path="/parent/children/add" element={<AddChild />} />
                <Route path="/parent/children/:childId" element={<ChildProfile />} />

                {/* Missing Cases Module Routes */}
                <Route path="/parent/missing-cases" element={<MissingCasesList />} />
                <Route path="/parent/missing-cases/new" element={<ReportMissingCase />} />
                <Route path="/parent/missing-cases/:caseId" element={<CaseDetails />} />

                {/* Citizen Module Routes */}
                <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
                <Route path="/citizen/found-child" element={<FoundChildStart />} />
                <Route path="/citizen/found-child/photo" element={<FoundChildPhoto />} />
                <Route path="/citizen/found-child/matching" element={<FoundChildMatching />} />
                <Route path="/citizen/found-child/result" element={<FoundChildResult />} />
                <Route path="/citizen/found-child/report" element={<FoundChildReportForm />} />
                <Route path="/citizen/found-child/location" element={<FoundChildLocationSharing />} />
                <Route path="/citizen/reports" element={<CitizenReportsList />} />
                <Route path="/citizen/reports/:reportId" element={<CitizenReportDetails />} />
                <Route path="/citizen/notifications" element={<CitizenNotifications />} />
                <Route path="/citizen/profile" element={<CitizenProfile />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </CitizenProvider>
        </MissingCasesProvider>
      </ChildrenProvider>
    </BrowserRouter>
  );
}
