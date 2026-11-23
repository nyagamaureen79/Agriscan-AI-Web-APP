import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { SessionProvider, useSession } from './contexts/SessionContext';
import SessionExpiredModal from './components/SessionExpiredModal';
import AppErrorBoundary from './components/AppErrorBoundary';
import useSessionTimeout from './hooks/useSessionTimeout';
import Login from './components/pages/Login';
import Signup from './components/pages/Signup';
import TermsAndConditions from './components/pages/TermsAndConditions';
import ForgotPassword from './components/pages/ForgotPassword';
import ResetPassword from './components/pages/ResetPassword';
import Dashboard from './components/Dashboard';
import FarmersData from './components/pages/FarmersData';
import FarmerApprovals from './components/pages/FarmerApprovals';
import DiseaseDetection from './components/pages/DiseaseDetection';
import DiseaseDetails from './components/pages/DiseaseDetails';
import AgriPay from './components/pages/AgriPay';
import FinancialTracking from './components/pages/FinancialTracking';
import ChatbotInsights from './components/pages/ChatbotInsights';
import YieldInsights from './components/pages/YieldInsights';
import FarmerRegistrationReport from './components/pages/reports/FarmerRegistrationReport';
import CarbonTrackingReport from './components/pages/reports/CarbonTrackingReport';
import DiseaseAIDiagnosticsReport from './components/pages/reports/DiseaseAIDiagnosticsReport';
import YieldProductionsReport from './components/pages/reports/YieldProductionsReport';
import FinancialsReport from './components/pages/reports/FinancialsReport';
import ChatbotInsightsReport from './components/pages/reports/ChatbotInsightsReport';
import KnowledgeBase from './components/pages/KnowledgeBase';
import UserManagement from './components/pages/UserManagement';
import SystemSettings from './components/pages/SystemSettings';
import AuditLogs from './components/pages/AuditLogs';
import FarmerStatement from './components/pages/FarmerStatement';
import './Dashboard.css';
import Overview from "./components/pages/SuperAdmin/Overview";
import Tenants from "./components/pages/SuperAdmin/Tenants";
import TenantDetails from "./components/pages/SuperAdmin/TenantDetails";
import Payments from "./components/pages/SuperAdmin/Payments";
import AnalyticsTenant from "./components/pages/SuperAdmin/Analytics";
import SuperAdminFarmersData from "./components/pages/SuperAdmin/FarmersData";
import SuperAdminDiseaseDetection from "./components/pages/SuperAdmin/DiseaseDetection";
import SuperAdminCarbonAnalytics from "./components/pages/SuperAdmin/CarbonAnalytics";




// Session Timeout Wrapper Component
const SessionWrapper = ({ children }) => {
  useSessionTimeout();
  const { expiredReason, triggerExpiry } = useSession();

  // Listen for 401 events dispatched by apiFetch
  useEffect(() => {
    const handle401 = (e) => triggerExpiry(e.detail?.reason || '401');
    window.addEventListener('session:expired', handle401);
    return () => window.removeEventListener('session:expired', handle401);
  }, [triggerExpiry]);

  return (
    <>
      <AppErrorBoundary>
        {children}
      </AppErrorBoundary>
      {expiredReason && <SessionExpiredModal reason={expiredReason} />}
    </>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('token'); //  matches login storage
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ToastProvider>
      <SessionProvider>
      <Router>
        <SessionWrapper>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/farmers-data" element={<ProtectedRoute><FarmersData /></ProtectedRoute>} />
            <Route path="/farmer-approvals" element={<ProtectedRoute><FarmerApprovals /></ProtectedRoute>} />
            <Route path="/farmer-statement/:farmerId" element={<ProtectedRoute><FarmerStatement /></ProtectedRoute>} />
            <Route path="/disease-detection" element={<ProtectedRoute><DiseaseDetection /></ProtectedRoute>} />
            <Route path="/disease-details/:id" element={<ProtectedRoute><DiseaseDetails /></ProtectedRoute>} />
            <Route path="/agripay" element={<ProtectedRoute><AgriPay /></ProtectedRoute>} />
            <Route path="/financial-tracking" element={<ProtectedRoute><FinancialTracking /></ProtectedRoute>} />
            <Route path="/chatbot-insights" element={<ProtectedRoute><ChatbotInsights /></ProtectedRoute>} />
            <Route path="/yield-insights" element={<ProtectedRoute><YieldInsights /></ProtectedRoute>} />
            <Route path="/reports/farmer-registration" element={<ProtectedRoute><FarmerRegistrationReport /></ProtectedRoute>} />
            <Route path="/reports/carbon-tracking" element={<ProtectedRoute><CarbonTrackingReport /></ProtectedRoute>} />
            <Route path="/reports/disease-ai-diagnostics" element={<ProtectedRoute><DiseaseAIDiagnosticsReport /></ProtectedRoute>} />
            <Route path="/reports/yield-productions" element={<ProtectedRoute><YieldProductionsReport /></ProtectedRoute>} />
            <Route path="/reports/financials" element={<ProtectedRoute><FinancialsReport /></ProtectedRoute>} />
            <Route path="/reports/chatbot-insights" element={<ProtectedRoute><ChatbotInsightsReport /></ProtectedRoute>} />
            <Route path="/knowledge-base" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/system-settings" element={<ProtectedRoute><SystemSettings /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />

            {/* Super Admin Protected Routes */}
            <Route path="/super-admin/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
            <Route path="/super-admin/tenants" element={<ProtectedRoute><Tenants  /></ProtectedRoute>} />
            <Route path="/super-admin/tenant-details/:tenantId" element={<ProtectedRoute><TenantDetails  /></ProtectedRoute>} />
            <Route path="/super-admin/farmers-data" element={<ProtectedRoute><SuperAdminFarmersData  /></ProtectedRoute>} />
            <Route path="/super-admin/disease-detection" element={<ProtectedRoute><SuperAdminDiseaseDetection /></ProtectedRoute>} />
            <Route path="/super-admin/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/super-admin/analytics" element={<ProtectedRoute><AnalyticsTenant /></ProtectedRoute>} />
            <Route path="/super-admin/carbon-analytics" element={<ProtectedRoute><SuperAdminCarbonAnalytics /></ProtectedRoute>} />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </SessionWrapper>
      </Router>
      </SessionProvider>
    </ToastProvider>
  );
}

export default App;
