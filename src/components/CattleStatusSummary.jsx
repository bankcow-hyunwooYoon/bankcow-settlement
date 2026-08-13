const STATUS_META = [
  { key: 'normal', label: '정상', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  { key: 'dead', label: '폐사', dot: 'bg-gray-500', badge: 'bg-gray-100 text-gray-700 ring-gray-500/20' },
  { key: 'early', label: '조기출하', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
]

export default function CattleStatusSummary({ normal, dead, early }) {
  const counts = { normal, dead, early }
  return (
    <div className="flex items-center gap-1.5">
      {STATUS_META.map((item) => (
        <span
          key={item.key}
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${item.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
          {item.label} {counts[item.key]}
        </span>
      ))}
    </div>
  )
}
