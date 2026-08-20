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
    '2026년 4월': [{ no: 36, status: '조기출하', exitDay: 26 }],
  },
}

export function getExitHistory(unitId) {
  return EXIT_HISTORY_BY_UNIT[unitId] ?? {}
}
