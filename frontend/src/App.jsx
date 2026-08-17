import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { Toaster } from '@/components/ui/sonner'
import { UserProvider } from './lib/UserContext'
import Overview from './pages/Dashboard/Overview'
import PropertiesList from './pages/Dashboard/PropertiesList'
import PropertyDetail from './pages/Dashboard/PropertyDetail'
import SubmissionsQueue from './pages/Dashboard/SubmissionsQueue'
import SubmissionDetail from './pages/Dashboard/SubmissionDetail'
import Navbar from './components/Navbar'
import NewVisit from './pages/Dashboard/NewVisit'
import Analytics from './pages/Dashboard/Analytics'
import NewOutreach from './pages/Dashboard/NewOutreach'
import Login from './pages/Login'
import RequireAuth from './components/RequireAuth'
import FieldVisitForm from './pages/FieldApp/FieldVisitForm'
import Account from './pages/Account'
import SubmitForm from './pages/Portal/SubmitForm'

const routeTransition = { type: 'spring', stiffness: 400, damping: 35 }

function ShellRoutes() {
  const location = useLocation()
  return (
    <div className="min-h-screen canvas-surface">
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={routeTransition}
        >
          <Routes location={location}>
            <Route path="/field" element={<RequireAuth allowedRoles={['field_crew', 'supervisor', 'admin']}><FieldVisitForm /></RequireAuth>} />
            <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
            <Route path="/" element={<RequireAuth allowedRoles={['office_staff', 'supervisor', 'admin']}><Overview /></RequireAuth>} />
            <Route path="/properties" element={<RequireAuth allowedRoles={['office_staff', 'supervisor', 'admin']}><PropertiesList /></RequireAuth>} />
            <Route path="/properties/:accountNumber" element={<RequireAuth allowedRoles={['office_staff', 'supervisor', 'admin']}><PropertyDetail /></RequireAuth>} />
            <Route path="/analytics" element={<RequireAuth allowedRoles={['office_staff', 'supervisor', 'admin']}><Analytics /></RequireAuth>} />
            <Route path="/visits/new" element={<RequireAuth allowedRoles={['office_staff', 'supervisor', 'admin']}><NewVisit /></RequireAuth>} />
            <Route path="/outreach/new" element={<RequireAuth allowedRoles={['office_staff', 'supervisor', 'admin']}><NewOutreach /></RequireAuth>} />
            <Route path="/submissions" element={<RequireAuth allowedRoles={['office_staff', 'supervisor', 'admin']}><SubmissionsQueue /></RequireAuth>} />
            <Route path="/submissions/:id" element={<RequireAuth allowedRoles={['office_staff', 'supervisor', 'admin']}><SubmissionDetail /></RequireAuth>} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <UserProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/submit" element={<SubmitForm />} />
            <Route path="/*" element={<ShellRoutes />} />
          </Routes>
          <Toaster position="bottom-right" />
        </UserProvider>
      </BrowserRouter>
    </MotionConfig>
  )
}

export default App
