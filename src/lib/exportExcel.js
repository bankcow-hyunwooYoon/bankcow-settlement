import XLSX from 'xlsx-js-style'
import JSZip from 'jszip'
import { sortRecordsByMonthDesc, STATUS_CONFIRMED } from './records.js'
import { now } from './prototypeDate.js'
import { getExpectedProductCost } from './expectedProductCosts.js'
import { calculateFarmManagementGuarantees } from './farmManagementGuarantee.js'

const FARM_NAME = '충만농장'

const BORDER = { style: 'thin', color: { rgb: 'D9E1F2' } }

function applyStandardSheetStyle(sheet, {
  title,
  lastColumn,
  dataRowCount,
  headerFills,
  numericColumns,
  columnWidths,
  freeze,
  hasTotalRow = false,
  wrapColumns = [],
}) {
  // XLSX 행 인덱스는 0부터 시작한다. 제목·헤더 뒤의 마지막 데이터 행을 가리킨다.
  const lastDataRow = 1 + dataRowCount
  const titleRange = `A1:${XLSX.utils.encode_col(lastColumn)}1`
  sheet['!merges'] = [XLSX.utils.decode_range(titleRange)]
  sheet['!freeze'] = freeze
  sheet['!autofilter'] = { ref: `A2:${XLSX.utils.encode_col(lastColumn)}${lastDataRow + 1}` }
  sheet['!cols'] = columnWidths.map((wch) => ({ wch }))
  sheet['!rows'] = [{ hpt: 28 }, { hpt: 36 }]
  sheet.A1.s = {
    fill: { fgColor: { rgb: '1F4E78' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
    alignment: { horizontal: 'left', vertical: 'center' },
  }
  for (let col = 0; col <= lastColumn; col += 1) {
    const header = sheet[XLSX.utils.encode_cell({ r: 1, c: col })]
    header.s = {
      fill: { fgColor: { rgb: headerFills[col] ?? 'D9E2F3' } },
      font: { bold: true, color: { rgb: '1F1F1F' }, sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
    }
  }
  for (let row = 2; row <= lastDataRow; row += 1) {
    for (let col = 0; col <= lastColumn; col += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })]
      cell.s = {
        alignment: {
          horizontal: numericColumns.includes(col) ? 'right' : 'left',
          vertical: 'center',
          wrapText: wrapColumns.includes(col),
        },
        numFmt: numericColumns.includes(col) ? '#,##0;[Red](#,##0);-' : '@',
        border: { bottom: BORDER },
      }
    }
  }
  if (hasTotalRow) {
    for (let col = 0; col <= lastColumn; col += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: lastDataRow, c: col })]
      cell.s = {
        ...(cell.s ?? {}),
        fill: { fgColor: { rgb: 'D9EAD3' } },
        font: { bold: true, color: { rgb: '1F1F1F' } },
        border: { top: { style: 'medium', color: { rgb: '70AD47' } }, bottom: BORDER },
      }
    }
  }
}

function applyComparisonSheetStyle(sheet, dataRowCount) {
  const lastRow = 3 + dataRowCount
  const headerGroups = [{ range: 'A2:D2', label: '개체 식별 정보', color: '595959' }]
  sheet['!merges'] = [
    XLSX.utils.decode_range('A1:T1'),
    ...headerGroups.map((group) => XLSX.utils.decode_range(group.range)),
  ]
  sheet['!freeze'] = { xSplit: 4, ySplit: 3, topLeftCell: 'E4', activePane: 'bottomRight', state: 'frozen' }
  sheet['!autofilter'] = { ref: `A3:T${lastRow}` }
  sheet['!rows'] = [{ hpt: 28 }, { hpt: 25 }, { hpt: 40 }]
  sheet['!cols'] = [
    { wch: 18 }, { wch: 16 }, { wch: 13 }, { wch: 16 },
    ...Array.from({ length: 16 }, () => ({ wch: 20 })),
  ]

  sheet.A1.s = {
    fill: { fgColor: { rgb: '1F4E78' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
    alignment: { horizontal: 'left', vertical: 'center' },
  }
  headerGroups.forEach((group) => {
    const range = XLSX.utils.decode_range(group.range)
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: 1, c: col })]
      cell.s = {
        fill: { fgColor: { rgb: group.color } },
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
      }
    }
  })

  const topHeaderKinds = [
    { label: '예상', color: '4472C4' },
    { label: '실제', color: '548235' },
    { label: '차이', color: 'BF9000' },
  ]
  for (let col = 4; col < 20; col += 1) {
    const kind = col === 18
      ? { label: '실제', color: '548235' }
      : col === 19
        ? { label: '수익(A)', color: '1F4E78' }
      : topHeaderKinds[(col - 4) % 3]
    const cell = sheet[XLSX.utils.encode_cell({ r: 1, c: col })]
    cell.v = kind.label
    cell.t = 's'
    cell.s = {
      fill: { fgColor: { rgb: kind.color } },
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
    }
  }

  const headerFills = [
    'F2F2F2', 'F2F2F2', 'F2F2F2', 'F2F2F2',
    'D9EAF7', 'E2F0D9', 'FFF2CC',
    'D9EAF7', 'E2F0D9', 'FFF2CC',
    'D9EAF7', 'E2F0D9', 'FFF2CC',
    'D9EAF7', 'E2F0D9', 'FFF2CC',
    'D9EAF7', 'E2F0D9', 'E2F0D9', 'D9E2F3',
  ]
  headerFills.forEach((fill, col) => {
    const cell = sheet[XLSX.utils.encode_cell({ r: 2, c: col })]
    cell.s = {
      fill: { fgColor: { rgb: fill } },
      font: { bold: true, color: { rgb: '1F1F1F' }, sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
    }
  })

  for (let row = 3; row < lastRow; row += 1) {
    for (let col = 0; col < 20; col += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })]
      cell.s = {
        alignment: { horizontal: col < 4 ? 'left' : 'right', vertical: 'center' },
        numFmt: col < 4 ? '@' : '#,##0;[Red](#,##0);-',
        border: { bottom: BORDER },
      }
    }
  }
  for (let col = 0; col < 20; col += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: lastRow - 1, c: col })]
    cell.s = {
      ...(cell.s ?? {}),
      fill: { fgColor: { rgb: 'D9EAD3' } },
      font: { bold: true, color: { rgb: '1F1F1F' } },
      border: { top: { style: 'medium', color: { rgb: '70AD47' } }, bottom: BORDER },
    }
  }
}

/** 소별 상세에서 이탈 상태를 행과 상태 셀에 함께 강조한다. */
function applyExitStatusHighlights(sheet, detailDataRows) {
  detailDataRows.forEach((cattle, index) => {
    const style = cattle.이전이탈여부
      // 이탈한 달이 지난 행은 0원·배분 제외 상태이므로 회색으로 표시한다.
      ? { row: 'F3F4F6', strong: 'E5E7EB', strongText: '6B7280' }
      : cattle.상태 === '폐사'
        ? { row: 'FDE9E7', strong: 'C00000' }
        : cattle.상태 === '조기출하'
          ? { row: 'FCE4D6', strong: 'C65911' }
          : cattle.상태 === '정상출하'
            // 정상출하는 기본 상태이므로 행 전체를 칠하지 않고 상태 셀만 태그처럼 강조한다.
            ? { row: null, strong: '548235' }
            : null
    if (!style) return

    const row = index + 2
    for (let col = 0; col <= 13; col += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })]
      if (style.row) {
        cell.s = {
          ...(cell.s ?? {}),
          fill: { fgColor: { rgb: style.row } },
        }
      }
    }
    const statusCell = sheet[XLSX.utils.encode_cell({ r: row, c: 5 })]
    statusCell.s = {
      ...(statusCell.s ?? {}),
      fill: { fgColor: { rgb: style.strong } },
      font: { bold: true, color: { rgb: style.strongText ?? 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    }
  })
}

/** '충만농장_사료관리비_20260813.xlsx' */
function buildFileName(date = now()) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${FARM_NAME}_사료관리비_${yyyy}${mm}${dd}.xlsx`
}

async function downloadWorkbook(workbook, fileName) {
  const zip = await JSZip.loadAsync(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }))
  // xlsx-js-style은 셀 스타일은 지원하지만 고정 창을 출력하지 않아, 각 시트의 OpenXML 뷰 설정을 추가한다.
  await Promise.all(workbook.SheetNames.map(async (sheetName, index) => {
    const freeze = workbook.Sheets[sheetName]['!freeze']
    if (!freeze) return
    const sheetPath = `xl/worksheets/sheet${index + 1}.xml`
    const sheetXml = await zip.file(sheetPath).async('string')
    const frozenSheetXml = sheetXml.replace(
      /<sheetViews>[\s\S]*?<\/sheetViews>/,
      `<sheetViews><sheetView workbookViewId="0"><pane xSplit="${freeze.xSplit}" ySplit="${freeze.ySplit}" topLeftCell="${freeze.topLeftCell}" activePane="${freeze.activePane}" state="frozen"/><selection pane="${freeze.activePane}" activeCell="${freeze.topLeftCell}" sqref="${freeze.topLeftCell}"/></sheetView></sheetViews>`,
    )
    zip.file(sheetPath, frozenSheetXml)
  }))
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 확정 월을 월별 요약·소별 상세 시트로 내보낸다. */
export function buildWorkbook(records, unit, { includeFarmManagementGuarantee = false } = {}) {
  const confirmed = sortRecordsByMonthDesc(records.filter((r) => r.상태 === STATUS_CONFIRMED))
  if (confirmed.length === 0) return null

  const summaryRows = confirmed.map((record) => ({
    정산월: record.정산월,
    '사료비 총액': record.사료비총액,
    '조사료비 총액': record.조사료비총액 ?? 0,
    '사료비 배분 합계(사료비+조사료비)': Number(record.사료비총액) + Number(record.조사료비총액 ?? 0),
    '관리비 총액': record.관리비총액,
    '사료관리비 합계': Number(record.사료비총액) + Number(record.조사료비총액 ?? 0) + Number(record.관리비총액),
    등록일시: record.등록일시,
  }))
  const summaryTotal = summaryRows.reduce(
    (total, row) => ({
      정산월: '전체 합계',
      '사료비 총액': total['사료비 총액'] + Number(row['사료비 총액']),
      '조사료비 총액': total['조사료비 총액'] + Number(row['조사료비 총액']),
      '사료비 배분 합계(사료비+조사료비)': total['사료비 배분 합계(사료비+조사료비)'] + Number(row['사료비 배분 합계(사료비+조사료비)']),
      '관리비 총액': total['관리비 총액'] + Number(row['관리비 총액']),
      '사료관리비 합계': total['사료관리비 합계'] + Number(row['사료관리비 합계']),
      등록일시: '-',
    }),
    {
      정산월: '전체 합계',
      '사료비 총액': 0,
      '조사료비 총액': 0,
      '사료비 배분 합계(사료비+조사료비)': 0,
      '관리비 총액': 0,
      '사료관리비 합계': 0,
      등록일시: '-',
    },
  )

  // 확정된 모든 달의 소별 상세를 정산월 → 개체명(번호) 순으로 세로로 이어붙인다.
  // 화면 3은 예외 개체를 위로 고정하지만, 엑셀은 조회·대조가 쉽도록 개체명 순으로 정렬한다.
  const cattleNo = (name) => Number(name.match(/(\d+)호/)[1])
  const detailDataRows = confirmed.flatMap((record) =>
    [...record.소별상세]
      .sort((a, b) => cattleNo(a.개체명) - cattleNo(b.개체명))
      .map((cattle) => {
        // 이전 저장 데이터의 사고 필드도 이탈 필드로 읽어 호환한다.
        const exitMonth = cattle.이탈월 ?? cattle.사고월
        const exitDay = cattle.이탈일 ?? cattle.사고일
        const isPastExit = cattle.이전이탈여부 ?? cattle.이전사고여부
        return {
          정산월: record.정산월,
          개체명: cattle.개체명,
          이력번호: cattle.이력번호 ?? '-',
          생년월일: cattle.생년월일 ?? '-',
          개월령: cattle.개월령 === undefined ? '-' : `${cattle.개월령}개월`,
          // 정산완료 농장은 최종 출하 정산 문서이므로, 사고 이력이 없는 개체를 정상출하로 표시한다.
          상태: unit.breedingStatus === '정산완료' && cattle.상태 === '사육중' ? '정상출하' : cattle.상태,
          이탈월: exitMonth ?? '-',
          이탈일: exitDay ? `${exitDay}일` : '-',
          배분상태: isPastExit ? '이전 이탈 · 배분 제외' : '배분 대상',
          // 이탈월 행과 이후 0원 행의 색상을 구분하기 위한 시트 내부 값이다.
          이전이탈여부: Boolean(isPastExit),
          '사료비 사육일수': cattle.사료비사육일수,
          '사료비 금액': cattle.사료비금액,
          '관리비 사육일수': cattle.관리비사육일수,
          '관리비 금액': cattle.관리비금액,
          '사료관리비 합계': cattle.사료관리비합계,
        }
      }),
  )

  // 소별 상세 시트 마지막 행에서 모든 확정 월의 사육일수와 배분 금액을 바로 대조할 수 있게 한다.
  const detailTotals = detailDataRows.reduce(
    (totals, cattle) => ({
      feedDays: totals.feedDays + (Number(cattle['사료비 사육일수']) || 0),
      feedAmount: totals.feedAmount + (Number(cattle['사료비 금액']) || 0),
      mgmtDays: totals.mgmtDays + (Number(cattle['관리비 사육일수']) || 0),
      mgmtAmount: totals.mgmtAmount + (Number(cattle['관리비 금액']) || 0),
      totalAmount: totals.totalAmount + (Number(cattle['사료관리비 합계']) || 0),
    }),
    { feedDays: 0, feedAmount: 0, mgmtDays: 0, mgmtAmount: 0, totalAmount: 0 },
  )
  const detailRows = [
    ...detailDataRows,
    {
      정산월: '전체 합계',
      개체명: '합계',
      이력번호: '-',
      생년월일: '-',
      개월령: '-',
      상태: '-',
      이탈월: '-',
      이탈일: '-',
      배분상태: '-',
      '사료비 사육일수': detailTotals.feedDays,
      '사료비 금액': detailTotals.feedAmount,
      '관리비 사육일수': detailTotals.mgmtDays,
      '관리비 금액': detailTotals.mgmtAmount,
      '사료관리비 합계': detailTotals.totalAmount,
    },
  ]

  // 투자상품 생성 시점의 예상 원가와, 확정된 월별 실제 사료·조사료·관리비를 소별로 비교한다.
  // 기초자산·발행제비용은 현 기능에서 변경하지 않는 고정 원가로 보고 실제값에도 동일하게 반영한다.
  const actualCostByCattle = new Map()
  const guaranteeByCattle = calculateFarmManagementGuarantees(unit, includeFarmManagementGuarantee)
  detailDataRows.forEach((cattle) => {
    const existing = actualCostByCattle.get(cattle.개체명) ?? {
      name: cattle.개체명,
      historyNo: cattle.이력번호,
      feedCost: 0,
      mgmtCost: 0,
    }
    existing.feedCost += Number(cattle['사료비 금액']) || 0
    existing.mgmtCost += Number(cattle['관리비 금액']) || 0
    actualCostByCattle.set(cattle.개체명, existing)
  })
  const comparisonRows = [...actualCostByCattle.values()]
    .sort((a, b) => cattleNo(a.name) - cattleNo(b.name))
    .map((actual) => {
      const expected = getExpectedProductCost(actual.name, unit)
      const farmManagementGuarantee = guaranteeByCattle.get(actual.name) ?? 0
      const actualTotal = expected.baseAsset + actual.feedCost + actual.mgmtCost + expected.issuanceCost + farmManagementGuarantee
      return {
        증권: expected.securityName,
        개체명: expected.productName,
        입식일: expected.placementDate,
        이력번호: actual.historyNo,
        '기초자산(예상)': expected.baseAsset,
        '기초자산(실제)': expected.baseAsset,
        '기초자산 차이(실제-예상)': 0,
        '사료비(예상)': expected.feedCost,
        '사료비(실제·조사료 포함)': actual.feedCost,
        '사료비 차이(실제-예상)': actual.feedCost - expected.feedCost,
        '관리비(예상)': expected.mgmtCost,
        '관리비(실제)': actual.mgmtCost,
        '관리비 차이(실제-예상)': actual.mgmtCost - expected.mgmtCost,
        '발행제비용(예상)': expected.issuanceCost,
        '발행제비용(실제)': expected.issuanceCost,
        '발행제비용 차이(실제-예상)': 0,
        '농가관리비보증금(실제)': farmManagementGuarantee,
        '모집금액(예상)': expected.fundraisingAmount,
        '투입원가 합계(실제)': actualTotal,
        '수익(A)': expected.fundraisingAmount - actualTotal,
      }
    })
  const comparisonAmountKeys = [
    '기초자산(예상)', '기초자산(실제)', '기초자산 차이(실제-예상)',
    '사료비(예상)', '사료비(실제·조사료 포함)', '사료비 차이(실제-예상)',
    '관리비(예상)', '관리비(실제)', '관리비 차이(실제-예상)',
    '발행제비용(예상)', '발행제비용(실제)', '발행제비용 차이(실제-예상)',
    '모집금액(예상)', '농가관리비보증금(실제)', '투입원가 합계(실제)', '수익(A)',
  ]
  const comparisonTotal = comparisonAmountKeys.reduce(
    (total, key) => ({ ...total, [key]: comparisonRows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0) }),
    { 증권: '-', 개체명: '합계', 입식일: '-', 이력번호: '-' },
  )

  const workbook = XLSX.utils.book_new()

  const summaryHeaders = ['정산월', '사료비 총액', '조사료비 총액', '사료비 배분 합계(사료비+조사료비)', '관리비 총액', '사료관리비 합계', '등록일시']
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['월별 사료관리비 요약'],
    summaryHeaders,
    ...summaryRows.map((row) => summaryHeaders.map((header) => row[header])),
    summaryHeaders.map((header) => summaryTotal[header]),
  ])
  applyStandardSheetStyle(summarySheet, {
    title: '월별 사료관리비 요약',
    lastColumn: 6,
    dataRowCount: summaryRows.length + 1,
    headerFills: ['F2F2F2', 'D9EAF7', 'D9EAF7', 'D9EAF7', 'E2F0D9', 'D9EAD3', 'F2F2F2'],
    numericColumns: [1, 2, 3, 4, 5],
    columnWidths: [14, 15, 15, 28, 15, 17, 18],
    freeze: { xSplit: 1, ySplit: 2, topLeftCell: 'B3', activePane: 'bottomRight', state: 'frozen' },
    hasTotalRow: true,
  })
  XLSX.utils.book_append_sheet(workbook, summarySheet, '월별 요약')

  const detailHeaders = ['정산월', '개체명', '이력번호', '생년월일', '개월령', '상태', '이탈월', '이탈일', '배분상태', '사료비 사육일수', '사료비 금액', '관리비 사육일수', '관리비 금액', '사료관리비 합계']
  const detailSheet = XLSX.utils.aoa_to_sheet([
    ['송아지별 사료관리비 상세'],
    detailHeaders,
    ...detailRows.map((row) => detailHeaders.map((header) => row[header])),
  ])
  applyStandardSheetStyle(detailSheet, {
    title: '송아지별 사료관리비 상세',
    lastColumn: 13,
    dataRowCount: detailRows.length,
    headerFills: ['F2F2F2', 'F2F2F2', 'F2F2F2', 'F2F2F2', 'F2F2F2', 'F2F2F2', 'F2F2F2', 'F2F2F2', 'F2F2F2', 'D9EAF7', 'D9EAF7', 'E2F0D9', 'E2F0D9', 'D9EAD3'],
    numericColumns: [4, 9, 10, 11, 12, 13],
    columnWidths: [14, 16, 16, 13, 10, 10, 14, 10, 22, 16, 16, 16, 16, 18],
    freeze: { xSplit: 4, ySplit: 2, topLeftCell: 'E3', activePane: 'bottomRight', state: 'frozen' },
    hasTotalRow: true,
  })
  applyExitStatusHighlights(detailSheet, detailDataRows)
  XLSX.utils.book_append_sheet(workbook, detailSheet, '송아지별 상세')

  const comparisonHeaders = [
    '증권', '개체명', '입식일', '이력번호',
    '기초자산(예상)', '기초자산(실제)', '기초자산 차이(실제-예상)',
    '사료비(예상)', '사료비(실제·조사료 포함)', '사료비 차이(실제-예상)',
    '관리비(예상)', '관리비(실제)', '관리비 차이(실제-예상)',
    '발행제비용(예상)', '발행제비용(실제)', '발행제비용 차이(실제-예상)',
    '모집금액(예상)', '농가관리비보증금(실제)', '투입원가 합계(실제)', '수익(A)',
  ]
  const comparisonSheet = XLSX.utils.aoa_to_sheet([
    ['예상·실제 원가 비교'],
    ['개체 식별 정보', '', '', '', '예상', '실제', '차이', '예상', '실제', '차이', '예상', '실제', '차이', '예상', '실제', '차이', '예상', '실제', '실제', '수익(A)'],
    comparisonHeaders,
    ...[...comparisonRows, comparisonTotal].map((row) => comparisonHeaders.map((header) => row[header])),
  ])
  applyComparisonSheetStyle(comparisonSheet, comparisonRows.length + 1)
  XLSX.utils.book_append_sheet(workbook, comparisonSheet, '예상·실제 원가 비교')

  return workbook
}

/** 워크북을 만들어 파일로 다운로드한다. 확정된 달이 없으면 아무것도 하지 않는다. */
export async function exportToExcel(records, unit, options) {
  const workbook = buildWorkbook(records, unit, options)
  if (!workbook) return false

  await downloadWorkbook(workbook, buildFileName())
  return true
}
