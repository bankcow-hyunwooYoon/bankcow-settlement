import { getExitHistory } from './livestockHistory.js'

const MONTHLY_GUARANTEE = 2000
const DEATH_RATE_LIMIT = 0.01

function getMonthDistance(startDate, endDate) {
  return (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth()
}

/** 사육 단위 전체의 폐사율과 보증금 기본 지급 가능 여부를 반환한다. */
export function getFarmManagementGuaranteeStatus(unit) {
  const exits = Object.values(getExitHistory(unit.id)).flat()
  const deathCount = exits.filter((cattle) => cattle.status === '폐사').length
  const deathRate = unit.headCount ? deathCount / unit.headCount : 0
  return {
    deathCount,
    deathRate,
    isEligibleByDeathRate: deathRate < DEATH_RATE_LIMIT,
  }
}

/**
 * 정상출하 개체의 농가관리비보증금을 계산한다.
 * 첫 달은 입식일과 무관하게 1개월, 마지막 달만 출하일까지 일할 계산한다.
 * 폐사·조기출하 개체는 지급 대상에서 제외한다.
 */
export function calculateFarmManagementGuarantees(unit, shouldPay) {
  const allocations = new Map()
  if (!shouldPay || unit.breedingStatus !== '정산완료' || !unit.finalShipmentDate) return allocations

  const startDate = new Date(`${unit.placementDate}T00:00:00`)
  const finalDate = new Date(`${unit.finalShipmentDate}T00:00:00`)
  const exceptionNos = new Set(Object.values(getExitHistory(unit.id)).flat().map((cattle) => cattle.no))
  const monthsBetween = getMonthDistance(startDate, finalDate)
  const daysInFinalMonth = new Date(finalDate.getFullYear(), finalDate.getMonth() + 1, 0).getDate()
  const eligibleMonths = monthsBetween === 0
    ? 1
    : 1 + Math.max(0, monthsBetween - 1) + finalDate.getDate() / daysInFinalMonth
  const amount = Math.round(eligibleMonths * MONTHLY_GUARANTEE)

  for (let no = 1; no <= unit.headCount; no += 1) {
    if (!exceptionNos.has(no)) allocations.set(`${unit.farmName} ${no}호`, amount)
  }
  return allocations
}
