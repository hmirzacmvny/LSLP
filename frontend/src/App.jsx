import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import PropertiesList from './pages/Dashboard/PropertiesList'
import PropertyDetail from './pages/Dashboard/PropertyDetail'
import Navbar from './components/Navbar'
import NewVisit from './pages/Dashboard/NewVisit'
import NewOutreach from './pages/Dashboard/NewOutreach'
import Login from './pages/Login'
import RequireAuth from './components/RequireAuth'
import FieldVisitForm from './pages/FieldApp/FieldVisitForm'
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
            <Route path="/field" element={<FieldVisitForm />} />
            <Route path="/" element={<RequireAuth><PropertiesList /></RequireAuth>} />
            <Route path="/properties/:accountNumber" element={<RequireAuth><PropertyDetail /></RequireAuth>} />
            <Route path="/visits/new" element={<RequireAuth><NewVisit /></RequireAuth>} />
            <Route path="/outreach/new" element={<RequireAuth><NewOutreach /></RequireAuth>} />
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
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/submit" element={<SubmitForm />} />
          <Route path="/*" element={<ShellRoutes />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  )
}

export default App
