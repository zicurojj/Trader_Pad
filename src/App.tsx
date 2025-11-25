import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { TradeEntry } from '@/pages/admin/TradeEntry'
import { ManualTradeEntry } from '@/pages/admin/ManualTradeEntry'
import { Masters } from '@/pages/admin/Masters'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/trade-entry" replace />} />
        <Route path="/admin" element={<Layout />}>
          <Route path="trade-entry" element={<TradeEntry />} />
          <Route path="manual-trade-entry" element={<ManualTradeEntry />} />
          <Route path="masters" element={<Masters />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
