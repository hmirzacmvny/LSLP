import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { createVisit, getFieldUsers } from '../../lib/api'
import { db } from '../../lib/db'
import { getPendingCount } from '../../lib/sync'
import { typeScale } from '../../lib/design-system'
import { isOutcomePermitted } from '../../lib/validation'
import { PageReveal, RevealItem } from '../../components/PageReveal'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { ArrowLeft, Camera, AlertCircle, CheckCircle, WifiOff, Loader2 } from 'lucide-react'

const ACCT_RE = /^\d{6}-\d{3}$/

const ACCESS_OPTIONS = ['Yes', 'No', 'No Answer', 'Refused', 'Scheduled']
const OUTCOME_OPTIONS = [
  { value: 'Lead', active: 'bg-red-600 hover:bg-red-700 text-white border-red-600' },
  { value: 'Copper', active: 'bg-green-600 hover:bg-green-700 text-white border-green-600' },
  { value: 'Galvanized', active: 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' },
  { value: 'Unknown', active: 'bg-slate-600 hover:bg-slate-700 text-white border-slate-600' },
  { value: 'Inaccessible', active: 'bg-slate-600 hover:bg-slate-700 text-white border-slate-600' },
]

function validate(form) {
  const errs = {}
  const acct = form.account_number.trim()
  if (!acct || !ACCT_RE.test(acct)) {
    errs.account_number = 'Enter a valid account number (e.g. 003518-000)'
  }
  if (!form.performed_by_uid) {
    errs.performed_by_uid = 'Select the crew member who performed this inspection'
  }
  if (!form.access_granted) {
    errs.access_granted = 'Please select an access status'
  }
  if (isOutcomePermitted(form.access_granted) && !form.verification_outcome) {
    errs.verification_outcome = 'Verification outcome is required when access was granted'
  }
  if (!isOutcomePermitted(form.access_granted) && form.verification_outcome) {
    errs.verification_outcome = 'Verification outcome is not permitted when access was not granted'
  }
  if (form.notes.length > 500) {
    errs.notes = 'Notes must be 500 characters or fewer'
  }
  return errs
}

export default function NewVisit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState(false)
  const [offlineSaved, setOfflineSaved] = useState(false)
  const [photos, setPhotos] = useState([])

  const [fieldUsers, setFieldUsers] = useState([])
  const [fieldUsersLoading, setFieldUsersLoading] = useState(true)

  const [form, setForm] = useState({
    account_number: '',
    performed_by_uid: '',
    access_granted: '',
    verification_outcome: '',
    property_type: '',
    notes: '',
  })

  useEffect(() => {
    getFieldUsers()
      .then((res) => setFieldUsers(res.data))
      .catch(() => setFieldUsers([]))
      .finally(() => setFieldUsersLoading(false))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handlePhotoChange = (e) => {
    setPhotos(Array.from(e.target.files))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError(null)

    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setLoading(true)

    if (!navigator.onLine) {
      try {
        await db.pendingVisits.add({
          formData: { ...form },
          photos: [...photos],
          savedAt: new Date().toISOString(),
          syncStatus: 'pending',
        })
        const count = await getPendingCount()
        window.dispatchEvent(new CustomEvent('lslp:sync-pending', { detail: { count } }))
        setOfflineSaved(true)
        setTimeout(() => navigate('/'), 2000)
      } catch {
        setApiError('Could not save offline. Please try again.')
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      const formData = new FormData()
      formData.append('account_number', form.account_number.trim())
      formData.append('performed_by_uid', form.performed_by_uid)
      if (form.access_granted) formData.append('access_granted', form.access_granted)
      if (form.verification_outcome) formData.append('verification_outcome', form.verification_outcome)
      if (form.property_type) formData.append('property_type', form.property_type)
      if (form.notes) formData.append('notes', form.notes)
      photos.forEach((photo) => formData.append('photos', photo))

      const res = await createVisit(formData)
      setSuccess(true)
      setTimeout(() => navigate(`/properties/${res.data.account_number}`), 2000)
    } catch (err) {
      if (err.response?.status === 404) {
        setApiError('Property not found. Check the account number and try again.')
      } else if (err.response?.status === 422) {
        setApiError(err.response.data?.detail || 'Validation error.')
      } else {
        setApiError('Something went wrong. Is the API running?')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <Card className="max-w-md text-center">
            <CardContent className="p-10">
              <CheckCircle className="size-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-green-700 mb-2">Visit Logged</h2>
              <p className="text-muted-foreground">Redirecting to property page...</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )

  if (offlineSaved)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <Card className="max-w-md text-center">
            <CardContent className="p-10">
              <WifiOff className="size-16 text-orange-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-orange-600 mb-2">Saved Locally</h2>
              <p className="text-muted-foreground">
                You are offline. This visit has been saved to your device and will sync automatically
                when you are back online.
              </p>
              <p className="text-sm text-muted-foreground mt-3">Returning...</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )

  const selectedPerformer = fieldUsers.find((u) => u.firebase_uid === form.performed_by_uid)

  return (
    <PageReveal className="p-6 max-w-[640px] mx-auto">
      <RevealItem className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <h1 className={typeScale.pageTitle}>Log Field Visit</h1>
        <p className="text-sm text-muted-foreground mt-1">Record a field inspection visit on behalf of a crew member</p>
      </RevealItem>

      <RevealItem>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>
                  Account Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="account_number"
                  value={form.account_number}
                  onChange={handleChange}
                  placeholder="e.g. 003518-000"
                  className="font-mono tabular-nums"
                  aria-invalid={!!fieldErrors.account_number}
                />
                {fieldErrors.account_number && (
                  <p className="text-xs text-red-600">{fieldErrors.account_number}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Performed By <span className="text-red-500">*</span>
                </Label>
                {fieldUsersLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="size-4 animate-spin" /> Loading crew members...
                  </div>
                ) : fieldUsers.length === 0 ? (
                  <p className="text-xs text-red-600">No inspection staff found. Check user setup.</p>
                ) : (
                  <Select
                    value={form.performed_by_uid}
                    onValueChange={(v) => {
                      setForm({ ...form, performed_by_uid: v })
                      if (fieldErrors.performed_by_uid)
                        setFieldErrors((prev) => ({ ...prev, performed_by_uid: '' }))
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select crew member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldUsers.map((u) => (
                        <SelectItem key={u.firebase_uid} value={u.firebase_uid}>
                          {u.name}{u.initials ? ` (${u.initials})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {fieldErrors.performed_by_uid && (
                  <p className="text-xs text-red-600">{fieldErrors.performed_by_uid}</p>
                )}
                {selectedPerformer && (
                  <p className="text-xs text-muted-foreground">
                    Initials: <span className="font-mono font-semibold text-[#1A56A0]">{selectedPerformer.initials || '—'}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Access Granted <span className="text-red-500">*</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {ACCESS_OPTIONS.map((opt) => (
                    <Button
                      key={opt}
                      type="button"
                      variant={form.access_granted === opt ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const update = { ...form, access_granted: opt }
                        if (opt !== 'Yes') update.verification_outcome = ''
                        setForm(update)
                        if (fieldErrors.access_granted)
                          setFieldErrors((prev) => ({ ...prev, access_granted: '', verification_outcome: '' }))
                      }}
                      className={
                        form.access_granted === opt
                          ? 'bg-[#1A56A0] hover:bg-[#143F75]'
                          : ''
                      }
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
                {fieldErrors.access_granted && (
                  <p className="text-xs text-red-600">{fieldErrors.access_granted}</p>
                )}
              </div>

              <div className={`space-y-2 ${!isOutcomePermitted(form.access_granted) ? 'opacity-40 pointer-events-none' : ''}`}>
                <Label>
                  Verification Outcome{' '}
                  {isOutcomePermitted(form.access_granted) && <span className="text-red-500">*</span>}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {OUTCOME_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={form.verification_outcome === opt.value ? 'default' : 'outline'}
                      size="sm"
                      disabled={!isOutcomePermitted(form.access_granted)}
                      onClick={() => {
                        setForm({ ...form, verification_outcome: opt.value })
                        if (fieldErrors.verification_outcome)
                          setFieldErrors((prev) => ({ ...prev, verification_outcome: '' }))
                      }}
                      className={
                        form.verification_outcome === opt.value ? opt.active : ''
                      }
                    >
                      {opt.value}
                    </Button>
                  ))}
                </div>
                {fieldErrors.verification_outcome && (
                  <p className="text-xs text-red-600">{fieldErrors.verification_outcome}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select
                  value={form.property_type}
                  onValueChange={(v) => setForm({ ...form, property_type: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="One Family">One Family</SelectItem>
                    <SelectItem value="Two Family">Two Family</SelectItem>
                    <SelectItem value="Three Family">Three Family</SelectItem>
                    <SelectItem value="Commercial or Industrial">Commercial or Industrial</SelectItem>
                    <SelectItem value="Multi Family">Multi Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes..."
                  rows={3}
                  aria-invalid={!!fieldErrors.notes}
                />
                <div className="flex justify-between items-center">
                  {fieldErrors.notes ? (
                    <p className="text-xs text-red-600">{fieldErrors.notes}</p>
                  ) : (
                    <span />
                  )}
                  <span
                    className={`text-xs tabular-nums ${form.notes.length > 500 ? 'text-red-500' : 'text-muted-foreground'}`}
                  >
                    {form.notes.length} / 500
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Photos</Label>
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted rounded-xl cursor-pointer hover:border-ring transition-colors">
                  <Camera className="size-6 text-muted-foreground mb-1" />
                  <span className="text-sm text-muted-foreground">Upload photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                {photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${idx + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                )}
              </div>

              {apiError && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{apiError}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1A56A0] hover:bg-[#143F75] text-white"
              >
                {loading ? 'Saving...' : 'Log Visit'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </RevealItem>
    </PageReveal>
  )
}
