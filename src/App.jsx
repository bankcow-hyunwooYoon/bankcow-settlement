import { useEffect, useState } from 'react'
import FeedCostListScreen from './screens/FeedCostListScreen.jsx'
import SettlementDetailScreen from './screens/SettlementDetailScreen.jsx'
import BreedingUnitListScreen from './screens/BreedingUnitListScreen.jsx'
import { getSelectableMonths, upsertRecord } from './lib/records.js'
import { BREEDING_UNITS } from './lib/breedingUnits.js'
import { ACTIVE_INVESTMENT_PRODUCTS } from './lib/investmentProducts.js'

function buildPlacementBatches(products) {
  let nextNo = 1
  return products.map((product) => {
    const from = nextNo
    const to = from + product.headCount - 1
    nextNo = to + 1
    return { from, to, placementDate: product.placementDate, productId: product.id }
  })
}

export default function App() {
  const [screen, setScreen] = useState('units')
  const [units, setUnits] = useState(BREEDING_UNITS)
  const [recordsByUnit, setRecordsByUnit] = useState(() =>
    Object.fromEntries(BREEDING_UNITS.map((unit) => [unit.id, unit.initialRecords])),
  )
  const [selectedUnitId, setSelectedUnitId] = useState(null)
  // 목록에서 선택한 월. null이면 신규 등록 화면이다.
  const [editing, setEditing] = useState(null)

  // 이 프로토타입은 별도 라우터 없이 화면 상태로 동작한다. 브라우저 뒤로가기도 지원한다.
  useEffect(() => {
    window.history.replaceState({ screen: 'units', editing: null }, '')
    const handlePopState = (event) => {
      setScreen(event.state?.screen ?? 'units')
      setEditing(event.state?.editing ?? null)
      setSelectedUnitId(event.state?.unitId ?? null)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (nextScreen, nextEditing = null, nextUnitId = selectedUnitId) => {
    setEditing(nextEditing)
    setScreen(nextScreen)
    setSelectedUnitId(nextUnitId)
    window.history.pushState({ screen: nextScreen, editing: nextEditing, unitId: nextUnitId }, '')
  }

  const goToList = () => {
    setEditing(null)
    // 뒤로가기 이벤트가 늦거나 생략되는 환경에서도 등록/확정 후 즉시 목록을 보여 준다.
    setScreen('list')
    window.history.back()
  }

  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) ?? units[0]
  const records = recordsByUnit[selectedUnit.id] ?? []

  if (screen === 'register') {
    return (
      <SettlementDetailScreen
        // 수정 대상이 바뀌면 입력 상태를 새로 초기화한다.
        key={editing?.정산월 ?? 'new'}
        record={editing}
        selectableMonths={getSelectableMonths(records, undefined, selectedUnit.placementDate)}
        onBack={goToList}
        onSave={(record, options = {}) => {
          setRecordsByUnit((prev) => ({
            ...prev,
            [selectedUnit.id]: upsertRecord(prev[selectedUnit.id] ?? [], record),
          }))
          if (options.stayOnScreen) {
            setEditing(record)
          } else {
            goToList()
          }
        }}
        onDelete={(settlementMonth) => {
          setRecordsByUnit((prev) => ({
            ...prev,
            [selectedUnit.id]: (prev[selectedUnit.id] ?? []).filter((record) => record.정산월 !== settlementMonth),
          }))
        }}
        unit={selectedUnit}
      />
    )
  }

  if (screen === 'units') {
    const unitsWithRecords = units.map((unit) => ({ ...unit, records: recordsByUnit[unit.id] ?? [] }))
    const connectedProductIds = new Set(units.flatMap((unit) => unit.linkedProductIds ?? []))
    const availableProducts = ACTIVE_INVESTMENT_PRODUCTS.filter((product) => !connectedProductIds.has(product.id))
    return (
      <BreedingUnitListScreen
        units={unitsWithRecords}
        availableProducts={availableProducts}
        onSelectUnit={(unit) => navigate('list', null, unit.id)}
        onCreateUnit={({ farmName, products }) => {
          const placementDate = products.reduce(
            (earliest, product) => (product.placementDate < earliest ? product.placementDate : earliest),
            products[0].placementDate,
          )
          const id = `unit-manual-${Date.now()}`
          const newUnit = {
            id,
            farmName,
            placementDate,
            headCount: products.reduce((sum, product) => sum + product.headCount, 0),
            placementBatches: buildPlacementBatches(products),
            linkedProductCount: products.length,
            linkedProductIds: products.map((product) => product.id),
            breedingStatus: '사육중',
            initialRecords: [],
          }
          setUnits((prev) => [newUnit, ...prev])
          setRecordsByUnit((prev) => ({ ...prev, [id]: [] }))
        }}
        onUpdateUnit={(unit, { farmName }) => {
          setUnits((previous) => previous.map((item) => (item.id === unit.id ? { ...item, farmName } : item)))
        }}
      />
    )
  }

  return (
    <FeedCostListScreen
      records={records}
      unit={selectedUnit}
      onNavigateToRegister={() => {
        navigate('register')
      }}
      onEditRecord={(record) => {
        navigate('register', record)
      }}
      onDeleteRecords={(settlementMonths) => {
        const monthsToDelete = new Set(settlementMonths)
        setRecordsByUnit((prev) => ({
          ...prev,
          [selectedUnit.id]: (prev[selectedUnit.id] ?? []).filter((record) => !monthsToDelete.has(record.정산월)),
        }))
      }}
    />
  )
}
