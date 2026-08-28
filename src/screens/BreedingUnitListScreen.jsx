import { useMemo, useState } from 'react'
import PrototypeDateBadge from '../components/PrototypeDateBadge.jsx'
import { now } from '../lib/prototypeDate.js'

const FILTERS = [
  { value: '전체', label: '전체' },
  { value: '사육중', label: '사육중' },
  { value: '정산완료', label: '경매완료' },
]

function BreedingStatusBadge({ status }) {
  const classes = status === '사육중'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    : 'bg-gray-100 text-gray-600 ring-gray-500/20'
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}>{status === '정산완료' ? '경매완료' : status}</span>
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

function FarmRegistrationModal({ products, unit, onClose, onSubmit }) {
  const isEdit = Boolean(unit)
  const isCompleted = unit?.breedingStatus === '정산완료'
  const [farmName, setFarmName] = useState(unit?.farmName ?? '')
  const [selectedIds, setSelectedIds] = useState(unit?.linkedProductIds ?? [])
  const selectedProducts = products.filter((product) => selectedIds.includes(product.id))
  const toggleProduct = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }
  const canSubmit = farmName.trim().length > 0 && (isCompleted || selectedProducts.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="farm-registration-title">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-hidden bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 id="farm-registration-title" className="text-base font-semibold text-gray-900">{isEdit ? '농장 정보 수정' : '농장 등록'}</h2>
          <p className="mt-1 text-xs text-gray-500">{isEdit ? '사육 단위명과 연결 투자상품을 수정합니다.' : '농장명과 연결할 진행 중 투자상품을 선택해 주세요.'}</p>
        </div>
        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-5">
          <label htmlFor="farm-name" className="mb-1.5 block text-xs font-medium text-gray-700">농장명</label>
          <input
            id="farm-name"
            value={farmName}
            onChange={(event) => setFarmName(event.target.value)}
            placeholder="예: 충만농장"
            className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
          />

          <div className="mt-6 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-xs font-medium text-gray-700">연결할 투자상품</h3>
              <p className="mt-1 text-xs text-gray-400">정산이 종료된 상품은 제외됩니다. 하나 이상 선택할 수 있습니다.</p>
            </div>
            <span className="shrink-0 text-xs text-gray-500">{selectedProducts.length}개 선택</span>
          </div>
          <div className="mt-2 overflow-hidden border border-gray-200">
            {products.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500">연결 가능한 투자상품이 없습니다.</p>
            ) : (
              products.map((product) => {
                const checked = selectedIds.includes(product.id)
                return (
                  <label key={product.id} className={`flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 ${checked ? 'bg-emerald-50/60' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={checked} disabled={isCompleted} onChange={() => toggleProduct(product.id)} className="h-4 w-4 accent-gray-900 disabled:cursor-not-allowed" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-800">{product.productName}호 <span className="ml-1 font-normal text-gray-500">· {product.farmName}</span></span>
                      <span className="mt-0.5 block text-xs text-gray-400">최초 입식일 {product.placementDate.replaceAll('-', '.')}</span>
                    </span>
                    <span className="text-xs font-medium text-gray-600">{product.headCount}두</span>
                  </label>
                )
              })
            )}
          </div>
          {selectedProducts.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">연결 후 사육 두수: <span className="font-medium text-gray-800">{selectedProducts.reduce((sum, product) => sum + product.headCount, 0)}두</span> · 최초 입식일: <span className="font-medium text-gray-800">{selectedProducts.reduce((earliest, product) => (product.placementDate < earliest ? product.placementDate : earliest), selectedProducts[0].placementDate).replaceAll('-', '.')}</span></p>
          )}
          {isCompleted && <p className="mt-3 text-xs text-gray-500">경매완료된 농장은 사육 단위명만 수정할 수 있습니다.</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button type="button" onClick={onClose} className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
          <button type="button" disabled={!canSubmit} onClick={() => onSubmit({ farmName: farmName.trim(), products: selectedProducts })} className="bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300">{isEdit ? '저장' : '등록'}</button>
        </div>
      </div>
    </div>
  )
}

export default function BreedingUnitListScreen({ units, availableProducts, onSelectUnit, onCreateUnit, onUpdateUnit }) {
  const [filter, setFilter] = useState('사육중')
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false)
  const [editingUnitId, setEditingUnitId] = useState(null)
  const [editingFarmName, setEditingFarmName] = useState('')
  const visibleUnits = useMemo(
    () => units
      .filter((unit) => filter === '전체' || unit.breedingStatus === filter)
      .sort((a, b) => b.placementDate.localeCompare(a.placementDate)),
    [filter, units],
  )
  const beginFarmNameEdit = (unit) => {
    setEditingUnitId(unit.id)
    setEditingFarmName(unit.farmName)
  }

  const saveFarmName = (unit) => {
    const farmName = editingFarmName.trim()
    if (!farmName) return
    onUpdateUnit(unit, { farmName })
    setEditingUnitId(null)
    setEditingFarmName('')
  }

  return (
    <div className="min-h-screen bg-gray-100 px-8 py-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">사료관리비 정산</h1>
            <p className="mt-1 text-xs text-gray-500">농장별 사육 단위를 선택해 월별 사료관리비를 입력·조회합니다.</p>
          </div>
          <div className="flex items-center gap-3">
            <PrototypeDateBadge />
            <button type="button" onClick={() => setIsRegistrationOpen(true)} className="bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700">농장 등록</button>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-1.5">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                filter === item.value ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.label}
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
                <th className="border-b border-gray-200 px-4 py-2.5 font-medium text-center">관리</th>
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
                    {editingUnitId === unit.id ? (
                      <input
                        autoFocus
                        value={editingFarmName}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => setEditingFarmName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') saveFarmName(unit)
                          if (event.key === 'Escape') setEditingUnitId(null)
                        }}
                        className="w-full min-w-0 border border-gray-300 px-2 py-1 text-[13px] font-medium text-gray-900 outline-none focus:border-gray-500"
                        aria-label={`${unit.farmName} 농장명 수정`}
                      />
                    ) : <p className="font-medium text-gray-900">{unit.farmName}</p>}
                  </td>
                  <td className="border-b border-gray-200 px-4 py-3 text-gray-700">{unit.placementDate.replaceAll('-', '.')}</td>
                  <td className="border-b border-gray-200 px-4 py-3 text-right text-gray-700">{unit.headCount.toLocaleString('ko-KR')}두</td>
                  <td className="border-b border-gray-200 px-4 py-3 text-right text-gray-700">{unit.linkedProductCount}개</td>
                  <td className="border-b border-gray-200 px-4 py-3"><BreedingStatusBadge status={unit.breedingStatus} /></td>
                  <td className="border-b border-gray-200 px-4 py-3"><InputProgress unit={unit} /></td>
                  <td className="border-b border-gray-200 px-4 py-3 text-center" onClick={(event) => event.stopPropagation()}>
                    {editingUnitId === unit.id ? (
                      <div className="flex justify-center gap-1">
                        <button type="button" disabled={!editingFarmName.trim()} onClick={() => saveFarmName(unit)} className="border border-gray-900 bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300">저장</button>
                        <button type="button" onClick={() => setEditingUnitId(null)} className="border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">취소</button>
                      </div>
                    ) : <button type="button" onClick={() => beginFarmNameEdit(unit)} className="border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">수정</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleUnits.length === 0 && <p className="py-16 text-center text-sm text-gray-500">해당 상태의 사육 단위가 없습니다.</p>}
        </div>
        {isRegistrationOpen && (
          <FarmRegistrationModal
            products={availableProducts}
            onClose={() => setIsRegistrationOpen(false)}
            onSubmit={(payload) => {
              onCreateUnit(payload)
              setIsRegistrationOpen(false)
            }}
          />
        )}
      </div>
    </div>
  )
}
