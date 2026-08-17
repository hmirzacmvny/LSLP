import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../lib/UserContext'
import { getUserActivity } from '../lib/api'
import { getRoleDisplay, roleConfig, typeScale } from '../lib/design-system'
import { PageReveal, RevealItem } from '../components/PageReveal'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  UserCircle, ClipboardPen, Megaphone, FileCheck, PenLine,
  ChevronRight, Loader2, Inbox,
} from 'lucide-react'

const ACTIVITY_ICONS = {
  visit: ClipboardPen,
  outreach: Megaphone,
  review: FileCheck,
  property_update: PenLine,
}

const ACTIVITY_LABELS = {
  visit: 'Field visit',
  outreach: 'Outreach',
  review: 'Submission review',
  property_update: 'Property update',
}

function relativeTime(iso) {
  const now = new Date()
  const then = new Date(iso)
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return then.toLocaleDateString()
}

function describeActivity(item) {
  let desc
  switch (item.type) {
    case 'visit':
      desc = item.detail ? `Field visit — ${item.detail}` : 'Field visit logged'
      if (item.entered_by_name) desc += ` (entered by ${item.entered_by_name})`
      return desc
    case 'outreach':
      return item.detail ? `Outreach via ${item.detail}` : 'Outreach logged'
    case 'review':
      return item.detail === 'Approved' ? 'Submission approved' : 'Submission rejected'
    case 'property_update':
      return item.detail || 'Property updated'
    default:
      return 'Activity recorded'
  }
}

export default function Account() {
  const navigate = useNavigate()
  const { profile, firebaseUser } = useUser()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    setLoading(true)
    getUserActivity({ page: 1, per_page: 20 })
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const loadMore = async () => {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const res = await getUserActivity({ page: nextPage, per_page: 20 })
      setData((prev) => ({
        ...res.data,
        activity: [...prev.activity, ...res.data.activity],
      }))
      setPage(nextPage)
    } catch {}
    setLoadingMore(false)
  }

  const counts = data?.counts || {}
  const nonZeroCounts = Object.entries(counts).filter(([, v]) => v > 0)
  const hasMore = data && data.activity.length < data.total

  const countLabels = {
    visits: 'Visits submitted',
    outreach: 'Outreach logged',
    reviews: 'Submissions reviewed',
    property_updates: 'Properties updated',
  }

  return (
    <PageReveal className="p-6 max-w-3xl mx-auto">
      <RevealItem className="mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600 shrink-0">
                {profile?.initials || firebaseUser?.email?.slice(0, 2).toUpperCase() || '??'}
              </div>
              <div className="min-w-0">
                <h1 className={typeScale.pageTitle}>{profile?.name || firebaseUser?.email || 'Account'}</h1>
                <p className="text-sm text-muted-foreground truncate">{firebaseUser?.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {profile?.role && (
                    <Badge variant="outline" className={roleConfig[profile.role]?.badgeCls || ''}>
                      {getRoleDisplay(profile.role)}
                    </Badge>
                  )}
                  {profile?.created_at && (
                    <span className="text-xs text-muted-foreground">
                      Joined {new Date(profile.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </RevealItem>

      {loading ? (
        <RevealItem>
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </RevealItem>
      ) : !data ? (
        <RevealItem>
          <div className="text-center py-16 text-sm text-muted-foreground">
            Could not load activity.
          </div>
        </RevealItem>
      ) : (
        <>
          {nonZeroCounts.length > 0 && (
            <RevealItem className="mb-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {nonZeroCounts.map(([key, value]) => (
                  <Card key={key}>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-semibold tabular-nums">{value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{countLabels[key] || key}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </RevealItem>
          )}

          <RevealItem>
            <h2 className={`${typeScale.sectionTitle} mb-3`}>Activity</h2>
            {data.activity.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <Inbox className="size-12 mx-auto mb-3 text-muted-foreground/40 stroke-1" />
                  <p className="text-sm font-medium text-slate-600">No activity yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your visits, outreach, and reviews will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="divide-y">
                  {data.activity.map((item, idx) => {
                    const Icon = ACTIVITY_ICONS[item.type] || ClipboardPen
                    return (
                      <button
                        key={`${item.type}-${item.account_number}-${idx}`}
                        onClick={() => navigate(`/properties/${item.account_number}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <Icon className="size-4 text-slate-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-800 truncate">{item.address}</div>
                          <div className="text-xs text-muted-foreground">{describeActivity(item)}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground tabular-nums">{relativeTime(item.occurred_at)}</span>
                          <ChevronRight className="size-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                        </div>
                      </button>
                    )
                  })}
                </div>
                {hasMore && (
                  <div className="p-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={loadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        'Load more'
                      )}
                    </Button>
                  </div>
                )}
              </Card>
            )}
          </RevealItem>
        </>
      )}
    </PageReveal>
  )
}
