/**
 * 사육 단위별 개체 사고 이력 목업.
 * 실제 API에서는 breedingUnitId, cattleId, status, exitDate로 관리해야 한다.
 */
export const EXIT_HISTORY_BY_UNIT = {
  'unit-chungman-202606': {
    '2026년 6월': [
      { no: 7, status: '폐사', exitDay: 26 },
      { no: 28, status: '조기출하', exitDay: 29 },
    ],
    '2026년 7월': [
      { no: 16, status: '조기출하', exitDay: 13 },
      { no: 42, status: '폐사', exitDay: 27 },
      ...Array.from({ length: 10 }, (_, index) => ({ no: index + 31, status: '정상출하', exitDay: 25 })),
    ],
  },
  'unit-cheongjeong-202605': {
    '2026년 5월': [{ no: 12, status: '폐사', exitDay: 22 }],
    '2026년 6월': [{ no: 31, status: '조기출하', exitDay: 19 }],
    '2026년 7월': [{ no: 44, status: '폐사', exitDay: 25 }],
  },
  'unit-pureun-202603': {
    '2026년 3월': [{ no: 5, status: '조기출하', exitDay: 14 }],
    '2026년 4월': [{ no: 27, status: '폐사', exitDay: 22 }],
    '2026년 5월': [
      { no: 18, status: '조기출하', exitDay: 11 },
      { no: 39, status: '폐사', exitDay: 24 },
    ],
    '2026년 6월': [{ no: 43, status: '조기출하', exitDay: 9 }],
    '2026년 7월': [
      { no: 11, status: '폐사', exitDay: 7 },
      { no: 35, status: '조기출하', exitDay: 20 },
    ],
  },
  'unit-chungman-202509': {
    '2024년 7월': [{ no: 9, status: '폐사', exitDay: 16 }],
    '2025년 2월': [{ no: 24, status: '조기출하', exitDay: 20 }],
    '2025년 7월': [{ no: 41, status: '폐사', exitDay: 12 }],
    // 정상출하는 한 번에 끝나지 않고 여러 차수로 나뉠 수 있다.
    '2026년 3월': [1, 2, 3, 4, 5, 6, 7, 8, 10, 11].map((no) => ({ no, status: '정상출하', exitDay: 20 })),
    '2026년 4월': [
      { no: 36, status: '조기출하', exitDay: 26 },
      ...[12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((no) => ({ no, status: '정상출하', exitDay: 15 })),
    ],
    '2026년 5월': [22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 37, 38, 39, 40, 42, 43, 44, 45, 46, 47, 48, 49, 50]
      .map((no) => ({ no, status: '정상출하', exitDay: 18 })),
  },
}

/**
 * 개체별 입식일 목업. 같은 사육 단위라도 실제 입식일이 다른 경우를 반영한다.
 * 실제 API에서는 송아지별 placementDate를 내려주며, 이 목업은 그 데이터를 대신한다.
 */
export const PLACEMENT_BATCHES_BY_UNIT = {
  'unit-chungman-202606': [
    { from: 1, to: 30, placementDate: '2026-05-24' },
    { from: 31, to: 50, placementDate: '2026-06-05' },
  ],
  'unit-cheongjeong-202605': [
    { from: 1, to: 25, placementDate: '2026-05-18' },
    { from: 26, to: 50, placementDate: '2026-06-02' },
  ],
  'unit-pureun-202603': [
    { from: 1, to: 25, placementDate: '2026-03-08' },
    { from: 26, to: 50, placementDate: '2026-03-18' },
  ],
}

export function getExitHistory(unitId) {
  return EXIT_HISTORY_BY_UNIT[unitId] ?? {}
}

/** 해당 송아지의 실제 입식일. 개별 데이터가 없으면 사육 단위의 최초 입식일을 사용한다. */
export function getCattlePlacementDate(unitId, cattleNo, fallbackPlacementDate) {
  const batch = (PLACEMENT_BATCHES_BY_UNIT[unitId] ?? []).find(({ from, to }) => cattleNo >= from && cattleNo <= to)
  return batch?.placementDate ?? fallbackPlacementDate
}
