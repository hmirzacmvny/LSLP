import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PropertiesList from './pages/Dashboard/PropertiesList'
import PropertyDetail from './pages/Dashboard/PropertyDetail'
import Navbar from './components/Navbar'
import NewVisit from './pages/Dashboard/NewVisit'
import NewOutreach from './pages/Dashboard/NewOutreach'


function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<PropertiesList />} />
          <Route path="/properties/:accountNumber" element={<PropertyDetail />} />
          <Route path="/visits/new" element={<NewVisit />} />
          <Route path="/outreach/new" element={<NewOutreach />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App