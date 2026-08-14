import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProperty, getVisits, getOutreach } from '../../lib/api'
import { statusColors, materialColors } from '../../lib/design'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { ArrowLeft, Plus, ClipboardList } from 'lucide-react'

function getMaterialClass(material) {
  if (!material) return 'text-gray-400'
  const key = Object.keys(materialColors).find((k) =>
    material.toLowerCase().includes(k.toLowerCase())
  )
  return key ? materialColors[key] : 'text-slate-600'
}

function getMaterialBorder(material) {
  if (!material) return 'border-l-slate-300'
  if (material.toLowerCase().includes('lead')) return 'border-l-red-600'
  if (material.toLowerCase().includes('copper')) return 'border-l-green-600'
  if (material.toLowerCase().includes('galvanized')) return 'border-l-orange-500'
  return 'border-l-slate-300'
}

function getStatusBadge(status) {
  if (!status) return statusColors['Unknown']
  const key = Object.keys(statusColors).find((k) =>
    status.toLowerCase().includes(k.toLowerCase())
  )
  return key ? statusColors[key] : statusColors['Unknown']
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
      <div className="text-red-500">Property not found</div>
    </div>
  )

  const serviceLineFields = [
    { label: 'House Side (H.S.)', value: property.hs_service, method: property.hs_verification_method },
    { label: 'Street Side (S.S.)', value: property.ss_service, method: property.ss_verification_method },
    { label: 'UB Private Side', value: property.ub_private_side },
    { label: 'UB Utility Side', value: property.ub_utility_side },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <span className="text-sm text-muted-foreground">
          Properties &rarr; {property.address}
        </span>
      </div>

      {/* Property header card */}
      <Card className="border-l-4 border-l-blue-700">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{property.address}</h1>
              <p className="text-muted-foreground mt-1">
                Account: {property.account_number} &middot; Zip: {property.zip} &middot; {property.ub_account_type}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getStatusBadge(property.acct_status)}>
                {property.acct_status}
              </Badge>
              <Button size="sm" onClick={() => navigate('/visits/new')} style={{ backgroundColor: '#1A56A0' }}>
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

      {/* Service line grid */}
      <div className="grid grid-cols-2 gap-4">
        {serviceLineFields.map((field) => (
          <Card key={field.label} className={`border-l-4 ${getMaterialBorder(field.value)}`}>
            <CardContent className="p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {field.label}
              </h3>
              <p className={`text-lg ${getMaterialClass(field.value)}`}>
                {field.value || '\u2014'}
              </p>
              {field.method && (
                <p className="text-xs text-muted-foreground mt-1">
                  Method: {field.method}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs — Visits & Outreach */}
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
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Initials</TableHead>
                    <TableHead>Access Granted</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Property Type</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-slate-700">
                        {v.visited_at ? new Date(v.visited_at).toLocaleDateString() : '\u2014'}
                      </TableCell>
                      <TableCell className="font-mono font-bold" style={{ color: '#1A56A0' }}>
                        {v.initials || '\u2014'}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          v.access_granted === 'Yes'
                            ? 'bg-green-100 text-green-700'
                            : v.access_granted === 'No'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                        }>
                          {v.access_granted || '\u2014'}
                        </Badge>
                      </TableCell>
                      <TableCell className={getMaterialClass(v.verification_outcome)}>
                        {v.verification_outcome || '\u2014'}
                      </TableCell>
                      <TableCell className="text-slate-600">{v.property_type || '\u2014'}</TableCell>
                      <TableCell className="text-slate-500 max-w-[200px] truncate">{v.notes || '\u2014'}</TableCell>
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
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Initials</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outreach.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-700">
                          #{o.attempt_number}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {o.outreach_date ? new Date(o.outreach_date).toLocaleDateString() : '\u2014'}
                      </TableCell>
                      <TableCell className="text-slate-600">{o.method || '\u2014'}</TableCell>
                      <TableCell className="text-slate-700">{o.outcome || '\u2014'}</TableCell>
                      <TableCell className="font-mono font-bold" style={{ color: '#1A56A0' }}>
                        {o.initials || '\u2014'}
                      </TableCell>
                      <TableCell className="text-slate-500 max-w-[200px] truncate">{o.notes || '\u2014'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
