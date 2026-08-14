import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createVisit } from '../../lib/api'
import { db } from '../../lib/db'
import { getPendingCount } from '../../lib/sync'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Camera, AlertCircle, CheckCircle, WifiOff } from 'lucide-react'

const ACCT_RE = /^\d{6}-\d{3}$/

const ACCESS_OPTIONS = ['Yes', 'No', 'No Answer', 'Refused', 'Scheduled']
const OUTCOME_OPTIONS = [
  { value: 'Lead', color: 'bg-red-600 text-white' },
  { value: 'Copper', color: 'bg-green-600 text-white' },
  { value: 'Galvanized', color: 'bg-orange-500 text-white' },
  { value: 'Unknown', color: 'bg-slate-600 text-white' },
  { value: 'Inaccessible', color: 'bg-slate-600 text-white' },
]

function validate(form) {
  const errs = {}
  const acct = form.account_number.trim()
  if (!acct || !ACCT_RE.test(acct)) {
    errs.account_number = 'Enter a valid account number (e.g. 003518-000)'
  }
  if (!form.access_granted) {
    errs.access_granted = 'Please select an access status'
  }
  if (form.initials && !/^[a-zA-Z]{1,5}$/.test(form.initials)) {
    errs.initials = 'Initials must be letters only, max 5 characters'
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

  const [form, setForm] = useState({
    account_number: '',
    initials: '',
    access_granted: '',
    verification_outcome: '',
    property_type: '',
    notes: '',
  })

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

    // --- Offline path ---
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

    // --- Online path ---
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, val]) => {
        if (val) formData.append(key, val)
      })
      photos.forEach((photo) => formData.append('photos', photo))

      const res = await createVisit(formData)
      setSuccess(true)
      setTimeout(() => navigate(`/properties/${res.data.account_number}`), 2000)
    } catch (err) {
      if (err.response?.status === 404) {
        setApiError('Property not found. Check the account number and try again.')
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
        <Card className="max-w-md text-center">
          <CardContent className="p-10">
            <CheckCircle className="size-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Visit Logged</h2>
            <p className="text-muted-foreground">Redirecting to property page...</p>
          </CardContent>
        </Card>
      </div>
    )

  if (offlineSaved)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md text-center">
          <CardContent className="p-10">
            <WifiOff className="size-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-orange-600 mb-2">Saved Locally</h2>
            <p className="text-muted-foreground">
              You are offline. This visit has been saved to your device and will sync automatically
              when you are back online.
            </p>
            <p className="text-sm text-muted-foreground mt-3">Returning...</p>
          </CardContent>
        </Card>
      </div>
    )

  return (
    <div className="p-6 max-w-[640px] mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-slate-800">Log Field Visit</h1>
        <p className="text-muted-foreground mt-1">Record a field inspection visit</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account Number */}
            <div className="space-y-2">
              <Label>
                Account Number <span className="text-red-500">*</span>
              </Label>
              <Input
                name="account_number"
                value={form.account_number}
                onChange={handleChange}
                placeholder="e.g. 003518-000"
                aria-invalid={!!fieldErrors.account_number}
              />
              {fieldErrors.account_number && (
                <p className="text-xs text-red-600">{fieldErrors.account_number}</p>
              )}
            </div>

            {/* Initials */}
            <div className="space-y-2">
              <Label>Staff Initials</Label>
              <Input
                name="initials"
                value={form.initials}
                onChange={handleChange}
                placeholder="e.g. MN"
                maxLength={5}
                aria-invalid={!!fieldErrors.initials}
              />
              {fieldErrors.initials && (
                <p className="text-xs text-red-600">{fieldErrors.initials}</p>
              )}
            </div>

            {/* Access Granted — tap buttons */}
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
                      setForm({ ...form, access_granted: opt })
                      if (fieldErrors.access_granted)
                        setFieldErrors((prev) => ({ ...prev, access_granted: '' }))
                    }}
                    className={
                      form.access_granted === opt
                        ? 'bg-[#1A56A0] hover:bg-[#1A56A0]/90'
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

            {/* Verification Outcome — tap buttons */}
            <div className="space-y-2">
              <Label>Verification Outcome</Label>
              <div className="flex flex-wrap gap-2">
                {OUTCOME_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={form.verification_outcome === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setForm({ ...form, verification_outcome: opt.value })}
                    className={
                      form.verification_outcome === opt.value ? opt.color : ''
                    }
                  >
                    {opt.value}
                  </Button>
                ))}
              </div>
            </div>

            {/* Property Type */}
            <div className="space-y-2">
              <Label>Property Type</Label>
              <select
                name="property_type"
                value={form.property_type}
                onChange={handleChange}
                className="flex h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 py-1 text-sm transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <option value="">-- Select --</option>
                <option value="One Family">One Family</option>
                <option value="Two Family">Two Family</option>
                <option value="Three Family">Three Family</option>
                <option value="Commercial or Industrial">Commercial or Industrial</option>
                <option value="Multi Family">Multi Family</option>
              </select>
            </div>

            {/* Notes */}
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
                  className={`text-xs ${form.notes.length > 500 ? 'text-red-500' : 'text-muted-foreground'}`}
                >
                  {form.notes.length} / 500
                </span>
              </div>
            </div>

            {/* Photos */}
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

            {/* API error */}
            {apiError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              style={{ backgroundColor: '#1A56A0' }}
            >
              {loading ? 'Saving...' : 'Log Visit'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
