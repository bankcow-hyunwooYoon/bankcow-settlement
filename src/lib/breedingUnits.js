import { buildRecord, STATUS_CONFIRMED } from './records.js'

function confirmedRecord(farmName, unitId, placementDate, settlementMonth, feedCost, mgmtCost) {
  return buildRecord({
    정산월: settlementMonth,
    사료비총액: feedCost,
    // 조사료비 입력 기능 확인을 위한 목업값: 사료비의 약 12%, 천원 단위로 표시한다.
    조사료비총액: Math.round((feedCost * 0.12) / 1000) * 1000,
    관리비총액: mgmtCost,
    상태: STATUS_CONFIRMED,
    등록일시: `${settlementMonth.replace('년 ', '-').replace('월', '-01')} 09:00`,
    farmName,
    unitId,
    placementDate,
  })
}

function monthlyConfirmedRecords(farmName, unitId, placementDate, startYear, startMonth, count, feedCostBase, mgmtCostBase) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(startYear, startMonth - 1 + index, 1)
    const settlementMonth = `${date.getFullYear()}년 ${date.getMonth() + 1}월`
    return confirmedRecord(farmName, unitId, placementDate, settlementMonth, feedCostBase + index * 25000, mgmtCostBase + index * 12500)
  })
}

/**
 * 사육 단위(농장 + 입식 코호트)와 그 사육 단위의 월별 정산 레코드를 함께 관리하는 목업.
 * 실제 API에는 id, placementDate, headCount, linkedProductCount, breedingStatus, settlementRecords가 필요하다.
 */
export const BREEDING_UNITS = [
  {
    id: 'unit-chungman-202606',
    farmName: '충만농장 4호',
    placementDate: '2026-06-24',
    placementLabel: '2026.06.24 입식',
    headCount: 50,
    linkedProductCount: 4,
    breedingStatus: '사육중',
    initialRecords: [confirmedRecord('충만농장 4호', 'unit-chungman-202606', '2026-06-24', '2026년 6월', 2700000, 1350000)],
  },
  {
    id: 'unit-cheongjeong-202605',
    farmName: '청정농장 3호',
    placementDate: '2026-05-18',
    placementLabel: '2026.05 입식',
    headCount: 50,
    linkedProductCount: 3,
    breedingStatus: '사육중',
    initialRecords: [
      confirmedRecord('청정농장 3호', 'unit-cheongjeong-202605', '2026-05-18', '2026년 5월', 2150000, 1075000),
      confirmedRecord('청정농장 3호', 'unit-cheongjeong-202605', '2026-05-18', '2026년 6월', 2200000, 1100000),
      confirmedRecord('청정농장 3호', 'unit-cheongjeong-202605', '2026-05-18', '2026년 7월', 2250000, 1125000),
    ],
  },
  {
    id: 'unit-pureun-202603',
    farmName: '푸른농장 2호',
    placementDate: '2026-03-08',
    placementLabel: '2026.03 입식',
    headCount: 50,
    linkedProductCount: 2,
    breedingStatus: '사육중',
    initialRecords: [
      confirmedRecord('푸른농장 2호', 'unit-pureun-202603', '2026-03-08', '2026년 3월', 1800000, 900000),
      confirmedRecord('푸른농장 2호', 'unit-pureun-202603', '2026-03-08', '2026년 4월', 1850000, 925000),
      confirmedRecord('푸른농장 2호', 'unit-pureun-202603', '2026-03-08', '2026년 5월', 1900000, 950000),
    ],
  },
  {
    id: 'unit-chungman-202509',
    farmName: '오솔농장 1호',
    placementDate: '2024-06-01',
    placementLabel: '2024.06 입식',
    headCount: 50,
    linkedProductCount: 1,
    breedingStatus: '정산완료',
    finalSettlementMonths: 24,
    finalShipmentDate: '2026-05-18',
    initialRecords: monthlyConfirmedRecords('오솔농장 1호', 'unit-chungman-202509', '2024-06-01', 2024, 6, 24, 2400000, 1200000),
  },
]
