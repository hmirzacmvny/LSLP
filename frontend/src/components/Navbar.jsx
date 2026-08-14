import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { getPendingCount, syncPendingVisits } from '../lib/sync'
import { colors } from '../lib/design-system'
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
import {
  Menu, LogOut, RefreshCw, Home, ClipboardPen, Megaphone, Smartphone,
} from 'lucide-react'

const navLinks = [
  { label: 'Properties', path: '/', icon: Home },
  { label: 'Log Visit', path: '/visits/new', icon: ClipboardPen },
  { label: 'Outreach', path: '/outreach/new', icon: Megaphone },
  { label: 'Field App', path: '/field', icon: Smartphone },
]

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState(null)
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

  const userInitials = user?.email
    ? user.email.split('@')[0].slice(0, 2).toUpperCase()
    : '??'

  let syncIndicator = null
  if (syncStatus === 'success') {
    syncIndicator = (
      <Badge variant="outline" className="border-green-400/40 text-green-300 text-xs">
        Synced
      </Badge>
    )
  } else if (syncStatus === 'failed') {
    syncIndicator = (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-red-400/40 text-red-300 text-xs">
          Sync failed &mdash; {failedCount} pending
        </Badge>
        <button
          onClick={handleRetry}
          className="text-red-300 hover:text-white transition-colors"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>
    )
  } else if (pendingCount > 0) {
    syncIndicator = (
      <Badge variant="outline" className="border-orange-400/40 text-orange-300 text-xs">
        {pendingCount} pending
      </Badge>
    )
  }

  return (
    <nav className="w-full border-b border-white/10" style={{ height: 68, background: `linear-gradient(180deg, ${colors.civic} 0%, ${colors.civicDark} 100%)` }}>
      <div className="h-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">

        {/* Left — Seal + title */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 shrink-0 group"
        >
          <img
            src="/seal.png"
            alt="City of Mount Vernon"
            className="h-10 w-10 object-contain"
          />
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-px h-8 bg-white/20" />
            <div>
              <div className="text-sm font-semibold text-white leading-tight">LSLP Platform</div>
              <div className="text-[11px] text-blue-200/80 leading-tight">City of Mount Vernon</div>
            </div>
          </div>
        </button>

        {/* Center — Sync status */}
        <div className="hidden md:flex items-center">
          {syncIndicator}
        </div>

        {/* Right — Desktop nav */}
        <div className="hidden lg:flex items-center gap-1">
          <div className="flex items-center bg-white/10 rounded-lg p-0.5">
            {navLinks.map((link) => {
              const Icon = link.icon
              const active = isActive(link.path)
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    active
                      ? 'bg-white text-[#1A56A0] shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="size-3.5" />
                  {link.label}
                </button>
              )
            })}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-3 w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-xs font-bold text-white hover:bg-white/25 transition-colors">
                {userInitials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="text-sm font-medium truncate">{user?.email || 'Not signed in'}</div>
                <Badge variant="outline" className="mt-1 text-[10px]">Staff</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="size-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile — Hamburger (below lg) */}
        <div className="lg:hidden flex items-center gap-2">
          {syncIndicator}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition-colors">
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4 py-3">
                {navLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <SheetClose key={link.path} asChild>
                      <Button
                        variant={isActive(link.path) ? 'secondary' : 'ghost'}
                        className="justify-start w-full gap-2"
                        onClick={() => { navigate(link.path); setMobileOpen(false) }}
                      >
                        <Icon className="size-4" />
                        {link.label}
                      </Button>
                    </SheetClose>
                  )
                })}
              </div>
              <div className="mt-auto border-t px-4 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user?.email || 'Not signed in'}</p>
                    <Badge variant="outline" className="text-[10px] mt-0.5">Staff</Badge>
                  </div>
                </div>
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
      </div>
    </nav>
  )
}
