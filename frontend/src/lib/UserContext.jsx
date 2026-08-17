import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { getCurrentUser } from './api'

const UserContext = createContext({ firebaseUser: null, role: null, profile: null, loading: true, roleLoaded: false })

export function UserProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [roleLoaded, setRoleLoaded] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u)
      if (!u) {
        setProfile(null)
        setRoleLoaded(false)
      }
    })
  }, [])

  useEffect(() => {
    if (firebaseUser === undefined) return
    if (!firebaseUser) return

    setRoleLoaded(false)
    let cancelled = false
    getCurrentUser()
      .then((res) => { if (!cancelled) setProfile(res.data) })
      .catch(() => { if (!cancelled) setProfile(null) })
      .finally(() => { if (!cancelled) setRoleLoaded(true) })
    return () => { cancelled = true }
  }, [firebaseUser])

  const loading = firebaseUser === undefined || (!!firebaseUser && !roleLoaded)

  return (
    <UserContext.Provider value={{
      firebaseUser,
      role: profile?.role || null,
      profile,
      loading,
      roleLoaded,
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
