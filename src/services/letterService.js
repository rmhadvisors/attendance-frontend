import api from "../api/axios"

// POST the form to /letters/<type> and save the returned Word file. Blob error bodies are decoded so the
// backend's `detail` message reaches the UI.
export async function generateLetter(type, payload) {
  try {
    const res = await api.post(`/letters/${type}`, payload, { responseType: "blob" })
    const disposition = res.headers?.["content-disposition"] || ""
    const match = /filename="?([^";]+)"?/i.exec(disposition)
    const filename = match ? match[1] : "Letter.docx"

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
      try {
        const detail = JSON.parse(await data.text())?.detail
        if (typeof detail === "string") throw new Error(detail, { cause: err })
        if (Array.isArray(detail)) throw new Error("Please fill in all the fields correctly.", { cause: err })
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.cause) throw parseErr
      }
    }
    throw err
  }
}

export const getLetterHistory = async (params = {}) => {
  const response = await api.get("/letters/history", { params })
  return response.data
}

export const deleteLetterHistory = async (id) => {
  const response = await api.delete(`/letters/history/${id}`)
  return response.data
}
