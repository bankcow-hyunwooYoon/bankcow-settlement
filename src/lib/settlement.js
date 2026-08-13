import { now } from './prototypeDate.js'

export const TOTAL_CATTLE_COUNT = 50
/** 첫 정산월(2025년 9월)과 일치하는 프로토타입 입식일. */
export const FARM_PLACEMENT_DATE = '2025년 9월 1일'

/** 상품 단위로 설정된 관리비보증금. 매월 계산 대상이 아니라 출하 정산 시 1회 지급된다. */
export const MGMT_DEPOSIT_PER_PRODUCT = 3000000

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

/**
 * 개체별 이탈 이력 목업. 실제 서비스에서는 개체 이력 데이터로 대체한다.
 * 이탈한 개체는 이후 정산월에도 상태와 이탈일이 유지되지만, 사육일수와 배분금액은 0이다.
 */
const CATTLE_EXIT_HISTORY = {
  '2025년 9월': [
    { no: 7, status: '폐사', exitDay: 11 },
    { no: 28, status: '조기출하', exitDay: 23 },
  ],
  '2025년 10월': [
    { no: 12, status: '폐사', exitDay: 8 },
    { no: 31, status: '폐사', exitDay: 19 },
    { no: 44, status: '조기출하', exitDay: 25 },
  ],
  '2025년 11월': [
    { no: 5, status: '폐사', exitDay: 14 },
    { no: 37, status: '조기출하', exitDay: 22 },
  ],
  '2025년 12월': [
    { no: 9, status: '폐사', exitDay: 6 },
    { no: 26, status: '조기출하', exitDay: 17 },
    { no: 48, status: '폐사', exitDay: 28 },
  ],
}

export function getExceptionCattle(settlementMonth) {
  const currentMonthIndex = monthIndex(settlementMonth)
  return Object.entries(CATTLE_EXIT_HISTORY).flatMap(([exitMonth, cattleList]) => {
    if (monthIndex(exitMonth) > currentMonthIndex) return []
    return cattleList.map((cattle) => ({
      ...cattle,
      id: `c${cattle.no}`,
      name: `충만농장 ${cattle.no}호`,
      exitMonth,
      // 정산월과 이탈월이 같을 때만 이탈일까지의 일수가 발생한다.
      isPastExit: monthIndex(exitMonth) < currentMonthIndex,
    }))
  })
}

export function getCattleForMonth(settlementMonth) {
  const exceptionByNo = new Map(getExceptionCattle(settlementMonth).map((cattle) => [cattle.no, cattle]))
  return Array.from({ length: TOTAL_CATTLE_COUNT }, (_, index) => index + 1).map(
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
        name: `충만농장 ${no}호`,
        historyNo: `002-${String(202500000 + no).slice(-8)}`,
        birthDate,
        ageInMonths,
        status: exception?.status ?? '정상',
        exitDay: exception?.exitDay ?? null,
        exitMonth: exception?.exitMonth ?? null,
        isPastExit: exception?.isPastExit ?? false,
      }
    },
  )
}

// 기존 화면 호환용 기본 목업(2025년 10월 기준).
export const EXCEPTION_CATTLE = getExceptionCattle('2025년 10월')
export const NORMAL_CATTLE = getCattleForMonth('2025년 10월').filter((cattle) => cattle.status === '정상')

/**
 * 개체별 사육일수.
 * 정상 소는 정산월의 실제 일수, 예외 소는 사료비=이탈일 전날까지 / 관리비=이탈일 당일까지.
 */
function feedDaysOf(cattle, daysInMonth) {
  if (cattle.isPastExit) return 0
  return cattle.status === '정상' ? daysInMonth : cattle.exitDay - 1
}

function mgmtDaysOf(cattle, daysInMonth) {
  if (cattle.isPastExit) return 0
  return cattle.status === '정상' ? daysInMonth : cattle.exitDay
}

/** 정산월의 사료비/관리비 사육일수 합계. */
export function calculateTotalDays(daysInMonth, settlementMonth) {
  const allCattle = getCattleForMonth(settlementMonth)
  return {
    totalFeedDays: allCattle.reduce((sum, c) => sum + feedDaysOf(c, daysInMonth), 0),
    totalMgmtDays: allCattle.reduce((sum, c) => sum + mgmtDaysOf(c, daysInMonth), 0),
  }
}

/**
 * 개체별 배분 결과를 계산한다.
 * 금액은 반올림하지 않은 정확한 값으로 들고 있고, 반올림은 표시 시점에만 한다.
 */
export function calculateAllocation({ feedCostTotal, mgmtCostTotal, daysInMonth, settlementMonth }) {
  const allCattle = getCattleForMonth(settlementMonth)
  const { totalFeedDays, totalMgmtDays } = calculateTotalDays(daysInMonth, settlementMonth)

  const feedUnitPrice = feedCostTotal / totalFeedDays
  const mgmtUnitPrice = mgmtCostTotal / totalMgmtDays

  const rows = allCattle.map((cattle) => {
    const feedDays = feedDaysOf(cattle, daysInMonth)
    const mgmtDays = mgmtDaysOf(cattle, daysInMonth)
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
  const exactFeedSum = rows.reduce((sum, r) => sum + r.feedAmount, 0)
  const exactMgmtSum = rows.reduce((sum, r) => sum + r.mgmtAmount, 0)

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
    isVerified: feedMatches && mgmtMatches,
    feedDiff: exactFeedSum - feedCostTotal,
    mgmtDiff: exactMgmtSum - mgmtCostTotal,
  }
}
