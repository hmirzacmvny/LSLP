import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createVisit } from '../../lib/api'
import { db } from '../../lib/db'
import { getPendingCount } from '../../lib/sync'

export default function NewVisit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
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
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handlePhotoChange = (e) => {
    setPhotos(Array.from(e.target.files))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate required fields
    if (!form.account_number.trim()) {
      setError('Account number is required')
      setLoading(false)
      return
    }

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
        setTimeout(() => navigate(-1), 3000)
      } catch (err) {
        setError('Could not save offline. Please try again.')
      } finally {
        setLoading(false)
      }
      return
    }

    // --- Online path (existing behavior) ---
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, val]) => {
        if (val) formData.append(key, val)
      })
      photos.forEach(photo => {
        formData.append('photos', photo)
      })

      const res = await createVisit(formData)
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
        <h2 className="text-2xl font-bold text-green-700 mb-2">Visit Logged</h2>
        <p className="text-gray-500">Redirecting to property page...</p>
      </div>
    </div>
  )

  if (offlineSaved) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white rounded-xl shadow p-10 text-center max-w-md">
        <div className="text-5xl mb-4">📴</div>
        <h2 className="text-2xl font-bold text-orange-600 mb-2">Saved Locally</h2>
        <p className="text-gray-600">You are offline. This visit has been saved to your device and will sync automatically when you are back online.</p>
        <p className="text-gray-400 text-sm mt-3">Returning...</p>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2 text-sm font-medium"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-blue-900">Log New Visit</h1>
        <p className="text-gray-500 mt-1">Record a field inspection visit</p>
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

        {/* Access Granted */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Access Granted
          </label>
          <select
            name="access_granted"
            value={form.access_granted}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Select —</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="No Answer">No Answer</option>
            <option value="No (Refused)">No (Refused)</option>
            <option value="Scheduled">Scheduled</option>
          </select>
        </div>

        {/* Verification Outcome */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Verification Outcome
          </label>
          <select
            name="verification_outcome"
            value={form.verification_outcome}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Select —</option>
            <option value="Lead">Lead</option>
            <option value="Copper">Copper</option>
            <option value="Galvanized">Galvanized</option>
            <option value="Brass">Brass</option>
            <option value="Unknown">Unknown</option>
            <option value="Completed - Private & Public Verified">Completed - Private & Public Verified</option>
            <option value="Inaccessible">Inaccessible</option>
          </select>
        </div>

        {/* Property Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Property Type
          </label>
          <select
            name="property_type"
            value={form.property_type}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Select —</option>
            <option value="One Family">One Family</option>
            <option value="Two Family">Two Family</option>
            <option value="Three Family">Three Family</option>
            <option value="Commercial or Industrial">Commercial or Industrial</option>
            <option value="Multi Family">Multi Family</option>
          </select>
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

        {/* Photos */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Photos
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-600"
          />
          {photos.length > 0 && (
            <p className="text-sm text-green-600 mt-1">
              {photos.length} photo{photos.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Log Visit'}
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