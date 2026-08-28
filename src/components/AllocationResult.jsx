import { useMemo } from 'react'
import CattleStatusBadge from './CattleStatusBadge.jsx'
import { formatWon } from '../lib/format.js'

/** 총액 입력 여부와 무관하게 계산되는 사육일수 합계. */
/** 긴 소별 목록을 보기 전에 이번 달 배분 금액 합계를 확인한다. */
export function CostSummaryCard({ feedCost = 0, roughageCost = 0, totalFeedCost, totalMgmtCost, totalFeedDays, totalMgmtDays }) {
  const totalCost = totalFeedCost + totalMgmtCost
  const items = [
    { label: '사료비', value: feedCost },
    { label: '조사료비', value: roughageCost },
    { label: '사료비 배분 합계', value: totalFeedCost, description: '사료비 + 조사료비' },
    { label: '관리비 배분 합계', value: totalMgmtCost },
    { label: '사료관리비 합계', value: totalCost },
    { label: '사료비 사육일수 합계', value: totalFeedDays, unit: '일' },
    { label: '관리비 사육일수 합계', value: totalMgmtDays, unit: '일' },
  ]

  return (
    <div className="mb-4 grid grid-cols-7 divide-x divide-gray-200 border border-gray-200 bg-white">
      {items.map((item) => (
        <div key={item.label} className="p-4">
          <p className="text-xs text-gray-500">{item.label}</p>
          {item.description && <p className="mt-0.5 text-[10px] text-gray-400">{item.description}</p>}
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {item.unit ? item.value.toLocaleString('ko-KR') : formatWon(item.value)}
            {item.unit && <span className="ml-1 text-sm font-normal text-gray-500">{item.unit}</span>}
          </p>
        </div>
      ))}
    </div>
  )
}

function VerificationBanner({ result }) {
  if (result.isVerified) {
    return (
      <div className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-[13px] font-medium text-emerald-800">
          사료비·조사료비 합산 총액, 관리비 총액과 정확히 일치합니다
        </p>
        <p className="mt-0.5 text-xs text-emerald-700">
          개체별 금액을 원 단위까지 배분했으므로, 화면과 엑셀에서 보이는 금액을 합산해도
          입력한 총액과 정확히 일치합니다.
        </p>
      </div>
    )
  }

  return (
    <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-[13px] font-medium text-red-800">총액이 일치하지 않습니다</p>
      <p className="mt-0.5 text-xs text-red-700">
        사료비·조사료비 합산 차액 {formatWon(result.feedDiff)} · 관리비 차액{' '}
        {formatWon(result.mgmtDiff)}
      </p>
    </div>
  )
}

function AllocationTable({ rows, totals }) {
  return (
    <div className="overflow-hidden border border-gray-200 bg-white">
      <div className="max-h-[1090px] overflow-auto">
      <table className="w-full min-w-[1380px] text-left text-[13px]">
        <thead className="sticky top-0 z-10 bg-gray-50">
          <tr className="bg-gray-50 text-gray-500">
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">개체명</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">이력번호</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">생년월일</th>
            <th className="border-b border-gray-200 px-4 py-2.5 text-right font-medium">개월령</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">상태</th>
            <th className="border-b border-gray-200 px-4 py-2.5 text-right font-medium">이탈일</th>
            <th className="border-b border-gray-200 px-4 py-2.5 text-right font-medium">사료비 사육일수</th>
            <th className="border-b border-gray-200 px-4 py-2.5 text-right font-medium">사료비 금액</th>
            <th className="border-b border-gray-200 px-4 py-2.5 text-right font-medium">관리비 사육일수</th>
            <th className="border-b border-gray-200 px-4 py-2.5 text-right font-medium">관리비 금액</th>
            <th className="border-b border-gray-200 px-4 py-2.5 text-right font-medium">사료관리비 합계</th>
            <th className="border-b border-gray-200 px-4 py-2.5 text-center font-medium">관리</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isExit = row.status !== '사육중'
            const rowBg = row.isPastExit
              ? 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              : row.status === '폐사'
                ? 'bg-red-50/70 hover:bg-red-50'
                : row.status === '조기출하'
                  ? 'bg-orange-50/70 hover:bg-orange-50'
                  : row.status === '정상출하'
                    ? 'bg-emerald-50/70 hover:bg-emerald-50'
                  : 'hover:bg-gray-50'
            return (
              <tr key={row.id} className={rowBg}>
                <td className={`border-b border-gray-200 px-4 py-2.5 ${row.isPastExit ? 'text-gray-400' : 'text-gray-900'}`}>
                  <span className="flex items-center gap-2">
                    {row.name}
                  </span>
                </td>
                <td className={`border-b border-gray-200 px-4 py-2.5 font-mono text-xs ${row.isPastExit ? 'text-gray-400' : 'text-gray-600'}`}>{row.historyNo}</td>
                <td className={`border-b border-gray-200 px-4 py-2.5 ${row.isPastExit ? 'text-gray-400' : 'text-gray-700'}`}>{row.birthDate}</td>
                <td className={`border-b border-gray-200 px-4 py-2.5 text-right ${row.isPastExit ? 'text-gray-400' : 'text-gray-700'}`}>{row.ageInMonths}개월</td>
                <td className="border-b border-gray-200 px-4 py-2.5">
                  <CattleStatusBadge status={row.displayStatus ?? row.status} muted={row.isPastExit} />
                </td>
                <td className={`border-b border-gray-200 px-4 py-2.5 text-right ${row.isPastExit ? 'text-gray-400' : 'text-gray-700'}`}>
                  {isExit ? `${row.exitMonth} ${row.exitDay}일` : '-'}
                </td>
                <td className={`border-b border-gray-200 px-4 py-2.5 text-right ${row.isPastExit ? 'text-gray-400' : 'text-gray-700'}`}>
                  {row.feedDays}일
                </td>
                <td className={`border-b border-gray-200 px-4 py-2.5 text-right ${row.isPastExit ? 'text-gray-400' : 'text-gray-700'}`}>
                  {formatWon(row.feedAmount)}
                </td>
                <td className={`border-b border-gray-200 px-4 py-2.5 text-right ${row.isPastExit ? 'text-gray-400' : 'text-gray-700'}`}>
                  {row.mgmtDays}일
                </td>
                <td className={`border-b border-gray-200 px-4 py-2.5 text-right ${row.isPastExit ? 'text-gray-400' : 'text-gray-700'}`}>
                  {formatWon(row.mgmtAmount)}
                </td>
                <td className={`border-b border-gray-200 px-4 py-2.5 text-right font-medium ${row.isPastExit ? 'text-gray-400' : 'text-gray-900'}`}>
                  {formatWon(row.totalAmount)}
                </td>
                <td className="border-b border-gray-200 px-4 py-2.5 text-center">
                  <button
                    type="button"
                    className="border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    송아지 상세
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-medium text-gray-900">
            <td className="px-4 py-2.5" colSpan={7}>
              합계
            </td>
            <td className="px-4 py-2.5 text-right">{formatWon(totals.feed)}</td>
            <td className="px-4 py-2.5" />
            <td className="px-4 py-2.5 text-right">{formatWon(totals.mgmt)}</td>
            <td className="px-4 py-2.5 text-right">{formatWon(totals.total)}</td>
            <td className="px-4 py-2.5" />
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  )
}

/** 검증 배너 + 필터 탭 + 소별 배분 결과 테이블. */
export default function AllocationResult({ result, isCompletedUnit = false }) {
  // 전체 개체를 실제 개체 번호 순으로 보여 준다.
  const sortedRows = useMemo(
    () => result.rows
      .map((row) => ({
        ...row,
        displayStatus: isCompletedUnit && row.status === '사육중' ? '정상출하' : row.status,
      }))
      .sort((a, b) => a.no - b.no),
    [result.rows, isCompletedUnit],
  )

  // 합계 행은 전체 개체 기준으로 집계한다.
  const totals = useMemo(
    () => ({
      feed: sortedRows.reduce((sum, r) => sum + r.feedAmount, 0),
      mgmt: sortedRows.reduce((sum, r) => sum + r.mgmtAmount, 0),
      total: sortedRows.reduce((sum, r) => sum + r.totalAmount, 0),
    }),
    [sortedRows],
  )

  return (
    <>
      <VerificationBanner result={result} />
      <AllocationTable rows={sortedRows} totals={totals} />
    </>
  )
}
