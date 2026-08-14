import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProperty, getVisits, getOutreach } from '../../lib/api'
import { getMaterial, getStatus, typeScale } from '../../lib/design-system'
import { PageReveal, RevealItem } from '../../components/PageReveal'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { ArrowLeft, Plus, ClipboardList, ShieldCheck, ShieldQuestion } from 'lucide-react'

function VerifiedPill({ method }) {
  if (method) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 mt-1.5">
        <ShieldCheck className="size-3" />
        Verified &mdash; {method}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5 mt-1.5">
      <ShieldQuestion className="size-3" />
      Not verified
    </span>
  )
}

export default function PropertyDetail() {
  const { accountNumber } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [visits, setVisits] = useState([])
  const [outreach, setOutreach] = useState([])
  const [loading, setLoading] = useState(true)

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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )

  if (!property) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <p className="text-muted-foreground">Property not found</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/')}>
          Back to search
        </Button>
      </div>
    </div>
  )

  const serviceLineFields = [
    { label: 'House Side (H.S.)', value: property.hs_service, method: property.hs_verification_method },
    { label: 'Street Side (S.S.)', value: property.ss_service, method: property.ss_verification_method },
    { label: 'UB Private Side', value: property.ub_private_side },
    { label: 'UB Utility Side', value: property.ub_utility_side },
  ]

  return (
    <PageReveal className="p-6 max-w-5xl mx-auto space-y-6">
      <RevealItem>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground">
            Properties &rarr; {property.address}
          </span>
        </div>
      </RevealItem>

      <RevealItem>
        <Card className="border-l-4 border-l-[#1A56A0]">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className={typeScale.pageTitle}>{property.address}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-mono tabular-nums">{property.account_number}</span>
                  <span className="mx-2">&middot;</span>
                  Zip: {property.zip}
                  <span className="mx-2">&middot;</span>
                  {property.ub_account_type}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`text-xs ${getStatus(property.acct_status).badgeCls}`}>
                  {property.acct_status}
                </Badge>
                <Button size="sm" onClick={() => navigate('/visits/new')} className="bg-[#1A56A0] hover:bg-[#143F75] text-white">
                  <Plus className="size-4" />
                  Log Visit
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/outreach/new')}>
                  <ClipboardList className="size-4" />
                  Log Outreach
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </RevealItem>

      <RevealItem>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {serviceLineFields.map((field) => {
            const mat = getMaterial(field.value)
            return (
              <Card key={field.label} className={`border-l-4 ${mat.border}`}>
                <CardContent className="p-5">
                  <h3 className={typeScale.label + ' mb-2'}>
                    {field.label}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${mat.dot}`} />
                    <p className={`text-lg font-semibold ${mat.text}`}>
                      {field.value || '—'}
                    </p>
                  </div>
                  {'method' in field && (
                    <VerifiedPill method={field.method} />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </RevealItem>

      <RevealItem>
        <Tabs defaultValue="visits">
          <TabsList>
            <TabsTrigger value="visits">Visits ({visits.length})</TabsTrigger>
            <TabsTrigger value="outreach">Outreach ({outreach.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="visits">
            {visits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No visits recorded for this property
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-xs font-medium">Date</TableHead>
                      <TableHead className="text-xs font-medium">Initials</TableHead>
                      <TableHead className="text-xs font-medium">Access</TableHead>
                      <TableHead className="text-xs font-medium">Outcome</TableHead>
                      <TableHead className="text-xs font-medium">Property Type</TableHead>
                      <TableHead className="text-xs font-medium">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="tabular-nums">
                          {v.visited_at ? new Date(v.visited_at).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell
                          className="font-mono font-semibold text-[#1A56A0]"
                          title={v.created_by_email || undefined}
                        >
                          <span>{v.initials || '—'}</span>
                          {v.created_by_email && (
                            <div className="text-[10px] font-sans font-normal text-muted-foreground truncate max-w-[140px]">
                              {v.created_by_email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${
                            v.access_granted === 'Yes'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : v.access_granted === 'No'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-gray-50 text-gray-500 border-gray-200'
                          }`}>
                            {v.access_granted || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className={getMaterial(v.verification_outcome).text + ' font-medium'}>
                          {v.verification_outcome || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{v.property_type || '—'}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{v.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="outreach">
            {outreach.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No outreach recorded for this property
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-xs font-medium">Attempt</TableHead>
                      <TableHead className="text-xs font-medium">Date</TableHead>
                      <TableHead className="text-xs font-medium">Method</TableHead>
                      <TableHead className="text-xs font-medium">Outcome</TableHead>
                      <TableHead className="text-xs font-medium">Initials</TableHead>
                      <TableHead className="text-xs font-medium">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outreach.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 tabular-nums">
                            #{o.attempt_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {o.outreach_date ? new Date(o.outreach_date).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{o.method || '—'}</TableCell>
                        <TableCell>{o.outcome || '—'}</TableCell>
                        <TableCell className="font-mono font-semibold text-[#1A56A0]">
                          {o.initials || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{o.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </RevealItem>
    </PageReveal>
  )
}
