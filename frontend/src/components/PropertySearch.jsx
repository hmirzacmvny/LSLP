import { useState, useRef, useEffect } from 'react'
import { getProperties } from '../lib/api'
import { getMaterial } from '../lib/design-system'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

export default function PropertySearch({
  value,
  onSelect,
  disabled = false,
  placeholder = 'Search address or account number...',
  autoFocus = false,
  inputClassName = '',
}) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const debounceRef = useRef(null)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (value && value !== query) setQuery(value)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (e) => {
    const v = e.target.value
    setQuery(v)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (v.length < 3) {
      setResults([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await getProperties({ search: v.trim(), limit: 10 })
        setResults(res.data)
        setShowDropdown(res.data.length > 0)
      } catch {
        setResults([])
        setShowDropdown(false)
      } finally {
        setLoading(false)
      }
    }, 250)
  }

  const handleSelect = (prop) => {
    setQuery(prop.address)
    setShowDropdown(false)
    setResults([])
    onSelect(prop)
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        value={query}
        onChange={handleChange}
        onFocus={() => { if (results.length > 0) setShowDropdown(true) }}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`pl-10 ${inputClassName}`}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          Searching...
        </div>
      )}

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden max-h-[320px] overflow-y-auto"
        >
          {results.map((prop) => (
            <button
              key={prop.account_number}
              onClick={() => handleSelect(prop)}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">{prop.address}</div>
                  <div className="text-xs text-muted-foreground font-mono tabular-nums">{prop.account_number}</div>
                </div>
                <span className={`text-xs font-medium ${getMaterial(prop.hs_service).text}`}>
                  {prop.hs_service || ''}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
