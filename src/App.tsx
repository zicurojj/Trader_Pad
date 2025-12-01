import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { TradeEntry } from '@/pages/admin/TradeEntry'
import { ManualTradeEntry } from '@/pages/admin/ManualTradeEntry'
import { Masters } from '@/pages/admin/Masters'
import Login from '@/pages/Login'
import UserManagement from '@/pages/admin/UserManagement'
import { AllTradeEntries } from '@/pages/admin/AllTradeEntries'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import './App.css'

function App() {
  const { user } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Navigate to="/trade-entry" replace />
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="trade-entry" element={<TradeEntry />} />
          <Route path="manual-trade-entry" element={<ManualTradeEntry />} />
          <Route path="masters" element={<Masters />} />
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
