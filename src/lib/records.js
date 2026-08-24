import {
  calculateAllocation,
  formatMonthLabel,
  getDaysInSettlementMonth,
  getLastEndedMonth,
  monthIndex,
  PRODUCT_START_MONTH,
} from './settlement.js'
import { now } from './prototypeDate.js'

export const STATUS_CONFIRMED = '확정'
export const STATUS_DRAFT = '임시저장'

/**
 * 계산 결과를 월 데이터의 소별 상세 형태로 변환한다.
 * 금액은 원 단위 잔여 배분까지 끝난 값을 저장한다.
 */
export function toCattleDetails(rows) {
  return rows.map((row) => ({
    개체명: row.name,
    이력번호: row.historyNo,
    생년월일: row.birthDate,
    개월령: row.ageInMonths,
    상태: row.status,
    이탈월: row.exitMonth,
    이탈일: row.exitDay,
    이전이탈여부: row.isPastExit,
    사료비사육일수: row.feedDays,
    사료비금액: row.feedAmount,
    관리비사육일수: row.mgmtDays,
    관리비금액: row.mgmtAmount,
    사료관리비합계: row.totalAmount,
  }))
}

/** 정산월 + 총액으로 확정 월 데이터 한 건을 만든다. */
export function buildRecord({ 정산월, 사료비총액, 조사료비총액 = 0, 관리비총액, 상태, 등록일시, farmName = '충만농장', unitId, placementDate }) {
  if (상태 !== STATUS_CONFIRMED) {
    // 아직 계산 전이므로 소별 상세는 비워둔다.
    return { 정산월, 사료비총액, 조사료비총액, 관리비총액, 상태, 등록일시, 소별상세: null }
  }

  const daysInMonth = getDaysInSettlementMonth(정산월)
  const result = calculateAllocation({
    // 조사료비는 사료비와 같은 사육일수 기준으로 합산 배분한다.
    feedCostTotal: Number(사료비총액) + Number(조사료비총액),
    mgmtCostTotal: 관리비총액,
    daysInMonth,
    settlementMonth: 정산월,
    farmName,
    unitId,
    placementDate,
  })

  return {
    정산월,
    사료비총액,
    조사료비총액,
    관리비총액,
    상태,
    등록일시,
    소별상세: toCattleDetails(sortRows(result.rows)),
  }
}

/** 이탈 개체를 위로, 그 아래 사육중 개체를 개체 번호 순으로 정렬한다. */
export function sortRows(rows) {
  const exceptions = rows.filter((r) => r.status !== '사육중').sort((a, b) => a.no - b.no)
  const normals = rows.filter((r) => r.status === '사육중').sort((a, b) => a.no - b.no)
  return [...exceptions, ...normals]
}

/**
 * 초기 목업. 충만농장은 2025년 9월 입식으로, 9·10월만 확정된 상태다.
 * 11·12월은 아직 입력 전이라 행 자체가 없다.
 * 9월(30일), 10월(31일)은 각 달의 실제 일수로 계산된다.
 */
export const INITIAL_RECORDS = [
  buildRecord({
    정산월: '2025년 10월',
    사료비총액: 2700000,
    조사료비총액: 324000,
    관리비총액: 1350000,
    상태: STATUS_CONFIRMED,
    등록일시: '2025-11-01 10:03',
  }),
  buildRecord({
    정산월: '2025년 9월',
    사료비총액: 2650000,
    조사료비총액: 318000,
    관리비총액: 1320000,
    상태: STATUS_CONFIRMED,
    등록일시: '2025-10-01 09:12',
  }),
]

/** 정산월 최신순 정렬 (예: 2025년 11월 → 10월 → 9월). */
export function sortRecordsByMonthDesc(records) {
  return [...records].sort((a, b) => monthIndex(b.정산월) - monthIndex(a.정산월))
}

/**
 * 신규 등록에서 고를 수 있는 정산월 목록 (최신순).
 * 이미 끝난 달 중에서 아직 저장된 데이터가 없는 달만 남긴다.
 */
export function getSelectableMonths(records, today = now(), placementDate) {
  const savedMonths = new Set(records.map((r) => r.정산월))
  const startLabel = placementDate
    ? formatMonthLabel(new Date(`${placementDate}T00:00:00`).getFullYear(), new Date(`${placementDate}T00:00:00`).getMonth() + 1)
    : PRODUCT_START_MONTH
  const startIndex = monthIndex(startLabel)
  const lastEndedIndex = monthIndex(getLastEndedMonth(today))

  const months = []
  for (let i = startIndex; i <= lastEndedIndex; i += 1) {
    // i = year * 12 + month 이므로 12월은 나머지가 0이 된다.
    const month = ((i - 1) % 12) + 1
    const year = Math.floor((i - month) / 12)
    const label = formatMonthLabel(year, month)
    if (!savedMonths.has(label)) months.push(label)
  }

  return months.reverse()
}

/**
 * 같은 정산월이 있으면 교체하고, 없으면 추가한다 (정산월 기준 upsert).
 * 임시저장 → 확정은 가능하지만, 확정 → 임시저장 역방향 저장은 무시한다.
 */
export function upsertRecord(records, record) {
  const index = records.findIndex((r) => r.정산월 === record.정산월)
  if (index === -1) return sortRecordsByMonthDesc([...records, record])

  const existing = records[index]
  if (existing.상태 === STATUS_CONFIRMED && record.상태 === STATUS_DRAFT) return records

  const next = [...records]
  next[index] = record
  return sortRecordsByMonthDesc(next)
}
