import SelfieImage from "./SelfieImage"
import { useEffect, useState } from "react"
import api, { getApiErrorMessage } from "../api/axios"
import AttendanceCalendar from "./AttendanceCalendar"

const getISTComponents = () => {
  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(new Date());

  const partMap = {};
  parts.forEach(p => partMap[p.type] = p.value);

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10); // 1-indexed
  const day = parseInt(partMap.day, 10);

  const pad = (num) => String(num).padStart(2, "0");

  return {
    year,
    month,
    day,
    dateStr: `${year}-${pad(month)}-${pad(day)}`
  };
};

function formatHours(value) {
  const totalHours = Number(value ?? 0)
  const hrs = Math.floor(totalHours)
  const mins = Math.round((totalHours - hrs) * 60)
  const finalMins = mins === 60 ? 0 : mins
  const finalHrs = mins === 60 ? hrs + 1 : hrs
  return `${finalHrs} hrs ${finalMins} mins`
}

export default function EmployeeStatsDashboard({ user_id = null, initialDate = null }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [holidays, setHolidays] = useState([])

  const ist = getISTComponents()

  const getInitialDateState = () => {
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
      const [y, m] = initialDate.split("-").map(Number)
      return { year: y, month: m, dateStr: initialDate }
    }
    return { year: ist.year, month: ist.month, dateStr: ist.dateStr }
  };

  const initialState = getInitialDateState()
  const [year, setYear] = useState(initialState.year)
  const [month, setMonth] = useState(initialState.month)
  const [selectedDate, setSelectedDate] = useState(initialState.dateStr)

  useEffect(() => {
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
      const [y, m] = initialDate.split("-").map(Number)
      setYear(y)
      setMonth(m)
      setSelectedDate(initialDate)
    }
  }, [initialDate])

  const updateSelectedYearMonth = (newYear, newMonth) => {
    // Clamp to joining month if a pre-joining period is chosen (e.g. via year dropdown)
    if (stats?.joining_date) {
      const [jy, jm] = stats.joining_date.split("-").map(Number)
      if (newYear * 12 + newMonth < jy * 12 + jm) {
        newYear = jy
        newMonth = jm
      }
    }
    setYear(newYear)
    setMonth(newMonth)
    const pad = (num) => String(num).padStart(2, "0")
    setSelectedDate(`${newYear}-${pad(newMonth)}-01`)
  }

  useEffect(() => {
    api.get("/company/holidays")
      .then((res) => {
        setHolidays(res.data || [])
      })
      .catch((err) => {
        console.error("Failed to load holidays in stats dashboard:", err)
      })
  }, [])

  const fetchStats = () => {
    setLoading(true)
    let url = `/dashboard/employee-stats?year=${year}&month=${month}`
    if (user_id) url += `&user_id=${user_id}`
    if (selectedDate) url += `&query_date=${selectedDate}`

    api.get(url)
      .then((res) => {
        setStats(res.data)
        setError("")
      })
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load dashboard stats")))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchStats()
  }, [year, month, selectedDate, user_id])

  // Don't show periods before the employee joined
  const joinParts = stats?.joining_date ? stats.joining_date.split("-").map(Number) : null
  const joinYear = joinParts ? joinParts[0] : null
  const joinMonth = joinParts ? joinParts[1] : null
  const canGoPrev = !joinParts || (year * 12 + month) > (joinYear * 12 + joinMonth)
  const isMonthBeforeJoin = (y, m) => !!joinParts && (y * 12 + m) < (joinYear * 12 + joinMonth)

  const years = Array.from({ length: 5 }, (_, i) => ist.year - i)
    .filter((y) => !joinParts || y >= joinYear || y === year)
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" }
  ]

  function formatTime(value) {
    if (!value) return "--:--"
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  function formatDate(value) {
    if (!value) return "-"
    return new Date(`${value}T00:00:00`).toLocaleDateString([], {
      weekday: "short", day: "2-digit", month: "short", year: "numeric"
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end sm:gap-4">
          <div className="contents">
            <div className="min-w-0">
              <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">Year</label>
              <select
                value={year}
                onChange={(e) => updateSelectedYearMonth(Number(e.target.value), month)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500 focus:bg-white"
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="min-w-0">
              <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">Month</label>
              <select
                value={month}
                onChange={(e) => updateSelectedYearMonth(year, Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500 focus:bg-white"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value} disabled={isMonthBeforeJoin(year, m.value)}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="col-span-2 min-w-0 sm:col-span-1 sm:ml-auto">
            <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">Date for day details</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500 focus:bg-white w-full sm:w-auto"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="py-10 text-center text-sm font-semibold text-gray-400">
          Loading statistics...
        </div>
      ) : (
        stats && (
          <div className="space-y-6">
            {(user_id || stats.employee_id) && (
              <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-white p-4 border border-emerald-100 flex justify-between items-center gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{stats.employee_name}</h3>
                  <p className="mt-0.5 font-mono text-xs font-semibold text-emerald-700">ID: {stats.employee_id}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 rounded-full px-3 py-1">
                    Active Profile
                  </span>
                </div>
              </div>
            )}

            {/* Dashboard grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Year Summary Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📅</span>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Yearly Summary ({stats.query_year})</h4>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl bg-gray-50 p-4 border border-gray-100 flex flex-col justify-center">
                    <p className="text-2xl font-black text-gray-900">
                      {stats.yearly_stats.worked_days}
                      <span className="text-sm font-semibold text-gray-400"> / {stats.yearly_stats.total_working_days}</span>
                    </p>
                    <p className="text-[10px] font-bold uppercase text-gray-400 mt-1">Days Worked</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                    <p className="text-xl sm:text-2xl font-black text-emerald-600">
                      {formatHours(stats.yearly_stats.avg_hours ?? 0)}
                    </p>
                    <p className="text-[10px] font-bold uppercase text-gray-400 mt-1">Avg Hours/Day</p>
                  </div>
                </div>
              </div>

              {/* Month Summary Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📊</span>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                    Monthly Summary ({months.find(m => m.value === stats.query_month)?.label})
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl bg-gray-50 p-4 border border-gray-100 flex flex-col justify-center">
                    <p className="text-2xl font-black text-gray-900">
                      {stats.monthly_stats.worked_days}
                      <span className="text-sm font-semibold text-gray-400"> / {stats.monthly_stats.total_working_days}</span>
                    </p>
                    <p className="text-[10px] font-bold uppercase text-gray-400 mt-1">Days Worked</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                    <p className="text-xl sm:text-2xl font-black text-emerald-600">
                      {formatHours(stats.monthly_stats.avg_hours ?? 0)}
                    </p>
                    <p className="text-[10px] font-bold uppercase text-gray-400 mt-1">Avg Hours/Day</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Breakdowns */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Monthly Day-Status Breakdown</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 pt-1">
                {[
                  { label: "Full Day", value: stats.monthly_stats.breakdown.full_day, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                  { label: "Half Day", value: stats.monthly_stats.breakdown.half_day, color: "bg-amber-50 text-amber-700 border-amber-100" },
                  { label: "Holiday Work", value: stats.monthly_stats.breakdown.holiday_work, color: "bg-purple-50 text-purple-700 border-purple-100" },
                  { label: "Paid Leave", value: stats.monthly_stats.breakdown.comp_off_leave, color: "bg-violet-50 text-violet-700 border-violet-100" },
                  { label: "Present", value: stats.monthly_stats.breakdown.present, color: "bg-blue-50 text-blue-700 border-blue-100" }
                ].map((item) => (
                  <div key={item.label} className={`rounded-xl border p-3 text-center last:odd:col-span-2 sm:last:odd:col-span-1 ${item.color}`}>
                    <p className="text-2xl font-black">{item.value}</p>
                    <p className="text-[10px] font-bold uppercase mt-1 tracking-tight">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Calendar & Single Day Details Grid */}
            <div className="grid gap-5 lg:grid-cols-5">
              {/* Calendar Card */}
              <div className="lg:col-span-3 space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">📅</span>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900">Calendar</h4>
                    </div>
                    {/* Calendar Month Pager */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (!canGoPrev) return
                          const prev = new Date(year, month - 2, 1)
                          updateSelectedYearMonth(prev.getFullYear(), prev.getMonth() + 1)
                        }}
                        disabled={!canGoPrev}
                        className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-600 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        title="Previous Month"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-xs font-bold text-gray-700 px-1">
                        {months.find(m => m.value === month)?.label} {year}
                      </span>
                      <button
                        onClick={() => {
                          const next = new Date(year, month, 1)
                          updateSelectedYearMonth(next.getFullYear(), next.getMonth() + 1)
                        }}
                        className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-600 transition"
                        title="Next Month"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <AttendanceCalendar
                    records={stats.records || []}
                    holidays={holidays}
                    currentDate={new Date(year, month - 1, 1)}
                    selectedDate={selectedDate}
                    onSelectDate={(dateStr) => {
                      setSelectedDate(dateStr)
                    }}
                    saturdayPolicy={stats.saturday_policy}
                  />
                </div>
              </div>

              {/* Single Day Detail Card */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">📌 Day details</p>
                        <h4 className="text-sm font-bold text-gray-900">{formatDate(selectedDate)}</h4>
                      </div>
                      {stats.single_day_detail && (
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${stats.single_day_detail.day_status === "full_day" ? "bg-emerald-100 text-emerald-700" :
                          stats.single_day_detail.day_status === "half_day" ? "bg-amber-100 text-amber-700" :
                            stats.single_day_detail.day_status === "holiday_work" ? "bg-purple-100 text-purple-700" :
                              stats.single_day_detail.day_status === "comp_off_leave" ? "bg-violet-100 text-violet-700" :
                                stats.single_day_detail.day_status === "holiday" ? "bg-blue-100 text-blue-700" :
                                  "bg-gray-100 text-gray-700"
                          }`}>
                          {stats.single_day_detail.day_status === "comp_off_leave" ? "paid leave" : stats.single_day_detail.day_status.replaceAll("_", " ")}
                        </span>
                      )}
                    </div>

                    {!stats.single_day_detail ? (
                      <div className="py-12 text-center text-sm font-medium text-gray-400">
                        No attendance logged on this date.
                      </div>
                    ) : (
                      <div className="space-y-4 pt-3">
                        {stats.single_day_detail.day_status === "holiday" ? (
                          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 text-center space-y-2">
                            <span className="text-2xl">🎉</span>
                            <h5 className="text-sm font-bold text-blue-950">Scheduled Holiday / Weekend</h5>
                            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">{stats.single_day_detail.checkin_note || "Official Non-Working Holiday"}</p>
                            <p className="text-xs text-gray-500">No attendance check-in required.</p>
                          </div>
                        ) : (
                          <>
                            <div className="grid gap-3 grid-cols-2">
                              <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-100">
                                <p className="text-[10px] font-bold uppercase text-gray-400">Check In</p>
                                <p className="text-sm font-bold text-gray-900 mt-0.5">{formatTime(stats.single_day_detail.checkin_time)}</p>
                                <p className="text-[9px] font-bold uppercase text-gray-400 mt-0.5">{stats.single_day_detail.checkin_status || "-"}</p>
                              </div>

                              <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-100">
                                <p className="text-[10px] font-bold uppercase text-gray-400">Check Out</p>
                                <p className="text-sm font-bold text-gray-900 mt-0.5">{formatTime(stats.single_day_detail.checkout_time)}</p>
                                <p className="text-[9px] font-bold uppercase text-gray-400 mt-0.5">{stats.single_day_detail.checkout_status || "-"}</p>
                              </div>

                              <div className="col-span-2 rounded-xl bg-gray-50 p-3.5 border border-gray-100">
                                <p className="text-[10px] font-bold uppercase text-gray-400">Hours Worked</p>
                                <p className="text-sm font-bold text-emerald-600 mt-0.5">
                                  {stats.single_day_detail.total_hours ? formatHours(stats.single_day_detail.total_hours) : "--"}
                                </p>
                                <p className="text-[9px] font-bold uppercase text-gray-400 mt-0.5">Calculated active time</p>
                              </div>
                            </div>

                            {/* Notes & Comments */}
                            {(stats.single_day_detail.checkin_note || stats.single_day_detail.checkout_note) && (
                              <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-100 space-y-2">
                                {stats.single_day_detail.checkin_note && (
                                  <div>
                                    <p className="text-[9px] font-bold uppercase text-gray-400">Check In Note</p>
                                    <p className="text-xs italic text-gray-700 mt-0.5">&ldquo;{stats.single_day_detail.checkin_note}&rdquo;</p>
                                  </div>
                                )}
                                {stats.single_day_detail.checkout_note && (
                                  <div className="border-t border-gray-200/50 pt-1.5">
                                    <p className="text-[9px] font-bold uppercase text-gray-400">Check Out Note</p>
                                    <p className="text-xs italic text-gray-700 mt-0.5">&ldquo;{stats.single_day_detail.checkout_note}&rdquo;</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {/* Verification Photos */}
                        <div className="grid gap-3 grid-cols-2">
                          <div>
                            <p className="text-[10px] font-bold uppercase text-gray-400 mb-1.5">Check In Selfie</p>
                            {stats.single_day_detail.checkin_photo_url ? (
                              <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                                <SelfieImage
                                  key={stats.single_day_detail.checkin_photo_url}
                                  src={`${import.meta.env.DEV ? "" : "/api"}/attendance/photo?path=${encodeURIComponent(stats.single_day_detail.checkin_photo_url)}`}
                                  alt="Check In Selfie"
                                  className="aspect-[3/4] w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-gray-300 text-[9px] font-semibold text-gray-400 bg-gray-50">
                                No photo
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="text-[10px] font-bold uppercase text-gray-400 mb-1.5">Check Out Selfie</p>
                            {stats.single_day_detail.checkout_photo_url ? (
                              <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                                <SelfieImage
                                  key={stats.single_day_detail.checkout_photo_url}
                                  src={`${import.meta.env.DEV ? "" : "/api"}/attendance/photo?path=${encodeURIComponent(stats.single_day_detail.checkout_photo_url)}`}
                                  alt="Check Out Selfie"
                                  className="aspect-[3/4] w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-gray-300 text-[9px] font-semibold text-gray-400 bg-gray-50">
                                No photo
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
