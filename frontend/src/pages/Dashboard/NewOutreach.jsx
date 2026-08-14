import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { createOutreach } from '../../lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'

const ACCT_RE = /^\d{6}-\d{3}$/

function validate(form) {
  const errs = {}
  const acct = form.account_number.trim()
  if (!acct || !ACCT_RE.test(acct)) {
    errs.account_number = 'Enter a valid account number (e.g. 003518-000)'
  }
  if (!form.method) {
    errs.method = 'Please select a contact method'
  }
  if (!form.outreach_date) {
    errs.outreach_date = 'Date is required'
  } else if (form.outreach_date > new Date().toISOString().split('T')[0]) {
    errs.outreach_date = 'Date cannot be in the future'
  }
  if (form.initials && !/^[a-zA-Z]{1,5}$/.test(form.initials)) {
    errs.initials = 'Initials must be letters only, max 5 characters'
  }
  if (form.notes.length > 500) {
    errs.notes = 'Notes must be 500 characters or fewer'
  }
  if (form.is_customer_initiated && form.customer_initiated_notes.length > 500) {
    errs.customer_initiated_notes = 'Notes must be 500 characters or fewer'
  }
  return errs
}

export default function NewOutreach() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState(false)

  const prefilled = location.state?.account_number || ''

  const [form, setForm] = useState({
    account_number: prefilled,
    outreach_date: new Date().toISOString().split('T')[0],
    method: '',
    outcome: '',
    initials: '',
    notes: '',
    is_customer_initiated: false,
    customer_initiated_notes: '',
  })

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target
    const val = type === 'checkbox' ? checked : value
    setForm({ ...form, [name]: val })
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    }
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
    try {
      const res = await createOutreach(form)
      setSuccess(true)
      setTimeout(() => {
        navigate(`/properties/${res.data.account_number}`)
      }, 2000)
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
            <h2 className="text-2xl font-bold text-green-700 mb-2">Outreach Logged</h2>
            <p className="text-muted-foreground">Redirecting to property page...</p>
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
        <h1 className="text-2xl font-bold text-slate-800">Log Outreach Attempt</h1>
        <p className="text-muted-foreground mt-1">Record a contact attempt for a property</p>
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

            {/* Date */}
            <div className="space-y-2">
              <Label>
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                name="outreach_date"
                value={form.outreach_date}
                onChange={handleChange}
                aria-invalid={!!fieldErrors.outreach_date}
              />
              {fieldErrors.outreach_date && (
                <p className="text-xs text-red-600">{fieldErrors.outreach_date}</p>
              )}
            </div>

            {/* Method */}
            <div className="space-y-2">
              <Label>
                Contact Method <span className="text-red-500">*</span>
              </Label>
              <select
                name="method"
                value={form.method}
                onChange={handleChange}
                className={`flex h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 py-1 text-sm transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 ${
                  fieldErrors.method ? 'border-destructive ring-3 ring-destructive/20' : ''
                }`}
              >
                <option value="">-- Select --</option>
                <option value="In-person">In-person</option>
                <option value="Mail">Mail</option>
                <option value="Phone">Phone</option>
                <option value="Email">Email</option>
                <option value="Other">Other</option>
              </select>
              {fieldErrors.method && (
                <p className="text-xs text-red-600">{fieldErrors.method}</p>
              )}
            </div>

            {/* Outcome */}
            <div className="space-y-2">
              <Label>Outcome</Label>
              <select
                name="outcome"
                value={form.outcome}
                onChange={handleChange}
                className="flex h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 py-1 text-sm transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <option value="">-- Select --</option>
                <option value="Completed - Private & Public Verified">Completed - Verified</option>
                <option value="No Answer">No Answer</option>
                <option value="Mailing Received">Mailing Received</option>
                <option value="Scheduled">Scheduled Follow-up</option>
                <option value="Refused">Refused</option>
                <option value="Left Voicemail">Left Voicemail</option>
                <option value="Other">Other</option>
              </select>
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

            {/* Customer Initiated */}
            <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
              <input
                type="checkbox"
                name="is_customer_initiated"
                id="is_customer_initiated"
                checked={form.is_customer_initiated}
                onChange={handleChange}
                className="w-4 h-4 accent-[#1A56A0]"
              />
              <label htmlFor="is_customer_initiated" className="text-sm font-medium">
                This was a customer-initiated contact
              </label>
            </div>

            {/* Customer Initiated Notes */}
            {form.is_customer_initiated && (
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-2">
                  <Label>Customer Contact Notes</Label>
                  <Textarea
                    name="customer_initiated_notes"
                    value={form.customer_initiated_notes}
                    onChange={handleChange}
                    placeholder="Details about the customer contact..."
                    rows={3}
                    aria-invalid={!!fieldErrors.customer_initiated_notes}
                  />
                  <div className="flex justify-between items-center">
                    {fieldErrors.customer_initiated_notes ? (
                      <p className="text-xs text-red-600">{fieldErrors.customer_initiated_notes}</p>
                    ) : (
                      <span />
                    )}
                    <span
                      className={`text-xs ${
                        form.customer_initiated_notes.length > 500
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {form.customer_initiated_notes.length} / 500
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* API error */}
            {apiError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
                style={{ backgroundColor: '#1A56A0' }}
              >
                {loading ? 'Saving...' : 'Log Outreach'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
