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
