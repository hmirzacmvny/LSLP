import { useState, useEffect, useCallback } from 'react'
import { getAnalytics } from '../../lib/api'
import { colors, materialConfig, typeScale } from '../../lib/design-system'
import { PageReveal, RevealItem } from '../../components/PageReveal'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area,
} from 'recharts'
import {
  BarChart3, X, Download, Loader2, AlertCircle, Info,
} from 'lucide-react'

const MATERIAL_COLORS = {
  Lead: colors.lead,
  Copper: colors.copper,
  Galvanized: colors.galvanized,
  'Cast Iron': '#7C3AED',
  Iron: '#A855F7',
  Brass: '#CA8A04',
  Plastic: '#0891B2',
  Unknown: colors.unknown,
  Other: '#8B5CF6',
}

const OUTCOME_COLORS = {
  Completed: '#16A34A',
  'No Contact': '#EAB308',
  Mailing: '#3B82F6',
  'Follow-up': '#F97316',
  Other: '#6B7280',
}

function defaultDateRange() {
  const to = new Date()
  const from = new Date()
  from.setFullYear(from.getFullYear() - 1)
  return {
    date_from: from.toISOString().split('T')[0],
    date_to: to.toISOString().split('T')[0],
  }
}

function FilterBar({ filters, onChange, onClear }) {
  const activeChips = []
  if (filters.date_from || filters.date_to)
    activeChips.push({ key: 'date', label: `${filters.date_from || '...'} to ${filters.date_to || '...'}` })
  if (filters.material)
    activeChips.push({ key: 'material', label: `Material: ${filters.material}` })
  if (filters.verified_status)
    activeChips.push({ key: 'verified_status', label: `Status: ${filters.verified_status}` })
  if (filters.outreach_outcome)
    activeChips.push({ key: 'outreach_outcome', label: `Outreach: ${filters.outreach_outcome}` })

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => onChange({ ...filters, date_from: e.target.value || null })}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => onChange({ ...filters, date_to: e.target.value || null })}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Material</Label>
            <Select
              value={filters.material || '__all__'}
              onValueChange={(v) => onChange({ ...filters, material: v === '__all__' ? null : v })}
            >
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All materials</SelectItem>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Copper">Copper</SelectItem>
                <SelectItem value="Galvanized">Galvanized</SelectItem>
                <SelectItem value="Cast Iron">Cast Iron</SelectItem>
                <SelectItem value="Iron">Iron</SelectItem>
                <SelectItem value="Brass">Brass</SelectItem>
                <SelectItem value="Plastic">Plastic</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Outreach outcome</Label>
            <Select
              value={filters.outreach_outcome || '__all__'}
              onValueChange={(v) => onChange({ ...filters, outreach_outcome: v === '__all__' ? null : v })}
            >
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All outcomes</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="No Contact">No Contact</SelectItem>
                <SelectItem value="Mailing">Mailing</SelectItem>
                <SelectItem value="Follow-up">Follow-up</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map((chip) => (
              <Badge
                key={chip.key}
                variant="secondary"
                className="gap-1 pl-2 pr-1 cursor-pointer hover:bg-slate-200 transition-colors"
                onClick={() => {
                  if (chip.key === 'date') onChange({ ...filters, date_from: null, date_to: null })
                  else onChange({ ...filters, [chip.key]: null })
                }}
              >
                {chip.label}
                <X className="size-3" />
              </Badge>
            ))}
            <button
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
            >
              Clear all
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ChartSkeleton({ height = 'h-64' }) {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className={`w-full ${height}`} />
      </CardContent>
    </Card>
  )
}

function ChartError({ label }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="size-4 shrink-0" />
          Could not load {label}.
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyChart({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BarChart3 className="size-10 text-muted-foreground/30 mb-2" />
      <p className="text-sm text-muted-foreground">No data for {label} with current filters.</p>
    </div>
  )
}

function InventoryProgress({ data }) {
  if (!data) return null
  const { total, material_on_record, material_on_record_pct, field_verified, field_verified_pct } = data
  const gap = material_on_record - field_verified

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Material on Record</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold tabular-nums tracking-tight text-slate-800">
                {material_on_record_pct}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${material_on_record_pct}%`, background: colors.civic }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1.5">
              <span className="font-semibold tabular-nums text-slate-700">
                {material_on_record.toLocaleString()}
              </span>{' '}
              of {total.toLocaleString()} properties
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Both sides have a known material from any source
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Verified by Field Inspection</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold tabular-nums tracking-tight text-slate-800">
                {field_verified_pct}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${field_verified_pct}%`, background: '#16A34A' }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1.5">
              <span className="font-semibold tabular-nums text-slate-700">
                {field_verified.toLocaleString()}
              </span>{' '}
              of {total.toLocaleString()} properties
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Material confirmed through this system's field visits
            </p>
          </div>
        </div>
        {gap > 0 && (
          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-slate-700">{gap.toLocaleString()}</span>{' '}
            properties have material records but have not been field verified
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PairingsMatrix({ data }) {
  if (!data || !data.rows.length || !data.cols.length) return <EmptyChart label="material pairings" />

  const allCounts = data.matrix.flat()
  const maxCount = Math.max(...allCounts, 1)

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className={typeScale.sectionTitle}>Material Pairings</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          Cross-tabulation of public and private side materials
        </p>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Column header: Private side (house) */}
            <div className="flex">
              <div className="w-28 shrink-0" />
              <div className="flex-1 text-center text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                Private side (house) &rarr;
              </div>
            </div>
            <div className="flex">
              {/* Row label column */}
              <div className="w-28 shrink-0 flex flex-col justify-end">
                <div className="text-xs font-semibold text-muted-foreground mb-1 text-right pr-2 uppercase tracking-wide whitespace-nowrap">
                  Public side (street) &darr;
                </div>
              </div>
              {/* Column headers */}
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${data.cols.length}, minmax(64px, 1fr))` }}>
                {data.cols.map((col) => (
                  <div
                    key={col}
                    className="text-center text-xs font-semibold py-1.5 px-1"
                    style={{ color: MATERIAL_COLORS[col] || colors.unknown }}
                  >
                    {col}
                  </div>
                ))}
              </div>
            </div>
            {/* Rows */}
            {data.rows.map((row, ri) => (
              <div key={row} className="flex">
                <div
                  className="w-28 shrink-0 flex items-center justify-end pr-2 text-xs font-semibold"
                  style={{ color: MATERIAL_COLORS[row] || colors.unknown }}
                >
                  {row}
                </div>
                <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${data.cols.length}, minmax(64px, 1fr))` }}>
                  {data.cols.map((col, ci) => {
                    const count = data.matrix[ri][ci]
                    const intensity = count / maxCount
                    const isLeadLead = row === 'Lead' && col === 'Lead'
                    return (
                      <div
                        key={col}
                        className={`flex items-center justify-center h-12 rounded text-xs font-mono tabular-nums transition-colors ${
                          isLeadLead ? 'ring-2 ring-red-400 ring-offset-1' : ''
                        }`}
                        style={{
                          backgroundColor: count === 0
                            ? 'rgb(248 250 252)'
                            : `rgba(30, 64, 120, ${0.08 + intensity * 0.45})`,
                          color: intensity > 0.5 ? 'white' : 'rgb(51, 65, 85)',
                        }}
                        title={`${row} (street) × ${col} (house): ${count}`}
                      >
                        {count > 0 ? count.toLocaleString() : '—'}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded ring-2 ring-red-400 ring-offset-1 bg-red-50 shrink-0" />
          Lead/Lead = highest priority for replacement
        </p>
      </CardContent>
    </Card>
  )
}

function MaterialDistribution({ data }) {
  if (!data) return null
  const { house_side, street_side } = data
  if (!house_side.length && !street_side.length) return <EmptyChart label="material distribution" />

  const materials = [...new Set([...house_side.map((d) => d.material), ...street_side.map((d) => d.material)])]
  const ssLookup = Object.fromEntries(street_side.map((d) => [d.material, d.count]))
  const hsLookup = Object.fromEntries(house_side.map((d) => [d.material, d.count]))
  const chartData = materials.map((m) => ({
    material: m,
    street_side: ssLookup[m] || 0,
    house_side: hsLookup[m] || 0,
  }))

  const config = {
    street_side: { label: 'Street side (public)', color: colors.civic },
    house_side: { label: 'House side (private)', color: '#64748B' },
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className={typeScale.sectionTitle}>Material Distribution</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          Count by material, grouped by side
        </p>
        <ChartContainer config={config} className="h-64 w-full">
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="material" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="street_side" fill="var(--color-street_side)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="house_side" fill="var(--color-house_side)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function VerificationOverTime({ data }) {
  if (!data || !data.length) return <EmptyChart label="verification over time" />
  const hasData = data.some((d) => d.count > 0)
  if (!hasData) return <EmptyChart label="verification over time" />

  const config = { count: { label: 'Properties verified', color: colors.civic } }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className={typeScale.sectionTitle}>Verification Over Time</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          Properties verified per month (visits with material determination)
        </p>
        <ChartContainer config={config} className="h-56 w-full">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="count" fill="var(--color-count)" fillOpacity={0.15} stroke="var(--color-count)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function OutreachOutcomesOverTime({ data }) {
  if (!data || !data.series.length || !data.data.length) return <EmptyChart label="outreach outcomes" />
  const hasData = data.data.some((d) => data.series.some((s) => d[s] > 0))
  if (!hasData) return <EmptyChart label="outreach outcomes" />

  const toKey = (s) => s.replace(/[\s/-]+/g, '_')
  const chartData = data.data.map((d) => {
    const entry = { month: d.month }
    data.series.forEach((s) => { entry[toKey(s)] = d[s] || 0 })
    return entry
  })
  const config = Object.fromEntries(
    data.series.map((s) => [toKey(s), { label: s, color: OUTCOME_COLORS[s] || '#6B7280' }])
  )

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className={typeScale.sectionTitle}>Outreach Outcomes Over Time</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          Monthly outreach by outcome category
        </p>
        <ChartContainer config={config} className="h-64 w-full">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {data.series.map((s) => (
              <Area
                key={s}
                type="monotone"
                dataKey={toKey(s)}
                stackId="1"
                fill={`var(--color-${toKey(s)})`}
                stroke={`var(--color-${toKey(s)})`}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function OutreachReach({ data }) {
  if (!data || !data.length) return <EmptyChart label="outreach reach" />
  const hasData = data.some((d) => d.properties_contacted > 0)
  if (!hasData) return <EmptyChart label="outreach reach" />

  const config = {
    properties_contacted: { label: 'Distinct properties', color: colors.civic },
    total_attempts: { label: 'Total attempts', color: '#94A3B8' },
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className={typeScale.sectionTitle}>Outreach Reach</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          Distinct properties contacted per month (not total attempts)
        </p>
        <ChartContainer config={config} className="h-56 w-full">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="total_attempts" stroke="var(--color-total_attempts)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            <Line type="monotone" dataKey="properties_contacted" stroke="var(--color-properties_contacted)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function DeferredPlaceholder() {
  return (
    <Card className="border-dashed">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <Info className="size-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <h3 className={typeScale.sectionTitle}>Replacement Tracking</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Three replacement metrics (lines replaced by side, replacement progress over time)
              and a property priority filter are planned but cannot be built yet &mdash;
              neither replacement records nor priority designations exist in this system or
              outside it today.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              See <span className="font-mono">docs/ANALYTICS_GAPS.md</span> for the specification
              and recommended data model.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function exportCSV(data, filters) {
  if (!data) return
  const lines = []
  const ts = new Date().toISOString().split('T')[0]

  lines.push('LSLP Analytics Export')
  lines.push(`Generated: ${ts}`)
  const af = data.filters_applied || {}
  const activeFilters = Object.entries(af).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(', ')
  lines.push(`Filters: ${activeFilters || 'none'}`)
  lines.push('')

  lines.push('--- Inventory Progress ---')
  const ip = data.inventory_progress
  lines.push('Total,Material on Record,Material on Record %,Field Verified,Field Verified %')
  lines.push(`${ip.total},${ip.material_on_record},${ip.material_on_record_pct}%,${ip.field_verified},${ip.field_verified_pct}%`)
  lines.push('')

  lines.push('--- Material Distribution ---')
  lines.push('Material,Street Side (Public),House Side (Private)')
  const ssLookup = Object.fromEntries(data.material_distribution.street_side.map((d) => [d.material, d.count]))
  const hsLookup = Object.fromEntries(data.material_distribution.house_side.map((d) => [d.material, d.count]))
  const allMats = [...new Set([...Object.keys(ssLookup), ...Object.keys(hsLookup)])]
  allMats.forEach((m) => lines.push(`${m},${ssLookup[m] || 0},${hsLookup[m] || 0}`))
  lines.push('')

  lines.push('--- Material Pairings Matrix ---')
  const mp = data.material_pairings
  lines.push(`Street \\ House,${mp.cols.join(',')}`)
  mp.rows.forEach((row, ri) => lines.push(`${row},${mp.matrix[ri].join(',')}`))
  lines.push('')

  lines.push('--- Verification Over Time ---')
  lines.push('Month,Properties Verified')
  data.verification_over_time.forEach((d) => lines.push(`${d.month},${d.count}`))
  lines.push('')

  lines.push('--- Outreach Outcomes Over Time ---')
  const oo = data.outreach_outcomes_over_time
  if (oo.series.length) {
    lines.push(`Month,${oo.series.join(',')}`)
    oo.data.forEach((d) => lines.push(`${d.month},${oo.series.map((s) => d[s] || 0).join(',')}`))
  }
  lines.push('')

  lines.push('--- Outreach Reach ---')
  lines.push('Month,Distinct Properties Contacted,Total Attempts')
  data.outreach_reach.forEach((d) => lines.push(`${d.month},${d.properties_contacted},${d.total_attempts}`))

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lslp-analytics-${ts}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filters, setFilters] = useState(defaultDateRange)

  const fetchData = useCallback(async (f) => {
    setLoading(true)
    setError(false)
    try {
      const params = {}
      if (f.date_from) params.date_from = f.date_from
      if (f.date_to) params.date_to = f.date_to
      if (f.material) params.material = f.material
      if (f.verified_status) params.verified_status = f.verified_status
      if (f.outreach_outcome) params.outreach_outcome = f.outreach_outcome
      const res = await getAnalytics(params)
      setData(res.data)
    } catch {
      setError(true)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(filters)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    fetchData(newFilters)
  }

  const clearFilters = () => {
    const empty = { date_from: null, date_to: null, material: null, verified_status: null, outreach_outcome: null }
    setFilters(empty)
    fetchData(empty)
  }

  return (
    <PageReveal className="p-6 max-w-6xl mx-auto">
      <RevealItem className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={typeScale.pageTitle}>Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Compliance reporting &mdash; program progress over time</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCSV(data, filters)}
            disabled={!data || loading}
            className="gap-1.5"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </RevealItem>

      <RevealItem className="mb-6">
        <FilterBar filters={filters} onChange={handleFilterChange} onClear={clearFilters} />
      </RevealItem>

      {loading ? (
        <div className="space-y-4">
          <ChartSkeleton height="h-32" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      ) : error ? (
        <RevealItem>
          <Card>
            <CardContent className="p-10 text-center">
              <AlertCircle className="size-12 mx-auto mb-3 text-red-400 stroke-1" />
              <p className="text-sm font-medium text-slate-600">Could not load analytics data.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchData(filters)}>
                Try again
              </Button>
            </CardContent>
          </Card>
        </RevealItem>
      ) : data ? (
        <div className="space-y-4">
          <RevealItem>
            <InventoryProgress data={data.inventory_progress} />
          </RevealItem>

          <RevealItem>
            <PairingsMatrix data={data.material_pairings} />
          </RevealItem>

          <RevealItem>
            <MaterialDistribution data={data.material_distribution} />
          </RevealItem>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RevealItem>
              <VerificationOverTime data={data.verification_over_time} />
            </RevealItem>
            <RevealItem>
              <OutreachReach data={data.outreach_reach} />
            </RevealItem>
          </div>

          <RevealItem>
            <OutreachOutcomesOverTime data={data.outreach_outcomes_over_time} />
          </RevealItem>

          <RevealItem>
            <DeferredPlaceholder />
          </RevealItem>
        </div>
      ) : null}
    </PageReveal>
  )
}
