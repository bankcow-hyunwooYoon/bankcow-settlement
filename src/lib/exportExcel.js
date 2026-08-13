import * as XLSX from 'xlsx'
import { sortRecordsByMonthDesc, STATUS_CONFIRMED } from './records.js'
import { now } from './prototypeDate.js'

const FARM_NAME = '충만농장'

/** '충만농장_사료관리비_20260813.xlsx' */
function buildFileName(date = now()) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${FARM_NAME}_사료관리비_${yyyy}${mm}${dd}.xlsx`
}

/**
 * 반올림 후에도 개체별 배분액 합계가 보증금 총액과 일치하도록 잔여 원 단위를 배분한다.
 * 전체비중 기준을 사료비/관리비 중 무엇으로 할지 재무기획팀 확인 필요.
 */
function allocateDepositByWeight(cattleRows, totalDeposit) {
  const totalDays = cattleRows.reduce((sum, cattle) => sum + cattle.totalMgmtDays, 0)
  if (!totalDays || !totalDeposit) {
    return cattleRows.map((cattle) => ({ ...cattle, weight: 0, depositAllocation: 0 }))
  }

  const allocated = cattleRows.map((cattle) => {
    const exactAllocation = (totalDeposit * cattle.totalMgmtDays) / totalDays
    return {
      ...cattle,
      weight: cattle.totalMgmtDays / totalDays,
      depositAllocation: Math.floor(exactAllocation),
      fractional: exactAllocation - Math.floor(exactAllocation),
    }
  })
  let remainder = Math.round(totalDeposit - allocated.reduce((sum, cattle) => sum + cattle.depositAllocation, 0))
  allocated
    .slice()
    .sort((a, b) => b.fractional - a.fractional || a.name.localeCompare(b.name, 'ko'))
    .forEach((cattle) => {
      if (remainder > 0) {
        cattle.depositAllocation += 1
        remainder -= 1
      }
    })
  return allocated
}

/** 확정 월을 월별 요약·소별 상세·개체별 전체비중 및 보증금 시트로 내보낸다. */
export function buildWorkbook(records, mgmtDeposit = 0) {
  const confirmed = sortRecordsByMonthDesc(records.filter((r) => r.상태 === STATUS_CONFIRMED))
  if (confirmed.length === 0) return null

  const summaryRows = confirmed.map((record) => ({
    정산월: record.정산월,
    '사료비 총액': record.사료비총액,
    '관리비 총액': record.관리비총액,
    '사료관리비 합계': record.사료비총액 + record.관리비총액,
    상태: record.상태,
    등록일시: record.등록일시,
  }))

  // 확정된 모든 달의 소별 상세를 정산월 → 개체명(번호) 순으로 세로로 이어붙인다.
  // 화면 3은 예외 개체를 위로 고정하지만, 엑셀은 조회·대조가 쉽도록 개체명 순으로 정렬한다.
  const cattleNo = (name) => Number(name.match(/(\d+)호/)[1])
  const detailRows = confirmed.flatMap((record) =>
    [...record.소별상세]
      .sort((a, b) => cattleNo(a.개체명) - cattleNo(b.개체명))
      .map((cattle) => ({
        정산월: record.정산월,
        개체명: cattle.개체명,
        이력번호: cattle.이력번호 ?? '-',
        생년월일: cattle.생년월일 ?? '-',
        개월령: cattle.개월령 === undefined ? '-' : `${cattle.개월령}개월`,
        상태: cattle.상태,
        이탈월: cattle.이탈월 ?? '-',
        이탈일: cattle.이탈일 ? `${cattle.이탈일}일` : '-',
        배분상태: cattle.이전이탈여부 ? '이전 이탈 · 배분 제외' : '배분 대상',
        '사료비 사육일수': cattle.사료비사육일수,
        '사료비 금액': cattle.사료비금액,
        '관리비 사육일수': cattle.관리비사육일수,
        '관리비 금액': cattle.관리비금액,
        '사료관리비 합계': cattle.사료관리비합계,
      })),
  )

  const cattleTotals = new Map()
  detailRows.forEach((cattle) => {
    const existing = cattleTotals.get(cattle.개체명) ?? { name: cattle.개체명, totalMgmtDays: 0 }
    existing.totalMgmtDays += Number(cattle['관리비 사육일수']) || 0
    cattleTotals.set(cattle.개체명, existing)
  })
  const depositRows = allocateDepositByWeight(
    [...cattleTotals.values()].sort((a, b) => cattleNo(a.name) - cattleNo(b.name)),
    Number(mgmtDeposit) || 0,
  )
  const totalMgmtDays = depositRows.reduce((sum, cattle) => sum + cattle.totalMgmtDays, 0)
  const totalDepositAllocated = depositRows.reduce((sum, cattle) => sum + cattle.depositAllocation, 0)
  const guaranteeSheetRows = [
    ...depositRows.map((cattle) => ({
      개체명: cattle.name,
      '전체 사육일수(관리비 기준)': cattle.totalMgmtDays,
      '전체비중(%)': cattle.weight,
      '관리비보증금 배분액': cattle.depositAllocation,
    })),
    {
      개체명: '합계',
      '전체 사육일수(관리비 기준)': totalMgmtDays,
      '전체비중(%)': depositRows.length ? 1 : 0,
      '관리비보증금 배분액': totalDepositAllocated,
    },
  ]

  const workbook = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
  summarySheet['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(workbook, summarySheet, '월별 요약')

  const detailSheet = XLSX.utils.json_to_sheet(detailRows)
  detailSheet['!cols'] = [
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 13 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 10 },
    { wch: 22 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
  ]
  XLSX.utils.book_append_sheet(workbook, detailSheet, '소별 상세')

  const guaranteeSheet = XLSX.utils.json_to_sheet(guaranteeSheetRows)
  guaranteeSheet['!cols'] = [{ wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 22 }]
  const range = XLSX.utils.decode_range(guaranteeSheet['!ref'])
  for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
    const weightCell = guaranteeSheet[XLSX.utils.encode_cell({ r: row, c: 2 })]
    if (weightCell) weightCell.z = '0.00%'
    const depositCell = guaranteeSheet[XLSX.utils.encode_cell({ r: row, c: 3 })]
    if (depositCell) depositCell.z = '#,##0"원"'
  }
  XLSX.utils.book_append_sheet(workbook, guaranteeSheet, '개체별 전체비중 및 보증금')

  return workbook
}

/** 워크북을 만들어 파일로 다운로드한다. 확정된 달이 없으면 아무것도 하지 않는다. */
export function exportToExcel(records, mgmtDeposit) {
  const workbook = buildWorkbook(records, mgmtDeposit)
  if (!workbook) return false

  XLSX.writeFile(workbook, buildFileName())
  return true
}
