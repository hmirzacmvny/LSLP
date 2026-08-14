import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSubmissions, getSubmissionCounts } from '../../lib/api'
import { typeScale } from '../../lib/design-system'
import { PageReveal, RevealItem } from '../../components/PageReveal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { CheckCircle, ChevronLeft, ChevronRight, Inbox, Image } from 'lucide-react'

const TABS = [
  { key: 'Pending', label: 'Pending' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Rejected', label: 'Rejected' },
]

export default function SubmissionsQueue() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('Pending')
  const [submissions, setSubmissions] = useState([])
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  const loadCounts = useCallback(async () => {
    try {
      const res = await getSubmissionCounts()
      setCounts(res.data)
    } catch {}
  }, [])

  const loadSubmissions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getSubmissions({
        review_status: tab,
        skip: (page - 1) * perPage,
        limit: perPage,
      })
      setSubmissions(res.data)
    } catch {} finally {
      setLoading(false)
    }
  }, [tab, page, perPage])

  useEffect(() => { loadCounts() }, [loadCounts])
  useEffect(() => { loadSubmissions() }, [loadSubmissions])

  const tabCount = (key) => {
    if (key === 'Pending') return counts.pending
    if (key === 'Approved') return counts.approved
    return counts.rejected
  }

  const totalForTab = tabCount(tab)
  const totalPages = Math.max(1, Math.ceil(totalForTab / perPage))

  return (
    <PageReveal className="p-6 max-w-6xl mx-auto">
      <RevealItem className="mb-6">
        <h1 className={typeScale.pageTitle}>Submission Review</h1>
        <p className="text-sm text-muted-foreground mt-1">Review customer-submitted service line information</p>
      </RevealItem>

      <RevealItem className="mb-6">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {TABS.map((t) => {
            const count = tabCount(t.key)
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setPage(1) }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  active
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
                <span className={`text-xs tabular-nums px-1.5 py-0.5 rounded-full ${
                  active
                    ? t.key === 'Pending' && count > 0
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                    : 'bg-slate-200/60 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </RevealItem>

      <RevealItem>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : submissions.length === 0 ? (
          tab === 'Pending' ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle className="size-12 mx-auto mb-4 text-green-400 stroke-1" />
              <p className="text-lg font-medium text-slate-600">No submissions awaiting review</p>
              <p className="text-sm mt-1">New customer submissions will appear here automatically.</p>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Inbox className="size-12 mx-auto mb-4 stroke-1" />
              <p className="text-lg">No {tab.toLowerCase()} submissions</p>
            </div>
          )
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground tabular-nums">
                Showing {submissions.length} of {totalForTab} {totalForTab === 1 ? 'submission' : 'submissions'}
              </p>
              {totalForTab > 25 && (
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

            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-xs font-medium">Submitted</TableHead>
                    <TableHead className="text-xs font-medium">Address</TableHead>
                    <TableHead className="text-xs font-medium">Name</TableHead>
                    <TableHead className="text-xs font-medium">Contact</TableHead>
                    <TableHead className="text-xs font-medium">Photos</TableHead>
                    <TableHead className="text-xs font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((s) => (
                    <TableRow
                      key={s.id}
                      onClick={() => navigate(`/submissions/${s.id}`)}
                      className="cursor-pointer hover:bg-slate-50/60"
                    >
                      <TableCell className="tabular-nums text-muted-foreground">
                        {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">
                        <div>{s.address || s.account_number}</div>
                        {s.address && (
                          <div className="text-xs text-muted-foreground font-mono tabular-nums">{s.account_number}</div>
                        )}
                      </TableCell>
                      <TableCell>{s.submitter_name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[180px] truncate">
                        {s.contact_info}
                      </TableCell>
                      <TableCell>
                        {s.photo_urls && s.photo_urls.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Image className="size-3.5" />
                            {s.photo_urls.length}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${
                          s.review_status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : s.review_status === 'Approved'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {s.review_status}
                        </Badge>
                      </TableCell>
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
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(p)}
                    className={`h-8 w-8 p-0 text-xs ${p === page ? 'bg-[#1A56A0] hover:bg-[#143F75]' : ''}`}
                  >
                    {p}
                  </Button>
                ))}
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
      </RevealItem>
    </PageReveal>
  )
}
