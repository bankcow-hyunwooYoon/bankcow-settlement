import { useState } from 'react'
import RecordStatusBadge from '../components/RecordStatusBadge.jsx'
import CattleStatusSummary from '../components/CattleStatusSummary.jsx'
import { formatNumber, formatWon, parseDigits } from '../lib/format.js'
import { STATUS_CONFIRMED } from '../lib/records.js'
import { exportToExcel } from '../lib/exportExcel.js'
import PrototypeDateBadge from '../components/PrototypeDateBadge.jsx'
import { FARM_PLACEMENT_DATE, TOTAL_CATTLE_COUNT } from '../lib/settlement.js'

const FARM_NAME = '충만농장'

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

function MgmtDepositEditor({ value, onSave }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  const startEditing = () => {
    setDraft(value ?? '')
    setIsEditing(true)
  }
  const cancel = () => {
    setDraft(value ?? '')
    setIsEditing(false)
  }
  const save = () => {
    if (Number(draft) > 0) onSave(Number(draft))
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          aria-label="관리비보증금"
          type="text"
          inputMode="numeric"
          value={formatNumber(draft)}
          onChange={(event) => setDraft(parseDigits(event.target.value))}
          className="w-36 border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:border-gray-500 focus:outline-none"
        />
        <span className="text-xs text-gray-400">원</span>
        <button type="button" onClick={save} className="text-xs font-medium text-gray-800 hover:underline">저장</button>
        <button type="button" onClick={cancel} className="text-xs text-gray-400 hover:underline">취소</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-gray-500">
        {value ? `관리비보증금 ${formatWon(value)}` : '관리비보증금 미설정'}
      </span>
      <button type="button" onClick={startEditing} className="font-medium text-gray-700 hover:underline">
        {value ? '✎' : '[입력]'}
      </button>
    </div>
  )
}

function FeedCostTable({ records, onEdit }) {
  return (
    <div className="overflow-hidden border border-gray-200 bg-white">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="bg-gray-50 text-gray-500">
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">정산월</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">사료비 총액</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">관리비 총액</th>
            <th className="border-b border-gray-200 px-4 py-2.5 font-medium">상태</th>
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
              <td className="border-b border-gray-200 px-4 py-2.5 text-gray-900">{record.정산월}</td>
              <td className="border-b border-gray-200 px-4 py-2.5 text-gray-700">
                {formatWon(record.사료비총액)}
              </td>
              <td className="border-b border-gray-200 px-4 py-2.5 text-gray-700">
                {formatWon(record.관리비총액)}
              </td>
              <td className="border-b border-gray-200 px-4 py-2.5">
                <RecordStatusBadge status={record.상태} />
              </td>
              <td className="border-b border-gray-200 px-4 py-2.5 text-gray-500">{record.등록일시}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function FeedCostListScreen({ records, onNavigateToRegister, onEditRecord, mgmtDeposit, onSaveMgmtDeposit }) {
  const [showEmpty, setShowEmpty] = useState(false)
  const visibleRecords = showEmpty ? [] : records

  const hasConfirmed = visibleRecords.some((r) => r.상태 === STATUS_CONFIRMED)

  const handleRegister = () => {
    console.log('사료관리비 등록하기 클릭')
    onNavigateToRegister()
  }

  const handleEdit = (record) => {
    console.log('수정 클릭', record)
    onEditRecord(record)
  }

  const handleExport = () => {
    console.log('엑셀로 내보내기 클릭')
    exportToExcel(visibleRecords, mgmtDeposit)
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
                {FARM_NAME} <span className="text-gray-400">·</span> 사료관리비
              </h1>
              <CattleStatusSummary normal={47} dead={2} early={1} />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              입식일 {FARM_PLACEMENT_DATE} <span className="mx-1 text-gray-300">|</span> 총 {TOTAL_CATTLE_COUNT}두
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MgmtDepositEditor value={mgmtDeposit} onSave={onSaveMgmtDeposit} />
            <ExportButton disabled={!hasConfirmed} onClick={handleExport} />
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
          <FeedCostTable records={visibleRecords} onEdit={handleEdit} />
        )}
      </div>
    </div>
  )
}
