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

import PoliceDashboard from "@/pages/police/PoliceDashboard";
import PoliceCasesList from "@/pages/police/PoliceCasesList";
import PoliceCaseDetails from "@/pages/police/PoliceCaseDetails";
import PoliceCaseInvestigation from "@/pages/police/PoliceCaseInvestigation";
import PoliceCaseMatches from "@/pages/police/PoliceCaseMatches";
import PoliceFoundReports from "@/pages/police/PoliceFoundReports";
import PoliceAssignments from "@/pages/police/PoliceAssignments";
import PoliceAnalytics from "@/pages/police/PoliceAnalytics";
import PoliceNotifications from "@/pages/police/PoliceNotifications";
import PoliceProfile from "@/pages/police/PoliceProfile";

import NgoDashboard from "@/pages/ngo/NgoDashboard";
import NgoChildrenList from "@/pages/ngo/NgoChildrenList";
import NgoChildProfile from "@/pages/ngo/NgoChildProfile";
import NgoIntakeWizard from "@/pages/ngo/NgoIntakeWizard";
import NgoCasesList from "@/pages/ngo/NgoCasesList";
import NgoCaseDetails from "@/pages/ngo/NgoCaseDetails";
import NgoShelterManagement from "@/pages/ngo/NgoShelterManagement";
import NgoTransfers from "@/pages/ngo/NgoTransfers";
import NgoAnalytics from "@/pages/ngo/NgoAnalytics";
import NgoNotifications from "@/pages/ngo/NgoNotifications";
import NgoProfile from "@/pages/ngo/NgoProfile";

import NotFound from "@/pages/NotFound";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PoliceLayout } from "@/components/police/PoliceLayout";
import { NgoLayout } from "@/components/ngo/NgoLayout";

import { ChildrenProvider } from "@/context/ChildrenContext";
import { MissingCasesProvider } from "@/context/MissingCasesContext";
import { CitizenProvider } from "@/context/CitizenContext";
import { PoliceProvider } from "@/context/PoliceContext";
import { NgoProvider } from "@/context/NgoContext";

import "@/styles/global.css";

export default function App() {
  return (
    <BrowserRouter>
      <ChildrenProvider>
        <MissingCasesProvider>
          <CitizenProvider>
            <PoliceProvider>
              <NgoProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Parent Portal & Citizen Dashboard Frame */}
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

                  {/* Specialized Police Module Layout Frame */}
                  <Route element={<PoliceLayout />}>
                    <Route path="/police/dashboard" element={<PoliceDashboard />} />
                    <Route path="/police/cases" element={<PoliceCasesList />} />
                    <Route path="/police/cases/:caseId" element={<PoliceCaseDetails />} />
                    <Route path="/police/cases/:caseId/investigation" element={<PoliceCaseInvestigation />} />
                    <Route path="/police/cases/:caseId/matches" element={<PoliceCaseMatches />} />
                    <Route path="/police/reports" element={<PoliceFoundReports />} />
                    <Route path="/police/assignments" element={<PoliceAssignments />} />
                    <Route path="/police/analytics" element={<PoliceAnalytics />} />
                    <Route path="/police/notifications" element={<PoliceNotifications />} />
                    <Route path="/police/profile" element={<PoliceProfile />} />
                  </Route>

                  {/* Specialized NGO Shelter Layout Frame */}
                  <Route element={<NgoLayout />}>
                    <Route path="/ngo/dashboard" element={<NgoDashboard />} />
                    <Route path="/ngo/children" element={<NgoChildrenList />} />
                    <Route path="/ngo/children/:childId" element={<NgoChildProfile />} />
                    <Route path="/ngo/intake" element={<NgoIntakeWizard />} />
                    <Route path="/ngo/cases" element={<NgoCasesList />} />
                    <Route path="/ngo/cases/:caseId" element={<NgoCaseDetails />} />
                    <Route path="/ngo/shelter" element={<NgoShelterManagement />} />
                    <Route path="/ngo/transfers" element={<NgoTransfers />} />
                    <Route path="/ngo/notifications" element={<NgoNotifications />} />
                    <Route path="/ngo/analytics" element={<NgoAnalytics />} />
                    <Route path="/ngo/profile" element={<NgoProfile />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </NgoProvider>
            </PoliceProvider>
          </CitizenProvider>
        </MissingCasesProvider>
      </ChildrenProvider>
    </BrowserRouter>
  );
}
