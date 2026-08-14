import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { getPendingCount, syncPendingVisits } from '../lib/sync'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'
import { Menu, LogOut, User, RefreshCw } from 'lucide-react'

const navLinks = [
  { label: 'Properties', path: '/' },
  { label: 'Log Visit', path: '/visits/new' },
  { label: 'Log Outreach', path: '/outreach/new' },
  { label: 'Field App', path: '/field' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState(null) // null | 'success' | 'failed'
  const [failedCount, setFailedCount] = useState(0)
  const [user, setUser] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return unsub
  }, [])

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

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  // Sync indicator
  let syncIndicator = null
  if (syncStatus === 'success') {
    syncIndicator = (
      <Badge className="bg-green-500/20 text-green-200 border-green-400/30">
        Synced
      </Badge>
    )
  } else if (syncStatus === 'failed') {
    syncIndicator = (
      <div className="flex items-center gap-2">
        <Badge className="bg-red-500/20 text-red-200 border-red-400/30">
          Sync failed — {failedCount} pending
        </Badge>
        <Button
          variant="ghost"
          size="xs"
          onClick={handleRetry}
          className="text-red-200 hover:text-white hover:bg-white/10"
        >
          <RefreshCw className="size-3" />
          Retry
        </Button>
      </div>
    )
  } else if (pendingCount > 0) {
    syncIndicator = (
      <Badge className="bg-orange-500/20 text-orange-200 border-orange-400/30">
        {pendingCount} pending sync
      </Badge>
    )
  }

  return (
    <nav className="w-full h-16 flex items-center justify-between px-4 md:px-6" style={{ backgroundColor: '#1A56A0' }}>
      {/* Left — Logo */}
      <div
        onClick={() => navigate('/')}
        className="flex items-center gap-3 cursor-pointer shrink-0"
      >
        <img
          src="/seal.png"
          alt="City of Mount Vernon"
          className="h-10 w-10 object-contain rounded-full bg-white p-0.5"
        />
        <div className="hidden sm:block">
          <div className="font-bold text-white text-sm leading-tight">LSLP Platform</div>
          <div className="text-blue-200 text-xs">City of Mount Vernon</div>
        </div>
      </div>

      {/* Center — Sync status */}
      <div className="hidden md:flex items-center">
        {syncIndicator}
      </div>

      {/* Right — Desktop nav */}
      <div className="hidden md:flex items-center gap-1">
        {navLinks.map((link) => (
          <Button
            key={link.path}
            variant="ghost"
            size="sm"
            onClick={() => navigate(link.path)}
            className={`text-white hover:bg-white/20 hover:text-white ${
              isActive(link.path) ? 'bg-white/20' : ''
            }`}
          >
            {link.label}
          </Button>
        ))}

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-2 text-white hover:bg-white/20 hover:text-white"
            >
              <User className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal text-xs text-muted-foreground truncate">
              {user?.email || 'Not signed in'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile — Hamburger */}
      <div className="md:hidden flex items-center gap-2">
        {syncIndicator}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/20 hover:text-white">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-4 py-2">
              {navLinks.map((link) => (
                <SheetClose key={link.path} asChild>
                  <Button
                    variant={isActive(link.path) ? 'secondary' : 'ghost'}
                    className="justify-start w-full"
                    onClick={() => { navigate(link.path); setMobileOpen(false) }}
                  >
                    {link.label}
                  </Button>
                </SheetClose>
              ))}
            </div>
            <div className="mt-auto border-t px-4 py-4">
              <p className="text-xs text-muted-foreground truncate mb-3">
                {user?.email || 'Not signed in'}
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { handleSignOut(); setMobileOpen(false) }}
              >
                <LogOut className="size-4" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
