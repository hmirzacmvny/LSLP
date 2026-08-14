import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { createOutreach } from '../../lib/api'
import { typeScale } from '../../lib/design-system'
import { PageReveal, RevealItem } from '../../components/PageReveal'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel,
} from '@/components/ui/select'
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <Card className="max-w-md text-center">
            <CardContent className="p-10">
              <CheckCircle className="size-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-green-700 mb-2">Outreach Logged</h2>
              <p className="text-muted-foreground">Redirecting to property page...</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )

  return (
    <PageReveal className="p-6 max-w-[640px] mx-auto">
      <RevealItem className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <h1 className={typeScale.pageTitle}>Log Outreach Attempt</h1>
        <p className="text-sm text-muted-foreground mt-1">Record a contact attempt for a property</p>
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

              <div className="space-y-2">
                <Label>
                  Contact Method <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.method}
                  onValueChange={(v) => {
                    setForm({ ...form, method: v })
                    if (fieldErrors.method) setFieldErrors((prev) => ({ ...prev, method: '' }))
                  }}
                >
                  <SelectTrigger className={`h-9 ${fieldErrors.method ? 'border-destructive ring-2 ring-destructive/20' : ''}`}>
                    <SelectValue placeholder="Select method..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Contact Methods</SelectLabel>
                      <SelectItem value="In-person">In-person</SelectItem>
                      <SelectItem value="Mail">Mail</SelectItem>
                      <SelectItem value="Phone">Phone</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {fieldErrors.method && (
                  <p className="text-xs text-red-600">{fieldErrors.method}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Outcome</Label>
                <Select
                  value={form.outcome}
                  onValueChange={(v) => setForm({ ...form, outcome: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select outcome..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Outcomes</SelectLabel>
                      <SelectItem value="Completed - Private & Public Verified">Completed &mdash; Verified</SelectItem>
                      <SelectItem value="No Answer">No Answer</SelectItem>
                      <SelectItem value="Mailing Received">Mailing Received</SelectItem>
                      <SelectItem value="Scheduled">Scheduled Follow-up</SelectItem>
                      <SelectItem value="Refused">Refused</SelectItem>
                      <SelectItem value="Left Voicemail">Left Voicemail</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Staff Initials</Label>
                <Input
                  name="initials"
                  value={form.initials}
                  onChange={handleChange}
                  placeholder="e.g. MN"
                  maxLength={5}
                  className="uppercase"
                  aria-invalid={!!fieldErrors.initials}
                />
                {fieldErrors.initials && (
                  <p className="text-xs text-red-600">{fieldErrors.initials}</p>
                )}
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
                        className={`text-xs tabular-nums ${
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

              {apiError && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{apiError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#1A56A0] hover:bg-[#143F75] text-white"
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
      </RevealItem>
    </PageReveal>
  )
}
