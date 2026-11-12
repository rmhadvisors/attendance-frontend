import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import ModalShell from "../components/ModalShell"
import Avatar from "../components/Avatar"
import { Icon } from "../components/FormParts"
import { inputClass } from "../constants/formStyles"
import { getRegularizationRequests, actionRegularization } from "../services/attendanceService"
import { getApiErrorMessage } from "../api/axios"

const TABS = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Declined" },
  { value: "all", label: "All" },
]

const STATUS_LABEL = { pending: "Waiting", approved: "Approved", rejected: "Declined" }
const STATUS_TONE = {
  pending: "bg-gray-100 text-gray-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
}
const RESULT_LABEL = { full_day: "Full Day", half_day: "Half Day", absent: "Absent", holiday_work: "Holiday Work" }

function formatDate(value) {
  if (!value) return "-"
  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    weekday: "short", day: "2-digit", month: "short", year: "numeric"
  })
}

// "2026-11-04T12:00:00" -> "12:00 PM"
function formatTime(value) {
  if (!value) return "--"
  const [h, m] = String(value).slice(11, 16).split(":").map(Number)
  if (Number.isNaN(h)) return "--"
  const suffix = h >= 12 ? "PM" : "AM"
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`
}

function formatHM(value) {
  if (value === null || value === undefined) return "--"
  let hrs = Math.floor(value)
  let mins = Math.round((value - hrs) * 60)
  if (mins === 60) { hrs += 1; mins = 0 }
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`
}

function DecisionModal({ request, action, onClose, onDone }) {
  const approve = action === "approve"
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await actionRegularization(request.id, { action, note: note.trim() || null })
      onDone(approve ? "Request approved. Attendance has been corrected." : "Request declined. Attendance is unchanged.")
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save the decision"))
      setSaving(false)
    }
  }

  return (
    <ModalShell onClose={onClose} disableClose={saving} maxWidth="sm:max-w-md">
      <form onSubmit={submit}>
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 px-5 py-5 text-white sm:px-6">
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold">{approve ? "Approve request" : "Decline request"}</h3>
              <p className="truncate text-xs text-emerald-50">
                {request.employee_name} · {formatDate(request.date)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
              className="shrink-0 rounded-full bg-white/15 p-1.5 transition hover:bg-white/25"
            >
              <Icon path="M6 18L18 6M6 6l12 12" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <p className={`rounded-xl border px-4 py-3 text-sm ${approve ? "border-emerald-100 bg-emerald-50/70 text-emerald-900" : "border-gray-200 bg-gray-50 text-gray-700"}`}>
            {approve ? (
              <>
                Attendance for this day becomes{" "}
                <b>{formatTime(request.requested_checkin)} – {formatTime(request.requested_checkout)}</b>{" "}
                ({formatHM(request.requested_hours)}), marked <b>{RESULT_LABEL[request.resulting_status] || request.resulting_status}</b>.
                This uses one of the employee&apos;s monthly corrections.
              </>
            ) : (
              <>Nothing changes in attendance, and the employee gets their correction back. They can send a new request.</>
            )}
          </p>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Note to the employee (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder={approve ? "e.g. Verified with manager" : "e.g. Reason is not clear, please check with your manager"}
              className={`${inputClass} resize-none`}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${
                approve ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {saving ? "Saving…" : approve ? "Approve" : "Decline"}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}

function RequestCard({ req, onDecide }) {
  const isPending = req.status === "pending"
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={req.employee_name} size="h-11 w-11" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-950">{req.employee_name}</p>
            <p className="text-xs text-gray-500">{req.employee_id} · {formatDate(req.date)}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_TONE[req.status] || STATUS_TONE.pending}`}>
          {STATUS_LABEL[req.status] || req.status}
        </span>
      </div>

      {/* Original vs requested */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Recorded</p>
          <p className="mt-1 text-sm font-bold text-gray-900">
            {formatTime(req.original_checkin)} – {formatTime(req.original_checkout)}
          </p>
          <p className="text-xs text-gray-500">{formatHM(req.original_hours)} worked</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Requested</p>
          <p className="mt-1 text-sm font-bold text-gray-900">
            {formatTime(req.requested_checkin)} – {formatTime(req.requested_checkout)}
          </p>
          <p className="text-xs text-gray-600">
            {formatHM(req.requested_hours)} · would be{" "}
            <span className="font-bold text-emerald-700">{RESULT_LABEL[req.resulting_status] || req.resulting_status}</span>
          </p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reason</p>
        <p className="mt-0.5 break-words text-sm text-gray-700">{req.reason}</p>
      </div>

      {req.admin_note && !isPending && (
        <p className="mt-2 text-xs italic text-gray-500">Your note: “{req.admin_note}”</p>
      )}

      {isPending && (
        <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
          <button
            onClick={() => onDecide(req, "approve")}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Approve
          </button>
          <button
            onClick={() => onDecide(req, "reject")}
            className="rounded-lg bg-red-50 px-5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  )
}

export default function RegularizePage() {
  const [tab, setTab] = useState("pending")
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [deciding, setDeciding] = useState(null) // { req, action }

  const [refreshKey, setRefreshKey] = useState(0)

  // State is only set from the async callbacks here (and from the handlers below)
  useEffect(() => {
    let cancelled = false
    getRegularizationRequests(tab)
      .then((data) => {
        if (cancelled) return
        setRequests(data)
        setError("")
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Failed to load requests"))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tab, refreshKey])

  const changeTab = (value) => {
    if (value === tab) return
    setNotice("")
    setLoading(true)
    setTab(value)
  }

  const handleDone = (message) => {
    setDeciding(null)
    setNotice(message)
    setLoading(true)
    setRefreshKey((k) => k + 1)
  }

  return (
    <AdminLayout>
      {deciding && (
        <DecisionModal
          request={deciding.req}
          action={deciding.action}
          onClose={() => setDeciding(null)}
          onDone={handleDone}
        />
      )}

      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-black text-gray-950">Regularize</h2>
          <p className="mt-1 text-sm text-gray-500">
            Employees ask to correct a wrong check-in or check-out time. Attendance changes only when you approve.
          </p>
        </div>

        {notice && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>
        )}
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
        )}

        {/* Tabs */}
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => changeTab(t.value)}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition sm:text-sm ${
                tab === t.value ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm font-semibold text-gray-400">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            Loading requests…
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <p className="text-sm font-semibold text-gray-600">
              {tab === "pending" ? "No requests waiting for you." : "No requests here yet."}
            </p>
            <p className="mt-1 text-xs text-gray-400">New requests from employees will show up here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {requests.map((req) => (
              <RequestCard key={req.id} req={req} onDecide={(r, action) => setDeciding({ req: r, action })} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
