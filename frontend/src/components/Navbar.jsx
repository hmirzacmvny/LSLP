import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getPendingCount, syncPendingVisits } from '../lib/sync'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState(null) // null | 'success' | 'failed'
  const [failedCount, setFailedCount] = useState(0)

  useEffect(() => {
    getPendingCount().then(setPendingCount)

    const onSuccess = () => {
      setPendingCount(0)
      setSyncStatus('success')
      setTimeout(() => setSyncStatus(null), 3000)
    }

    const onFailed = (e) => {
      setSyncStatus('failed')
      setFailedCount(e.detail.count)
    }

    const onPending = (e) => {
      setPendingCount(e.detail.count)
    }

    window.addEventListener('lslp:sync-success', onSuccess)
    window.addEventListener('lslp:sync-failed', onFailed)
    window.addEventListener('lslp:sync-pending', onPending)

    return () => {
      window.removeEventListener('lslp:sync-success', onSuccess)
      window.removeEventListener('lslp:sync-failed', onFailed)
      window.removeEventListener('lslp:sync-pending', onPending)
    }
  }, [])

  const handleRetry = () => {
    setSyncStatus(null)
    syncPendingVisits()
  }

  let syncIndicator = null
  if (syncStatus === 'success') {
    syncIndicator = (
      <span className="text-green-300 text-sm font-medium">
        ✅ Synced
      </span>
    )
  } else if (syncStatus === 'failed') {
    syncIndicator = (
      <span className="flex items-center gap-2 text-red-300 text-sm font-medium">
        ⚠️ Sync failed — {failedCount} record{failedCount !== 1 ? 's' : ''} pending
        <button onClick={handleRetry} className="underline hover:text-red-100">
          Retry
        </button>
      </span>
    )
  } else if (pendingCount > 0) {
    syncIndicator = (
      <span className="text-orange-300 text-sm font-medium">
        🔄 {pendingCount} pending sync
      </span>
    )
  }

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
      {syncIndicator}

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
        <button
          onClick={() => navigate('/field')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            location.pathname === '/field'
              ? 'bg-blue-700 text-white'
              : 'text-blue-200 hover:bg-blue-800'
          }`}
        >
          📱 Field App
        </button>
      </div>
    </nav>
  )
}
