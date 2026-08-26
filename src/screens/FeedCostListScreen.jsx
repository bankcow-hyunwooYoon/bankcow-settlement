import { useEffect, useState } from 'react'
import CattleStatusSummary from '../components/CattleStatusSummary.jsx'
import { formatWon } from '../lib/format.js'
import { STATUS_CONFIRMED } from '../lib/records.js'
import { exportToExcel } from '../lib/exportExcel.js'
import PrototypeDateBadge from '../components/PrototypeDateBadge.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { getSelectableMonths, sortRecordsByMonthDesc } from '../lib/records.js'
import { getExceptionCattle } from '../lib/settlement.js'
import { downloadAttachmentsZip } from '../lib/attachments.js'
import { getFarmManagementGuaranteeStatus } from '../lib/farmManagementGuarantee.js'

function EmptyState({ onRegister }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-gray-200 bg-white py-24">
      <p className="text-sm text-gray-500">아직 등록된 사료관리비 내역이 없습니다</p>
      <button
        type="button"
        onClick={onRegister}
        className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
      >
        사료관리비 등록하기
      </button>
    </div>
  )
}

function ExportButton({ disabled, onClick }) {
  return (
    <div className="group relative">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`rounded border px-3 py-1.5 text-xs font-medium ${
          disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        엑셀로 내보내기
      </button>
      {disabled && (
        <span className="pointer-events-none absolute right-0 top-full z-10 mt-1 hidden whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
          확정된 데이터가 없습니다
        </span>
      )}
    </div>
  )
}

function FeedCostTable({ records, onEdit, selectedMonths, onToggleMonth, onToggleAll }) {
  const isAllSelected = records.length > 0 && records.every((record) => selectedMonths.includes(record.정산월))
  return (
    <div className="overflow-hidden border border-gray-200 bg-white">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="bg-gray-50 text-gray-500">
            <th className="w-11 border-b border-gray-200 px-4 py-2.5">
              <input
                type="checkbox"
                aria-label="전체 선택"
                checked={isAllSelected}
                onChange={(event) => onToggleAll(event.target.checked)}
                className="h-3.5 w-3.5 accent-gray-900"
              />
            </th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">정산월</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">사료비 총액</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">조사료비 총액</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">사료비+조사료비 합계</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">관리비 총액</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">사료관리비 합계</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">첨부</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">등록일시</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              key={record.정산월}
              onClick={() => onEdit(record)}
              className="cursor-pointer transition-colors hover:bg-gray-100"
            >
              <td className="border-b border-gray-200 px-4 py-2.5" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={`${record.정산월} 선택`}
                  checked={selectedMonths.includes(record.정산월)}
                  onChange={(event) => onToggleMonth(record.정산월, event.target.checked)}
                  className="h-3.5 w-3.5 accent-gray-900"
                />
              </td>
              <td className="border-b border-gray-200 px-4 py-2.5 text-gray-900">{record.정산월}</td>
              <td className="border-b border-gray-200 px-4 py-2.5 text-gray-700">
                {formatWon(record.사료비총액)}
              </td>
              <td className="border-b border-gray-200 px-4 py-2.5 text-gray-700">
                {formatWon(record.조사료비총액 ?? 0)}
              </td>
              <td className="border-b border-gray-200 px-4 py-2.5 font-medium text-gray-900">
                {formatWon(Number(record.사료비총액) + Number(record.조사료비총액 ?? 0))}
              </td>
              <td className="border-b border-gray-200 px-4 py-2.5 text-gray-700">
                {formatWon(record.관리비총액)}
              </td>
              <td className="border-b border-gray-200 px-4 py-2.5 font-semibold text-gray-900">
                {formatWon(Number(record.사료비총액) + Number(record.조사료비총액 ?? 0) + Number(record.관리비총액))}
              </td>
              <td className="border-b border-gray-200 px-4 py-2.5 text-gray-500">
                {record.첨부파일?.length ? `${record.첨부파일.length}개` : '-'}
              </td>
              <td className="border-b border-gray-200 px-4 py-2.5 text-gray-500">{record.등록일시}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExportModal({ open, isCompletedUnit, deathRate, deathCount, headCount, includeGuarantee, onToggleGuarantee, onClose, onExport, isExporting, exportError }) {
  if (!open) return null
  const isBlockedByDeathRate = deathRate >= 0.01
  const rateLabel = `${(deathRate * 100).toFixed(1)}%`
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div role="dialog" aria-modal="true" aria-labelledby="export-title" className="w-full max-w-md border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 id="export-title" className="text-sm font-semibold text-gray-900">엑셀 내보내기</h2>
          <p className="mt-1 text-xs text-gray-500">내보낼 최종 정산 항목을 확인해 주세요.</p>
        </div>
        <div className="space-y-4 px-5 py-4">
          {isCompletedUnit ? <div className={`border px-3 py-3 ${isBlockedByDeathRate ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
            <p className={`text-xs font-semibold ${isBlockedByDeathRate ? 'text-red-800' : 'text-emerald-800'}`}>
              이 농장의 폐사율은 {rateLabel}입니다 ({deathCount}두 / {headCount}두)
            </p>
            <p className={`mt-1 text-xs ${isBlockedByDeathRate ? 'text-red-700' : 'text-emerald-700'}`}>
              {isBlockedByDeathRate
                ? '폐사율이 1% 이상이므로 농가관리비보증금은 지급하지 않아야 합니다. 필요 시 토글을 직접 변경할 수 있습니다.'
                : '폐사율이 1% 미만이므로 농가관리비보증금 지급 기준을 충족합니다.'}
            </p>
          </div> : <div className="border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-600">
            농가관리비보증금은 경매완료 후 최종 정산 엑셀에서만 선택할 수 있습니다.
          </div>}
          {isCompletedUnit && <div className="flex items-center justify-between gap-4 border border-gray-200 px-3 py-3">
            <div>
              <p className="text-xs font-medium text-gray-800">농가관리비보증금 지급</p>
              <p className="mt-1 text-[11px] text-gray-500">정상출하 개체에 한해 최종 정산 엑셀에 반영됩니다.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={includeGuarantee}
              onClick={() => onToggleGuarantee(!includeGuarantee)}
              className={`relative h-6 w-11 rounded-full transition-colors ${includeGuarantee ? 'bg-emerald-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${includeGuarantee ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>}
          <p className="text-[11px] text-gray-400">보증금은 월별 사료비·관리비에는 포함되지 않고, 최종 실제 투입원가에만 별도 반영됩니다.</p>
          {exportError && <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">엑셀 파일을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button type="button" onClick={onClose} disabled={isExporting} className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-900">취소</button>
          <button type="button" onClick={onExport} disabled={isExporting} className="bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:bg-gray-400">
            {isExporting ? '내보내는 중...' : '엑셀 내보내기'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FeedCostListScreen({ records, unit, onNavigateToRegister, onEditRecord, onDeleteRecords }) {
  const [showEmpty, setShowEmpty] = useState(false)
  const [showNoMonthDialog, setShowNoMonthDialog] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [includeFarmManagementGuarantee, setIncludeFarmManagementGuarantee] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState(false)
  const [isDownloadingAttachments, setIsDownloadingAttachments] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState([])
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const visibleRecords = showEmpty ? [] : records
  const latestRecord = sortRecordsByMonthDesc(records)[0]
  const exitedCattle = latestRecord ? getExceptionCattle(latestRecord.정산월, unit.farmName, unit.id) : []
  const deadCount = exitedCattle.filter((cattle) => cattle.status === '폐사').length
  const earlyCount = exitedCattle.filter((cattle) => cattle.status === '조기출하').length
  const shippedCount = exitedCattle.filter((cattle) => cattle.status === '정상출하').length
  const guaranteeStatus = getFarmManagementGuaranteeStatus(unit)

  const hasConfirmed = visibleRecords.some((r) => r.상태 === STATUS_CONFIRMED)
  const hasAttachments = visibleRecords.some((r) => r.첨부파일?.length)

  useEffect(() => {
    const existingMonths = new Set(records.map((record) => record.정산월))
    setSelectedMonths((previous) => previous.filter((month) => existingMonths.has(month)))
  }, [records])

  const handleRegister = () => {
    const hasAvailableMonth = unit.breedingStatus !== '정산완료'
      && getSelectableMonths(records, undefined, unit.placementDate).length > 0
    if (!hasAvailableMonth) {
      setShowNoMonthDialog(true)
      return
    }
    onNavigateToRegister()
  }

  const handleEdit = (record) => {
    console.log('수정 클릭', record)
    onEditRecord(record)
  }

  const handleToggleMonth = (settlementMonth, checked) => {
    setSelectedMonths((previous) => (
      checked ? [...previous, settlementMonth] : previous.filter((month) => month !== settlementMonth)
    ))
  }

  const handleToggleAll = (checked) => {
    setSelectedMonths(checked ? visibleRecords.map((record) => record.정산월) : [])
  }

  const handleBulkDelete = () => {
    onDeleteRecords(selectedMonths)
    setSelectedMonths([])
    setShowBulkDeleteDialog(false)
  }

  const handleExport = () => {
    setIncludeFarmManagementGuarantee(unit.breedingStatus === '정산완료' && guaranteeStatus.isEligibleByDeathRate)
    setExportError(false)
    setShowExportModal(true)
  }

  const handleConfirmExport = async () => {
    setIsExporting(true)
    setExportError(false)
    try {
      await exportToExcel(visibleRecords, unit, { includeFarmManagementGuarantee })
      setShowExportModal(false)
    } catch (error) {
      console.error('엑셀 내보내기 실패', error)
      setExportError(true)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadAttachments = async () => {
    setIsDownloadingAttachments(true)
    await downloadAttachmentsZip(visibleRecords, unit.farmName)
    setIsDownloadingAttachments(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 px-8 py-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-4 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={showEmpty}
              onChange={(e) => setShowEmpty(e.target.checked)}
              className="h-3 w-3"
            />
            빈 상태 미리보기 (프로토타입용 토글)
          </label>
          <PrototypeDateBadge />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900">
                {unit.farmName} <span className="text-gray-400">·</span> 사료관리비
              </h1>
              <CattleStatusSummary
                normal={unit.headCount - exitedCattle.length}
                dead={deadCount}
                early={earlyCount}
                shipped={shippedCount}
                normalLabel={unit.breedingStatus === '정산완료' ? '정상출하' : '사육중'}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              최초 입식일 {unit.placementDate.replaceAll('-', '.')} <span className="mx-1 text-gray-300">|</span> 총 {unit.headCount}두
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedMonths.length === 0}
              onClick={() => setShowBulkDeleteDialog(true)}
              className={`rounded border px-3 py-1.5 text-xs font-medium ${
                selectedMonths.length > 0
                  ? 'border-red-200 bg-white text-red-700 hover:bg-red-50'
                  : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
              }`}
            >
              선택 삭제{selectedMonths.length > 0 ? ` (${selectedMonths.length})` : ''}
            </button>
            <ExportButton disabled={!hasConfirmed} onClick={handleExport} />
            <button
              type="button"
              disabled={!hasAttachments || isDownloadingAttachments}
              onClick={handleDownloadAttachments}
              className={`rounded border px-3 py-1.5 text-xs font-medium ${
                hasAttachments && !isDownloadingAttachments
                  ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
              }`}
            >
              {isDownloadingAttachments ? 'ZIP 생성 중...' : '첨부파일 전체 다운로드'}
            </button>
            <button
              type="button"
              onClick={handleRegister}
              className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
            >
              사료관리비 등록하기
            </button>
          </div>
        </div>

        {visibleRecords.length === 0 ? (
          <EmptyState onRegister={handleRegister} />
        ) : (
          <FeedCostTable
            records={visibleRecords}
            onEdit={handleEdit}
            selectedMonths={selectedMonths}
            onToggleMonth={handleToggleMonth}
            onToggleAll={handleToggleAll}
          />
        )}
      </div>
      <ConfirmDialog
        open={showNoMonthDialog}
        message="현재 등록 가능한 정산월이 없습니다. 입식월처럼 정산 대상이 아니거나 입력에서 제외된 달은 미입력 상태로 남을 수 있습니다. 다음 정산월이 끝난 뒤 등록할 수 있습니다."
        onCancel={() => setShowNoMonthDialog(false)}
        onConfirm={() => setShowNoMonthDialog(false)}
        confirmLabel="확인"
        hideCancel
      />
      <ConfirmDialog
        open={showBulkDeleteDialog}
        message={`선택한 사료관리비 ${selectedMonths.length}건을 삭제하시겠습니까? 삭제한 정산월은 다시 등록할 수 있습니다.`}
        onCancel={() => setShowBulkDeleteDialog(false)}
        onConfirm={handleBulkDelete}
        confirmLabel="삭제"
      />
      <ExportModal
        open={showExportModal}
        isCompletedUnit={unit.breedingStatus === '정산완료'}
        deathRate={guaranteeStatus.deathRate}
        deathCount={guaranteeStatus.deathCount}
        headCount={unit.headCount}
        includeGuarantee={includeFarmManagementGuarantee}
        onToggleGuarantee={setIncludeFarmManagementGuarantee}
        onClose={() => setShowExportModal(false)}
        onExport={handleConfirmExport}
        isExporting={isExporting}
        exportError={exportError}
      />
    </div>
  )
}
