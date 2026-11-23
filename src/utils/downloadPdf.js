import api from "../api/axios"

// Download a file (PDF, Excel...) from an authenticated endpoint. Errors from a blob response come back
// as a Blob, so read the JSON `detail` out of it to show a useful message.
export async function downloadFile(url, fallbackName) {
  try {
    const res = await api.get(url, { responseType: "blob" })
    const disposition = res.headers?.["content-disposition"] || ""
    const match = /filename="?([^";]+)"?/i.exec(disposition)
    const filename = match ? match[1] : fallbackName

    const href = window.URL.createObjectURL(res.data)
    const link = document.createElement("a")
    link.href = href
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(href)
  } catch (err) {
    const data = err?.response?.data
    if (data instanceof Blob) {
      let detail = null
      try {
        detail = JSON.parse(await data.text())?.detail
      } catch {
        // not JSON — fall through to the original error
      }
      if (typeof detail === "string") throw new Error(detail, { cause: err })
    }
    throw err
  }
}

export const downloadPdf = downloadFile
