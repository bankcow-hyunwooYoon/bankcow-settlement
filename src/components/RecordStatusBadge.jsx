export default function RecordStatusBadge({ status }) {
  const isConfirmed = status === '확정'
  const classes = isConfirmed
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    : 'bg-gray-100 text-gray-600 ring-gray-500/20'
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}>
      {status}
    </span>
  )
}
