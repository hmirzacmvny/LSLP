import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProperty, getVisits, getOutreach } from '../../lib/api'

export default function PropertyDetail() {
  const { accountNumber } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [visits, setVisits] = useState([])
  const [outreach, setOutreach] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('visits')

  useEffect(() => {
    const loadData = async () => {
      try {
        const [propRes, visitsRes, outreachRes] = await Promise.all([
          getProperty(accountNumber),
          getVisits({ account_number: accountNumber }),
          getOutreach({ account_number: accountNumber }),
        ])
        setProperty(propRes.data)
        setVisits(visitsRes.data)
        setOutreach(outreachRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [accountNumber])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-400 text-lg">Loading...</div>
    </div>
  )

  if (!property) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-red-500">Property not found</div>
    </div>
  )

  const getMaterialColor = (material) => {
    if (!material) return 'text-gray-400'
    if (material.toLowerCase().includes('lead')) return 'text-red-600 font-bold'
    if (material.toLowerCase().includes('copper')) return 'text-green-600 font-bold'
    if (material.toLowerCase().includes('galvanized')) return 'text-orange-600 font-bold'
    return 'text-gray-600'
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="text-blue-600 hover:text-blue-800 mb-6 flex items-center gap-2 text-sm font-medium"
      >
        ← Back to Search
      </button>

      {/* Property Header */}
      <div className="bg-blue-800 text-white rounded-xl p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{property.address}</h1>
            <p className="text-blue-200 mt-1">Account: {property.account_number}</p>
            <p className="text-blue-200">Zip: {property.zip} · {property.ub_account_type}</p>
          </div>
          <span className="bg-white text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
            {property.acct_status}
          </span>
        </div>
      </div>

      {/* Service Line Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">House Side (H.S.)</h3>
          <p className={`text-lg ${getMaterialColor(property.hs_service)}`}>
            {property.hs_service || '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Method: {property.hs_verification_method || '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Street Side (S.S.)</h3>
          <p className={`text-lg ${getMaterialColor(property.ss_service)}`}>
            {property.ss_service || '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Method: {property.ss_verification_method || '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">UB Private Side</h3>
          <p className={`text-lg ${getMaterialColor(property.ub_private_side)}`}>
            {property.ub_private_side || '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">UB Utility Side</h3>
          <p className={`text-lg ${getMaterialColor(property.ub_utility_side)}`}>
            {property.ub_utility_side || '—'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {['visits', 'outreach'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg font-semibold text-sm capitalize ${
              activeTab === tab
                ? 'bg-blue-700 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab === 'visits' ? `Visits (${visits.length})` : `Outreach (${outreach.length})`}
          </button>
        ))}
      </div>

      {/* Visits Tab */}
      {activeTab === 'visits' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {visits.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No visits recorded for this property
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 text-gray-600">Initials</th>
                  <th className="text-left px-4 py-3 text-gray-600">Access</th>
                  <th className="text-left px-4 py-3 text-gray-600">Outcome</th>
                  <th className="text-left px-4 py-3 text-gray-600">Property Type</th>
                  <th className="text-left px-4 py-3 text-gray-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v, i) => (
                  <tr key={v.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-700">
                      {v.visited_at ? new Date(v.visited_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{v.initials || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        v.access_granted === 'Yes'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {v.access_granted || '—'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${getMaterialColor(v.verification_outcome)}`}>
                      {v.verification_outcome || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{v.property_type || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{v.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Outreach Tab */}
      {activeTab === 'outreach' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {outreach.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No outreach recorded for this property
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600">Attempt</th>
                  <th className="text-left px-4 py-3 text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 text-gray-600">Method</th>
                  <th className="text-left px-4 py-3 text-gray-600">Outcome</th>
                  <th className="text-left px-4 py-3 text-gray-600">Initials</th>
                  <th className="text-left px-4 py-3 text-gray-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {outreach.map((o, i) => (
                  <tr key={o.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                        #{o.attempt_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {o.outreach_date ? new Date(o.outreach_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{o.method || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{o.outcome || '—'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{o.initials || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{o.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}