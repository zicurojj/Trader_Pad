import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { TradeEntry } from '@/pages/admin/TradeEntry'
import { ManualTradeEntry } from '@/pages/admin/ManualTradeEntry'
import { Masters } from '@/pages/admin/Masters'
import { Settings } from '@/pages/admin/Settings'
import Login from '@/pages/Login'
import UserManagement from '@/pages/admin/UserManagement'
import { AllTradeEntries } from '@/pages/admin/AllTradeEntries'
import NoPermissions from '@/pages/NoPermissions'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import './App.css'

function App() {
  const { user } = useAuth()

  // Check if user has any permissions
  const hasAnyPermission = user?.role === 'admin' || (user?.permissions && user.permissions.length > 0)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            {hasAnyPermission ? <Navigate to="/trade-entry" replace /> : <Navigate to="/no-permissions" replace />}
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
          <Route path="trade-entry" element={<TradeEntry />} />
          <Route path="manual-trade-entry" element={<ManualTradeEntry />} />
          <Route path="masters" element={<Masters />} />
          <Route path="settings" element={<Settings />} />
          <Route path="all-entries" element={
            <ProtectedRoute adminOnly>
              <AllTradeEntries />
            </ProtectedRoute>
          } />
          <Route path="user-management" element={
            <ProtectedRoute adminOnly>
              <UserManagement />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
