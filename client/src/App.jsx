import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import MyChildren from "@/pages/parent/MyChildren";
import AddChild from "@/pages/parent/AddChild";
import ChildProfile from "@/pages/parent/ChildProfile";
import NotFound from "@/pages/NotFound";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ChildrenProvider } from "@/context/ChildrenContext";
import "@/styles/global.css";

export default function App() {
  return (
    <BrowserRouter>
      <ChildrenProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Parent Portal Dashboard Frame */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/parent/children" element={<MyChildren />} />
            <Route path="/parent/children/add" element={<AddChild />} />
            <Route path="/parent/children/:childId" element={<ChildProfile />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </ChildrenProvider>
    </BrowserRouter>
  );
}
