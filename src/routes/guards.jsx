import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export function RequireAdmin() {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export function RequireGuest() {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (user) {
    return profile?.role === 'admin' 
      ? <Navigate to="/admin" replace /> 
      : <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}