import { now } from './prototypeDate.js'
import { getCattlePlacementDate, getExitHistory } from './livestockHistory.js'

export const TOTAL_CATTLE_COUNT = 50
/** 첫 정산월(2025년 9월)과 일치하는 프로토타입 입식일. */
export const FARM_PLACEMENT_DATE = '2025년 9월 1일'

/** 상품의 사육 시작월. 이 달부터가 정산 대상이다. */
export const PRODUCT_START_MONTH = '2025년 9월'

/** '2025년 11월' → { year: 2025, month: 11 } */
export function parseSettlementMonth(label) {
  const [, year, month] = label.match(/(\d+)년\s*(\d+)월/)
  return { year: Number(year), month: Number(month) }
}

/** (2025, 11) → '2025년 11월' */
export function formatMonthLabel(year, month) {
  return `${year}년 ${month}월`
}

/** 월을 비교 가능한 정수로 바꾼다 (2025년 11월 → 24311). */
export function monthIndex(label) {
  const { year, month } = parseSettlementMonth(label)
  return year * 12 + month
}

/** 오늘이 속한 달의 직전 달, 즉 "마지막으로 끝난 달". */
export function getLastEndedMonth(today = now()) {
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  return month === 1 ? formatMonthLabel(year - 1, 12) : formatMonthLabel(year, month - 1)
}

/** 선택된 정산월의 실제 달력 일수 (윤년 포함). */
export function getDaysInSettlementMonth(label) {
  const { year, month } = parseSettlementMonth(label)
  return new Date(year, month, 0).getDate()
}

export function getExceptionCattle(settlementMonth, farmName = '충만농장', unitId) {
  const currentMonthIndex = monthIndex(settlementMonth)
  return Object.entries(getExitHistory(unitId)).flatMap(([exitMonth, cattleList]) => {
    if (monthIndex(exitMonth) > currentMonthIndex) return []
    return cattleList.map((cattle) => ({
      ...cattle,
      id: `c${cattle.no}`,
      name: `${farmName} ${cattle.no}호`,
      exitMonth,
      // 정산월과 이탈월이 같을 때만 이탈일까지의 일수가 발생한다.
      isPastExit: monthIndex(exitMonth) < currentMonthIndex,
    }))
  })
}

export function getCattleForMonth(settlementMonth, farmName = '충만농장', unitId, fallbackPlacementDate, headCount = TOTAL_CATTLE_COUNT, placementBatches) {
  const exceptionByNo = new Map(getExceptionCattle(settlementMonth, farmName, unitId).map((cattle) => [cattle.no, cattle]))
  return Array.from({ length: headCount }, (_, index) => index + 1).map(
    (no) => {
      const exception = exceptionByNo.get(no)
      const birthMonth = ((no * 7) % 12) + 1
      const birthDay = ((no * 11) % 27) + 1
      const birthYear = 2024
      const birthDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
      const { year, month } = parseSettlementMonth(settlementMonth)
      const ageInMonths = Math.max(0, (year - birthYear) * 12 + month - birthMonth)
      return {
        id: `c${no}`,
        no,
        name: `${farmName} ${no}호`,
        historyNo: `002-${String(202500000 + no).slice(-8)}`,
        birthDate,
        ageInMonths,
        status: exception?.status ?? '사육중',
        exitDay: exception?.exitDay ?? null,
        exitMonth: exception?.exitMonth ?? null,
        isPastExit: exception?.isPastExit ?? false,
        placementDate: getCattlePlacementDate(unitId, no, fallbackPlacementDate, placementBatches),
      }
    },
  )
}

// 기존 화면 호환용 기본 목업(2025년 10월 기준).
export const EXCEPTION_CATTLE = getExceptionCattle('2026년 7월', '충만농장', 'unit-chungman-202606')
export const NORMAL_CATTLE = getCattleForMonth('2026년 7월', '충만농장', 'unit-chungman-202606').filter((cattle) => cattle.status === '사육중')

/**
 * 개체별 사육일수.
 * 사육중 개체는 정산월의 실제 일수, 이탈 개체는 사료비=이탈일 전날까지 / 관리비=이탈일 당일까지.
 */
/**
 * 입식월에는 입식일을 포함하고, 아직 입식 전인 정산월에는 null을 반환한다.
 * 예: 7월 입식 송아지는 6월 정산에서 0일·0원이다.
 */
function getMonthStartDay(settlementMonth, placementDate) {
  if (!placementDate) return 1
  const placement = new Date(`${placementDate}T00:00:00`)
  const { year, month } = parseSettlementMonth(settlementMonth)
  const settlementMonthIndex = year * 12 + month
  const placementMonthIndex = placement.getFullYear() * 12 + placement.getMonth() + 1
  if (placementMonthIndex > settlementMonthIndex) return null
  return placement.getFullYear() === year && placement.getMonth() + 1 === month ? placement.getDate() : 1
}

function feedDaysOf(cattle, daysInMonth, settlementMonth, fallbackPlacementDate) {
  if (cattle.isPastExit) return 0
  const startDay = getMonthStartDay(settlementMonth, cattle.placementDate ?? fallbackPlacementDate)
  if (startDay === null) return 0
  const endDay = cattle.status === '사육중' ? daysInMonth : cattle.exitDay - 1
  return Math.max(0, endDay - startDay + 1)
}

function mgmtDaysOf(cattle, daysInMonth, settlementMonth, fallbackPlacementDate) {
  if (cattle.isPastExit) return 0
  const startDay = getMonthStartDay(settlementMonth, cattle.placementDate ?? fallbackPlacementDate)
  if (startDay === null) return 0
  const endDay = cattle.status === '사육중' ? daysInMonth : cattle.exitDay
  return Math.max(0, endDay - startDay + 1)
}

/**
 * 원 단위 배분값을 총액과 정확히 맞춘다.
 *
 * 각 금액을 먼저 버림 처리한 뒤, 남은 1원은 소수점이 큰 개체부터 한 번씩 배분한다.
 * 소수점까지 같으면 개체 번호가 작은 순서로 배분해 항상 같은 결과가 나오게 한다.
 */
function allocateWholeWon(rows, rawAmountKey, totalAmount) {
  const targetTotal = Math.round(Number(totalAmount) || 0)
  const allocations = rows.map((row) => {
    const rawAmount = Number(row[rawAmountKey]) || 0
    const baseAmount = Math.floor(rawAmount)
    return {
      id: row.id,
      no: row.no,
      baseAmount,
      fraction: rawAmount - baseAmount,
    }
  })

  const baseTotal = allocations.reduce((sum, allocation) => sum + allocation.baseAmount, 0)
  const remainder = targetTotal - baseTotal
  const ranked = [...allocations].sort((a, b) => (
    b.fraction - a.fraction || a.no - b.no
  ))
  const allocatedById = new Map(allocations.map((allocation) => [allocation.id, allocation.baseAmount]))

  // 총액은 정수이고 모든 원금액은 버림 처리했으므로, 잔여는 배분 대상 수보다 작다.
  for (let index = 0; index < remainder; index += 1) {
    const allocation = ranked[index]
    allocatedById.set(allocation.id, allocatedById.get(allocation.id) + 1)
  }
  return allocatedById
}

/** 정산월의 사료비/관리비 사육일수 합계. */
export function calculateTotalDays(daysInMonth, settlementMonth, farmName, unitId, placementDate, headCount = TOTAL_CATTLE_COUNT, placementBatches) {
  const allCattle = getCattleForMonth(settlementMonth, farmName, unitId, placementDate, headCount, placementBatches)
  return {
    totalFeedDays: allCattle.reduce((sum, c) => sum + feedDaysOf(c, daysInMonth, settlementMonth, placementDate), 0),
    totalMgmtDays: allCattle.reduce((sum, c) => sum + mgmtDaysOf(c, daysInMonth, settlementMonth, placementDate), 0),
  }
}

/**
 * 개체별 배분 결과를 계산한다.
 * 금액은 반올림하지 않은 정확한 값으로 들고 있고, 반올림은 표시 시점에만 한다.
 */
export function calculateAllocation({ feedCostTotal, mgmtCostTotal, daysInMonth, settlementMonth, farmName, unitId, placementDate, headCount = TOTAL_CATTLE_COUNT, placementBatches }) {
  const allCattle = getCattleForMonth(settlementMonth, farmName, unitId, placementDate, headCount, placementBatches)
  const { totalFeedDays, totalMgmtDays } = calculateTotalDays(daysInMonth, settlementMonth, farmName, unitId, placementDate, headCount, placementBatches)

  const feedUnitPrice = totalFeedDays > 0 ? feedCostTotal / totalFeedDays : 0
  const mgmtUnitPrice = totalMgmtDays > 0 ? mgmtCostTotal / totalMgmtDays : 0

  const rawRows = allCattle.map((cattle) => {
    const feedDays = feedDaysOf(cattle, daysInMonth, settlementMonth, placementDate)
    const mgmtDays = mgmtDaysOf(cattle, daysInMonth, settlementMonth, placementDate)
    const feedAmount = feedUnitPrice * feedDays
    const mgmtAmount = mgmtUnitPrice * mgmtDays
    return {
      ...cattle,
      feedDays,
      mgmtDays,
      feedAmount,
      mgmtAmount,
      totalAmount: feedAmount + mgmtAmount,
    }
  })

  // 검증은 반올림 전 정확한 값의 합으로 한다.
  const exactFeedSum = rawRows.reduce((sum, r) => sum + r.feedAmount, 0)
  const exactMgmtSum = rawRows.reduce((sum, r) => sum + r.mgmtAmount, 0)

  // 배분 대상 일수가 없다면 0원으로 남겨 검증 실패를 노출한다. 존재하지 않는
  // 사육일수에 총액을 억지로 나누거나 잔액을 임의 개체에 몰아주지 않는다.
  const allocatedFeedById = allocateWholeWon(rawRows, 'feedAmount', totalFeedDays > 0 ? feedCostTotal : 0)
  const allocatedMgmtById = allocateWholeWon(rawRows, 'mgmtAmount', totalMgmtDays > 0 ? mgmtCostTotal : 0)
  const rows = rawRows.map((row) => {
    const feedAmount = allocatedFeedById.get(row.id)
    const mgmtAmount = allocatedMgmtById.get(row.id)
    return {
      ...row,
      rawFeedAmount: row.feedAmount,
      rawMgmtAmount: row.mgmtAmount,
      feedAmount,
      mgmtAmount,
      totalAmount: feedAmount + mgmtAmount,
    }
  })

  // 부동소수점 오차만 허용한다.
  const EPSILON = 0.000001
  const feedMatches = Math.abs(exactFeedSum - feedCostTotal) < EPSILON
  const mgmtMatches = Math.abs(exactMgmtSum - mgmtCostTotal) < EPSILON

  return {
    rows,
    totalFeedDays,
    totalMgmtDays,
    feedUnitPrice,
    mgmtUnitPrice,
    exactFeedSum,
    exactMgmtSum,
    exactTotalSum: exactFeedSum + exactMgmtSum,
    allocatedFeedSum: rows.reduce((sum, row) => sum + row.feedAmount, 0),
    allocatedMgmtSum: rows.reduce((sum, row) => sum + row.mgmtAmount, 0),
    isVerified: feedMatches && mgmtMatches,
    feedDiff: exactFeedSum - feedCostTotal,
    mgmtDiff: exactMgmtSum - mgmtCostTotal,
  }
}
