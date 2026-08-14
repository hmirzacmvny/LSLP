import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, Camera, CheckCircle, AlertCircle, X } from 'lucide-react'

const API_BASE = 'http://127.0.0.1:8000'
const PORTAL_API_KEY = import.meta.env.VITE_PORTAL_API_KEY || 'lslp-portal-2026'

const YEAR_OPTIONS = [
  { value: 'before_1986', label: 'Before 1986' },
  { value: '1986_2000', label: '1986 \u2013 2000' },
  { value: 'after_2000', label: 'After 2000' },
  { value: 'unknown', label: "I don't know" },
]

let debounceTimer = null

export default function SubmitForm() {
  // Step 1
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  // Step 2
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [yearConstructed, setYearConstructed] = useState('')
  const [priorLineWork, setPriorLineWork] = useState(null)
  const [priorLineNotes, setPriorLineNotes] = useState('')
  const [step2Error, setStep2Error] = useState('')

  // Step 3
  const [photos, setPhotos] = useState([])
  const [photoPreviewURLs, setPhotoPreviewURLs] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Result
  const [submissionId, setSubmissionId] = useState(null)

  const photoInputRef = useRef(null)

  // Property search
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

  // Step 2 validation
  const handleStep2Next = () => {
    if (!name.trim()) { setStep2Error('Please enter your full name.'); return }
    if (!contact.trim()) { setStep2Error('Please enter a phone number or email address.'); return }
    setStep2Error('')
    setStep(3)
  }

  // Submit
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

  // Progress indicator
  const ProgressBar = () => (
    <div className="flex items-center justify-center gap-0 py-4 px-6 max-w-xs mx-auto">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              step === n || (typeof step === 'number' && step > n)
                ? 'text-white'
                : 'bg-slate-200 text-slate-500'
            }`}
            style={
              step === n || (typeof step === 'number' && step > n)
                ? { backgroundColor: '#1A56A0' }
                : {}
            }
          >
            {n}
          </div>
          {n < 3 && (
            <div
              className={`flex-1 h-0.5 mx-1 ${
                typeof step === 'number' && step > n ? 'bg-[#1A56A0]' : 'bg-slate-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )

  // Success
  if (step === 'success')
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full text-center shadow-xl">
          <CardContent className="p-10">
            <CheckCircle className="size-20 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-800 mb-3">Thank You!</h1>
            <p className="text-muted-foreground text-lg mb-5">
              Your submission has been received. Our team will review your information and may follow
              up if needed.
            </p>
            <div className="inline-block">
              <p className="text-sm text-muted-foreground mb-1">Reference Number</p>
              <Badge className="text-2xl px-4 py-2 bg-blue-100 text-blue-800">
                #{submissionId}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-6">You may close this page.</p>
          </CardContent>
        </Card>
      </div>
    )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="text-white text-center py-8 px-6" style={{ backgroundColor: '#1A56A0' }}>
        <img
          src="/seal.png"
          alt="City of Mount Vernon"
          className="h-16 w-16 object-contain mx-auto mb-3"
        />
        <h1 className="text-xl font-bold mb-1">City of Mount Vernon</h1>
        <p className="text-blue-200 text-sm">Service Line Information Submission</p>
      </div>

      {/* Progress */}
      <ProgressBar />

      <div className="max-w-[560px] mx-auto px-5 pb-8">
        <Card>
          <CardContent className="p-6">
            {/* Step 1 — Find address */}
            {step === 1 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-700 mb-1">Find Your Property</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Use this form to provide information about the water service line at your property.
                </p>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Start typing your address..."
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
                          className="w-full text-left px-5 py-4 hover:bg-slate-50 border-b last:border-0 text-slate-800"
                        >
                          {prop.address}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirmation */}
                {selectedProperty && !confirmed && (
                  <div className="mt-5 p-5 border-2 border-blue-200 rounded-xl">
                    <p className="text-sm text-muted-foreground mb-2">Is this your property?</p>
                    <p className="text-lg font-bold text-slate-800 mb-4">{selectedProperty.address}</p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => { setConfirmed(true); setStep(2) }}
                        className="flex-1"
                        style={{ backgroundColor: '#1A56A0' }}
                      >
                        Yes, that's it
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setSelectedProperty(null); setSearchQuery(''); setConfirmed(false) }}
                        className="flex-1"
                      >
                        No, search again
                      </Button>
                    </div>
                  </div>
                )}

                {!selectedProperty && searchQuery.length < 3 && (
                  <div className="mt-10 text-center text-muted-foreground">
                    <Search className="size-10 mx-auto mb-3 stroke-1" />
                    <p>Type your street address to get started</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2 — Your information */}
            {step === 2 && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="mb-4"
                >
                  &larr; Change property
                </Button>
                <h2 className="text-lg font-semibold text-slate-700 mb-5">Your Information</h2>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Smith"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Phone or Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="(914) 555-1234 or jane@example.com"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      When was your home built?{' '}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <select
                      value={yearConstructed}
                      onChange={(e) => setYearConstructed(e.target.value)}
                      className="flex h-11 w-full rounded-3xl border border-transparent bg-input/50 px-3 py-1 text-base transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                    >
                      <option value="">-- Select --</option>
                      {YEAR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Has any work been done on your water line?{' '}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Yes', value: true },
                        { label: 'No', value: false },
                        { label: 'Not sure', value: 'unsure' },
                      ].map((opt) => (
                        <Button
                          key={opt.label}
                          type="button"
                          variant={priorLineWork === opt.value ? 'default' : 'outline'}
                          onClick={() => setPriorLineWork(opt.value)}
                          className={
                            priorLineWork === opt.value
                              ? 'bg-[#1A56A0] hover:bg-[#1A56A0]/90'
                              : ''
                          }
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>

                    {priorLineWork === true && (
                      <div className="mt-3 space-y-2">
                        <Label>Please describe the work done</Label>
                        <Textarea
                          value={priorLineNotes}
                          onChange={(e) => setPriorLineNotes(e.target.value)}
                          placeholder="e.g. pipe replaced from meter to street in 2015..."
                          rows={3}
                        />
                      </div>
                    )}
                  </div>

                  {step2Error && (
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertDescription>{step2Error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleStep2Next}
                    className="w-full h-12 text-base font-bold"
                    style={{ backgroundColor: '#1A56A0' }}
                  >
                    Next &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3 — Photos */}
            {step === 3 && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="mb-4"
                >
                  &larr; Back
                </Button>
                <h2 className="text-lg font-semibold text-slate-700 mb-1">
                  Photos <span className="text-muted-foreground font-normal text-sm">(optional)</span>
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  If possible, please upload photos of your water pipe where it enters your home — usually
                  in the basement near the water meter.
                </p>

                {photoPreviewURLs.length > 0 && (
                  <div className="flex gap-3 mb-4 flex-wrap">
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
                      className="w-full h-16 border-dashed mb-3"
                    >
                      <Camera className="size-5" />
                      Add Photo {photos.length > 0 ? `(${photos.length}/3)` : ''}
                    </Button>
                  </>
                )}

                {submitError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="size-4" />
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full h-14 text-lg font-bold"
                  style={{ backgroundColor: '#1A56A0' }}
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </Button>

                {!loading && (
                  <button
                    onClick={handleSubmit}
                    className="w-full text-center text-muted-foreground text-sm mt-3 hover:text-slate-600 py-2"
                  >
                    Skip photos and submit
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
