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
import NotFound from "@/pages/NotFound";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ChildrenProvider } from "@/context/ChildrenContext";
import { MissingCasesProvider } from "@/context/MissingCasesContext";
import "@/styles/global.css";

export default function App() {
  return (
    <BrowserRouter>
      <ChildrenProvider>
        <MissingCasesProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Parent Portal Dashboard Frame */}
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
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </MissingCasesProvider>
      </ChildrenProvider>
    </BrowserRouter>
  );
}
