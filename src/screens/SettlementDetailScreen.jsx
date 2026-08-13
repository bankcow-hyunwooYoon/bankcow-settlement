import { useMemo, useState } from 'react'
import CattleStatusSummary from '../components/CattleStatusSummary.jsx'
import CattleStatusBadge from '../components/CattleStatusBadge.jsx'
import PrototypeDateBadge from '../components/PrototypeDateBadge.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import AllocationResult, { CostSummaryCard } from '../components/AllocationResult.jsx'
import { formatDateTime, formatNumber, formatWon, parseDigits } from '../lib/format.js'
import { useDebouncedValue } from '../lib/hooks.js'
import { now } from '../lib/prototypeDate.js'
import {
  sortRows,
  STATUS_CONFIRMED,
  toCattleDetails,
} from '../lib/records.js'
import {
  calculateAllocation,
  calculateTotalDays,
  getExceptionCattle,
  getDaysInSettlementMonth,
} from '../lib/settlement.js'

const FARM_NAME = '충만농장'
const NORMAL_COUNT = 50

function ExceptionCattlePanel({ settlementMonth, cattleList }) {
  const monthLabel = settlementMonth?.match(/(\d+)월/)?.[1]
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="mb-5 border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
      >
        <span className="text-xs font-medium text-gray-700">
          {monthLabel ? `${monthLabel}월 기준 이탈 개체` : '이번 달 이탈 개체'}
          <span className="ml-1.5 text-gray-400">{cattleList.length}두</span>
        </span>
        <span className="text-xs text-gray-400">{isOpen ? '⌃ 접기' : '⌄ 펼치기'}</span>
      </button>
      {isOpen && (
        <div className="border-t border-gray-200 px-4 py-2">
          {cattleList.length === 0 ? (
            <p className="py-1.5 text-sm text-gray-500">이탈 개체가 없습니다</p>
          ) : (
            <div className="divide-y divide-gray-100">
          {cattleList.map((cattle) => (
            <div
              key={cattle.id}
              className={`flex items-center justify-between py-1.5 text-[13px] ${
                cattle.isPastExit ? 'text-gray-400' : 'text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                {cattle.name}
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                  cattle.isPastExit ? 'bg-gray-100 text-gray-400' : 'bg-red-100 text-red-700'
                }`}>
                  {cattle.exitMonth.match(/(\d+)월/)?.[1]}월 이탈
                </span>
              </span>
              <div className="flex items-center gap-3">
                <CattleStatusBadge status={cattle.status} muted={cattle.isPastExit} />
                <span className={cattle.isPastExit ? 'text-gray-400' : 'text-gray-500'}>
                  이탈일 {cattle.exitMonth} {cattle.exitDay}일
                </span>
                {cattle.isPastExit && <span className="text-gray-400">이번 달 배분 제외</span>}
              </div>
            </div>
          ))}
        </div>
          )}
        </div>
      )}
    </div>
  )
}

function MgmtDepositInfoCard({ value }) {
  return (
    <div className="mb-5 border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-600">관리비보증금 (참고)</p>
          <p className="mt-1 text-xs text-gray-500">
            관리비보증금은 매월이 아닌 정산(출하) 시점에 1회 지급됩니다. 이번 달 계산에는 포함되지
            않습니다.
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-gray-900">
          {value ? formatWon(value) : '미설정'}
        </p>
      </div>
    </div>
  )
}

function MoneyInput({ id, label, value, onChange, disabled }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={formatNumber(value)}
          onChange={(e) => onChange(parseDigits(e.target.value))}
          disabled={disabled}
          placeholder="0"
          className={`w-full border border-gray-200 px-3 py-2 pr-10 text-[13px] focus:border-gray-400 focus:outline-none ${
            disabled ? 'cursor-not-allowed bg-gray-50 text-gray-500' : 'text-gray-900'
          }`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-gray-400">
          원
        </span>
      </div>
    </div>
  )
}

export default function SettlementDetailScreen({
  record,
  selectableMonths = [],
  onBack,
  onSave,
  onDelete,
  mgmtDeposit,
}) {
  const isNew = !record

  // 신규는 바로 입력 가능, 기존 행은 읽기 전용으로 진입한다.
  const [mode, setMode] = useState(isNew ? 'new' : 'view')
  const [confirmAction, setConfirmAction] = useState(null)

  // 신규 등록은 아직 입력하지 않은 달 중 가장 이른 달부터 처리한다.
  const monthOptions = isNew ? [...selectableMonths].reverse() : [record.정산월]
  const [settlementMonth, setSettlementMonth] = useState(record?.정산월 ?? monthOptions[0] ?? '')
  const [feedCost, setFeedCost] = useState(record?.사료비총액 ?? '')
  const [mgmtCost, setMgmtCost] = useState(record?.관리비총액 ?? '')

  const isReadOnly = mode === 'view'
  const isEditing = mode === 'edit'
  // 기존 행은 정산월을 바꿀 수 없다. 다른 달은 신규 등록으로 처리한다.
  const isMonthLocked = !isNew

  // 입력이 멈췄을 때만 소별 배분을 다시 계산한다.
  const debouncedFeedCost = useDebouncedValue(feedCost, 300)
  const debouncedMgmtCost = useDebouncedValue(mgmtCost, 300)

  const daysInMonth = settlementMonth ? getDaysInSettlementMonth(settlementMonth) : 0
  const exceptionCattle = useMemo(() => getExceptionCattle(settlementMonth), [settlementMonth])
  const deadCount = exceptionCattle.filter((cattle) => cattle.status === '폐사').length
  const earlyCount = exceptionCattle.filter((cattle) => cattle.status === '조기출하').length

  const { totalFeedDays, totalMgmtDays } = useMemo(
    () => calculateTotalDays(daysInMonth, settlementMonth),
    [daysInMonth, settlementMonth],
  )

  const hasValidCosts = Number(debouncedFeedCost) > 0 && Number(debouncedMgmtCost) > 0
  const hasEnteredValidCosts = Number(feedCost) > 0 && Number(mgmtCost) > 0

  const result = useMemo(() => {
    if (!hasValidCosts) return null
    return calculateAllocation({
      feedCostTotal: Number(debouncedFeedCost),
      mgmtCostTotal: Number(debouncedMgmtCost),
      daysInMonth,
      settlementMonth,
    })
  }, [hasValidCosts, debouncedFeedCost, debouncedMgmtCost, daysInMonth, settlementMonth])

  const buildConfirmedRecord = () => {
    // 저장은 디바운스 대기 중인 값까지 반영한다.
    const currentResult = calculateAllocation({
      feedCostTotal: Number(feedCost),
      mgmtCostTotal: Number(mgmtCost),
      daysInMonth,
      settlementMonth,
    })
    return {
      정산월: settlementMonth,
      사료비총액: Number(feedCost),
      관리비총액: Number(mgmtCost),
      상태: STATUS_CONFIRMED,
      등록일시: formatDateTime(now()),
      소별상세: toCattleDetails(sortRows(currentResult.rows)),
    }
  }

  const handleConfirmSettlement = () => {
    const saved = buildConfirmedRecord()
    console.log('확정하기 클릭', saved)
    onSave(saved)
  }

  // "수정완료" → 확인 다이얼로그 → 저장 후 읽기 전용으로 복귀
  const handleEditComplete = () => {
    const saved = buildConfirmedRecord()
    console.log('수정완료 확인', saved)
    onSave(saved, { stayOnScreen: true })
    setConfirmAction(null)
    setMode('view')
  }

  const handleDelete = () => {
    onDelete(record.정산월)
    setConfirmAction(null)
    onBack()
  }

  const handleConfirmedAction = () => {
    if (confirmAction === 'delete') return handleDelete()
    return isEditing ? handleEditComplete() : handleConfirmSettlement()
  }

  if (!settlementMonth) {
    return (
      <div className="min-h-screen bg-gray-100 px-8 py-8">
        <div className="mx-auto max-w-[1440px]">
          <button type="button" onClick={onBack} className="mb-3 text-xs text-gray-500 hover:text-gray-900">
            ‹ 목록으로
          </button>
          <div className="flex flex-col items-center justify-center gap-3 border border-gray-200 bg-white py-24">
            <p className="text-sm text-gray-500">등록 가능한 정산월이 없습니다</p>
            <p className="text-xs text-gray-400">
              이미 끝난 달의 실비용이 모두 입력되었습니다. 이번 달이 끝나면 등록할 수 있어요.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 px-8 py-8">
      <div className="mx-auto max-w-[1440px]">
        <button type="button" onClick={onBack} className="mb-3 text-xs text-gray-500 hover:text-gray-900">
          ‹ 목록으로
        </button>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">
              {FARM_NAME} <span className="text-gray-400">·</span>{' '}
              {isNew ? '사료관리비 등록' : '사료관리비 상세'}
            </h1>
            <CattleStatusSummary normal={NORMAL_COUNT - exceptionCattle.length} dead={deadCount} early={earlyCount} />
          </div>
          <div className="flex items-center gap-3">
            <PrototypeDateBadge />
            {isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  className="border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction('delete')}
                  className="border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  삭제
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing && record.상태 === STATUS_CONFIRMED && (
          <div className="mb-5 border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[13px] font-medium text-amber-900">
              이미 확정된 달입니다. 수정 후 다시 확정하면 기존 데이터를 덮어씁니다
            </p>
          </div>
        )}

        <ExceptionCattlePanel settlementMonth={settlementMonth} cattleList={exceptionCattle} />

        <MgmtDepositInfoCard value={mgmtDeposit} />

        <div className="mb-5 border border-gray-200 bg-white p-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">정산월</label>
          <div className="flex items-center gap-2">
            <select
              value={settlementMonth}
              onChange={(e) => setSettlementMonth(e.target.value)}
              disabled={isMonthLocked}
              className={`w-48 border border-gray-200 px-3 py-2 text-[13px] focus:border-gray-400 focus:outline-none ${
                isMonthLocked ? 'cursor-not-allowed bg-gray-50 text-gray-500' : 'text-gray-900'
              }`}
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500">총 {daysInMonth}일</span>
            {isMonthLocked && (
              <span className="text-xs text-gray-400">
                정산월은 변경할 수 없습니다. 다른 달은 신규 등록으로 진행해 주세요.
              </span>
            )}
          </div>
        </div>

        <div className="mb-5 border border-gray-200 bg-white p-4">
          <p className="mb-3 text-xs font-medium text-gray-600">실비용 입력</p>
          <div className="grid grid-cols-2 gap-4">
            <MoneyInput
              id="feed-cost"
              label="사료비 총액"
              value={feedCost}
              onChange={setFeedCost}
              disabled={isReadOnly}
            />
            <MoneyInput
              id="mgmt-cost"
              label="관리비 총액"
              value={mgmtCost}
              onChange={setMgmtCost}
              disabled={isReadOnly}
            />
          </div>
        </div>

        {result ? (
          <>
            <CostSummaryCard
              totalFeedCost={result.exactFeedSum}
              totalMgmtCost={result.exactMgmtSum}
              totalFeedDays={totalFeedDays}
              totalMgmtDays={totalMgmtDays}
            />
            <AllocationResult result={result} />
          </>
        ) : (
          <div className="border border-dashed border-gray-200 bg-gray-50 px-4 py-16 text-center">
            <p className="text-sm text-gray-400">총액을 입력하면 계산 결과를 확인할 수 있어요</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          {isEditing ? (
            <button
              type="button"
              onClick={() => setConfirmAction('edit')}
              disabled={!hasEnteredValidCosts}
              className={`px-4 py-2 text-xs font-medium ${
                hasEnteredValidCosts
                  ? 'bg-gray-900 text-white hover:bg-gray-700'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
              }`}
            >
              수정완료
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmAction('confirm')}
              disabled={!hasEnteredValidCosts}
              className={`px-4 py-2 text-xs font-medium ${
                hasEnteredValidCosts
                  ? 'bg-gray-900 text-white hover:bg-gray-700'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
              }`}
            >
              확정하기
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        message={confirmAction === 'delete' ? '이 정산월을 삭제하시겠습니까?' : confirmAction === 'edit' ? '수정하시겠습니까?' : '확정하시겠습니까?'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmedAction}
      />
    </div>
  )
}
