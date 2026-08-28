import { useMemo, useState } from 'react'
import CattleStatusSummary from '../components/CattleStatusSummary.jsx'
import CattleStatusBadge from '../components/CattleStatusBadge.jsx'
import PrototypeDateBadge from '../components/PrototypeDateBadge.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import AllocationResult, { CostSummaryCard } from '../components/AllocationResult.jsx'
import { formatDateTime, formatNumber, formatWon, parseDigits } from '../lib/format.js'
import { createAttachment, downloadAttachment, downloadAttachmentsZip, formatFileSize } from '../lib/attachments.js'
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

const NORMAL_COUNT = 50

function ExceptionCattlePanel({ settlementMonth, cattleList }) {
  const monthLabel = settlementMonth?.match(/(\d+)월/)?.[1]
  const [isOpen, setIsOpen] = useState(false)
  const [showAllExited, setShowAllExited] = useState(false)
  const currentMonthCattle = cattleList.filter((cattle) => !cattle.isPastExit)
  const displayedCattle = showAllExited ? cattleList : currentMonthCattle

  return (
    <section className="mb-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">이탈 개체</h2>
        <p className="mt-1 text-xs text-gray-400">
          선택한 정산월에 이탈했거나 이전에 이탈한 개체만 표시됩니다. 이후 월 이탈 개체는 해당 정산월의 배분 대상이 아니므로 표시되지 않습니다.
        </p>
      </div>
      <div className="border border-gray-200 bg-white">
        <div className="flex items-center px-4 py-3">
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            className="min-w-0 flex-1 text-left"
          >
            <span className="text-xs font-medium text-gray-700">
              {monthLabel ? `${monthLabel}월 기준 이탈 개체` : '이번 달 이탈 개체'}
              <span className="ml-1.5 text-gray-400">{displayedCattle.length}두</span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-400">
              모든 이탈 개체 보기
              <input
                type="checkbox"
                checked={showAllExited}
                onChange={(event) => setShowAllExited(event.target.checked)}
                className="peer sr-only"
              />
              <span className="relative h-5 w-9 rounded-full bg-gray-200 transition-colors peer-checked:bg-gray-900 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
            </label>
            <button
              type="button"
              onClick={() => setIsOpen((open) => !open)}
              aria-label={isOpen ? '이탈 개체 접기' : '이탈 개체 펼치기'}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              {isOpen ? '⌃' : '⌄'}
            </button>
          </div>
        </div>
        {isOpen && (
          <div className="border-t border-gray-200">
          {displayedCattle.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">이탈 개체가 없습니다</p>
          ) : (
            <div className="divide-y divide-gray-100">
          {displayedCattle.map((cattle) => (
            <div
              key={cattle.id}
              className={`flex items-center justify-between px-4 py-2.5 text-[13px] ${
                cattle.isPastExit
                  ? 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  : cattle.status === '폐사'
                    ? 'bg-red-50/70 text-gray-900 hover:bg-red-50'
                    : cattle.status === '조기출하'
                      ? 'bg-orange-50/70 text-gray-900 hover:bg-orange-50'
                      : 'bg-emerald-50/70 text-gray-900 hover:bg-emerald-50'
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                {cattle.name}
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
    </section>
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

function AttachmentsPanel({ attachments, onAdd, onRemove, disabled, settlementMonth, allowDownloads }) {
  const [isDownloading, setIsDownloading] = useState(false)
  const handleDownloadAll = async () => {
    setIsDownloading(true)
    await downloadAttachmentsZip([{ 정산월: settlementMonth, 첨부파일: attachments }], '사료관리비')
    setIsDownloading(false)
  }

  return (
    <div className="mb-5 border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-600">첨부파일</p>
          <p className="mt-1 text-xs text-gray-400">세금계산서, 거래명세서, 영수증 등 증빙 파일을 첨부할 수 있습니다.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {allowDownloads && attachments.length > 0 && (
            <button type="button" onClick={handleDownloadAll} disabled={isDownloading} className="border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:text-gray-400">
              {isDownloading ? 'ZIP 생성 중...' : '첨부파일 전체 다운로드'}
            </button>
          )}
          {!disabled && (
            <label className="cursor-pointer bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-700">
              파일 추가
              <input
                type="file"
                multiple
                accept="image/*,application/pdf,.xlsx,.xls,.csv"
                className="sr-only"
                onChange={(event) => {
                  onAdd(Array.from(event.target.files ?? []).map(createAttachment))
                  event.target.value = ''
                }}
              />
            </label>
          )}
        </div>
      </div>

      {attachments.length === 0 ? (
        <p className="mt-4 border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-400">
          첨부된 파일이 없습니다
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 border border-gray-200">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center justify-between gap-4 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-gray-800">{attachment.name}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">{formatFileSize(attachment.size)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                {allowDownloads && (
                  <button type="button" onClick={() => downloadAttachment(attachment)} className="font-medium text-gray-700 hover:underline">다운로드</button>
                )}
                {!disabled && <button type="button" onClick={() => onRemove(attachment.id)} className="text-red-600 hover:underline">삭제</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-gray-400">프로토타입에서는 새로고침 시 첨부파일이 유지되지 않습니다.</p>
    </div>
  )
}

export default function SettlementDetailScreen({
  record,
  selectableMonths = [],
  onBack,
  onSave,
  onDelete,
  unit,
}) {
  const isNew = !record
  const farmName = unit.farmName

  // 신규는 바로 입력 가능, 기존 행은 읽기 전용으로 진입한다.
  const [mode, setMode] = useState(isNew ? 'new' : 'view')
  const [confirmAction, setConfirmAction] = useState(null)

  // 신규 등록은 아직 입력하지 않은 달 중 가장 이른 달부터 처리한다.
  const monthOptions = isNew ? [...selectableMonths].reverse() : [record.정산월]
  const [settlementMonth, setSettlementMonth] = useState(record?.정산월 ?? monthOptions[0] ?? '')
  const [feedCost, setFeedCost] = useState(record?.사료비총액 ?? '')
  const [roughageCost, setRoughageCost] = useState(record?.조사료비총액 ?? '')
  const [mgmtCost, setMgmtCost] = useState(record?.관리비총액 ?? '')
  const [attachments, setAttachments] = useState(record?.첨부파일 ?? [])
  // 신규·수정은 계산하기를 누른 시점의 값을 고정해 결과를 보여 준다.
  const [calculationSnapshot, setCalculationSnapshot] = useState(() => (
    record
      ? {
          settlementMonth: record.정산월,
          feedCost: Number(record.사료비총액 ?? 0),
          roughageCost: Number(record.조사료비총액 ?? 0),
          mgmtCost: Number(record.관리비총액 ?? 0),
        }
      : null
  ))

  const isReadOnly = mode === 'view'
  const isEditing = mode === 'edit'
  // 기존 행은 정산월을 바꿀 수 없다. 다른 달은 신규 등록으로 처리한다.
  const isMonthLocked = !isNew

  const daysInMonth = settlementMonth ? getDaysInSettlementMonth(settlementMonth) : 0
  const exceptionCattle = useMemo(
    () => getExceptionCattle(settlementMonth, farmName, unit.id),
    [settlementMonth, farmName, unit.id],
  )
  const deadCount = exceptionCattle.filter((cattle) => cattle.status === '폐사').length
  const earlyCount = exceptionCattle.filter((cattle) => cattle.status === '조기출하').length
  const shippedCount = exceptionCattle.filter((cattle) => cattle.status === '정상출하').length

  const { totalFeedDays, totalMgmtDays } = useMemo(
    () => calculateTotalDays(daysInMonth, settlementMonth, farmName, unit.id, unit.placementDate, unit.headCount, unit.placementBatches),
    [daysInMonth, settlementMonth, farmName, unit.id, unit.placementDate, unit.headCount, unit.placementBatches],
  )

  // 조사료비는 사료비와 합산한 금액을 사료비 사육일수 기준으로 배분한다.
  const totalFeedCost = Number(feedCost) + Number(roughageCost)
  const hasEnteredValidCosts = totalFeedCost > 0 && Number(mgmtCost) > 0
  const canCalculate = hasEnteredValidCosts && totalFeedDays > 0 && totalMgmtDays > 0
  const isCurrentCalculation = Boolean(
    calculationSnapshot
      && calculationSnapshot.settlementMonth === settlementMonth
      && calculationSnapshot.feedCost === Number(feedCost)
      && calculationSnapshot.roughageCost === Number(roughageCost)
      && calculationSnapshot.mgmtCost === Number(mgmtCost),
  )
  const canSave = canCalculate && isCurrentCalculation

  const result = useMemo(() => {
    if (!calculationSnapshot) return null
    return calculateAllocation({
      feedCostTotal: calculationSnapshot.feedCost + calculationSnapshot.roughageCost,
      mgmtCostTotal: calculationSnapshot.mgmtCost,
      daysInMonth: getDaysInSettlementMonth(calculationSnapshot.settlementMonth),
      settlementMonth: calculationSnapshot.settlementMonth,
      farmName,
      unitId: unit.id,
      placementDate: unit.placementDate,
      headCount: unit.headCount,
      placementBatches: unit.placementBatches,
    })
  }, [calculationSnapshot, farmName, unit.id, unit.placementDate, unit.headCount, unit.placementBatches])

  const calculatedDays = useMemo(() => {
    if (!calculationSnapshot) return { totalFeedDays: 0, totalMgmtDays: 0 }
    return calculateTotalDays(
      getDaysInSettlementMonth(calculationSnapshot.settlementMonth),
      calculationSnapshot.settlementMonth,
      farmName,
      unit.id,
      unit.placementDate,
      unit.headCount,
      unit.placementBatches,
    )
  }, [calculationSnapshot, farmName, unit.id, unit.placementDate, unit.headCount, unit.placementBatches])

  const handleCalculate = () => {
    if (!canCalculate) return
    setCalculationSnapshot({
      settlementMonth,
      feedCost: Number(feedCost),
      roughageCost: Number(roughageCost),
      mgmtCost: Number(mgmtCost),
    })
  }

  const buildConfirmedRecord = () => {
    // 저장은 디바운스 대기 중인 값까지 반영한다.
    const currentResult = calculateAllocation({
      feedCostTotal: totalFeedCost,
      mgmtCostTotal: Number(mgmtCost),
      daysInMonth,
      settlementMonth,
      farmName,
      unitId: unit.id,
      placementDate: unit.placementDate,
      headCount: unit.headCount,
      placementBatches: unit.placementBatches,
    })
    return {
      정산월: settlementMonth,
      사료비총액: Number(feedCost),
      조사료비총액: Number(roughageCost),
      관리비총액: Number(mgmtCost),
      첨부파일: attachments,
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
        <button type="button" onClick={onBack} className="mb-3 text-xs text-gray-500 hover:text-gray-900">
          ‹ 목록으로
        </button>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">
              {farmName} <span className="text-gray-400">·</span>{' '}
              {isNew ? '사료관리비 등록' : '사료관리비 상세'}
            </h1>
            <CattleStatusSummary
              normal={NORMAL_COUNT - exceptionCattle.length}
              dead={deadCount}
                early={earlyCount}
                shipped={shippedCount}
              normalLabel={unit.breedingStatus === '정산완료' ? '정상출하' : '사육중'}
            />
          </div>
          <div className="flex items-center gap-3">
            <PrototypeDateBadge />
            {isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMode('edit')
                    setCalculationSnapshot(null)
                  }}
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

        <div className="mb-5 border border-gray-200 bg-white p-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">정산월</label>
          <div className="flex items-center gap-2">
            <select
              value={settlementMonth}
              onChange={(e) => {
                setSettlementMonth(e.target.value)
                setCalculationSnapshot(null)
              }}
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
          <p className="-mt-2 mb-3 text-xs text-gray-400">
            조사료비는 사료비와 합산해 송아지별 사료비 사육일수 기준으로 배분됩니다.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <MoneyInput
              id="feed-cost"
              label="사료비 총액"
              value={feedCost}
              onChange={setFeedCost}
              disabled={isReadOnly}
            />
            <MoneyInput
              id="roughage-cost"
              label="조사료비 총액"
              value={roughageCost}
              onChange={setRoughageCost}
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
          {!isReadOnly && (
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCalculate}
                disabled={!canCalculate}
                className={`px-3 py-2 text-xs font-medium ${
                  canCalculate
                    ? 'bg-gray-900 text-white hover:bg-gray-700'
                    : 'cursor-not-allowed bg-gray-200 text-gray-400'
                }`}
              >
                {calculationSnapshot ? '다시 계산하기' : '계산하기'}
              </button>
              {calculationSnapshot && !isCurrentCalculation && (
                <p className="text-xs text-amber-600">입력값이 변경되었습니다. 계산하기를 눌러 결과를 갱신해 주세요.</p>
              )}
            </div>
          )}
        </div>

        <AttachmentsPanel
          settlementMonth={settlementMonth}
          attachments={attachments}
          disabled={isReadOnly}
          allowDownloads={!isNew}
          onAdd={(nextAttachments) => setAttachments((current) => [...current, ...nextAttachments])}
          onRemove={(attachmentId) => setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId))}
        />

        {result ? (
          <>
            <CostSummaryCard
              feedCost={calculationSnapshot.feedCost}
              roughageCost={calculationSnapshot.roughageCost}
              totalFeedCost={result.exactFeedSum}
              totalMgmtCost={result.exactMgmtSum}
              totalFeedDays={calculatedDays.totalFeedDays}
              totalMgmtDays={calculatedDays.totalMgmtDays}
            />
            <AllocationResult result={result} isCompletedUnit={unit.breedingStatus === '정산완료'} />
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
              disabled={!canSave}
              className={`px-4 py-2 text-xs font-medium ${
                canSave
                  ? 'bg-gray-900 text-white hover:bg-gray-700'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
              }`}
            >
              수정완료
            </button>
          ) : isNew ? (
            <button
              type="button"
              onClick={() => setConfirmAction('confirm')}
              disabled={!canSave}
              className={`px-4 py-2 text-xs font-medium ${
                canSave
                  ? 'bg-gray-900 text-white hover:bg-gray-700'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
              }`}
              >
                확정하기
              </button>
          ) : null}
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
