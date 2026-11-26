import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import LetterModal from "../components/LetterModal"
import LetterHistory from "../components/LetterHistory"
import { Icon } from "../components/FormParts"
import { ICONS, LETTERS } from "../constants/letterTypes"
import { getEmployees } from "../services/employeeService"
import { getApiErrorMessage } from "../api/axios"

const TABS = [
  { value: "generate", label: "Generate" },
  { value: "history", label: "History" },
]

export default function LettersPage() {
  const [tab, setTab] = useState("generate")
  const [employees, setEmployees] = useState([])
  const [openType, setOpenType] = useState(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    getEmployees()
      .then((list) => setEmployees([...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""))))
      .catch((err) => setError(getApiErrorMessage(err, "Could not load employees.")))
  }, [])

  const handleGenerated = (label, name) => {
    setOpenType(null)
    setNotice(`${label} downloaded${name ? ` for ${name}` : ""}`)
  }

  return (
    <AdminLayout>
      {openType && (
        <LetterModal
          type={openType}
          employees={employees}
          onClose={() => setOpenType(null)}
          onGenerated={handleGenerated}
        />
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-gray-950">Letters</h2>
          <p className="mt-1 text-sm text-gray-500">Generate HR letters as Word files and see every letter downloaded so far.</p>
        </div>

        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition sm:text-sm ${
                tab === t.value ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "history" && <LetterHistory />}

        {tab === "generate" && notice && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {notice}.
          </p>
        )}
        {tab === "generate" && error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
        )}

        {tab === "generate" && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(LETTERS).map(([key, letter]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setNotice(""); setOpenType(key) }}
              className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
                <Icon path={ICONS.document} className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-gray-950">{letter.label}</h3>
              <p className="mt-1 flex-1 text-sm text-gray-500">{letter.description}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                <Icon path={ICONS.download} className="h-4 w-4" />
                Generate
              </span>
            </button>
          ))}
        </div>}
      </div>
    </AdminLayout>
  )
}
