import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { TradeEntry } from '@/pages/admin/TradeEntry'
import { ManualTradeEntry } from '@/pages/admin/ManualTradeEntry'
import { Masters } from '@/pages/admin/Masters'
import { Settings } from '@/pages/admin/Settings'
import Login from '@/pages/Login'
import UserManagement from '@/pages/admin/UserManagement'
import NoPermissions from '@/pages/NoPermissions'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import './App.css'

// Define route-permission mapping
const routePermissions = [
  { path: '/trade-entry', permission: 'trade-entry' },
  { path: '/manual-trade-entry', permission: 'manual-trade-entry' },
  { path: '/masters', permission: 'masters' },
  { path: '/user-management', permission: 'user-management' },
  { path: '/settings', permission: 'settings' },
]

function App() {
  const { user } = useAuth()

  // Check if user has any permissions
  const hasAnyPermission = user?.role === 'admin' || (user?.permissions && user.permissions.length > 0)

  // Get the first available route based on user permissions
  const getDefaultRoute = () => {
    if (user?.role === 'admin') {
      return '/trade-entry'
    }

    if (user?.permissions && user.permissions.length > 0) {
      // Find the first route that matches user's permissions
      const firstPermittedRoute = routePermissions.find(
        route => user.permissions?.includes(route.permission)
      )
      return firstPermittedRoute?.path || '/no-permissions'
    }

    return '/no-permissions'
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            {hasAnyPermission ? <Navigate to={getDefaultRoute()} replace /> : <Navigate to="/no-permissions" replace />}
          </ProtectedRoute>
        } />
        <Route path="/no-permissions" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<NoPermissions />} />
        </Route>
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="trade-entry" element={
            <ProtectedRoute requiredPermission="trade-entry">
              <TradeEntry />
            </ProtectedRoute>
          } />
          <Route path="manual-trade-entry" element={
            <ProtectedRoute requiredPermission="manual-trade-entry">
              <ManualTradeEntry />
            </ProtectedRoute>
          } />
          <Route path="masters" element={
            <ProtectedRoute requiredPermission="masters">
              <Masters />
            </ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute requiredPermission="settings">
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="user-management" element={
            <ProtectedRoute requiredPermission="user-management">
              <UserManagement />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
