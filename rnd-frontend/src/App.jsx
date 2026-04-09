import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { authService } from './services/auth.service';
const Login = lazy(() => import('./components/Login/Login'));
const DashboardLayout = lazy(() => import('./components/Layout/DashboardLayout'));
const DashboardHome = lazy(() => import('./components/Dashboard/DashboardHome'));
const MastersHome = lazy(() => import('./components/Masters/MastersHome'));
const EquipmentMaster = lazy(() => import('./components/Masters/EquipmentMaster'));
const IngredientMaster = lazy(() => import('./components/Masters/IngredientMaster'));
const BenchmarkMaster = lazy(() => import('./components/Masters/BenchmarkMaster'));
const CalibrationHome = lazy(() => import('./components/LabRecords/Calibration/CalibrationHome'));
const CalibrationLogs = lazy(() => import('./components/LabRecords/Calibration/CalibrationLogs'));
const ProjectsPage = lazy(() => import('./components/Projects/ProjectsPage'));
const ProjectDetailsPage = lazy(() => import('./components/Projects/ProjectDetailsPage'));
const AuditTrailPage = lazy(() => import('./components/Audit/AuditTrailPage'));
const DocumentsPage = lazy(() => import('./components/Documents/DocumentsPage'));
const ProcedurePage = lazy(() => import('./components/Procedure/ProcedurePage'));
const SettingsPage = lazy(() => import('./components/Settings/SettingsPage'));

const PAGE_MAP = {
  dashboard: 'DASHBOARD',
  projects: 'PROJECTS',
  procedure: 'PROCEDURE',
  documents: 'DOCUMENTS',
  calibration: 'CALIBRATION',
  'logs/calibration': 'CALIBRATION_LOGS',
  masters: 'MASTERS',
  'masters/equipment': 'MASTERS',
  'masters/benchmark': 'MASTERS',
  'masters/ingredients': 'MASTERS',
  'audit/trail': 'AUDIT',
  settings: 'SETTINGS'
};

const PageAccess = ({ pageKey, children }) => {
  const user = authService.getCurrentUser();
  const role = user?.role;
  const pages = Array.isArray(user?.allowedPages) ? user.allowedPages : [];

  if (role === 'HEAD') {
    return children;
  }

  if (!pageKey || pages.includes(pageKey)) {
    return children;
  }

  return <Navigate to="/" replace />;
};

const RouteLoader = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
    <Spinner animation="border" variant="primary" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<PageAccess pageKey={PAGE_MAP.dashboard}><DashboardHome /></PageAccess>} />

            {/* Lab Records */}
            <Route path="projects" element={<PageAccess pageKey={PAGE_MAP.projects}><ProjectsPage /></PageAccess>} />
            <Route path="projects/:projectId" element={<PageAccess pageKey={PAGE_MAP.projects}><ProjectDetailsPage /></PageAccess>} />
            <Route path="procedure" element={<PageAccess pageKey={PAGE_MAP.procedure}><ProcedurePage /></PageAccess>} />
            <Route path="documents" element={<PageAccess pageKey={PAGE_MAP.documents}><DocumentsPage /></PageAccess>} />
            <Route path="calibration" element={<PageAccess pageKey={PAGE_MAP.calibration}><CalibrationHome /></PageAccess>} />

            {/* Logs */}
            <Route path="logs/calibration" element={<PageAccess pageKey={PAGE_MAP['logs/calibration']}><CalibrationLogs /></PageAccess>} />

            {/* Audit */}
            <Route path="audit/trail" element={<PageAccess pageKey={PAGE_MAP['audit/trail']}><AuditTrailPage /></PageAccess>} />

            {/* Masters */}
            <Route path="masters" element={<PageAccess pageKey={PAGE_MAP.masters}><MastersHome /></PageAccess>} />
            <Route path="masters/equipment" element={<PageAccess pageKey={PAGE_MAP['masters/equipment']}><EquipmentMaster /></PageAccess>} />
            <Route path="masters/benchmark" element={<PageAccess pageKey={PAGE_MAP['masters/benchmark']}><BenchmarkMaster /></PageAccess>} />
            <Route path="masters/ingredients" element={<PageAccess pageKey={PAGE_MAP['masters/ingredients']}><IngredientMaster /></PageAccess>} />

            <Route path="settings" element={<PageAccess pageKey={PAGE_MAP.settings}><SettingsPage /></PageAccess>} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
