import { useState } from 'react'
import FeedCostListScreen from './screens/FeedCostListScreen.jsx'
import SettlementDetailScreen from './screens/SettlementDetailScreen.jsx'
import { getSelectableMonths, INITIAL_RECORDS, upsertRecord } from './lib/records.js'
import { MGMT_DEPOSIT_PER_PRODUCT } from './lib/settlement.js'

export default function App() {
  const [screen, setScreen] = useState('list')
  const [records, setRecords] = useState(INITIAL_RECORDS)
  const [mgmtDeposit, setMgmtDeposit] = useState(MGMT_DEPOSIT_PER_PRODUCT)
  // 목록에서 선택한 월. null이면 신규 등록 화면이다.
  const [editing, setEditing] = useState(null)

  const goToList = () => {
    setEditing(null)
    setScreen('list')
  }

  if (screen === 'register') {
    return (
      <SettlementDetailScreen
        // 수정 대상이 바뀌면 입력 상태를 새로 초기화한다.
        key={editing?.정산월 ?? 'new'}
        record={editing}
        selectableMonths={getSelectableMonths(records)}
        onBack={goToList}
        onSave={(record, options = {}) => {
          setRecords((prev) => upsertRecord(prev, record))
          if (options.stayOnScreen) {
            setEditing(record)
          } else {
            goToList()
          }
        }}
        onDelete={(settlementMonth) => {
          setRecords((prev) => prev.filter((record) => record.정산월 !== settlementMonth))
        }}
        mgmtDeposit={mgmtDeposit}
      />
    )
  }

  return (
    <FeedCostListScreen
      records={records}
      onNavigateToRegister={() => {
        setEditing(null)
        setScreen('register')
      }}
      onEditRecord={(record) => {
        setEditing(record)
        setScreen('register')
      }}
      mgmtDeposit={mgmtDeposit}
      onSaveMgmtDeposit={setMgmtDeposit}
    />
  )
}
