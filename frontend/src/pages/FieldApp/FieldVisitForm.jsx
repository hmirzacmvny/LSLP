import { useState, useEffect, useRef } from 'react'
import { getProperties, createVisit } from '../../lib/api'
import { db } from '../../lib/db'
import { getPendingCount } from '../../lib/sync'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Search, MapPin, Camera, CheckCircle, WifiOff, ArrowLeft, AlertCircle, X,
} from 'lucide-react'

const ACCESS_OPTIONS = [
  { value: 'Yes', selected: 'bg-green-600 text-white hover:bg-green-700' },
  { value: 'No', selected: 'bg-red-600 text-white hover:bg-red-700' },
  { value: 'No Answer', selected: 'bg-[#1A56A0] text-white hover:bg-[#1A56A0]/90' },
  { value: 'Refused', selected: 'bg-[#1A56A0] text-white hover:bg-[#1A56A0]/90' },
  { value: 'Scheduled', selected: 'bg-[#1A56A0] text-white hover:bg-[#1A56A0]/90' },
]

const OUTCOME_OPTIONS = [
  { value: 'Lead', selected: 'bg-red-600 text-white hover:bg-red-700' },
  { value: 'Copper', selected: 'bg-green-600 text-white hover:bg-green-700' },
  { value: 'Galvanized', selected: 'bg-orange-500 text-white hover:bg-orange-600' },
  { value: 'Unknown', selected: 'bg-slate-600 text-white hover:bg-slate-700' },
  { value: 'Inaccessible', selected: 'bg-slate-600 text-white hover:bg-slate-700' },
]

const PROPERTY_TYPES = [
  'One Family', 'Two Family', 'Three Family',
  'Commercial or Industrial', 'Multi Family',
]

export default function FieldVisitForm() {
  // Step 1
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)

  // Step 2
  const [form, setForm] = useState({
    access_granted: '',
    verification_outcome: '',
    property_type: '',
    initials: '',
    notes: '',
  })
  const [photos, setPhotos] = useState([])
  const [photoPreviewURLs, setPhotoPreviewURLs] = useState([])
  const [gpsCoords, setGpsCoords] = useState(null)
  const [gpsStatus, setGpsStatus] = useState('capturing')

  // Submit
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [offlineSaved, setOfflineSaved] = useState(false)

  const debounceRef = useRef(null)
  const photoInputRef = useRef(null)

  // Search
  const handleSearchChange = (e) => {
    const q = e.target.value
    setSearchQuery(q)
    setSelectedProperty(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (q.length < 3) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await getProperties({ search: q, limit: 10 })
        setSearchResults(res.data)
        setShowDropdown(res.data.length > 0)
      } catch {
        setSearchResults([])
        setShowDropdown(false)
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }

  const handleSelectProperty = (prop) => {
    setSelectedProperty(prop)
    setSearchQuery(prop.address)
    setShowDropdown(false)
    setSearchResults([])
  }

  // GPS
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

  // Photos
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

  // Reset
  const resetForm = () => {
    setStep(1)
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
    setSelectedProperty(null)
    setForm({ access_granted: '', verification_outcome: '', property_type: '', initials: '', notes: '' })
    setPhotos([])
    setPhotoPreviewURLs([])
    setGpsCoords(null)
    setGpsStatus('capturing')
    setError(null)
    setSubmitted(false)
    setOfflineSaved(false)
  }

  // Submit
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

  // Success screens
  if (submitted)
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-10">
          <CheckCircle className="size-20 text-green-600 mx-auto mb-4" />
          <div className="text-3xl font-bold text-green-700">Visit Logged</div>
          <div className="text-muted-foreground mt-2">Ready for next property...</div>
        </div>
      </div>
    )

  if (offlineSaved)
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-10">
          <WifiOff className="size-20 text-orange-500 mx-auto mb-4" />
          <div className="text-3xl font-bold text-orange-600">Saved Locally</div>
          <div className="text-muted-foreground mt-2 max-w-xs mx-auto">
            You are offline. This visit will sync automatically when you reconnect.
          </div>
        </div>
      </div>
    )

  // Step 1 — Property Search
  if (step === 1)
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: '#1A56A0' }}>
          <img src="/seal.png" alt="City of Mount Vernon" className="h-8 w-8 object-contain rounded-full bg-white p-0.5" />
          <span className="text-white font-bold">Field Visit</span>
        </div>

        <div className="p-5 max-w-xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">Find a property</h2>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={handleSearchChange}
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
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg overflow-hidden">
                    {searchResults.map((prop) => (
                      <button
                        key={prop.account_number}
                        onClick={() => handleSelectProperty(prop)}
                        className="w-full text-left px-5 py-4 hover:bg-slate-50 border-b last:border-0"
                      >
                        <div className="font-semibold text-slate-800">{prop.address}</div>
                        <div className="text-sm text-muted-foreground font-mono">{prop.account_number}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirmation card */}
              {selectedProperty && (
                <div className="mt-5 p-4 border-2 border-blue-200 rounded-xl">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Selected Property</p>
                  <p className="text-xl font-bold text-slate-800 mb-1">{selectedProperty.address}</p>
                  <p className="text-sm font-mono text-muted-foreground mb-3">{selectedProperty.account_number}</p>
                  <div className="flex gap-4 text-sm flex-wrap">
                    <span className="text-muted-foreground">House side: <strong>{selectedProperty.hs_service || '\u2014'}</strong></span>
                    <span className="text-muted-foreground">Street side: <strong>{selectedProperty.ss_service || '\u2014'}</strong></span>
                  </div>
                  {selectedProperty.verified_status && (
                    <Badge className="mt-3 bg-blue-100 text-blue-800">{selectedProperty.verified_status}</Badge>
                  )}
                </div>
              )}

              {(selectedProperty || searchQuery.trim().length >= 6) && (
                <Button
                  onClick={() => setStep(2)}
                  className="mt-5 w-full h-14 text-lg font-bold"
                  style={{ backgroundColor: '#1A56A0' }}
                >
                  Looks right — Continue
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
      </div>
    )

  // Step 2 — Log Visit
  const addressDisplay = selectedProperty?.address || searchQuery.trim()

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header — tap to go back */}
      <button
        onClick={() => setStep(1)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left text-white transition-colors hover:bg-[#174d8f]"
        style={{ backgroundColor: '#1A56A0' }}
      >
        <ArrowLeft className="size-4 shrink-0" />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-blue-200 uppercase tracking-wide">Tap to change property</div>
          <div className="text-lg font-bold truncate">{addressDisplay}</div>
          {selectedProperty && (
            <div className="text-sm font-mono text-blue-200">{selectedProperty.account_number}</div>
          )}
        </div>
      </button>

      <div className="px-5 pt-4 max-w-xl mx-auto space-y-5">

        {/* GPS status */}
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

        {/* Access Granted */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Access Granted</p>
          <div className="space-y-2">
            {ACCESS_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={form.access_granted === opt.value ? 'default' : 'outline'}
                onClick={() => setForm({ ...form, access_granted: opt.value })}
                className={`w-full min-h-[52px] text-sm font-semibold ${
                  form.access_granted === opt.value ? opt.selected : ''
                }`}
              >
                {opt.value}
              </Button>
            ))}
          </div>
        </div>

        {/* Verification Outcome */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Verification Outcome</p>
          <div className="grid grid-cols-2 gap-2">
            {OUTCOME_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={form.verification_outcome === opt.value ? 'default' : 'outline'}
                onClick={() => setForm({ ...form, verification_outcome: opt.value })}
                className={`min-h-[52px] text-sm font-semibold ${
                  form.verification_outcome === opt.value ? opt.selected : ''
                }`}
              >
                {opt.value}
              </Button>
            ))}
          </div>
        </div>

        {/* Property Type */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Property Type</p>
          <select
            value={form.property_type}
            onChange={(e) => setForm({ ...form, property_type: e.target.value })}
            className="flex h-12 w-full rounded-3xl border border-transparent bg-input/50 px-3 py-1 text-base transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <option value="">-- Select --</option>
            {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Initials */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Initials</p>
          <Input
            value={form.initials}
            onChange={(e) => setForm({ ...form, initials: e.target.value })}
            placeholder="e.g. MN"
            maxLength={5}
            className="h-12 text-base uppercase"
          />
        </div>

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any additional observations..."
            rows={3}
            className="text-base"
          />
        </div>

        {/* Photos */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
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

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-14 text-lg font-bold max-w-xl mx-auto block"
          style={{ backgroundColor: '#1A56A0' }}
        >
          {loading ? 'Saving...' : !navigator.onLine ? 'Save Offline' : 'Submit Visit'}
        </Button>
      </div>
    </div>
  )
}
