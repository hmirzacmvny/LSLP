import { useState, useRef } from 'react'

const API_BASE = 'http://127.0.0.1:8000'
const PORTAL_API_KEY = import.meta.env.VITE_PORTAL_API_KEY || 'lslp-portal-2026'

const YEAR_OPTIONS = [
  { value: 'before_1986', label: 'Before 1986' },
  { value: '1986_2000', label: '1986 – 2000' },
  { value: 'after_2000', label: 'After 2000' },
  { value: 'unknown', label: 'I don\'t know' },
]

let debounceTimer = null

export default function SubmitForm() {
  // ── Step 1 ────────────────────────────────────────────
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  // ── Step 2 ────────────────────────────────────────────
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [yearConstructed, setYearConstructed] = useState('')
  const [priorLineWork, setPriorLineWork] = useState(null) // true | false | 'unsure' | null
  const [priorLineNotes, setPriorLineNotes] = useState('')
  const [step2Error, setStep2Error] = useState('')

  // ── Step 3 ────────────────────────────────────────────
  const [photos, setPhotos] = useState([])
  const [photoPreviewURLs, setPhotoPreviewURLs] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ── Result ────────────────────────────────────────────
  const [submissionId, setSubmissionId] = useState(null)

  const photoInputRef = useRef(null)

  // ── Property search ───────────────────────────────────
  const handleSearchChange = (e) => {
    const q = e.target.value
    setSearchQuery(q)
    setSelectedProperty(null)
    setConfirmed(false)

    if (debounceTimer) clearTimeout(debounceTimer)

    if (q.length < 3) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    debounceTimer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(
          `${API_BASE}/api/submissions/property-search?search=${encodeURIComponent(q)}`,
          { headers: { 'X-Portal-API-Key': PORTAL_API_KEY } }
        )
        if (!res.ok) throw new Error()
        const data = await res.json()
        setSearchResults(data)
        setShowDropdown(data.length > 0)
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
    setConfirmed(false)
  }

  // ── Photos ────────────────────────────────────────────
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

  // ── Step 2 validation ─────────────────────────────────
  const handleStep2Next = () => {
    if (!name.trim()) { setStep2Error('Please enter your full name.'); return }
    if (!contact.trim()) { setStep2Error('Please enter a phone number or email address.'); return }
    setStep2Error('')
    setStep(3)
  }

  // ── Submit ────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true)
    setSubmitError('')

    const fd = new FormData()
    fd.append('account_number', selectedProperty.account_number)
    fd.append('submitter_name', name.trim())
    fd.append('contact_info', contact.trim())
    if (yearConstructed) fd.append('year_constructed', yearConstructed)
    if (priorLineWork === true) fd.append('prior_line_work', 'true')
    if (priorLineWork === false) fd.append('prior_line_work', 'false')
    if (priorLineWork === true && priorLineNotes.trim()) {
      fd.append('prior_line_notes', priorLineNotes.trim())
    }
    photos.forEach((photo) => fd.append('photos', photo))

    try {
      const res = await fetch(`${API_BASE}/api/submissions/`, {
        method: 'POST',
        headers: { 'X-Portal-API-Key': PORTAL_API_KEY },
        body: fd,
      })
      if (!res.ok) throw new Error(res.status)
      const data = await res.json()
      setSubmissionId(data.id)
      setStep('success')
    } catch {
      setSubmitError(
        'Something went wrong. Please try again or call us at (914) 665-2300.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ────────────────────────────────────
  if (step === 'success') return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-lg w-full text-center">
        <div className="text-7xl mb-5">🎉</div>
        <h1 className="text-3xl font-bold text-blue-900 mb-3">Thank You!</h1>
        <p className="text-gray-600 text-lg mb-5">
          Your submission has been received. Our team will review your information and may follow up if needed.
        </p>
        <div className="bg-blue-50 rounded-xl px-6 py-4 inline-block">
          <div className="text-sm text-blue-600 font-semibold uppercase tracking-wide">Reference Number</div>
          <div className="text-4xl font-bold text-blue-900 mt-1">#{submissionId}</div>
        </div>
        <p className="text-gray-400 text-sm mt-6">
          You can close this window.
        </p>
      </div>
    </div>
  )

  // ── Page shell ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-900 text-white px-6 py-8 text-center">
        <div className="text-3xl mb-2">💧</div>
        <h1 className="text-2xl font-bold mb-1">Service Line Information</h1>
        <p className="text-blue-300 text-sm max-w-md mx-auto">
          City of Mount Vernon — Department of Public Works
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                step === n || (typeof step === 'number' && step > n)
                  ? 'bg-blue-700 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>{n}</div>
              <div className={`text-sm hidden sm:block ${step === n ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>
                {n === 1 ? 'Find Property' : n === 2 ? 'Your Info' : 'Photos'}
              </div>
              {n < 3 && <div className="flex-1 h-px bg-gray-200 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 py-8">

        {/* ── Step 1 ──────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Find Your Property</h2>
            <p className="text-gray-500 text-sm mb-6">
              Use this form to provide information about the water service line at your property. This helps us maintain accurate records for our community.
            </p>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Start typing your address..."
                autoFocus
                className="w-full border-2 border-gray-300 rounded-xl px-5 py-4 text-base focus:outline-none focus:border-blue-500"
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
                      className="w-full text-left px-5 py-4 hover:bg-blue-50 border-b border-gray-100 last:border-0 text-gray-800"
                    >
                      {prop.address}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Confirmation card */}
            {selectedProperty && !confirmed && (
              <div className="mt-5 bg-white rounded-xl border-2 border-blue-200 p-5 shadow-sm">
                <p className="text-gray-600 mb-2 text-sm">Is this your property?</p>
                <p className="text-lg font-bold text-gray-800 mb-4">{selectedProperty.address}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setConfirmed(true); setStep(2) }}
                    className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-semibold hover:bg-blue-800"
                  >
                    Yes, that's it
                  </button>
                  <button
                    onClick={() => { setSelectedProperty(null); setSearchQuery(''); setConfirmed(false) }}
                    className="flex-1 border-2 border-gray-300 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50"
                  >
                    No, search again
                  </button>
                </div>
              </div>
            )}

            {!selectedProperty && searchQuery.length < 3 && (
              <div className="mt-10 text-center text-gray-400">
                <div className="text-4xl mb-3">🏠</div>
                <p>Type your street address to get started</p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2 ──────────────────────────────────── */}
        {step === 2 && (
          <div>
            <button
              onClick={() => setStep(1)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-5 flex items-center gap-1"
            >
              ← Change property
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-5">Your Information</h2>

            <div className="space-y-5">
              {/* Full name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Contact info */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Phone or Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="(914) 555-1234 or jane@example.com"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Year constructed */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  When was your home built? <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={yearConstructed}
                  onChange={(e) => setYearConstructed(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">— Select —</option>
                  {YEAR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Prior line work */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Has any work been done on your water line in the past? <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Yes', value: true },
                    { label: 'No', value: false },
                    { label: 'Not sure', value: 'unsure' },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setPriorLineWork(opt.value)}
                      className={`py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                        priorLineWork === opt.value
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {priorLineWork === true && (
                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Please describe the work done
                    </label>
                    <textarea
                      value={priorLineNotes}
                      onChange={(e) => setPriorLineNotes(e.target.value)}
                      placeholder="e.g. pipe replaced from meter to street in 2015..."
                      rows={3}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                )}
              </div>

              {step2Error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                  {step2Error}
                </div>
              )}

              <button
                onClick={handleStep2Next}
                className="w-full bg-blue-700 text-white py-4 rounded-xl text-lg font-bold hover:bg-blue-800 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 ──────────────────────────────────── */}
        {step === 3 && (
          <div>
            <button
              onClick={() => setStep(2)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-5 flex items-center gap-1"
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Photos <span className="text-gray-400 font-normal text-base">(optional)</span></h2>
            <p className="text-gray-500 text-sm mb-5">
              If possible, please upload photos of your water pipe where it enters your home — usually in the basement near the water meter. This helps us identify the pipe material.
            </p>

            {/* Thumbnails */}
            {photoPreviewURLs.length > 0 && (
              <div className="flex gap-3 mb-4 flex-wrap">
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
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl py-5 text-gray-600 font-semibold hover:border-blue-400 hover:text-blue-600 transition-colors mb-3"
                >
                  📷 Add Photo {photos.length > 0 ? `(${photos.length}/3)` : ''}
                </button>
              </>
            )}

            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-4">
                {submitError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-700 text-white py-5 rounded-xl text-xl font-bold hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>

            {!loading && (
              <button
                onClick={handleSubmit}
                className="w-full text-center text-gray-400 text-sm mt-3 hover:text-gray-600 py-2"
              >
                Skip photos and submit
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
