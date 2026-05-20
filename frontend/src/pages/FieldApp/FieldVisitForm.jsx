import { useState, useEffect, useRef } from 'react'
import { getProperties, createVisit } from '../../lib/api'
import { db } from '../../lib/db'
import { getPendingCount } from '../../lib/sync'

const ACCESS_OPTIONS = ['Yes', 'No', 'No Answer', 'Refused', 'Scheduled']
const OUTCOME_OPTIONS = ['Lead', 'Copper', 'Galvanized', 'Unknown', 'Inaccessible']
const PROPERTY_TYPES = [
  'One Family', 'Two Family', 'Three Family',
  'Commercial or Industrial', 'Multi Family',
]

const OUTCOME_COLORS = {
  Lead: 'bg-red-600 text-white',
  Copper: 'bg-green-600 text-white',
  Galvanized: 'bg-orange-500 text-white',
  Unknown: 'bg-blue-700 text-white',
  Inaccessible: 'bg-blue-700 text-white',
}

export default function FieldVisitForm() {
  // ── Step 1 ────────────────────────────────────────────
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)

  // ── Step 2 ────────────────────────────────────────────
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
  const [gpsStatus, setGpsStatus] = useState('capturing') // capturing | captured | unavailable

  // ── Submit ────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [offlineSaved, setOfflineSaved] = useState(false)

  const debounceRef = useRef(null)
  const photoInputRef = useRef(null)

  // ── Search (debounced, fires at 3+ chars) ─────────────
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

  // ── GPS (fires when step 2 mounts) ───────────────────
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

  // ── Photos ────────────────────────────────────────────
  const handlePhotoChange = (e) => {
    const incoming = Array.from(e.target.files)
    const merged = [...photos, ...incoming].slice(0, 3)
    setPhotos(merged)
    setPhotoPreviewURLs(merged.map((f) => URL.createObjectURL(f)))
    e.target.value = '' // allow re-selecting the same file
  }

  const removePhoto = (idx) => {
    const updated = photos.filter((_, i) => i !== idx)
    setPhotos(updated)
    setPhotoPreviewURLs(updated.map((f) => URL.createObjectURL(f)))
  }

  // ── Reset back to step 1 ──────────────────────────────
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

  // ── Submit ────────────────────────────────────────────
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

    // Offline path
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

    // Online path
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

  // ── Success screens ───────────────────────────────────
  if (submitted) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-10">
        <div className="text-8xl mb-6">✅</div>
        <div className="text-3xl font-bold text-green-700">Visit Logged</div>
        <div className="text-gray-500 mt-2">Ready for next property...</div>
      </div>
    </div>
  )

  if (offlineSaved) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-10">
        <div className="text-8xl mb-6">📴</div>
        <div className="text-3xl font-bold text-orange-600">Saved Locally</div>
        <div className="text-gray-500 mt-2 max-w-xs mx-auto">
          You are offline. This visit will sync automatically when you reconnect.
        </div>
      </div>
    </div>
  )

  // ── Step 1 — Property Search ──────────────────────────
  if (step === 1) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-900 text-white px-6 py-5">
        <div className="text-xs font-semibold text-blue-300 uppercase tracking-wide mb-1">Field App</div>
        <div className="text-2xl font-bold">Find Property</div>
      </div>

      <div className="p-5 max-w-xl mx-auto">
        <div className="relative mt-2">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search address or account number..."
            autoFocus
            className="w-full border-2 border-gray-300 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-blue-500"
          />
          {searchLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              Searching...
            </div>
          )}

          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {searchResults.map((prop) => (
                <button
                  key={prop.account_number}
                  onClick={() => handleSelectProperty(prop)}
                  className="w-full text-left px-5 py-4 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                >
                  <div className="font-semibold text-gray-800">{prop.address}</div>
                  <div className="text-sm text-gray-500 font-mono">{prop.account_number}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Property confirmation card */}
        {selectedProperty && (
          <div className="mt-5 bg-white rounded-xl border-2 border-blue-200 p-5 shadow-sm">
            <div className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">Selected Property</div>
            <div className="text-xl font-bold text-gray-800 mb-1">{selectedProperty.address}</div>
            <div className="text-sm font-mono text-gray-500 mb-3">{selectedProperty.account_number}</div>
            <div className="flex gap-4 text-sm flex-wrap">
              <div>
                <span className="text-gray-500">House side: </span>
                <span className="font-semibold">{selectedProperty.hs_service || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500">Street side: </span>
                <span className="font-semibold">{selectedProperty.ss_service || '—'}</span>
              </div>
            </div>
            {selectedProperty.verified_status && (
              <div className="mt-3 inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                {selectedProperty.verified_status}
              </div>
            )}
          </div>
        )}

        {/* Continue button — show if property selected or account number typed directly (≥6 chars) */}
        {(selectedProperty || searchQuery.trim().length >= 6) && (
          <button
            onClick={() => setStep(2)}
            className="mt-5 w-full bg-blue-700 text-white py-5 rounded-xl text-xl font-bold hover:bg-blue-800 active:bg-blue-900 transition-colors"
          >
            Looks right — Continue →
          </button>
        )}

        {!selectedProperty && searchQuery.length < 3 && (
          <div className="mt-12 text-center text-gray-400">
            <div className="text-5xl mb-3">🔍</div>
            <div>Type at least 3 characters to search</div>
          </div>
        )}
      </div>
    </div>
  )

  // ── Step 2 — Log Visit ────────────────────────────────
  const addressDisplay = selectedProperty?.address || searchQuery.trim()

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header — tap to go back to Step 1 */}
      <button
        onClick={() => setStep(1)}
        className="w-full bg-blue-900 text-white px-6 py-5 text-left hover:bg-blue-800 transition-colors"
      >
        <div className="text-xs font-semibold text-blue-300 uppercase tracking-wide mb-1">← Tap to change property</div>
        <div className="text-xl font-bold truncate">{addressDisplay}</div>
        {selectedProperty && (
          <div className="text-sm font-mono text-blue-300">{selectedProperty.account_number}</div>
        )}
      </button>

      {/* GPS status */}
      <div className="px-5 pt-3">
        {gpsStatus === 'captured' && <div className="text-sm text-green-600 font-medium">📍 Location captured</div>}
        {gpsStatus === 'unavailable' && <div className="text-sm text-gray-400">📍 Location unavailable</div>}
        {gpsStatus === 'capturing' && <div className="text-sm text-gray-400">📍 Capturing location...</div>}
      </div>

      <div className="px-5 pt-4 max-w-xl mx-auto space-y-6">

        {/* Access Granted */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Access Granted</div>
          <div className="grid grid-cols-3 gap-2">
            {ACCESS_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setForm({ ...form, access_granted: opt })}
                className={`min-h-[52px] rounded-xl font-semibold text-sm transition-all ${
                  form.access_granted === opt
                    ? 'bg-blue-700 text-white shadow-md scale-[0.98]'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Verification Outcome */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Verification Outcome</div>
          <div className="grid grid-cols-3 gap-2">
            {OUTCOME_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setForm({ ...form, verification_outcome: opt })}
                className={`min-h-[52px] rounded-xl font-semibold text-sm transition-all ${
                  form.verification_outcome === opt
                    ? OUTCOME_COLORS[opt] + ' shadow-md scale-[0.98]'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Property Type */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Property Type</div>
          <select
            value={form.property_type}
            onChange={(e) => setForm({ ...form, property_type: e.target.value })}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">— Select —</option>
            {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Initials */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Your Initials</div>
          <input
            type="text"
            value={form.initials}
            onChange={(e) => setForm({ ...form, initials: e.target.value })}
            placeholder="e.g. MN"
            maxLength={5}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Notes</div>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any additional observations..."
            rows={3}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {/* Photos */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            Photos {photos.length > 0 && `(${photos.length}/3)`}
          </div>

          {photoPreviewURLs.length > 0 && (
            <div className="flex gap-3 mb-3 flex-wrap">
              {photoPreviewURLs.map((url, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    className="w-24 h-24 object-cover rounded-xl border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow"
                  >
                    ✕
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
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full min-h-[52px] border-2 border-dashed border-gray-300 rounded-xl text-gray-600 font-semibold hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                📷 Take Photo
              </button>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-700 text-white py-5 rounded-xl text-xl font-bold hover:bg-blue-800 active:bg-blue-900 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : !navigator.onLine ? '📴 Save Offline' : 'Submit Visit'}
        </button>

      </div>
    </div>
  )
}
