import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Search, Camera, CheckCircle, AlertCircle, X, Check } from 'lucide-react'
import { PageReveal, RevealItem } from '../../components/PageReveal'

const API_BASE = 'http://127.0.0.1:8000'
const PORTAL_API_KEY = import.meta.env.VITE_PORTAL_API_KEY || 'lslp-portal-2026'

const YEAR_OPTIONS = [
  { value: 'before_1986', label: 'Before 1986' },
  { value: '1986_2000', label: '1986 – 2000' },
  { value: 'after_2000', label: 'After 2000' },
  { value: 'unknown', label: "I don't know" },
]

const STEP_LABELS = ['Find Address', 'Your Info', 'Photos']

const stepTransition = { type: 'spring', stiffness: 300, damping: 30 }
const stepVariants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
}

const portalHeaderBg = `
  repeating-linear-gradient(0deg, transparent, transparent 47px, rgba(255, 255, 255, 0.06) 47px, rgba(255, 255, 255, 0.06) 48px),
  repeating-linear-gradient(90deg, transparent, transparent 47px, rgba(255, 255, 255, 0.06) 47px, rgba(255, 255, 255, 0.06) 48px),
  linear-gradient(135deg, #1A56A0 0%, #2563EB 100%)
`.trim()

export default function SubmitForm() {
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [yearConstructed, setYearConstructed] = useState('')
  const [priorLineWork, setPriorLineWork] = useState(null)
  const [priorLineNotes, setPriorLineNotes] = useState('')
  const [step2Error, setStep2Error] = useState('')

  const [photos, setPhotos] = useState([])
  const [photoPreviewURLs, setPhotoPreviewURLs] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [submissionId, setSubmissionId] = useState(null)

  const photoInputRef = useRef(null)
  const debounceRef = useRef(null)
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
    setConfirmed(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.length < 3) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(
          `${API_BASE}/api/submissions/property-search?search=${encodeURIComponent(value)}`,
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
    }, 250)
  }

  const handleSelectProperty = (prop) => {
    setSelectedProperty(prop)
    setSearchQuery(prop.address)
    setShowDropdown(false)
    setSearchResults([])
    setConfirmed(false)
  }

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

  const handleStep2Next = () => {
    if (!name.trim()) { setStep2Error('Please enter your full name.'); return }
    if (!contact.trim()) { setStep2Error('Please enter a phone number or email address.'); return }
    setStep2Error('')
    setStep(3)
  }

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

  const Stepper = () => (
    <div className="flex items-center justify-center gap-0 py-5 px-6 max-w-xs mx-auto">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1
        const completed = typeof step === 'number' && step > n
        const current = step === n
        return (
          <div key={n} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
                  completed
                    ? 'bg-green-600 text-white'
                    : current
                      ? 'bg-[#1A56A0] text-white'
                      : 'bg-slate-200 text-slate-500'
                }`}
              >
                {completed ? <Check className="size-4" /> : n}
              </div>
              <span className={`text-[10px] font-medium ${current ? 'text-[#1A56A0]' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {n < 3 && (
              <div
                className={`flex-1 h-0.5 mx-2 mt-[-16px] ${
                  completed ? 'bg-green-600' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )

  if (step === 'success')
    return (
      <div className="min-h-screen canvas-surface flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <Card className="max-w-lg w-full text-center">
            <CardContent className="p-10">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="size-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-semibold text-slate-800 mb-3">Thank You!</h1>
              <p className="text-muted-foreground mb-5">
                Your submission has been received. Our team will review your information and may follow
                up if needed.
              </p>
              <div className="inline-block">
                <p className="text-xs text-muted-foreground mb-1.5">Reference Number</p>
                <Badge variant="outline" className="text-xl px-4 py-1.5 bg-blue-50 text-[#1A56A0] border-blue-200 font-mono tabular-nums">
                  #{submissionId}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-6">You may close this page.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )

  return (
    <motion.div
      className="min-h-screen canvas-surface"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
    >
      <div className="text-white text-center py-8 px-6" style={{ background: portalHeaderBg }}>
        <img
          src="/seal.png"
          alt="City of Mount Vernon"
          className="h-16 w-16 object-contain mx-auto mb-3"
        />
        <h1 className="text-xl font-semibold mb-1">City of Mount Vernon</h1>
        <p className="text-blue-100 text-sm">Service Line Information Submission</p>
      </div>

      <PageReveal>
        <RevealItem>
          <Stepper />
        </RevealItem>

        <RevealItem className="max-w-[560px] mx-auto px-5 pb-8">
          <Card className="overflow-visible">
            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={stepTransition}
                  >
                    <h2 className="text-lg font-semibold text-slate-700 mb-1">Find Your Property</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Use this form to provide information about the water service line at your property.
                    </p>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
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
                        <div
                          ref={dropdownRef}
                          className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden max-h-[320px] overflow-y-auto"
                        >
                          {searchResults.map((prop) => (
                            <button
                              key={prop.account_number}
                              onClick={() => handleSelectProperty(prop)}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0 transition-colors"
                            >
                              {prop.address}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {selectedProperty && !confirmed && (
                        <motion.div
                          key="confirmation"
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className="mt-5 p-5 border-2 border-blue-200 rounded-xl bg-blue-50/30"
                        >
                          <p className="text-sm text-muted-foreground mb-2">Is this your property?</p>
                          <p className="text-lg font-semibold text-slate-800 mb-4">{selectedProperty.address}</p>
                          <div className="flex gap-3">
                            <Button
                              onClick={() => { setConfirmed(true); setStep(2) }}
                              className="flex-1 bg-[#1A56A0] hover:bg-[#143F75] text-white"
                            >
                              Yes, that&apos;s it
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => { setSelectedProperty(null); setSearchQuery(''); setConfirmed(false) }}
                              className="flex-1"
                            >
                              No, search again
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!selectedProperty && searchQuery.length < 3 && (
                      <div className="mt-10 text-center text-muted-foreground">
                        <Search className="size-10 mx-auto mb-3 stroke-1" />
                        <p>Type your street address to get started</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={stepTransition}
                  >
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
                        <Select
                          value={yearConstructed}
                          onValueChange={setYearConstructed}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select a range..." />
                          </SelectTrigger>
                          <SelectContent>
                            {YEAR_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                            <motion.div key={opt.label} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }}>
                              <Button
                                type="button"
                                variant={priorLineWork === opt.value ? 'default' : 'outline'}
                                onClick={() => setPriorLineWork(opt.value)}
                                className={`w-full ${
                                  priorLineWork === opt.value
                                    ? 'bg-[#1A56A0] hover:bg-[#143F75]'
                                    : ''
                                }`}
                              >
                                {opt.label}
                              </Button>
                            </motion.div>
                          ))}
                        </div>

                        <AnimatePresence>
                          {priorLineWork === true && (
                            <motion.div
                              key="prior-notes"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 space-y-2">
                                <Label>Please describe the work done</Label>
                                <Textarea
                                  value={priorLineNotes}
                                  onChange={(e) => setPriorLineNotes(e.target.value)}
                                  placeholder="e.g. pipe replaced from meter to street in 2015..."
                                  rows={3}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {step2Error && (
                        <Alert variant="destructive">
                          <AlertCircle className="size-4" />
                          <AlertDescription>{step2Error}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        onClick={handleStep2Next}
                        className="w-full h-12 text-base font-semibold bg-[#1A56A0] hover:bg-[#143F75] text-white"
                      >
                        Next &rarr;
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={stepTransition}
                  >
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
                      className="w-full h-14 text-lg font-semibold bg-[#1A56A0] hover:bg-[#143F75] text-white"
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
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </RevealItem>
      </PageReveal>
    </motion.div>
  )
}
