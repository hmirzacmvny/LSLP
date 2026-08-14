import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'

export default function RequireAuth({ children }) {
  const [user, setUser] = useState(undefined)
  const location = useLocation()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
    })
    return unsubscribe
  }, [])

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100dvh - 68px)' }}>
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
