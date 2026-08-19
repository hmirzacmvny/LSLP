import { useState, useRef, useEffect, useCallback } from 'react'
import { getProperties } from '../../lib/api'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getMaterial, getStatus, getPriority, priorityConfig, typeScale } from '../../lib/design-system'
import { PageReveal, RevealItem } from '../../components/PageReveal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Search, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'

const FILTER_LABELS = {
  verified_status: (v) => `Status: ${v}`,
  stalled: () => 'Stalled outreach (4+ attempts, unresolved)',
  untouched: () => 'Never touched (no visits or outreach)',
  priority: (v) => `Priority: P${v} – ${priorityConfig[v]?.full || ''}`,
}

export default function PropertiesList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()

  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  const doSearch = useCallback(async (query) => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setSearched(true)
    setPage(1)
    setShowSuggestions(false)
    setSuggestions([])

    try {
      const res = await getProperties({ search: query.trim() })
      setResults(res.data)
    } catch {
      setError('Failed to load properties. Is the API running?')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (e) => {
    const q = e.target.value
    setSearch(q)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (q.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      setHighlightIdx(-1)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await getProperties({ search: q.trim(), limit: 8 })
        setSuggestions(res.data)
        setShowSuggestions(res.data.length > 0)
        setHighlightIdx(-1)
      } catch {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 250)
  }

  const handleSelectSuggestion = (prop) => {
    setSearch(prop.address)
    setShowSuggestions(false)
    setSuggestions([])
    navigate(`/properties/${prop.account_number}`)
  }

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIdx((prev) => Math.min(prev + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIdx((prev) => Math.max(prev - 1, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (highlightIdx >= 0) {
          handleSelectSuggestion(suggestions[highlightIdx])
        } else {
          doSearch(search)
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
        setHighlightIdx(-1)
      }
    } else if (e.key === 'Enter') {
      doSearch(search)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const params = {}
    const vs = searchParams.get('verified_status')
    const st = searchParams.get('stalled')
    const ut = searchParams.get('untouched')
    const pr = searchParams.get('priority')
    if (vs) params.verified_status = vs
    if (st) params.stalled = st
    if (ut) params.untouched = ut
    if (pr) params.priority = pr
    if (Object.keys(params).length > 0) {
      setLoading(true)
      setSearched(true)
      setPage(1)
      getProperties({ ...params, limit: 10000 })
        .then((res) => setResults(res.data))
        .catch(() => setError('Failed to load properties.'))
        .finally(() => setLoading(false))
    }
  }, [searchParams])

  const activeFilters = []
  for (const key of ['verified_status', 'stalled', 'untouched', 'priority']) {
    const val = searchParams.get(key)
    if (val) activeFilters.push({ key, value: val })
  }

  const removeFilter = (key) => {
    const next = new URLSearchParams(searchParams)
    next.delete(key)
    setSearchParams(next)
    if ([...next.keys()].length === 0) {
      setResults([])
      setSearched(false)
    }
  }

  const totalResults = results.length
  const totalPages = Math.max(1, Math.ceil(totalResults / perPage))
  const startIdx = (page - 1) * perPage
  const endIdx = Math.min(startIdx + perPage, totalResults)
  const pagedResults = results.slice(startIdx, endIdx)

  const pageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    if (start > 1) {
      pages.push(1)
      if (start > 2) pages.push('...')
    }
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <PageReveal className="p-6 max-w-6xl mx-auto">
      <RevealItem className="mb-6">
        <h1 className={typeScale.pageTitle}>Properties</h1>
        <p className="text-sm text-muted-foreground mt-1">Search the service area inventory</p>
      </RevealItem>

      <RevealItem className="mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={search}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
              placeholder="Enter address or account number..."
              className="pl-10 h-11"
            />

            {showSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden"
              >
                {suggestions.map((prop, idx) => (
                  <button
                    key={prop.account_number}
                    onClick={() => handleSelectSuggestion(prop)}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between border-b last:border-0 transition-colors ${
                      idx === highlightIdx ? 'bg-slate-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-800">{prop.address}</div>
                      <div className="text-xs text-muted-foreground tabular-nums font-mono">{prop.account_number}</div>
                    </div>
                    <span className={`text-xs font-medium ${getMaterial(prop.hs_service).text}`}>
                      {prop.hs_service || ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Select
            value={searchParams.get('priority') || '__all__'}
            onValueChange={(v) => {
              const next = new URLSearchParams(searchParams)
              if (v === '__all__') next.delete('priority')
              else next.set('priority', v)
              setSearchParams(next)
            }}
          >
            <SelectTrigger className="h-11 w-[140px] text-sm shrink-0">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All priorities</SelectItem>
              {[1, 2, 3, 4, 5, 6].map((t) => (
                <SelectItem key={t} value={String(t)}>P{t}: {priorityConfig[t]?.full.split(' – ')[0]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => doSearch(search)}
            disabled={loading}
            className="h-11 px-6 bg-[#1A56A0] hover:bg-[#143F75] text-white"
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </RevealItem>

      {activeFilters.length > 0 && (
        <RevealItem className="mb-4">
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-sm bg-[#1A56A0]/10 text-[#1A56A0] rounded-full"
              >
                {FILTER_LABELS[f.key] ? FILTER_LABELS[f.key](f.value) : `${f.key}: ${f.value}`}
                <button
                  onClick={() => removeFilter(f.key)}
                  className="hover:bg-[#1A56A0]/20 rounded-full p-0.5"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {activeFilters.length > 1 && (
              <button
                onClick={() => { setSearchParams({}); setResults([]); setSearched(false) }}
                className="text-xs text-muted-foreground hover:underline px-2 py-1"
              >
                Clear all
              </button>
            )}
          </div>
        </RevealItem>
      )}

      <RevealItem>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {searched && !loading && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground tabular-nums">
                Showing {totalResults === 0 ? 0 : startIdx + 1}&ndash;{endIdx} of {totalResults} {totalResults === 1 ? 'property' : 'properties'}
              </p>
              {totalResults > 25 && (
                <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1) }}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {results.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                No properties found for &ldquo;{search}&rdquo;
              </div>
            ) : (
              <>
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80">
                        <TableHead className="text-xs font-medium">Account #</TableHead>
                        <TableHead className="text-xs font-medium">Address</TableHead>
                        <TableHead className="text-xs font-medium">House Side</TableHead>
                        <TableHead className="text-xs font-medium">Street Side</TableHead>
                        <TableHead className="text-xs font-medium">Status</TableHead>
                        <TableHead className="text-xs font-medium">Priority</TableHead>
                        <TableHead className="text-xs font-medium">Account Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedResults.map((prop) => (
                        <TableRow
                          key={prop.account_number}
                          onClick={() => navigate(`/properties/${prop.account_number}`)}
                          className="cursor-pointer hover:bg-slate-50/60"
                        >
                          <TableCell className="font-mono tabular-nums font-semibold text-[#1A56A0]">
                            {prop.account_number}
                          </TableCell>
                          <TableCell className="text-slate-800 font-medium">{prop.address}</TableCell>
                          <TableCell className={getMaterial(prop.hs_service).text}>
                            {prop.hs_service || '—'}
                          </TableCell>
                          <TableCell className={getMaterial(prop.ss_service).text}>
                            {prop.ss_service || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${getStatus(prop.verified_status).badgeCls}`}>
                              {prop.verified_status || 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {prop.priority && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${getPriority(prop.priority).badgeCls}`}
                                title={getPriority(prop.priority).full}
                              >
                                {getPriority(prop.priority).label}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{prop.ub_account_type || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      className="h-8 px-2"
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </Button>
                    {pageNumbers().map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">&hellip;</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPage(p)}
                          className={`h-8 w-8 p-0 text-xs ${p === page ? 'bg-[#1A56A0] hover:bg-[#143F75]' : ''}`}
                        >
                          {p}
                        </Button>
                      )
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                      className="h-8 px-2"
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!searched && !loading && (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="size-12 mx-auto mb-4 stroke-1" />
            <p className="text-lg">Search for a property to get started</p>
          </div>
        )}
      </RevealItem>
    </PageReveal>
  )
}
