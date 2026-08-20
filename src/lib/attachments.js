import JSZip from 'jszip'

function safeFilePart(value) {
  return String(value).replace(/[\\/:*?"<>|]/g, '_')
}

export function createAttachment(file) {
  return {
    id: `${file.name}-${file.lastModified}-${file.size}-${crypto.randomUUID()}`,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    file,
  }
}

export function formatFileSize(size) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}

export function downloadAttachment(attachment) {
  const url = URL.createObjectURL(attachment.file)
  const link = document.createElement('a')
  link.href = url
  link.download = attachment.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** 확정 월별 첨부파일을 정산월 폴더로 묶어 한 번에 내려받는다. */
export async function downloadAttachmentsZip(records, farmName) {
  const recordsWithAttachments = records.filter((record) => record.첨부파일?.length)
  if (!recordsWithAttachments.length) return false

  const zip = new JSZip()
  recordsWithAttachments.forEach((record) => {
    const folder = zip.folder(safeFilePart(record.정산월))
    record.첨부파일.forEach((attachment) => {
      if (attachment.file) folder.file(safeFilePart(attachment.name), attachment.file)
    })
  })

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeFilePart(farmName)}_사료관리비_첨부파일.zip`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return true
}
