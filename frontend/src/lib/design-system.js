export const colors = {
  civic: '#1A56A0',
  civicDark: '#143F75',

  lead: '#DC2626',
  copper: '#16A34A',
  galvanized: '#EA580C',
  unknown: '#6B7280',

  surface: '#F8FAFC',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
}

export const materialConfig = {
  Lead:        { color: colors.lead,       bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-l-red-600',    dot: 'bg-red-600',    badgeCls: 'bg-red-50 text-red-700 border-red-200' },
  Copper:      { color: colors.copper,     bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-l-green-600',  dot: 'bg-green-600',  badgeCls: 'bg-green-50 text-green-700 border-green-200' },
  Galvanized:  { color: colors.galvanized, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-l-orange-500', dot: 'bg-orange-500', badgeCls: 'bg-orange-50 text-orange-700 border-orange-200' },
  Unknown:     { color: colors.unknown,    bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-l-gray-300',   dot: 'bg-gray-400',   badgeCls: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export const statusConfig = {
  Pending:                { badgeCls: 'bg-amber-50 text-amber-700 border-amber-200' },
  Approved:               { badgeCls: 'bg-green-50 text-green-700 border-green-200' },
  Rejected:               { badgeCls: 'bg-red-50 text-red-700 border-red-200' },
  'Verified-Lead':        { badgeCls: 'bg-red-50 text-red-700 border-red-200' },
  'Verified-Copper':      { badgeCls: 'bg-green-50 text-green-700 border-green-200' },
  'Verified-Galvanized':  { badgeCls: 'bg-orange-50 text-orange-700 border-orange-200' },
  Active:                 { badgeCls: 'bg-blue-50 text-blue-700 border-blue-200' },
  Unknown:                { badgeCls: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export function getMaterial(value) {
  if (!value) return materialConfig.Unknown
  const key = Object.keys(materialConfig).find(
    (k) => value.toLowerCase().includes(k.toLowerCase())
  )
  return key ? materialConfig[key] : materialConfig.Unknown
}

export function getStatus(value) {
  if (!value) return statusConfig.Unknown
  const key = Object.keys(statusConfig).find(
    (k) => value.toLowerCase().includes(k.toLowerCase())
  )
  return key ? statusConfig[key] : statusConfig.Unknown
}

export const typeScale = {
  pageTitle: 'text-2xl font-semibold tracking-tight',
  sectionTitle: 'text-base font-semibold',
  body: 'text-sm',
  caption: 'text-xs text-muted-foreground',
  label: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  data: 'text-sm font-mono tabular-nums',
}

export const layout = {
  page: 'p-6 max-w-6xl mx-auto',
  narrowPage: 'p-6 max-w-[640px] mx-auto',
  cardGrid: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
  stack: 'space-y-6',
}
