import { useEffect, useState } from "react"
import EmployeeLayout from "../../layouts/EmployeeLayout"
import api, { getApiErrorMessage } from "../../api/axios"

const LEAVE_LABELS = { full_day: "Full Day", first_half: "First Half", second_half: "Second Half" }

const STATUS_STYLES = {
  approved: { chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  rejected: { chip: "bg-red-50 text-red-700 ring-red-200", bar: "bg-red-500", dot: "bg-red-500" },
  pending: { chip: "bg-amber-50 text-amber-700 ring-amber-200", bar: "bg-amber-400", dot: "bg-amber-400" },
}

const parseDate = (value) => new Date(`${value}T00:00:00`)
const fmtMonth = (value) => parseDate(value).toLocaleDateString(undefined, { month: "short" })
const fmtDay = (value) => parseDate(value).getDate()
const fmtFull = (value) => parseDate(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    plus: "M12 5v14M5 12h14",
    sun: "M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10l1.4 1.4M3 12h2m14 0h2M5.6 18.4L7 17m10-10l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z",
    calendar: "M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
    close: "M6 6l12 12M18 6L6 18",
    inbox: "M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5",
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={paths[name]} />
    </svg>
  )
}

function MyLeavePage() {
  const [balance, setBalance] = useState({ available_balance: 0, days_earned: 0, days_used: 0 })
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ start_date: "", end_date: "", reason: "", leave_type: "full_day" })
  const [dayMode, setDayMode] = useState(null) // null | "full" | "half" (null = nothing chosen yet)
  const [halfChosen, setHalfChosen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [balRes, reqsRes] = await Promise.all([
        api.get("/leave/balance"),
        api.get("/leave/my-requests")
      ])
      setBalance(balRes.data)
      setRequests(reqsRes.data)
      setError("")
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load leave data"))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({ start_date: "", end_date: "", reason: "", leave_type: "full_day" })
    setDayMode(null)
    setHalfChosen(false)
    setFormError("")
  }

  const closeModal = () => {
    setShowModal(false)
    resetForm()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError("")
    try {
      await api.post("/leave/request", form)
      setShowModal(false)
      resetForm()
      fetchData()
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to submit request"))
    } finally {
      setSubmitting(false)
    }
  }

  const isHalf = form.leave_type !== "full_day"

  const handleTypeChange = (leave_type) => {
    // Half-day leave is for a single date, so keep end date equal to start date
    setForm(f => ({ ...f, leave_type, end_date: leave_type !== "full_day" ? f.start_date : f.end_date }))
  }

  const handleStartChange = (start_date) => {
    setForm(f => ({ ...f, start_date, end_date: f.leave_type !== "full_day" ? start_date : f.end_date }))
  }

  const pendingCount = requests.filter(r => r.status === "pending").length

  const inputCls = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"

  return (
    <EmployeeLayout>
      <div className="mx-auto max-w-md space-y-6 md:max-w-2xl">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-950">Leave</h2>
            <p className="text-sm text-gray-500">Request time off and track your comp-off</p>
          </div>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              {pendingCount} pending
            </span>
          )}
        </div>

        {/* Balance Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Available</span>
          </div>
          <p className="text-sm font-semibold text-gray-500">Comp-Off Balance</p>
          <p className="mt-2 text-5xl font-black text-gray-900">{balance.available_balance}</p>
          <p className="mt-1 text-sm text-gray-400">days</p>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <div>
              <p className="font-bold text-emerald-600">+{balance.days_earned}</p>
              <p className="text-[10px] uppercase font-bold text-gray-400">Earned</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="font-bold text-amber-600">-{balance.days_used}</p>
              <p className="text-[10px] uppercase font-bold text-gray-400">Used</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="font-bold text-blue-600">-{balance.days_paid_out || 0}</p>
              <p className="text-[10px] uppercase font-bold text-gray-400">Paid Out</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 py-4 text-base font-bold text-white shadow-md transition hover:bg-gray-800 active:scale-[0.98]"
        >
          <Icon name="plus" className="h-5 w-5" />
          Request Leave
        </button>

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

        {/* History */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Request History</h3>

          {loading && (
            <div className="space-y-3">
              {[0, 1].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}
            </div>
          )}

          {!loading && requests.length === 0 && (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center">
              <div className="rounded-full bg-gray-100 p-3 text-gray-400"><Icon name="inbox" className="h-6 w-6" /></div>
              <p className="mt-3 text-sm font-semibold text-gray-700">No leave requests yet</p>
              <p className="text-xs text-gray-400">Tap "Request Leave" to create one</p>
            </div>
          )}

          {!loading && requests.map(req => {
            const st = STATUS_STYLES[req.status] || STATUS_STYLES.pending
            const isRange = req.start_date !== req.end_date
            const half = req.leave_type && req.leave_type !== "full_day"
            return (
              <div key={req.id} className="relative flex gap-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 pl-5 shadow-sm">
                <span className={`absolute inset-y-0 left-0 w-1.5 ${st.bar}`} />

                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-100">
                  <span className="text-[10px] font-bold uppercase text-gray-400">{fmtMonth(req.start_date)}</span>
                  <span className="text-xl font-extrabold leading-none text-gray-900">{fmtDay(req.start_date)}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">
                        {isRange ? `${fmtFull(req.start_date)} → ${fmtFull(req.end_date)}` : fmtFull(req.start_date)}
                      </p>
                      <span className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${half ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                        {half ? `Half Day · ${LEAVE_LABELS[req.leave_type]}` : "Full Day"}
                      </span>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ring-inset ${st.chip}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      {req.status}
                    </span>
                  </div>

                  {req.reason && <p className="mt-2 text-sm text-gray-600">{req.reason}</p>}
                  {req.admin_notes && (
                    <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs italic text-gray-500">
                      <span className="font-bold not-italic text-gray-600">Admin:</span> {req.admin_notes}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal / bottom sheet */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={closeModal}>
          <div
            className="flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="shrink-0 px-5 pt-3 sm:px-6 sm:pt-6">
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" />
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-950">Request Leave</h3>
                  <p className="text-xs text-gray-500">Your admin will review the request</p>
                </div>
                <button type="button" onClick={closeModal} className="rounded-full bg-gray-100 p-2 text-gray-500 transition hover:bg-gray-200">
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              {/* Scrollable fields */}
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-4 sm:px-6">
              {/* Leave type */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Leave Type</label>

                {/* Step 1: Full Day / Half Day. Once chosen, only the chosen one is shown. */}
                <div className="flex items-stretch gap-2">
                  {(dayMode === null || dayMode === "full") && (
                    <button
                      type="button"
                      onClick={() => { setDayMode("full"); setHalfChosen(false); handleTypeChange("full_day") }}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border-2 px-3 py-3 transition ${
                        dayMode === "full" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <Icon name="sun" className="h-6 w-6" />
                      <span className="text-sm font-bold">Full Day</span>
                      <span className="text-[11px] opacity-70">1 day</span>
                    </button>
                  )}
                  {(dayMode === null || dayMode === "half") && (
                    <button
                      type="button"
                      onClick={() => { setDayMode("half"); setHalfChosen(false); handleTypeChange("first_half") }}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border-2 px-3 py-3 transition ${
                        dayMode === "half" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <Icon name="sun" className="h-6 w-6" />
                      <span className="text-sm font-bold">Half Day</span>
                      <span className="text-[11px] opacity-70">0.5 day</span>
                    </button>
                  )}
                  {dayMode !== null && (
                    <button
                      type="button"
                      onClick={() => { setDayMode(null); setHalfChosen(false); handleTypeChange("full_day") }}
                      className="self-center rounded-lg px-2 py-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50"
                    >
                      Change
                    </button>
                  )}
                </div>

                {/* Step 2 (Half Day only): First Half / Second Half. Once chosen, only the chosen one is shown. */}
                {dayMode === "half" && (
                  <div className="mt-3">
                    <div className="flex items-stretch gap-2">
                      {[["first_half", "First Half", "Morning"], ["second_half", "Second Half", "Afternoon"]]
                        .filter(([value]) => !halfChosen || form.leave_type === value)
                        .map(([value, label, hint]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => { handleTypeChange(value); setHalfChosen(true) }}
                            className={`flex flex-1 flex-col items-center rounded-2xl border-2 px-3 py-2.5 transition ${
                              form.leave_type === value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            <span className="text-sm font-bold">{label}</span>
                            <span className="text-[11px] opacity-70">{hint}</span>
                          </button>
                        ))}
                      {halfChosen && (
                        <button
                          type="button"
                          onClick={() => setHalfChosen(false)}
                          className="self-center rounded-lg px-2 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                        >
                          Change
                        </button>
                      )}
                    </div>
                    <p className="mt-2 rounded-xl bg-indigo-50 px-3 py-2 text-[11px] font-medium text-indigo-700">
                      You must complete 5 hours of work in the other half of the day.
                    </p>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{isHalf ? "Date" : "Start Date"}</label>
                  <input type="date" required value={form.start_date} onChange={e => handleStartChange(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">End Date</label>
                  <input type="date" required disabled={isHalf} value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className={inputCls} />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Reason</label>
                <textarea
                  required
                  maxLength={280}
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  rows={2}
                  className={`${inputCls} resize-none`}
                  placeholder="Vacation, medical appointment..."
                />
                <p className="mt-1 text-right text-[11px] text-gray-400">{form.reason.length}/280</p>
              </div>
              </div>

              {/* Footer: always visible, no scrolling needed */}
              <div className="shrink-0 space-y-2 border-t border-gray-100 bg-white px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:rounded-b-3xl sm:px-6 sm:pb-5">
              {formError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{formError}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 rounded-xl bg-gray-100 py-3.5 text-sm font-bold text-gray-600 transition hover:bg-gray-200">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-600 hover:to-violet-700 disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none">
                  {submitting ? "Sending..." : "Submit Request"}
                </button>
              </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </EmployeeLayout>
  )
}

export default MyLeavePage
