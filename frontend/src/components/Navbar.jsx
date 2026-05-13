import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getPendingCount } from '../lib/sync'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const check = async () => {
      const count = await getPendingCount()
      setPendingCount(count)
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <nav className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
      {/* Logo */}
      <div
        onClick={() => navigate('/')}
        className="flex items-center gap-3 cursor-pointer"
      >
        <div className="bg-blue-600 rounded-lg p-2 text-lg">💧</div>
        <div>
          <div className="font-bold text-lg leading-tight">LSLP Platform</div>
          <div className="text-blue-300 text-xs">Lead Service Line Inventory</div>
        </div>
      </div>

      {/* Sync status */}
      {pendingCount > 0 && (
        <span className="text-orange-300 text-sm font-medium">
          🔄 {pendingCount} pending sync
        </span>
      )}

      {/* Nav Links */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            location.pathname === '/'
              ? 'bg-blue-700 text-white'
              : 'text-blue-200 hover:bg-blue-800'
          }`}
        >
          🏠 Properties
        </button>
        <button
          onClick={() => navigate('/visits/new')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            location.pathname === '/visits/new'
              ? 'bg-blue-700 text-white'
              : 'text-blue-200 hover:bg-blue-800'
          }`}
        >
          ➕ Log Visit
        </button>
        <button
            onClick={() => navigate('/outreach/new')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/outreach/new'
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-200 hover:bg-blue-800'
    }`}
    >
        📋 Log Outreach
        </button>
      </div>
    </nav>
  )
}