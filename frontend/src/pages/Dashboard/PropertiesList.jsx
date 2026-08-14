import { useState } from 'react'
import { getProperties } from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { statusColors, materialColors } from '../../lib/design'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, AlertCircle } from 'lucide-react'

function getMaterialClass(material) {
  if (!material) return 'text-gray-400'
  const key = Object.keys(materialColors).find((k) =>
    material.toLowerCase().includes(k.toLowerCase())
  )
  return key ? materialColors[key] : 'text-slate-600'
}

function getStatusBadge(status) {
  if (!status) return statusColors['Unknown']
  const key = Object.keys(statusColors).find((k) =>
    status.toLowerCase().includes(k.toLowerCase())
  )
  return key ? statusColors[key] : statusColors['Unknown']
}

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Properties</h1>
        <p className="text-slate-500 mt-1">Search the service area inventory</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter address or account number..."
            className="pl-10 h-11"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={loading}
          style={{ backgroundColor: '#1A56A0' }}
          className="h-11 px-6"
        >
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {/* Results */}
      {searched && !loading && (
        <>
          <p className="text-sm text-slate-500 mb-4">
            {results.length} {results.length === 1 ? 'property' : 'properties'} found
          </p>

          {results.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              No properties found for "{search}"
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account #</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>House Side</TableHead>
                    <TableHead>Street Side</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Account Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((prop) => (
                    <TableRow
                      key={prop.account_number}
                      onClick={() => navigate(`/properties/${prop.account_number}`)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <TableCell className="font-mono font-semibold" style={{ color: '#1A56A0' }}>
                        {prop.account_number}
                      </TableCell>
                      <TableCell className="text-slate-800">{prop.address}</TableCell>
                      <TableCell className={getMaterialClass(prop.hs_service)}>
                        {prop.hs_service || '\u2014'}
                      </TableCell>
                      <TableCell className={getMaterialClass(prop.ss_service)}>
                        {prop.ss_service || '\u2014'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(prop.verified_status)}>
                          {prop.verified_status || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{prop.ub_account_type || '\u2014'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Empty state before search */}
      {!searched && !loading && (
        <div className="text-center py-16 text-slate-400">
          <Search className="size-12 mx-auto mb-4 stroke-1" />
          <p className="text-lg">Search for a property to get started</p>
        </div>
      )}
    </div>
  )
}
