export function normalizePhone(raw) {
  let digits = raw.replace(/[^\d]/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1)
  }
  return digits
}

export function isValidPhone(v) {
  return /^\d{10}$/.test(normalizePhone(v))
}

export function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export function isValidContact(v) {
  const trimmed = v.trim()
  return isValidEmail(trimmed) || isValidPhone(trimmed)
}

export function isOutcomePermitted(accessGranted) {
  return accessGranted === 'Yes'
}

export function isFollowUpPermitted(accessGranted) {
  return accessGranted === 'Scheduled'
}

export function isOutreachFollowUpRequired(outcome) {
  return outcome === 'Scheduled' || outcome === 'Follow-up'
}

export function isOutreachFollowUpPermitted(outcome) {
  return outcome === 'Scheduled' || outcome === 'Follow-up'
}

export const MATERIAL_DETERMINATIONS = new Set([
  'Lead', 'Copper', 'Galvanized', 'Brass', 'Cast Iron', 'Iron', 'Plastic',
  'Completed - Private & Public Verified',
])

export function isMaterialDetermination(outcome) {
  return !!outcome && MATERIAL_DETERMINATIONS.has(outcome)
}

export function isNeedsReturnPermitted(accessGranted, verificationOutcome) {
  if (accessGranted === 'Scheduled') return false
  return !isMaterialDetermination(verificationOutcome)
}
