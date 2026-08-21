import { useMemo, useState } from 'react'
import PrototypeDateBadge from '../components/PrototypeDateBadge.jsx'
import { now } from '../lib/prototypeDate.js'

const FILTERS = ['전체', '사육중', '정산완료']

function BreedingStatusBadge({ status }) {
  const classes = status === '사육중'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    : 'bg-gray-100 text-gray-600 ring-gray-500/20'
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}>{status}</span>
}

/** 입식월을 포함하고, 진행 중인 이번 달은 제외한 완료 정산월 수를 계산한다. */
function getElapsedSettlementMonths(placementDate) {
  const placement = new Date(`${placementDate}T00:00:00`)
  const reference = now()
  const lastEndedMonthIndex = reference.getFullYear() * 12 + reference.getMonth()
  const placementMonthIndex = placement.getFullYear() * 12 + placement.getMonth() + 1
  return Math.max(0, lastEndedMonthIndex - placementMonthIndex + 1)
}

function InputProgress({ unit }) {
  const totalMonths = unit.breedingStatus === '정산완료'
    ? unit.finalSettlementMonths
    : getElapsedSettlementMonths(unit.placementDate)
  const completedMonths = unit.records.filter((record) => record.상태 === '확정').length
  const isComplete = completedMonths === totalMonths
  const classes = unit.breedingStatus === '정산완료'
    ? 'text-gray-500'
    : isComplete
      ? 'text-emerald-700'
      : 'font-medium text-orange-700'
  return <span className={`text-xs ${classes}`}>{completedMonths} / {totalMonths}개월</span>
}

export default function BreedingUnitListScreen({ units, onSelectUnit }) {
  const [filter, setFilter] = useState('사육중')
  const visibleUnits = useMemo(
    () => units
      .filter((unit) => filter === '전체' || unit.breedingStatus === filter)
      .sort((a, b) => b.placementDate.localeCompare(a.placementDate)),
    [filter, units],
  )

  return (
    <div className="min-h-screen bg-gray-100 px-8 py-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">사료관리비 정산</h1>
            <p className="mt-1 text-xs text-gray-500">농장별 사육 단위를 선택해 월별 사료관리비를 입력·조회합니다.</p>
          </div>
          <PrototypeDateBadge />
        </div>

        <div className="mb-4 flex items-center gap-1.5">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                filter === item ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="overflow-hidden border border-gray-200 bg-white">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="border-b border-gray-200 px-4 py-2.5 font-medium">농장명</th>
                <th className="border-b border-gray-200 px-4 py-2.5 font-medium">최초 입식일</th>
                <th className="border-b border-gray-200 px-4 py-2.5 font-medium text-right">사육 두수</th>
                <th className="border-b border-gray-200 px-4 py-2.5 font-medium text-right">연결 상품 수</th>
                <th className="border-b border-gray-200 px-4 py-2.5 font-medium">상태</th>
                <th className="border-b border-gray-200 px-4 py-2.5 font-medium">입력 현황</th>
              </tr>
            </thead>
            <tbody>
              {visibleUnits.map((unit) => (
                <tr
                  key={unit.id}
                  onClick={() => onSelectUnit(unit)}
                  className="cursor-pointer transition-colors hover:bg-gray-100"
                >
                  <td className="border-b border-gray-200 px-4 py-3">
                    <p className="font-medium text-gray-900">{unit.farmName}</p>
                  </td>
                  <td className="border-b border-gray-200 px-4 py-3 text-gray-700">{unit.placementDate.replaceAll('-', '.')}</td>
                  <td className="border-b border-gray-200 px-4 py-3 text-right text-gray-700">{unit.headCount.toLocaleString('ko-KR')}두</td>
                  <td className="border-b border-gray-200 px-4 py-3 text-right text-gray-700">{unit.linkedProductCount}개</td>
                  <td className="border-b border-gray-200 px-4 py-3"><BreedingStatusBadge status={unit.breedingStatus} /></td>
                  <td className="border-b border-gray-200 px-4 py-3"><InputProgress unit={unit} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleUnits.length === 0 && <p className="py-16 text-center text-sm text-gray-500">해당 상태의 사육 단위가 없습니다.</p>}
        </div>
      </div>
    </div>
  )
}
