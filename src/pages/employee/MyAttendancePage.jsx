import { useEffect, useState } from "react"
import EmployeeLayout from "../../layouts/EmployeeLayout"
import { getMyHistory, getRegularizationQuota, regularizeAttendance } from "../../services/attendanceService"
import api, { getApiErrorMessage } from "../../api/axios"
import AttendanceCalendar from "../../components/AttendanceCalendar"
import EmployeeStatsDashboard from "../../components/EmployeeStatsDashboard"
import EmployeePayrollSlip from "../../components/EmployeePayrollSlip"
import { useAuth } from "../../context/AuthContext"

function formatDate(value) {
  if (!value) return "-"
  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    weekday: "short", day: "2-digit", month: "short", year: "numeric"
  })
}

function formatTime(value) {
  if (!value) return "--:--"
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatHours(value) {
  const totalHours = Number(value ?? 0)
  const hrs = Math.floor(totalHours)
  const mins = Math.round((totalHours - hrs) * 60)
  const finalMins = mins === 60 ? 0 : mins
  const finalHrs = mins === 60 ? hrs + 1 : hrs
  return `${finalHrs} hrs ${finalMins} mins`
}

const statusConfig = {
  full_day:      { label: "Full Day",     cls: "bg-emerald-100 text-emerald-700" },
  half_day:      { label: "Half Day",     cls: "bg-amber-100 text-amber-700" },
  present:       { label: "Present",      cls: "bg-blue-100 text-blue-700" },
  absent:        { label: "Absent",       cls: "bg-red-100 text-red-700" },
  holiday_work:  { label: "Holiday Work", cls: "bg-purple-100 text-purple-700" },
  comp_off_leave:{ label: "Paid Leave",   cls: "bg-violet-100 text-violet-700" },
}

function DayBadge({ status }) {
  const cfg = statusConfig[status] || { label: status || "—", cls: "bg-gray-100 text-gray-600" }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

export default function MyAttendancePage() {
  const { user } = useAuth()
  const saturdayPolicy = user?.saturday_policy || "alt_sat_holiday"

  const [records, setRecords] = useState([])
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [view, setView] = useState("calendar") // calendar | list
  const [selectedStatsDate, setSelectedStatsDate] = useState(null)

  useEffect(() => {
    Promise.all([
      getMyHistory(),
      api.get("/company/holidays")
    ])
      .then(([history, hols]) => {
        setRecords(history)
        setHolidays(hols.data)
        setError("")
      })
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load data")))
      .finally(() => setLoading(false))
  }, [])

  const [currentDate, setCurrentDate] = useState(new Date())

  // --- Self-service regularization (limited per month; admins are unlimited) ---
  const [quota, setQuota] = useState(null)
  const [showRegularize, setShowRegularize] = useState(false)
  const [regForm, setRegForm] = useState({ date: "", checkin: "09:00", checkout: "18:00", note: "" })
  const [regError, setRegError] = useState("")
  const [regSubmitting, setRegSubmitting] = useState(false)

  const loadQuota = () => {
    getRegularizationQuota().then(setQuota).catch(() => setQuota(null))
  }
  useEffect(() => { loadQuota() }, [])

  const pad2 = (n) => String(n).padStart(2, "0")
  const toDateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  const regMax = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return toDateStr(d) })()
  const regMin = (() => {
    const first = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
    const prevFirst = toDateStr(first)
    const joined = user?.joining_date
    return joined && joined > prevFirst ? joined : prevFirst
  })()

  // Only days you actually checked in on can be corrected (not days with no check-in)
  const timeOf = (value) => (value ? String(value).slice(11, 16) : "")
  const eligibleDays = records
    .filter((r) => r.checkin_time && r.date >= regMin && r.date <= regMax)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const pickRegDay = (dateStr) => {
    const rec = eligibleDays.find((r) => r.date === dateStr)
    setRegForm((prev) => ({
      ...prev,
      date: dateStr,
      checkin: timeOf(rec?.checkin_time) || "09:00",
      checkout: timeOf(rec?.checkout_time) || "18:00",
    }))
  }

  const openRegularize = () => {
    const first = eligibleDays[0]
    setRegForm({
      date: first?.date || "",
      checkin: timeOf(first?.checkin_time) || "09:00",
      checkout: timeOf(first?.checkout_time) || "18:00",
      note: "",
    })
    setRegError("")
    setShowRegularize(true)
  }

  const submitRegularize = async (e) => {
    e.preventDefault()
    setRegError("")
    setRegSubmitting(true)
    try {
      await regularizeAttendance({
        date: regForm.date,
        checkin_time: `${regForm.date}T${regForm.checkin}:00`,
        checkout_time: `${regForm.date}T${regForm.checkout}:00`,
        note: regForm.note,
      })
      setShowRegularize(false)
      const fresh = await getMyHistory()
      setRecords(fresh)
      loadQuota()
    } catch (err) {
      setRegError(getApiErrorMessage(err, "Failed to regularize attendance"))
    } finally {
      setRegSubmitting(false)
    }
  }

  // Live preview mirroring the backend thresholds (8.5h full, 5h half; 6.5h full on half-day Saturdays)
  const regPreview = (() => {
    if (!regForm.date || !regForm.checkin || !regForm.checkout) return null
    const [ih, im] = regForm.checkin.split(":").map(Number)
    const [oh, om] = regForm.checkout.split(":").map(Number)
    const hours = (oh * 60 + om - (ih * 60 + im)) / 60
    if (hours <= 0) {
      return { label: "Check-out must be after check-in", hours: "", cls: "border-red-200 bg-red-50 text-red-700" }
    }
    const [y, m, d] = regForm.date.split("-").map(Number)
    const dow = new Date(y, m - 1, d).getDay()
    const fullAt = dow === 6 && saturdayPolicy === "all_sat_half_day" ? 6.5 : 8.5
    const hrsLabel = `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`
    if (dow === 0) return { label: "Holiday Work (off day)", hours: hrsLabel, cls: "border-purple-200 bg-purple-50 text-purple-700" }
    if (hours >= fullAt) return { label: "Full Day", hours: hrsLabel, cls: "border-emerald-200 bg-emerald-50 text-emerald-700" }
    if (hours >= 5) return { label: "Half Day", hours: hrsLabel, cls: "border-amber-200 bg-amber-50 text-amber-700" }
    return { label: "Absent (under 5 hours)", hours: hrsLabel, cls: "border-red-200 bg-red-50 text-red-700" }
  })()

  const canRegularize = quota && !quota.unlimited
  const quotaExhausted = canRegularize && quota.remaining <= 0

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const prevMonth = () => {
    if (!canGoPrev) return
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  // Calendar should not go back before the month the employee joined
  const joiningMonthIdx = (() => {
    if (!user?.joining_date) return null
    const [y, m] = user.joining_date.split("-").map(Number)
    return y * 12 + (m - 1)
  })()
  const canGoPrev = joiningMonthIdx === null || (currentDate.getFullYear() * 12 + currentDate.getMonth()) > joiningMonthIdx

  // Helper to determine if a date string is Saturday
  const isSaturday = (dateStr) => {
    if (!dateStr) return false
    const [y, m, d] = dateStr.split("-").map(Number)
    const dateObj = new Date(y, m - 1, d)
    return dateObj.getDay() === 6
  }

  // Filter records for the currently selected month and year
  const monthlyRecords = records.filter((r) => {
    if (!r.date) return false
    const [y, m] = r.date.split("-").map(Number)
    return y === currentDate.getFullYear() && m === (currentDate.getMonth() + 1)
  })

  // Summary stats (filtered by month)
  const fullDays  = monthlyRecords.filter((r) => r.day_status === "full_day").length
  const halfDays  = monthlyRecords.filter((r) => r.day_status === "half_day").length
  
  // Scale Saturday hours under all_sat_half_day policy by 9.0 / 6.5 (Option 1)
  const totalHrs  = monthlyRecords.reduce((sum, r) => {
    let hours = Number(r.total_hours) || 0
    if (saturdayPolicy === "all_sat_half_day" && r.date && isSaturday(r.date)) {
      hours = hours * (9.0 / 6.5)
    }
    return sum + hours
  }, 0)

  return (
    <EmployeeLayout>
      <div className={`mx-auto space-y-5 pb-10 ${view === "stats" ? "max-w-md lg:max-w-5xl" : view === "payroll" ? "max-w-md lg:max-w-3xl" : "max-w-md md:max-w-2xl"}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-950">My Attendance</h2>
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setView("calendar")}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] sm:text-xs font-bold transition ${view === "calendar" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] sm:text-xs font-bold transition ${view === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              List
            </button>
            <button
              onClick={() => setView("stats")}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] sm:text-xs font-bold transition ${view === "stats" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Stats
            </button>
            <button
              onClick={() => setView("payroll")}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] sm:text-xs font-bold transition ${view === "payroll" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Payroll
            </button>
          </div>
        </div>

        {/* Unified Month Selector Header */}
        {!loading && !error && !["stats", "payroll"].includes(view) && (
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} disabled={!canGoPrev} className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-gray-100">
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* Regularize attendance */}
        {!loading && !error && canRegularize && !["stats", "payroll"].includes(view) && (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 shadow-sm">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-100/60 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.4a2 2 0 112.8 2.8L11.8 15H9v-2.8l8.6-8.6z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">Wrong check-in/out time?</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex gap-1">
                    {Array.from({ length: quota.limit }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-6 rounded-full transition-colors ${i < quota.remaining ? "bg-emerald-500" : "bg-gray-200"}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500">
                    {quota.remaining} of {quota.limit} left this month
                  </span>
                </div>
              </div>
              <button
                onClick={openRegularize}
                disabled={quotaExhausted}
                className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
              >
                {quotaExhausted ? "Limit reached" : "Regularize"}
              </button>
            </div>
          </div>
        )}

        {/* Summary strip */}
        {!loading && !error && !["stats", "payroll"].includes(view) && records.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Full Days",  value: fullDays },
              { label: "Half Days",  value: halfDays },
              { label: "Avg Hours/Day", value: `${monthlyRecords.length > 0 ? (totalHrs / monthlyRecords.length).toFixed(1) : "0.0"}h` }
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                <p className="text-xl font-bold text-gray-950">{value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        )}

        {loading && <p className="text-sm text-gray-400">Loading…</p>}
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {/* Calendar View */}
        {!loading && !error && view === "calendar" && (
          <AttendanceCalendar
            records={records}
            holidays={holidays}
            currentDate={currentDate}
            selectedDate={selectedStatsDate}
            onSelectDate={(dateStr) => {
              setSelectedStatsDate(dateStr)
              setView("stats")
            }}
            saturdayPolicy={saturdayPolicy}
          />
        )}

        {/* Records list View */}
        {!loading && !error && view === "list" && (
          <div className="space-y-3">
            {monthlyRecords.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-10">No attendance records for this month.</p>
            )}
            {monthlyRecords.map((record, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-emerald-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{formatDate(record.date)}</p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                      <span>In: <span className="font-semibold text-gray-700">{formatTime(record.checkin_time)}</span></span>
                      <span>Out: <span className="font-semibold text-gray-700">{formatTime(record.checkout_time)}</span></span>
                    </div>
                    {record.total_hours > 0 && (
                      <p className="mt-1 text-[10px] font-bold uppercase text-gray-400">
                        {formatHours(record.total_hours)} worked
                      </p>
                    )}
                    {record.checkin_note && (
                      <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs italic text-gray-500">
                        &ldquo;{record.checkin_note}&rdquo;
                      </p>
                    )}
                  </div>
                  <DayBadge status={record.day_status} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Dashboard View */}
        {!loading && !error && view === "stats" && (
          <EmployeeStatsDashboard initialDate={selectedStatsDate} />
        )}

        {/* Payroll Slip View */}
        {!loading && !error && view === "payroll" && (
          <EmployeePayrollSlip />
        )}
      </div>

      {showRegularize && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowRegularize(false) }}
        >
          <form
            onSubmit={submitRegularize}
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-600 px-6 pb-5 pt-6 text-white">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <button
                type="button" onClick={() => setShowRegularize(false)} aria-label="Close"
                className="absolute right-4 top-4 rounded-full bg-white/15 p-1.5 transition hover:bg-white/25"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h3 className="text-lg font-bold">Regularize Attendance</h3>
              <p className="mt-1 text-xs text-emerald-50">
                Correct a wrong check-in or check-out time on a day you did check in (this or last month).
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">
                <span className="flex gap-1">
                  {Array.from({ length: quota?.limit ?? 3 }).map((_, i) => (
                    <span key={i} className={`h-1.5 w-4 rounded-full ${i < (quota?.remaining ?? 0) ? "bg-white" : "bg-white/30"}`} />
                  ))}
                </span>
                {quota?.remaining ?? 0} left this month · uses 1
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Day to correct</label>
                {eligibleDays.length === 0 ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                    No days to correct. Regularization is only for days you checked in on. If you were present but never checked in, please contact your admin.
                  </p>
                ) : (
                  <select
                    required value={regForm.date}
                    onChange={(e) => pickRegDay(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  >
                    {eligibleDays.map((r) => (
                      <option key={r.date} value={r.date}>
                        {new Date(`${r.date}T00:00:00`).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}
                        {" · In "}{timeOf(r.checkin_time) || "—"}{" · Out "}{timeOf(r.checkout_time) || "—"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Check-In</label>
                  <input
                    type="time" required value={regForm.checkin}
                    onChange={(e) => setRegForm({ ...regForm, checkin: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Check-Out</label>
                  <input
                    type="time" required value={regForm.checkout}
                    onChange={(e) => setRegForm({ ...regForm, checkout: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              {/* Live preview of the resulting day status */}
              {regPreview && (
                <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${regPreview.cls}`}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">This will be saved as</p>
                    <p className="text-sm font-bold">{regPreview.label}</p>
                  </div>
                  <p className="text-sm font-bold">{regPreview.hours}</p>
                </div>
              )}

              <div>
                <label className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <span>Reason</span>
                  <span className="font-semibold normal-case tracking-normal">{regForm.note.length}/280</span>
                </label>
                <textarea
                  required maxLength={280} rows={3} value={regForm.note}
                  onChange={(e) => setRegForm({ ...regForm, note: e.target.value })}
                  placeholder="Why was attendance missed?"
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              {regError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">{regError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button" onClick={() => setShowRegularize(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={regSubmitting || eligibleDays.length === 0}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                >
                  {regSubmitting ? "Saving…" : "Submit"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </EmployeeLayout>
  )
}
