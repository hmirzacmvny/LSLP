import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardSummary } from '../../lib/api'
import { typeScale } from '../../lib/design-system'
import { PageReveal, RevealItem } from '../../components/PageReveal'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Inbox, AlertTriangle, EyeOff, ArrowUpRight, ArrowDownRight, Minus,
  ClipboardCheck, Megaphone, ChevronRight,
} from 'lucide-react'

const STATUS_COLORS = {
  'Verified-Lead':       { bar: 'bg-red-600',    text: 'text-red-700',    label: 'Lead' },
  'Verified-Copper':     { bar: 'bg-green-600',  text: 'text-green-700',  label: 'Copper' },
  'Verified-Galvanized': { bar: 'bg-orange-500', text: 'text-orange-700', label: 'Galvanized' },
  'Unknown':             { bar: 'bg-gray-400',   text: 'text-gray-500',   label: 'Unknown' },
  'Pending':             { bar: 'bg-slate-300',  text: 'text-slate-500',  label: 'Pending' },
}

function statusMeta(status) {
  return STATUS_COLORS[status] || { bar: 'bg-slate-300', text: 'text-slate-500', label: status }
}

function relativeTime(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function Overview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getDashboardSummary()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-24 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    )
  }

  const classification = data.classification || {}
  const total = data.total_properties || 0
  const verifiedCount = Object.entries(classification)
    .filter(([k]) => k.startsWith('Verified'))
    .reduce((sum, [, v]) => sum + v, 0)
  const verifiedPct = total > 0 ? ((verifiedCount / total) * 100).toFixed(1) : '0.0'

  const orderedStatuses = ['Verified-Lead', 'Verified-Copper', 'Verified-Galvanized', 'Unknown', 'Pending']
  const segments = orderedStatuses
    .filter((s) => (classification[s] || 0) > 0)
    .map((s) => ({
      status: s,
      count: classification[s],
      pct: ((classification[s] / total) * 100).toFixed(1),
      ...statusMeta(s),
    }))

  const otherStatuses = Object.entries(classification).filter(
    ([k]) => !orderedStatuses.includes(k)
  )
  for (const [status, count] of otherStatuses) {
    if (count > 0) {
      segments.push({
        status,
        count,
        pct: ((count / total) * 100).toFixed(1),
        ...statusMeta(status),
      })
    }
  }

  const visitsDelta = data.visits_last_7 - data.visits_prior_7
  const TrendIcon = visitsDelta > 0 ? ArrowUpRight : visitsDelta < 0 ? ArrowDownRight : Minus
  const trendColor = visitsDelta > 0 ? 'text-green-600' : visitsDelta < 0 ? 'text-red-600' : 'text-gray-500'

  const actionCards = [
    {
      label: 'Submissions awaiting review',
      count: data.pending_submissions,
      icon: Inbox,
      onClick: () => navigate('/submissions'),
      accent: data.pending_submissions > 0,
    },
    {
      label: 'Stalled outreach cases',
      count: data.stalled_outreach,
      icon: AlertTriangle,
      onClick: () => navigate('/properties?stalled=true'),
      accent: data.stalled_outreach > 0,
    },
    {
      label: 'Properties never touched',
      count: data.never_touched,
      icon: EyeOff,
      onClick: () => navigate('/properties?untouched=true'),
      accent: data.never_touched > 0,
    },
  ]

  return (
    <PageReveal className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Headline figure — provisional, pending water department confirmation */}
      <RevealItem>
        <div className="mb-2">
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold tabular-nums tracking-tight text-slate-900">
              {verifiedPct}%
            </span>
            <span className="text-lg text-muted-foreground font-medium">verified</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {verifiedCount.toLocaleString()} of {total.toLocaleString()} properties classified
          </p>
        </div>
      </RevealItem>

      {/* Action row */}
      <RevealItem>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {actionCards.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.label}
                className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${
                  card.accent ? 'border-l-4 border-l-amber-400' : ''
                }`}
                onClick={card.onClick}
              >
                <CardContent className="p-5 flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-3xl font-bold tabular-nums mt-1 text-slate-900">
                      {card.count.toLocaleString()}
                    </p>
                  </div>
                  <Icon className={`size-5 mt-1 ${card.accent ? 'text-amber-500' : 'text-slate-400'}`} />
                </CardContent>
              </Card>
            )
          })}
        </div>
      </RevealItem>

      {/* Classification progress */}
      <RevealItem>
        <Card>
          <CardContent className="p-5">
            <h2 className={typeScale.sectionTitle + ' mb-4'}>Classification Progress</h2>
            <div className="flex h-5 rounded-full overflow-hidden bg-slate-100">
              {segments.map((seg) => (
                <button
                  key={seg.status}
                  className={`${seg.bar} transition-opacity hover:opacity-80 h-full`}
                  style={{ width: `${seg.pct}%`, minWidth: seg.count > 0 ? 4 : 0 }}
                  onClick={() => navigate(`/properties?verified_status=${encodeURIComponent(seg.status)}`)}
                  title={`${seg.label}: ${seg.count.toLocaleString()} (${seg.pct}%)`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
              {segments.map((seg) => (
                <button
                  key={seg.status}
                  onClick={() => navigate(`/properties?verified_status=${encodeURIComponent(seg.status)}`)}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${seg.bar}`} />
                  <span className={seg.text + ' font-medium'}>{seg.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {seg.count.toLocaleString()} ({seg.pct}%)
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </RevealItem>

      {/* Bottom row: activity feed + trend */}
      <RevealItem>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent activity feed */}
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className={typeScale.sectionTitle}>Recent Activity</h2>
                <button
                  onClick={() => navigate('/properties')}
                  className="text-xs text-[#1A56A0] hover:underline flex items-center gap-0.5"
                >
                  View all <ChevronRight className="size-3" />
                </button>
              </div>
              {data.recent_activity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>
              ) : (
                <div className="space-y-1">
                  {data.recent_activity.map((item, i) => {
                    const isVisit = item.type === 'visit'
                    const Icon = isVisit ? ClipboardCheck : Megaphone
                    return (
                      <button
                        key={`${item.type}-${item.account_number}-${i}`}
                        onClick={() => navigate(`/properties/${item.account_number}`)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-slate-50 transition-colors"
                      >
                        <Icon className={`size-4 shrink-0 ${isVisit ? 'text-[#1A56A0]' : 'text-amber-600'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-800 truncate">{item.address}</p>
                          <p className="text-xs text-muted-foreground">
                            {isVisit ? 'Visit' : 'Outreach'}{item.who ? ` by ${item.who}` : ''}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {relativeTime(item.occurred_at)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Field activity trend */}
          <Card>
            <CardContent className="p-5">
              <h2 className={typeScale.sectionTitle + ' mb-4'}>Field Activity</h2>
              <p className="text-sm text-muted-foreground mb-1">Last 7 days</p>
              <p className="text-3xl font-bold tabular-nums text-slate-900">
                {data.visits_last_7}
                <span className="text-lg font-normal text-muted-foreground ml-1">visits</span>
              </p>
              <div className={`flex items-center gap-1 mt-3 text-sm font-medium ${trendColor}`}>
                <TrendIcon className="size-4" />
                <span>
                  {visitsDelta > 0 ? '+' : ''}{visitsDelta} vs prior week
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Prior 7 days: {data.visits_prior_7} visits
              </p>
            </CardContent>
          </Card>
        </div>
      </RevealItem>
    </PageReveal>
  )
}
