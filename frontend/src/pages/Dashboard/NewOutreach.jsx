import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { createOutreach } from '../../lib/api'

export default function NewOutreach() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // If coming from a property page, pre-fill account number
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
    const val = e.target.type === 'checkbox'
      ? e.target.checked
      : e.target.value
    setForm({ ...form, [e.target.name]: val })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!form.account_number.trim()) {
      setError('Account number is required')
      setLoading(false)
      return
    }
    if (!form.method) {
      setError('Contact method is required')
      setLoading(false)
      return
    }

    try {
      const res = await createOutreach(form)
      setSuccess(true)
      setTimeout(() => {
        navigate(`/properties/${res.data.account_number}`)
      }, 2000)
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Property not found. Check the account number and try again.')
      } else {
        setError('Something went wrong. Is the API running?')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white rounded-xl shadow p-10 text-center max-w-md">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-700 mb-2">Outreach Logged</h2>
        <p className="text-gray-500">Redirecting to property page...</p>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2 text-sm font-medium"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-blue-900">Log Outreach Attempt</h1>
        <p className="text-gray-500 mt-1">Record a contact attempt for a property</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-5">

        {/* Account Number */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Account Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="account_number"
            value={form.account_number}
            onChange={handleChange}
            placeholder="e.g. 003518-000"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="outreach_date"
            value={form.outreach_date}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Method */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Contact Method <span className="text-red-500">*</span>
          </label>
          <select
            name="method"
            value={form.method}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Select —</option>
            <option value="In-person">In-person</option>
            <option value="Mail">Mail</option>
            <option value="Phone">Phone</option>
            <option value="Email">Email</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Outcome */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Outcome
          </label>
          <select
            name="outcome"
            value={form.outcome}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Select —</option>
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
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Staff Initials
          </label>
          <input
            type="text"
            name="initials"
            value={form.initials}
            onChange={handleChange}
            placeholder="e.g. MN"
            maxLength={5}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Any additional notes..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Customer Initiated */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            name="is_customer_initiated"
            id="is_customer_initiated"
            checked={form.is_customer_initiated}
            onChange={handleChange}
            className="w-4 h-4 accent-blue-700"
          />
          <label htmlFor="is_customer_initiated" className="text-sm font-medium text-gray-700">
            This was a customer-initiated contact
          </label>
        </div>

        {/* Customer Initiated Notes — only show if checked */}
        {form.is_customer_initiated && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Customer Contact Notes
            </label>
            <textarea
              name="customer_initiated_notes"
              value={form.customer_initiated_notes}
              onChange={handleChange}
              placeholder="Details about the customer contact..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Log Outreach'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}