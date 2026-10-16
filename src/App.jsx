import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RequireAuth, RequireAdmin, RequireGuest } from './routes/guards'
import AppShell from './components/AppShell'

import Login from './pages/Login'
import SignUp from './pages/SignUp'
import ForgotPassword from './pages/ForgotPassword'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import ReportLost from './pages/ReportLost'
import ReportFound from './pages/ReportFound'
import ItemGallery from './pages/ItemGallery'
import ItemDetail from './pages/ItemDetail'
import Leaderboard from './pages/Leaderboard'
import MyClaims from './pages/MyClaims'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Logged-out pages — no nav shell */}
          <Route element={<RequireGuest />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          <Route path="/verify" element={<VerifyEmail />} />

          {/* Everything signed-in shares the AppShell sidebar */}
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/report-lost" element={<ReportLost />} />
              <Route path="/report-found" element={<ReportFound />} />
              <Route path="/items/:type" element={<ItemGallery />} />
              <Route path="/item/:id" element={<ItemDetail />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/my-claims" element={<MyClaims />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          <Route element={<RequireAdmin />}>
            <Route element={<AppShell />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}