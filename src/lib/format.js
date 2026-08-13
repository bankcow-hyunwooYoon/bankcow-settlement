export function formatWon(value) {
  if (value === null || value === undefined || value === '') return '-'
  return `${Number(value).toLocaleString('ko-KR')}원`
}

export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return ''
  return Number(value).toLocaleString('ko-KR')
}

export function parseDigits(rawValue) {
  const digitsOnly = rawValue.replace(/[^0-9]/g, '')
  return digitsOnly === '' ? '' : Number(digitsOnly)
}

/** '2026-08-13 14:20' */
export function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatUnitPrice(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return `${value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}원`
}
