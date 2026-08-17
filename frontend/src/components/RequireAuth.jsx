import { Navigate, useLocation } from 'react-router-dom'
import { useUser } from '../lib/UserContext'

const ROLE_HOME = {
  field_crew: '/field',
}

function getHome(role) {
  return ROLE_HOME[role] || '/'
}

export default function RequireAuth({ children, allowedRoles }) {
  const { firebaseUser, role, loading } = useUser()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100dvh - 68px)' }}>
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles) {
    if (!role) {
      return (
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100dvh - 68px)' }}>
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-500">Could not load your account.</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-[#1A56A0] hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    if (!allowedRoles.includes(role)) {
      return <Navigate to={getHome(role)} replace />
    }
  }

  return children
}
