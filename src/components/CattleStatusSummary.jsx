const STATUS_META = [
  { key: 'normal', label: '사육중', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  { key: 'dead', label: '폐사', dot: 'bg-gray-500', badge: 'bg-gray-100 text-gray-700 ring-gray-500/20' },
  { key: 'early', label: '조기출하', dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 ring-orange-600/20' },
  { key: 'shipped', label: '정상출하', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
]

export default function CattleStatusSummary({ normal, dead, early, shipped = 0, normalLabel = '사육중' }) {
  const counts = { normal, dead, early, shipped }
  const visibleStatuses = STATUS_META.filter((item) => !(item.key === 'normal' && normalLabel === '정상출하'))
  return (
    <div className="flex items-center gap-1.5">
      {visibleStatuses.map((item) => (
        <span
          key={item.key}
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${item.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
          {item.key === 'normal' ? normalLabel : item.label} {counts[item.key]}
        </span>
      ))}
    </div>
  )
}
