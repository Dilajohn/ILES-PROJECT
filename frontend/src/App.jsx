import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import AuthLayout  from './layouts/AuthLayout';
import MainLayout  from './layouts/MainLayout';

const LandingPage        = lazy(() => import('./features/landing/LandingPage'));
const LoginPage          = lazy(() => import('./pages/LoginPage'));
const SignupPage         = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const StudentDashboard   = lazy(() => import('./features/dashboard/StudentDashboard'));
const MentorDashboard    = lazy(() => import('./features/mentor/MentorDashboard'));
const LecturerDashboard  = lazy(() => import('./features/lecturer/LecturerDashboard'));
const AdminDashboard     = lazy(() => import('./features/admin/AdminDashboard'));

function Spinner() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#eef1f7'}}>
      <div style={{width:36,height:36,border:'3px solid #d8dde9',borderTop:'3px solid #00bfa5',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function DashboardLayout({ role }) {
  const { user } = useAuth();
  const effectiveRole = user?.role || role;
  const effectiveUser = user ? { name:user.name, id:user.id, email:user.email } : { name:'User', id:'' };
  return (
    <ProtectedRoute>
      <MainLayout role={effectiveRole} user={effectiveUser} />
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AuthLayout />}>
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/signup"          element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Student */}
      <Route path="/dashboard/student/*" element={<DashboardLayout role="student" />}>
        <Route index             element={<StudentDashboard />} />
        <Route path="logbook"    element={<StudentDashboard page="logbook" />} />
        <Route path="attendance" element={<StudentDashboard page="attendance" />} />
        <Route path="scores"     element={<StudentDashboard page="scores" />} />
        <Route path="reports"    element={<StudentDashboard page="reports" />} />
        <Route path="qr"         element={<StudentDashboard page="qr" />} />
        <Route path="profile"    element={<StudentDashboard page="profile" />} />
      </Route>

      {/* Mentor */}
      <Route path="/dashboard/mentor/*" element={<DashboardLayout role="mentor" />}>
        <Route index              element={<MentorDashboard />} />
        <Route path="validation"  element={<MentorDashboard page="validation" />} />
        <Route path="mentees"     element={<MentorDashboard page="mentees" />} />
        <Route path="qr"          element={<MentorDashboard page="qr" />} />
        <Route path="create"      element={<MentorDashboard page="create" />} />
        <Route path="reports"     element={<MentorDashboard page="reports" />} />
      </Route>

      {/* Lecturer */}
      <Route path="/dashboard/lecturer/*" element={<DashboardLayout role="lecturer" />}>
        <Route index              element={<LecturerDashboard />} />
        <Route path="validation"  element={<LecturerDashboard page="validation" />} />
        <Route path="grades"      element={<LecturerDashboard page="grades" />} />
        <Route path="students"    element={<LecturerDashboard page="students" />} />
        <Route path="attendance"  element={<LecturerDashboard page="attendance" />} />
        <Route path="reports"     element={<LecturerDashboard page="reports" />} />
        <Route path="activities"  element={<LecturerDashboard page="activities" />} />
      </Route>

      {/* Admin */}
      <Route path="/dashboard/admin/*" element={<DashboardLayout role="admin" />}>
        <Route index              element={<AdminDashboard />} />
        <Route path="students"    element={<AdminDashboard page="students" />} />
        <Route path="users"       element={<AdminDashboard page="users" />} />
        <Route path="companies"   element={<AdminDashboard page="companies" />} />
        <Route path="periods"     element={<AdminDashboard page="periods" />} />
        <Route path="placements"  element={<AdminDashboard page="placements" />} />
        <Route path="reports"     element={<AdminDashboard page="reports" />} />
        <Route path="audit"       element={<AdminDashboard page="audit" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Spinner />}>
          <AppRoutes />
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}