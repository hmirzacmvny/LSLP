import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PropertiesList from './pages/Dashboard/PropertiesList'
import PropertyDetail from './pages/Dashboard/PropertyDetail'
import Navbar from './components/Navbar'
import NewVisit from './pages/Dashboard/NewVisit'
import NewOutreach from './pages/Dashboard/NewOutreach'
import Login from './pages/Login'
import RequireAuth from './components/RequireAuth'
import FieldVisitForm from './pages/FieldApp/FieldVisitForm'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Field app — no RequireAuth; auth for field crew is Phase 2.5+ */}
        <Route
          path="/field"
          element={
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <FieldVisitForm />
            </div>
          }
        />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <Routes>
                  <Route path="/" element={<PropertiesList />} />
                  <Route path="/properties/:accountNumber" element={<PropertyDetail />} />
                  <Route path="/visits/new" element={<NewVisit />} />
                  <Route path="/outreach/new" element={<NewOutreach />} />
                </Routes>
              </div>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App