const STATUS_CLASSES = {
  정상: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  폐사: 'bg-red-100 text-red-700 ring-red-600/20',
  조기출하: 'bg-red-100 text-red-700 ring-red-600/20',
}

export default function CattleStatusBadge({ status, muted = false }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        muted ? 'bg-gray-100 text-gray-400 ring-gray-300' : STATUS_CLASSES[status]
      }`}
    >
      {status}
    </span>
  )
}
