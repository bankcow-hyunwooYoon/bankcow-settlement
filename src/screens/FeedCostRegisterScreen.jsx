import { useMemo, useState } from 'react'
import AllocationResult, { DaysSummaryCard } from '../components/AllocationResult.jsx'
import CattleStatusSummary from '../components/CattleStatusSummary.jsx'
import CattleStatusBadge from '../components/CattleStatusBadge.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import {
  formatDateTime,
  formatNumber,
  formatUnitPrice,
  formatWon,
  parseDigits,
} from '../lib/format.js'
import { STATUS_CONFIRMED, toCattleDetails } from '../lib/records.js'
import { now } from '../lib/prototypeDate.js'
import PrototypeDateBadge from '../components/PrototypeDateBadge.jsx'
import {
  calculateTotalDays,
  calculateAllocation,
  EXCEPTION_CATTLE,
  getDaysInSettlementMonth,
  NORMAL_CATTLE,
} from '../lib/settlement.js'
import { useDebouncedValue } from '../lib/hooks.js'

const FARM_NAME = '충만농장'
const NORMAL_COUNT = NORMAL_CATTLE.length

const DEAD_COUNT = EXCEPTION_CATTLE.filter((c) => c.status === '폐사').length
const EARLY_COUNT = EXCEPTION_CATTLE.filter((c) => c.status === '조기출하').length

function ExceptionCattlePanel({ settlementMonth, cattleList }) {
  return (
    <div className="mb-5 border border-orange-200 bg-orange-50 px-4 py-3">
      <p className="mb-2 text-xs font-medium text-orange-900">이번 달 예외 개체</p>
      {cattleList.length === 0 ? (
        <p className="text-sm text-gray-500">이번 달은 예외 개체가 없습니다</p>
      ) : (
        <div className="divide-y divide-orange-200/70">
          {cattleList.map((cattle) => (
            <div key={cattle.id} className="flex items-center justify-between py-1.5 text-[13px]">
              <span className="font-medium text-gray-900">{cattle.name}</span>
              <div className="flex items-center gap-3">
                <CattleStatusBadge status={cattle.status} />
                <span className="text-gray-500">
                  이탈일 {settlementMonth} {cattle.exitDay}일
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MoneyInput({ id, label, value, onChange }) {
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
          placeholder="0"
          className="w-full border border-gray-200 px-3 py-2 pr-10 text-[13px] text-gray-900 focus:border-gray-400 focus:outline-none"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-gray-400">원</span>
      </div>
    </div>
  )
}

function PreviewStat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}

export default function FeedCostRegisterScreen({
  onBack,
  onSaveRecord,
  editing,
  selectableMonths = [],
}) {
  // 수정 시에는 해당 달로 고정하고, 신규 등록은 선택 가능한 달 중 가장 최근 달로 시작한다.
  const monthOptions = editing ? [editing.정산월] : selectableMonths

  // 수정 진입 시 기존 값으로 채운다. 총액이 비어있던 임시저장 행은 빈 입력으로 시작한다.
  const [settlementMonth, setSettlementMonth] = useState(editing?.정산월 ?? monthOptions[0] ?? '')
  const [feedCost, setFeedCost] = useState(editing?.사료비총액 ?? '')
  const [mgmtCost, setMgmtCost] = useState(editing?.관리비총액 ?? '')
  const [isEditMode, setIsEditMode] = useState(!editing)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const isEditing = Boolean(editing)
  const isEditingConfirmed = editing?.상태 === STATUS_CONFIRMED

  // 등록 가능한 달이 하나도 없으면 settlementMonth가 빈 값이 된다.
  const daysInMonth = settlementMonth ? getDaysInSettlementMonth(settlementMonth) : 0

  const { totalFeedDays, totalMgmtDays } = useMemo(
    () => calculateTotalDays(daysInMonth),
    [daysInMonth],
  )

  const debouncedFeedCost = useDebouncedValue(feedCost, 300)
  const debouncedMgmtCost = useDebouncedValue(mgmtCost, 300)
  const isPreviewActive = Number(debouncedFeedCost) > 0 && Number(debouncedMgmtCost) > 0
  const feedUnitPrice = isPreviewActive ? Number(debouncedFeedCost) / totalFeedDays : null
  const mgmtUnitPrice = isPreviewActive ? Number(debouncedMgmtCost) / totalMgmtDays : null
  const allocationResult = useMemo(
    () =>
      isPreviewActive
        ? calculateAllocation({
            feedCostTotal: Number(debouncedFeedCost),
            mgmtCostTotal: Number(debouncedMgmtCost),
            daysInMonth,
          })
        : null,
    [debouncedFeedCost, debouncedMgmtCost, daysInMonth, isPreviewActive],
  )

  const saveRecord = () => {
    if (!isPreviewActive || !allocationResult) return
    const record = {
      정산월: settlementMonth,
      사료비총액: Number(debouncedFeedCost),
      관리비총액: Number(debouncedMgmtCost),
      상태: STATUS_CONFIRMED,
      등록일시: formatDateTime(now()),
      소별상세: toCattleDetails(allocationResult.rows),
    }
    onSaveRecord(record)
    setIsConfirmOpen(false)
    setIsEditMode(false)
  }

  const handlePrimaryAction = () => {
    if (isEditMode && isEditing) setIsConfirmOpen(true)
    else saveRecord()
  }

  if (!settlementMonth) {
    return (
      <div className="min-h-screen bg-gray-100 px-8 py-8">
        <div className="mx-auto max-w-[1440px]">
          <button type="button" onClick={onBack} className="mb-3 text-xs text-gray-500 hover:text-gray-900">
            ‹ 목록으로
          </button>
          <div className="flex flex-col items-center justify-center gap-3 border border-gray-200 bg-white py-24">
            <p className="text-sm text-gray-500">현재 등록 가능한 정산월이 없습니다</p>
            <p className="text-xs text-gray-400">
              입식월처럼 정산 대상이 아니거나 입력에서 제외된 달은 미입력 상태로 남을 수 있습니다.
              다음 정산월이 끝난 뒤 등록할 수 있어요.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 px-8 py-8">
      <div className="mx-auto max-w-[1440px]">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 text-xs text-gray-500 hover:text-gray-900"
        >
          ‹ 목록으로
        </button>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">
              {FARM_NAME} <span className="text-gray-400">·</span>{' '}
              {isEditing ? '사료관리비 수정' : '사료관리비 등록'}
            </h1>
            <CattleStatusSummary normal={NORMAL_COUNT} dead={DEAD_COUNT} early={EARLY_COUNT} />
          </div>
          <PrototypeDateBadge />
        </div>

        {isEditingConfirmed && isEditMode && (
          <div className="mb-5 border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[13px] font-medium text-amber-900">
              이미 확정된 달입니다. 수정 후 다시 확정하면 기존 데이터를 덮어씁니다
            </p>
          </div>
        )}

        <ExceptionCattlePanel settlementMonth={settlementMonth} cattleList={EXCEPTION_CATTLE} />

        <div className="mb-5 border border-gray-200 bg-white p-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">정산월</label>
          <div className="flex items-center gap-2">
            <select
              value={settlementMonth}
              onChange={(e) => setSettlementMonth(e.target.value)}
              disabled={isEditing || !isEditMode}
              className={`w-48 border border-gray-200 px-3 py-2 text-[13px] focus:border-gray-400 focus:outline-none ${
                isEditing || !isEditMode ? 'cursor-not-allowed bg-gray-50 text-gray-500' : 'text-gray-900'
              }`}
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500">총 {daysInMonth}일</span>
            {isEditing && (
              <span className="text-xs text-gray-400">
                수정 시 정산월은 변경할 수 없습니다. 다른 달은 신규 등록으로 진행해 주세요.
              </span>
            )}
          </div>
        </div>

        <div className="mb-5 border border-gray-200 bg-white p-4">
          <p className="mb-3 text-xs font-medium text-gray-600">실비용 입력</p>
          <div className="grid grid-cols-2 gap-4">
            <MoneyInput id="feed-cost" label="사료비 총액" value={feedCost} onChange={setFeedCost} disabled={!isEditMode} />
            <MoneyInput id="mgmt-cost" label="관리비 총액" value={mgmtCost} onChange={setMgmtCost} disabled={!isEditMode} />
          </div>
        </div>

        {isPreviewActive ? (
          <div className="mb-6">
            <DaysSummaryCard totalFeedDays={totalFeedDays} totalMgmtDays={totalMgmtDays} />
            <div className="mb-4 grid grid-cols-2 gap-4 border border-gray-200 bg-white p-4">
              <PreviewStat label="사료비 단가" value={formatUnitPrice(feedUnitPrice)} />
              <PreviewStat label="관리비 단가" value={formatUnitPrice(mgmtUnitPrice)} />
            </div>
            <AllocationResult result={allocationResult} />
          </div>
        ) : (
          <div className="mb-6 border border-dashed border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-400">총액을 입력하면 계산 결과를 확인할 수 있어요</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          {isEditing && !isEditMode && (
            <button type="button" onClick={() => setIsEditMode(true)} className="border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
              수정
            </button>
          )}
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={!isPreviewActive}
            className={`px-4 py-2 text-xs font-medium text-white ${isPreviewActive ? 'bg-gray-900 hover:bg-gray-700' : 'cursor-not-allowed bg-gray-300'}`}
          >
            {isEditMode && isEditing ? '수정완료' : '확정하기'}
          </button>
        </div>
        <ConfirmDialog
          open={isConfirmOpen}
          message="수정하시겠습니까?"
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={saveRecord}
        />
      </div>
    </div>
  )
}
