export default function ConfirmDialog({ open, message, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-xs border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-900">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-700"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
