import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { Role } from './api/types';
import { AuthProvider, homePathFor, useAuth } from './auth/AuthContext';
import { ChatScreen } from './chat/ChatScreen';
import { LogoMark } from './components/Logo';
import { ToastProvider } from './components/Toast';
import { RealtimeProvider } from './realtime/RealtimeContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DoctorLayout } from './pages/doctor/DoctorLayout';
import { PatientsPage } from './pages/doctor/PatientsPage';
import { SettingsPage } from './pages/doctor/SettingsPage';
import { PatientLayout } from './pages/patient/PatientLayout';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/cadastro" element={<Navigate to="/cadastro/medico" replace />} />
            <Route path="/cadastro/:tipo" element={<PublicOnly><RegisterPage /></PublicOnly>} />

            <Route path="/medico" element={<RequireRole role="DOCTOR"><DoctorLayout /></RequireRole>}>
              <Route index element={<Navigate to="conversas" replace />} />
              <Route path="conversas/:id?" element={<ChatScreen basePath="/medico/conversas" />} />
              <Route path="pacientes" element={<PatientsPage />} />
              <Route path="configuracoes" element={<SettingsPage />} />
            </Route>

            <Route path="/paciente" element={<Navigate to="/paciente/conversas" replace />} />
            <Route path="/paciente/conversas/:id?" element={<RequireRole role="PATIENT"><PatientLayout /></RequireRole>} />

            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

function Splash() {
  return (
    <div className="splash">
      <LogoMark size={64} />
    </div>
  );
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return <Navigate to={user ? homePathFor(user) : '/login'} replace />;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return user ? <Navigate to={homePathFor(user)} replace /> : <>{children}</>;
}

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, token, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user || !token) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homePathFor(user)} replace />;
  return <RealtimeProvider token={token}>{children}</RealtimeProvider>;
}
