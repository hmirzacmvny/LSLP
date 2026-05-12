import { useState } from 'react'
import { getProperties } from '../../lib/api'
import { useNavigate } from 'react-router-dom'

export default function PropertiesList() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()

  const handleSearch = async () => {
    if (!search.trim()) return
    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const res = await getProperties({ search: search.trim() })
      setResults(res.data)
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      setError('Failed to load properties. Is the API running?')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-600'
    if (status.toLowerCase().includes('lead')) return 'bg-red-100 text-red-700'
    if (status.toLowerCase().includes('copper')) return 'bg-green-100 text-green-700'
    if (status.toLowerCase().includes('galvanized')) return 'bg-orange-100 text-orange-700'
    return 'bg-blue-100 text-blue-700'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900">Properties</h1>
        <p className="text-gray-500 mt-1">
          Search by address or account number
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter address or account number..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Results */}
      {searched && !loading && (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {results.length} {results.length === 1 ? 'property' : 'properties'} found
          </p>

          {results.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              No properties found for "{search}"
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-blue-800 text-white">
                  <tr>
                    <th className="text-left px-4 py-3">Account #</th>
                    <th className="text-left px-4 py-3">Address</th>
                    <th className="text-left px-4 py-3">House Side</th>
                    <th className="text-left px-4 py-3">Street Side</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Account Type</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((prop, i) => (
                    <tr
                      key={prop.account_number}
                      onClick={() => navigate(`/properties/${prop.account_number}`)}
                      className={`cursor-pointer hover:bg-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-4 py-3 font-mono text-blue-700 font-semibold">
                        {prop.account_number}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{prop.address}</td>
                      <td className="px-4 py-3 text-gray-600">{prop.hs_service || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{prop.ss_service || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(prop.verified_status)}`}>
                          {prop.verified_status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{prop.ub_account_type || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Empty state before search */}
      {!searched && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-lg">Search for a property to get started</p>
        </div>
      )}
    </div>
  )
}