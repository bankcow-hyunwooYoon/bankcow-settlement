import { useMemo, useState } from 'react'
import CattleStatusBadge from '../components/CattleStatusBadge.jsx'
import { formatDateTime, formatWon } from '../lib/format.js'
import { sortRows, STATUS_CONFIRMED, toCattleDetails } from '../lib/records.js'
import { now } from '../lib/prototypeDate.js'
import PrototypeDateBadge from '../components/PrototypeDateBadge.jsx'
import {
  calculateAllocation,
  EXCEPTION_CATTLE,
  getDaysInSettlementMonth,
  TOTAL_CATTLE_COUNT,
} from '../lib/settlement.js'

const FARM_NAME = '충만농장'
const EXCEPTION_COUNT = EXCEPTION_CATTLE.length

// 화면 2에서 값을 입력하지 않고 넘어온 경우를 위한 목업 기본값.
const FALLBACK_MONTH = '2025년 11월'
const FALLBACK_FEED_COST = 1000000
const FALLBACK_MGMT_COST = 1000000

function roundWon(value) {
  return Math.round(value)
}

function VerificationBanner({ result }) {
  if (result.isVerified) {
    return (
      <div className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-[13px] font-medium text-emerald-800">
          사료비 총액, 관리비 총액과 정확히 일치합니다
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
        사료비 차액 {formatWon(roundWon(result.feedDiff))} · 관리비 차액{' '}
        {formatWon(roundWon(result.mgmtDiff))}
      </p>
    </div>
  )
}

function FilterTabs({ activeTab, onChange }) {
  const tabs = [
    { key: 'exception', label: `예외 개체만 (${EXCEPTION_COUNT})` },
    { key: 'all', label: `전체 (${TOTAL_CATTLE_COUNT})` },
  ]

  return (
    <div className="mb-3 flex items-center gap-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            activeTab === tab.key
              ? 'bg-gray-900 text-white'
              : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function AllocationTable({ rows, totals }) {
  return (
    <div className="overflow-hidden border border-gray-200 bg-white">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="bg-gray-50 text-gray-500">
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">개체명</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">상태</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium text-right">사료비 사육일수</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium text-right">사료비 금액</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium text-right">관리비 사육일수</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium text-right">관리비 금액</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium text-right">사료관리비 합계</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isException = row.status === '폐사' || row.status === '조기출하'
            const rowBg = isException
              ? row.status === '폐사'
                ? 'bg-red-50/70 hover:bg-red-50'
                : 'bg-orange-50/70 hover:bg-orange-50'
              : 'hover:bg-gray-50'
            return (
              <tr key={row.id} className={rowBg}>
                <td className="border-b border-gray-200 px-4 py-2.5 text-gray-900">{row.name}</td>
                <td className="border-b border-gray-200 px-4 py-2.5">
                  <CattleStatusBadge status={row.status} />
                </td>
                <td className="border-b border-gray-200 px-4 py-2.5 text-right text-gray-700">
                  {row.feedDays}일
                </td>
                <td className="border-b border-gray-200 px-4 py-2.5 text-right text-gray-700">
                  {formatWon(row.feedAmount)}
                </td>
                <td className="border-b border-gray-200 px-4 py-2.5 text-right text-gray-700">
                  {row.mgmtDays}일
                </td>
                <td className="border-b border-gray-200 px-4 py-2.5 text-right text-gray-700">
                  {formatWon(row.mgmtAmount)}
                </td>
                <td className="border-b border-gray-200 px-4 py-2.5 text-right font-medium text-gray-900">
                  {formatWon(row.totalAmount)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-medium text-gray-900">
            <td className="px-4 py-2.5" colSpan={3}>
              합계
            </td>
            <td className="px-4 py-2.5 text-right">{formatWon(roundWon(totals.feed))}</td>
            <td className="px-4 py-2.5" />
            <td className="px-4 py-2.5 text-right">{formatWon(roundWon(totals.mgmt))}</td>
            <td className="px-4 py-2.5 text-right">{formatWon(roundWon(totals.total))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function AllocationResultScreen({ onBack, onConfirm, input }) {
  const [activeTab, setActiveTab] = useState('exception')

  const settlementMonth = input?.settlementMonth || FALLBACK_MONTH
  const feedCostTotal = input?.feedCost > 0 ? input.feedCost : FALLBACK_FEED_COST
  const mgmtCostTotal = input?.mgmtCost > 0 ? input.mgmtCost : FALLBACK_MGMT_COST
  const daysInMonth = getDaysInSettlementMonth(settlementMonth)

  const result = useMemo(
    () => calculateAllocation({ feedCostTotal, mgmtCostTotal, daysInMonth }),
    [feedCostTotal, mgmtCostTotal, daysInMonth],
  )

  // 사고 개체를 항상 위에 고정하고, 그 아래 사육중 개체를 개체명(번호) 순으로 정렬한다.
  const sortedRows = useMemo(() => sortRows(result.rows), [result.rows])

  const visibleRows = activeTab === 'exception' ? sortedRows.filter((r) => r.status !== '사육중') : sortedRows

  // 합계 행은 현재 탭에 보이는 개체 기준으로 집계한다.
  const totals = useMemo(
    () => ({
      feed: visibleRows.reduce((sum, r) => sum + r.feedAmount, 0),
      mgmt: visibleRows.reduce((sum, r) => sum + r.mgmtAmount, 0),
      total: visibleRows.reduce((sum, r) => sum + r.totalAmount, 0),
    }),
    [visibleRows],
  )

  const handleBack = () => {
    console.log('다시 입력하기 클릭')
    onBack()
  }

  const handleConfirm = () => {
    const record = {
      정산월: settlementMonth,
      사료비총액: feedCostTotal,
      관리비총액: mgmtCostTotal,
      상태: STATUS_CONFIRMED,
      등록일시: formatDateTime(now()),
      소별상세: toCattleDetails(sortedRows),
    }
    console.log('확정하기 클릭', record)
    onConfirm(record)
  }

  return (
    <div className="min-h-screen bg-gray-100 px-8 py-8">
      <div className="mx-auto max-w-[1440px]">
        <button type="button" onClick={handleBack} className="mb-3 text-xs text-gray-500 hover:text-gray-900">
          ‹ 다시 입력하기
        </button>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">
              {FARM_NAME} <span className="text-gray-400">·</span> 사료관리비 확인
            </h1>
            <span className="text-[13px] text-gray-500">
              {settlementMonth} <span className="text-gray-400">(총 {daysInMonth}일)</span>
            </span>
          </div>
          <PrototypeDateBadge />
        </div>

        <VerificationBanner result={result} />

        <FilterTabs activeTab={activeTab} onChange={setActiveTab} />

        <AllocationTable rows={visibleRows} totals={totals} />

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            다시 입력하기
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-700"
          >
            확정하기
          </button>
        </div>
      </div>
    </div>
  )
}
