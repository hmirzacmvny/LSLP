import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSubmission, getProperty, reviewSubmission } from '../../lib/api'
import { getMaterial, typeScale } from '../../lib/design-system'
import { toast } from 'sonner'
import { PageReveal, RevealItem } from '../../components/PageReveal'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft, Image, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react'

const API_BASE = 'http://127.0.0.1:8000'

const MATERIALS = [
  { value: 'Lead', label: 'Lead', cls: 'bg-red-600 hover:bg-red-700 text-white' },
  { value: 'Copper', label: 'Copper', cls: 'bg-green-600 hover:bg-green-700 text-white' },
  { value: 'Galvanized', label: 'Galvanized', cls: 'bg-orange-500 hover:bg-orange-600 text-white' },
  { value: 'Unknown', label: 'Unknown', cls: 'bg-slate-600 hover:bg-slate-700 text-white' },
]

const MATERIAL_TO_STATUS = {
  Lead: 'Verified-Lead',
  Copper: 'Verified-Copper',
  Galvanized: 'Verified-Galvanized',
  Unknown: 'Unknown',
}

export default function SubmissionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)

  const [lightboxIdx, setLightboxIdx] = useState(-1)

  const [approveOpen, setApproveOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [approving, setApproving] = useState(false)

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const subRes = await getSubmission(id)
        setSubmission(subRes.data)
        const propRes = await getProperty(subRes.data.account_number)
        setProperty(propRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleKeyDown = useCallback((e) => {
    if (lightboxIdx < 0 || !submission?.photo_urls) return
    if (e.key === 'ArrowRight') {
      setLightboxIdx((i) => Math.min(i + 1, submission.photo_urls.length - 1))
    } else if (e.key === 'ArrowLeft') {
      setLightboxIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Escape') {
      setLightboxIdx(-1)
    }
  }, [lightboxIdx, submission])

  useEffect(() => {
    if (lightboxIdx >= 0) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [lightboxIdx, handleKeyDown])

  const handleApprove = async () => {
    if (!selectedMaterial) return
    setApproving(true)
    try {
      await reviewSubmission(id, {
        review_status: 'Approved',
        verified_material: selectedMaterial,
      })
      toast.success(`Submission approved — property updated to ${MATERIAL_TO_STATUS[selectedMaterial]}`)
      navigate('/submissions')
    } catch {
      toast.error('Failed to approve submission. Please try again.')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    setRejecting(true)
    try {
      await reviewSubmission(id, {
        review_status: 'Rejected',
        notes: rejectReason.trim() || undefined,
      })
      toast.success('Submission rejected — property record unchanged')
      navigate('/submissions')
    } catch {
      toast.error('Failed to reject submission. Please try again.')
    } finally {
      setRejecting(false)
    }
  }

  if (loading) return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )

  if (!submission) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <p className="text-muted-foreground">Submission not found</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/submissions')}>
          Back to queue
        </Button>
      </div>
    </div>
  )

  const photos = submission.photo_urls || []
  const isPending = submission.review_status === 'Pending'

  return (
    <PageReveal className="p-6 max-w-5xl mx-auto space-y-6">
      <RevealItem>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/submissions')}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <span className="text-sm text-muted-foreground">
              Submissions &rarr; #{submission.id}
            </span>
          </div>
          <Badge variant="outline" className={`text-xs ${
            submission.review_status === 'Pending'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : submission.review_status === 'Approved'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {submission.review_status}
          </Badge>
        </div>
      </RevealItem>

      {/* Photos */}
      <RevealItem>
        <Card>
          <CardContent className="p-6">
            <h2 className={typeScale.sectionTitle + ' mb-4'}>Photos</h2>
            {photos.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Image className="size-10 mx-auto mb-3 stroke-1" />
                <p>No photos were submitted</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightboxIdx(idx)}
                    className="aspect-square rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-[#1A56A0]/30 transition-shadow"
                  >
                    <img
                      src={`${API_BASE}/${url}`}
                      alt={`Submission photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </RevealItem>

      {/* Two-column: customer info vs. property record */}
      <RevealItem>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer-submitted info */}
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className={typeScale.sectionTitle}>Customer Submission</h2>
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">
                  Submitted
                </Badge>
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Name</dt>
                  <dd className="text-slate-800 font-medium mt-0.5">{submission.submitter_name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Contact</dt>
                  <dd className="text-slate-800 mt-0.5">{submission.contact_info}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Year Constructed</dt>
                  <dd className="text-slate-800 mt-0.5">
                    {submission.year_constructed
                      ? submission.year_constructed.replace(/_/g, ' ').replace('before', 'Before').replace('after', 'After')
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Prior Line Work</dt>
                  <dd className="text-slate-800 mt-0.5">
                    {submission.prior_line_work === true ? 'Yes' : submission.prior_line_work === false ? 'No' : '—'}
                  </dd>
                </div>
                {submission.prior_line_work && submission.prior_line_notes && (
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Work Details</dt>
                    <dd className="text-slate-800 mt-0.5">{submission.prior_line_notes}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Submitted</dt>
                  <dd className="text-slate-800 tabular-nums mt-0.5">
                    {submission.submitted_at
                      ? new Date(submission.submitted_at).toLocaleString()
                      : '—'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Current property record */}
          <Card className="border-l-4 border-l-slate-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className={typeScale.sectionTitle}>Current Record</h2>
                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200">
                  On File
                </Badge>
              </div>
              {property ? (
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Address</dt>
                    <dd className="text-slate-800 font-medium mt-0.5">{property.address}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Account</dt>
                    <dd className="text-slate-800 font-mono tabular-nums mt-0.5">{property.account_number}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">House Side</dt>
                    <dd className={`font-medium mt-0.5 ${getMaterial(property.hs_service).text}`}>
                      {property.hs_service || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Street Side</dt>
                    <dd className={`font-medium mt-0.5 ${getMaterial(property.ss_service).text}`}>
                      {property.ss_service || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Verified Status</dt>
                    <dd className="mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {property.verified_status || 'Pending'}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-muted-foreground">Property record not found</p>
              )}
            </CardContent>
          </Card>
        </div>
      </RevealItem>

      {/* Reviewed info (if already reviewed) */}
      {!isPending && submission.reviewed_by && (
        <RevealItem>
          <Card className="bg-slate-50/50">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                {submission.review_status === 'Approved' ? 'Approved' : 'Rejected'} by{' '}
                <span className="font-medium text-slate-700">{submission.reviewed_by_name || 'staff'}</span>
                {submission.reviewed_at && (
                  <> on {new Date(submission.reviewed_at).toLocaleString()}</>
                )}
              </p>
            </CardContent>
          </Card>
        </RevealItem>
      )}

      {/* Actions (only for pending) */}
      {isPending && (
        <RevealItem>
          <div className="flex gap-3">
            <Button
              onClick={() => setApproveOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="size-4" />
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="size-4" />
              Reject
            </Button>
          </div>
        </RevealItem>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxIdx >= 0} onOpenChange={(open) => { if (!open) setLightboxIdx(-1) }}>
        <DialogContent className="sm:max-w-3xl p-2" showCloseButton={false}>
          {lightboxIdx >= 0 && photos[lightboxIdx] && (
            <div className="relative">
              <img
                src={`${API_BASE}/${photos[lightboxIdx]}`}
                alt={`Photo ${lightboxIdx + 1} of ${photos.length}`}
                className="w-full max-h-[70vh] object-contain rounded-lg"
              />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full tabular-nums">
                {lightboxIdx + 1} / {photos.length}
              </div>
              {lightboxIdx > 0 && (
                <button
                  onClick={() => setLightboxIdx(lightboxIdx - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="size-5" />
                </button>
              )}
              {lightboxIdx < photos.length - 1 && (
                <button
                  onClick={() => setLightboxIdx(lightboxIdx + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="size-5" />
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Material Classification</DialogTitle>
            <DialogDescription>
              Based on the submitted photos, select the verified material for this service line.
              This will update the property record.
            </DialogDescription>
          </DialogHeader>

          {property && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">This will change the property record</p>
                  <p className="text-amber-700 mt-1">
                    <span className="font-mono">{property.account_number}</span> &mdash; current status:{' '}
                    <strong>{property.verified_status || 'Pending'}</strong>
                    {selectedMaterial && (
                      <> &rarr; <strong>{MATERIAL_TO_STATUS[selectedMaterial]}</strong></>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Verified Material</Label>
            <div className="grid grid-cols-2 gap-2">
              {MATERIALS.map((m) => (
                <Button
                  key={m.value}
                  type="button"
                  variant={selectedMaterial === m.value ? 'default' : 'outline'}
                  onClick={() => setSelectedMaterial(m.value)}
                  className={selectedMaterial === m.value ? m.cls : ''}
                >
                  {m.label}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button
              onClick={handleApprove}
              disabled={!selectedMaterial || approving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approving ? 'Approving...' : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              This will reject the submission. The property record will not be changed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Photos are too blurry to determine material..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              onClick={handleReject}
              disabled={rejecting}
              variant="destructive"
            >
              {rejecting ? 'Rejecting...' : 'Reject Submission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageReveal>
  )
}
