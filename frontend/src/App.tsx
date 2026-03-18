import { type ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Snags from './pages/Snags'
import SnagDetail from './pages/SnagDetail'
import Instructions from './pages/Instructions'
import InstructionDetail from './pages/InstructionDetail'
import CreateSnag from './pages/CreateSnag'
import DataOwnership from './pages/DataOwnership'

function AppShell({ children }: { children: ReactNode }) {
  return <Layout>{children}</Layout>
}

function LegacyAppRedirect() {
  const location = useLocation()
  return <Navigate to={`/app${location.pathname}`} replace />
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/app/dashboard" element={<AppShell><Dashboard /></AppShell>} />
        <Route path="/app/snags" element={<AppShell><Snags /></AppShell>} />
        <Route path="/app/snags/new" element={<AppShell><CreateSnag /></AppShell>} />
        <Route path="/app/snags/:id" element={<AppShell><SnagDetail /></AppShell>} />
        <Route path="/app/instructions" element={<AppShell><Instructions /></AppShell>} />
        <Route path="/app/instructions/:id" element={<AppShell><InstructionDetail /></AppShell>} />
        <Route path="/app/data-ownership" element={<AppShell><DataOwnership /></AppShell>} />

        <Route path="/dashboard" element={<LegacyAppRedirect />} />
        <Route path="/snags" element={<LegacyAppRedirect />} />
        <Route path="/snags/new" element={<LegacyAppRedirect />} />
        <Route path="/snags/:id" element={<LegacyAppRedirect />} />
        <Route path="/instructions" element={<LegacyAppRedirect />} />
        <Route path="/instructions/:id" element={<LegacyAppRedirect />} />
        <Route path="/data-ownership" element={<LegacyAppRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
