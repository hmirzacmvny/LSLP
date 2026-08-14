import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { getProperties, createVisit } from '../../lib/api'
import { db } from '../../lib/db'
import { getPendingCount } from '../../lib/sync'
import { getMaterial } from '../../lib/design-system'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Search, MapPin, Camera, CheckCircle, WifiOff, ArrowLeft, AlertCircle, X, UserCircle,
} from 'lucide-react'

const stepTransition = { type: 'spring', stiffness: 300, damping: 30 }
const stepVariants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
}

const ACCESS_OPTIONS = [
  { value: 'Yes', active: 'bg-green-600 text-white hover:bg-green-700' },
  { value: 'No', active: 'bg-red-600 text-white hover:bg-red-700' },
  { value: 'No Answer', active: 'bg-[#1A56A0] text-white hover:bg-[#143F75]' },
  { value: 'Refused', active: 'bg-[#1A56A0] text-white hover:bg-[#143F75]' },
  { value: 'Scheduled', active: 'bg-[#1A56A0] text-white hover:bg-[#143F75]' },
]

const OUTCOME_OPTIONS = [
  { value: 'Lead', active: 'bg-red-600 text-white hover:bg-red-700' },
  { value: 'Copper', active: 'bg-green-600 text-white hover:bg-green-700' },
  { value: 'Galvanized', active: 'bg-orange-500 text-white hover:bg-orange-600' },
  { value: 'Unknown', active: 'bg-slate-600 text-white hover:bg-slate-700' },
  { value: 'Inaccessible', active: 'bg-slate-600 text-white hover:bg-slate-700' },
]

const PROPERTY_TYPES = [
  'One Family', 'Two Family', 'Three Family',
  'Commercial or Industrial', 'Multi Family',
]

export default function FieldVisitForm() {
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)

  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setCurrentUser(firebaseUser)
    })
    return unsubscribe
  }, [])

  const [form, setForm] = useState({
    access_granted: '',
    verification_outcome: '',
    property_type: '',
    notes: '',
  })
  const [photos, setPhotos] = useState([])
  const [photoPreviewURLs, setPhotoPreviewURLs] = useState([])
  const [gpsCoords, setGpsCoords] = useState(null)
  const [gpsStatus, setGpsStatus] = useState('capturing')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [offlineSaved, setOfflineSaved] = useState(false)

  const debounceRef = useRef(null)
  const photoInputRef = useRef(null)
  const searchInputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    setSelectedProperty(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.length < 3) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await getProperties({ search: value, limit: 10 })
        setSearchResults(res.data)
        setShowDropdown(res.data.length > 0)
      } catch {
        setSearchResults([])
        setShowDropdown(false)
      } finally {
        setSearchLoading(false)
      }
    }, 250)
  }

  const handleSelectProperty = (prop) => {
    setSelectedProperty(prop)
    setSearchQuery(prop.address)
    setShowDropdown(false)
    setSearchResults([])
  }

  useEffect(() => {
    if (step !== 2) return
    if (!navigator.geolocation) {
      setGpsStatus('unavailable')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsStatus('captured')
      },
      () => setGpsStatus('unavailable'),
      { timeout: 10000 },
    )
  }, [step])

  const handlePhotoChange = (e) => {
    const incoming = Array.from(e.target.files)
    const merged = [...photos, ...incoming].slice(0, 3)
    setPhotos(merged)
    setPhotoPreviewURLs(merged.map((f) => URL.createObjectURL(f)))
    e.target.value = ''
  }

  const removePhoto = (idx) => {
    const updated = photos.filter((_, i) => i !== idx)
    setPhotos(updated)
    setPhotoPreviewURLs(updated.map((f) => URL.createObjectURL(f)))
  }

  const resetForm = () => {
    setStep(1)
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
    setSelectedProperty(null)
    setForm({ access_granted: '', verification_outcome: '', property_type: '', notes: '' })
    setPhotos([])
    setPhotoPreviewURLs([])
    setGpsCoords(null)
    setGpsStatus('capturing')
    setError(null)
    setSubmitted(false)
    setOfflineSaved(false)
  }

  const handleSubmit = async () => {
    const accountNumber = selectedProperty?.account_number || searchQuery.trim()
    if (!accountNumber) {
      setError('Please select a property first.')
      return
    }

    setLoading(true)
    setError(null)

    const gpsString = gpsCoords ? JSON.stringify(gpsCoords) : null
    const formPayload = {
      account_number: accountNumber,
      ...form,
      ...(gpsString ? { gps_coordinates: gpsString } : {}),
    }

    if (!navigator.onLine) {
      try {
        await db.pendingVisits.add({
          formData: formPayload,
          photos: [...photos],
          savedAt: new Date().toISOString(),
          syncStatus: 'pending',
        })
        const count = await getPendingCount()
        window.dispatchEvent(new CustomEvent('lslp:sync-pending', { detail: { count } }))
        setOfflineSaved(true)
        setTimeout(resetForm, 2000)
      } catch {
        setError('Could not save offline. Please try again.')
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      const fd = new FormData()
      Object.entries(formPayload).forEach(([key, val]) => {
        if (val) fd.append(key, val)
      })
      photos.forEach((photo) => fd.append('photos', photo))

      await createVisit(fd)
      setSubmitted(true)
      setTimeout(resetForm, 2000)
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Property not found. Check the account number.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (submitted)
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100dvh - 68px)' }}>
        <motion.div
          className="text-center p-10"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <CheckCircle className="size-20 text-green-600 mx-auto mb-4" />
          <div className="text-3xl font-semibold text-green-700">Visit Logged</div>
          <div className="text-muted-foreground mt-2">Ready for next property...</div>
        </motion.div>
      </div>
    )

  if (offlineSaved)
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100dvh - 68px)' }}>
        <motion.div
          className="text-center p-10"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <WifiOff className="size-20 text-orange-500 mx-auto mb-4" />
          <div className="text-3xl font-semibold text-orange-600">Saved Locally</div>
          <div className="text-muted-foreground mt-2 max-w-xs mx-auto">
            You are offline. This visit will sync automatically when you reconnect.
          </div>
        </motion.div>
      </div>
    )

  const addressDisplay = selectedProperty?.address || searchQuery.trim()

  return (
    <AnimatePresence mode="wait">
      {step === 1 ? (
        <motion.div
          key="step1"
          variants={stepVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={stepTransition}
        >
          <div className="p-5 max-w-xl mx-auto">
            <Card className="overflow-visible">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">Find a property</h2>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
                    placeholder="Search address or account number..."
                    autoFocus
                    className="pl-10 h-12 text-base"
                  />
                  {searchLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      Searching...
                    </div>
                  )}

                  {showDropdown && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden"
                    >
                      {searchResults.map((prop) => (
                        <button
                          key={prop.account_number}
                          onClick={() => handleSelectProperty(prop)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-800">{prop.address}</div>
                              <div className="text-xs text-muted-foreground font-mono tabular-nums">{prop.account_number}</div>
                            </div>
                            <span className={`text-xs font-medium ${getMaterial(prop.hs_service).text}`}>
                              {prop.hs_service || ''}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {selectedProperty && (
                    <motion.div
                      key="confirmation"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="mt-5 p-4 border-2 border-blue-200 rounded-xl"
                    >
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Selected Property</p>
                      <p className="text-xl font-semibold text-slate-800 mb-1">{selectedProperty.address}</p>
                      <p className="text-sm font-mono tabular-nums text-muted-foreground mb-3">{selectedProperty.account_number}</p>
                      <div className="flex gap-4 text-sm flex-wrap">
                        <span className="text-muted-foreground">House side: <strong className={getMaterial(selectedProperty.hs_service).text}>{selectedProperty.hs_service || '—'}</strong></span>
                        <span className="text-muted-foreground">Street side: <strong className={getMaterial(selectedProperty.ss_service).text}>{selectedProperty.ss_service || '—'}</strong></span>
                      </div>
                      {selectedProperty.verified_status && (
                        <Badge variant="outline" className="mt-3 bg-blue-50 text-blue-700 border-blue-200">{selectedProperty.verified_status}</Badge>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {(selectedProperty || searchQuery.trim().length >= 6) && (
                  <Button
                    onClick={() => setStep(2)}
                    className="mt-5 w-full h-14 text-lg font-semibold bg-[#1A56A0] hover:bg-[#143F75] text-white"
                  >
                    Continue
                  </Button>
                )}

                {!selectedProperty && searchQuery.length < 3 && (
                  <div className="mt-12 text-center text-muted-foreground">
                    <Search className="size-12 mx-auto mb-3 stroke-1" />
                    <div>Type at least 3 characters to search</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="step2"
          variants={stepVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={stepTransition}
          className="pb-24"
        >
          <div className="px-5 pt-4 max-w-xl mx-auto">
            <button
              onClick={() => setStep(1)}
              className="w-full flex items-center gap-3 p-4 text-left rounded-xl border bg-blue-50/50 hover:bg-blue-100/50 transition-colors"
            >
              <ArrowLeft className="size-4 text-[#1A56A0] shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Selected Property</div>
                <div className="text-base font-semibold text-slate-800 truncate">{addressDisplay}</div>
                {selectedProperty && (
                  <div className="text-sm font-mono tabular-nums text-muted-foreground">{selectedProperty.account_number}</div>
                )}
              </div>
            </button>
          </div>

          <div className="px-5 pt-4 max-w-xl mx-auto space-y-5">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <MapPin className={`size-5 ${gpsStatus === 'captured' ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${gpsStatus === 'captured' ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {gpsStatus === 'captured' && 'Location captured'}
                  {gpsStatus === 'unavailable' && 'Location unavailable'}
                  {gpsStatus === 'capturing' && 'Capturing location...'}
                </span>
              </CardContent>
            </Card>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Access Granted</p>
              <div className="space-y-2">
                {ACCESS_OPTIONS.map((opt) => (
                  <motion.div key={opt.value} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }}>
                    <Button
                      type="button"
                      variant={form.access_granted === opt.value ? 'default' : 'outline'}
                      onClick={() => setForm({ ...form, access_granted: opt.value })}
                      className={`w-full min-h-[52px] text-sm font-semibold ${
                        form.access_granted === opt.value ? opt.active : ''
                      }`}
                    >
                      {opt.value}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Verification Outcome</p>
              <div className="grid grid-cols-2 gap-2">
                {OUTCOME_OPTIONS.map((opt) => (
                  <motion.div key={opt.value} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }}>
                    <Button
                      type="button"
                      variant={form.verification_outcome === opt.value ? 'default' : 'outline'}
                      onClick={() => setForm({ ...form, verification_outcome: opt.value })}
                      className={`w-full min-h-[52px] text-sm font-semibold ${
                        form.verification_outcome === opt.value ? opt.active : ''
                      }`}
                    >
                      {opt.value}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Property Type</p>
              <Select
                value={form.property_type}
                onValueChange={(v) => setForm({ ...form, property_type: v })}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <UserCircle className="size-8 text-[#1A56A0] shrink-0" />
                <div className="min-w-0">
                  {currentUser?.displayName && (
                    <div className="text-base font-semibold text-slate-800 uppercase tracking-wide">
                      {currentUser.displayName}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground truncate">{currentUser?.email}</div>
                </div>
              </CardContent>
            </Card>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional observations..."
                rows={3}
                className="text-base"
              />
            </div>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Photos {photos.length > 0 && `(${photos.length}/3)`}
                </p>

                {photoPreviewURLs.length > 0 && (
                  <div className="flex gap-3 mb-3 flex-wrap">
                    {photoPreviewURLs.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img src={url} alt={`Photo ${idx + 1}`} className="w-24 h-24 object-cover rounded-xl border" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {photos.length < 3 && (
                  <>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full min-h-[52px] border-dashed"
                    >
                      <Camera className="size-5" />
                      Take Photo
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-14 text-lg font-semibold max-w-xl mx-auto block bg-[#1A56A0] hover:bg-[#143F75] text-white"
            >
              {loading ? 'Saving...' : !navigator.onLine ? 'Save Offline' : 'Submit Visit'}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
