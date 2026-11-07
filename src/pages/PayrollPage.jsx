import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import api, { getApiErrorMessage } from "../api/axios"
import ModalShell from "../components/ModalShell"
import PayrollAdjustmentsModal from "../components/PayrollAdjustmentsModal"

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
  return `${finalHrs}h ${finalMins}m`
}

const formatINR = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// 30.2222222 -> "30.22", 28 -> "28", 29.5 -> "29.5"
const formatDays = (n) => String(Number(Number(n || 0).toFixed(2)))

const MONTHS = [
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

function StatTile({ label, value, tone = "text-gray-950" }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-1 truncate text-lg font-black sm:text-xl ${tone}`}>{value}</p>
    </div>
  )
}

export default function PayrollPage() {
  const ist = getISTComponents()

  const [year, setYear] = useState(ist.year)
  const [month, setMonth] = useState(ist.month)
  const [payrollData, setPayrollData] = useState(null)

  const [loading, setLoading] = useState(true)
  const [editingEmp, setEditingEmp] = useState(null)
  const [adjustingEmp, setAdjustingEmp] = useState(null)
  const [editingSalaryVal, setEditingSalaryVal] = useState("")
  const [savingSalary, setSavingSalary] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  // silent = refresh the numbers without blanking the page (used after adjustments)
  const fetchPayroll = ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
      setSuccessMsg("")
    }
    setError("")
    api.get(`/payroll/summary?year=${year}&month=${month}`)
      .then((res) => {
        setPayrollData(res.data)
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Failed to fetch payroll calculations"))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchPayroll()
  }, [year, month])

  const handleEditSalaryClick = (emp) => {
    setEditingEmp(emp)
    setEditingSalaryVal(emp.base_salary.toString())
    setError("")
    setSuccessMsg("")
  }

  const handleSaveSalarySubmit = async (e, userId) => {
    e.preventDefault()
    const parsedSalary = parseFloat(editingSalaryVal)
    if (isNaN(parsedSalary) || parsedSalary < 0) {
      setError("Please enter a valid numeric salary amount.")
      return
    }

    setSavingSalary(true)
    setError("")
    setSuccessMsg("")

    try {
      await api.post("/payroll/salary", {
        user_id: userId,
        base_salary: parsedSalary,
        year: year,
        month: month
      })
      setSuccessMsg("Base monthly salary updated successfully!")
      setEditingEmp(null)

      // Refresh payroll calculation list
      fetchPayroll()
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update employee salary"))
    } finally {
      setSavingSalary(false)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => ist.year - i)
  const monthLabel = MONTHS.find((m) => m.value === month)?.label

  const allRecords = Array.isArray(payrollData?.records) ? payrollData.records : []

  const suggestions = allRecords.filter(r =>
    r?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r?.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const displayedRecords = selectedUserId
    ? allRecords.filter(r => r.user_id === selectedUserId)
    : suggestions

  const totals = displayedRecords.reduce(
    (acc, r) => ({
      attendance: acc.attendance + Number(r.calculated_salary || 0),
      added: acc.added + Number(r.adjustments_added || 0),
      deducted: acc.deducted + Number(r.adjustments_deducted || 0),
      net: acc.net + Number(r.net_salary || 0)
    }),
    { attendance: 0, added: 0, deducted: 0, net: 0 }
  )

  const selectClass =
    "rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500"

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Title + month filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-950">Payroll & Salaries</h2>
            <p className="mt-1 text-sm text-gray-500">
              Set monthly salaries, review attendance-based pay and add bonuses or deductions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Year</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${selectClass} w-full`}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Month</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={`${selectClass} w-full`}>
                {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {successMsg}
          </div>
        )}

        {/* Month totals */}
        {!loading && allRecords.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={selectedUserId ? "Employee" : "Employees"} value={displayedRecords.length} />
            <StatTile label="Attendance Salary" value={formatINR(totals.attendance)} />
            <StatTile
              label="Additions / Deductions"
              value={
                <>
                  <span className="text-emerald-700">+{formatINR(totals.added)}</span>
                  <span className="mx-1 text-gray-300">/</span>
                  <span className="text-red-600">−{formatINR(totals.deducted)}</span>
                </>
              }
            />
            <StatTile label="Net Payable" value={formatINR(totals.net)} tone="text-emerald-700" />
          </div>
        )}

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          {/* Search + basis */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Search or select employee..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedUserId(null)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setShowSuggestions(false)
                  }, 200)
                }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-10 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedUserId(null)
                    setShowSuggestions(false)
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 font-bold text-gray-400 transition hover:text-gray-600"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}

              {/* Suggestions floating list */}
              {showSuggestions && searchQuery && (
                <div className="absolute left-0 right-0 z-20 mt-1.5 max-h-60 space-y-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                  {suggestions.length === 0 ? (
                    <div className="px-3 py-2.5 text-xs font-semibold italic text-gray-400">
                      No matching employees found
                    </div>
                  ) : (
                    suggestions.map((s) => (
                      <button
                        key={s.user_id}
                        type="button"
                        onClick={() => {
                          setSearchQuery(s.name)
                          setSelectedUserId(s.user_id)
                          setShowSuggestions(false)
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-bold text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        <span>{s.name}</span>
                        <span className="text-[10px] font-normal text-gray-400">{s.employee_id}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="shrink-0 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              📅 {monthLabel} · pay basis{" "}
              <span className="text-sm font-black normal-case text-gray-900">{payrollData?.total_working_days || 30} days</span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-sm font-semibold text-gray-400">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
              <span>Calculating payroll records...</span>
            </div>
          ) : displayedRecords.length === 0 ? (
            <div className="py-16 text-center text-sm font-medium text-gray-400">
              No employee payroll records found matching your search.
            </div>
          ) : (
            <>
              {/* Desktop / tablet: compact table */}
              <div className="hidden overflow-hidden rounded-xl border border-gray-200 md:block">
                <table className="w-full border-collapse text-left text-sm text-gray-500">
                  <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Base Salary</th>
                      <th className="px-4 py-3">Attendance</th>
                      <th className="px-4 py-3 text-right">Calculated</th>
                      <th className="px-4 py-3 text-right">Adjustments</th>
                      <th className="px-4 py-3 text-right">Net Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {displayedRecords.map((rec) => (
                      <tr key={rec.user_id} className="align-top transition hover:bg-gray-50/70">
                        <td className="max-w-[14rem] px-4 py-4">
                          <p className="truncate text-sm font-bold text-gray-950">{rec.name}</p>
                          <p className="mt-0.5 truncate text-xs text-gray-500">{rec.employee_id}</p>
                          <p className="truncate text-xs text-gray-400" title={rec.email}>{rec.email}</p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-black text-gray-900">{formatINR(rec.base_salary)}</p>
                          <button
                            onClick={() => handleEditSalaryClick(rec)}
                            className="mt-1.5 rounded-lg border border-gray-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                          >
                            Edit Salary
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-black text-gray-950">
                            {formatDays(rec.total_paid_days)}
                            <span className="text-xs font-semibold text-gray-400"> / {rec.total_working_days} paid days</span>
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-gray-500">
                            Present {rec.total_days_present || 0} · Worked {formatDays(rec.worked_days)}
                            <br />
                            Paid leave {formatDays(rec.paid_leaves)} · {formatHours(rec.total_hours_worked || 0)}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-right text-sm font-bold text-gray-900">
                          {formatINR(rec.calculated_salary)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <p className={`text-xs font-bold ${rec.adjustments_added ? "text-emerald-700" : "text-gray-300"}`}>
                            + {formatINR(rec.adjustments_added)}
                          </p>
                          <p className={`text-xs font-bold ${rec.adjustments_deducted ? "text-red-600" : "text-gray-300"}`}>
                            − {formatINR(rec.adjustments_deducted)}
                          </p>
                          <button
                            onClick={() => setAdjustingEmp(rec)}
                            className="mt-1.5 rounded-lg border border-gray-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                          >
                            Add / Manage
                          </button>
                        </td>

                        <td className={`px-4 py-4 text-right text-base font-black ${rec.net_salary < 0 ? "text-red-600" : "text-emerald-700"}`}>
                          {formatINR(rec.net_salary)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phone: one card per employee */}
              <div className="space-y-3 md:hidden">
                {displayedRecords.map((rec) => (
                  <div key={rec.user_id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-950">{rec.name}</p>
                        <p className="truncate text-xs text-gray-500">{rec.employee_id} · {rec.email}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Net payable</p>
                        <p className={`text-base font-black ${rec.net_salary < 0 ? "text-red-600" : "text-emerald-700"}`}>
                          {formatINR(rec.net_salary)}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                      <div>
                        <dt className="font-bold uppercase tracking-wider text-gray-400">Base salary</dt>
                        <dd className="mt-0.5 text-sm font-bold text-gray-900">{formatINR(rec.base_salary)}</dd>
                      </div>
                      <div>
                        <dt className="font-bold uppercase tracking-wider text-gray-400">Paid days</dt>
                        <dd className="mt-0.5 text-sm font-bold text-gray-900">
                          {formatDays(rec.total_paid_days)} / {rec.total_working_days}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold uppercase tracking-wider text-gray-400">Present / Worked</dt>
                        <dd className="mt-0.5 font-semibold text-gray-700">
                          {rec.total_days_present || 0} / {formatDays(rec.worked_days)} days
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold uppercase tracking-wider text-gray-400">Hours · Leave</dt>
                        <dd className="mt-0.5 font-semibold text-gray-700">
                          {formatHours(rec.total_hours_worked || 0)} · {formatDays(rec.paid_leaves)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold uppercase tracking-wider text-gray-400">Calculated</dt>
                        <dd className="mt-0.5 font-semibold text-gray-900">{formatINR(rec.calculated_salary)}</dd>
                      </div>
                      <div>
                        <dt className="font-bold uppercase tracking-wider text-gray-400">Adjustments</dt>
                        <dd className="mt-0.5 font-semibold">
                          <span className="text-emerald-700">+{formatINR(rec.adjustments_added)}</span>
                          <br />
                          <span className="text-red-600">−{formatINR(rec.adjustments_deducted)}</span>
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleEditSalaryClick(rec)}
                        className="rounded-lg border border-gray-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Edit Salary
                      </button>
                      <button
                        onClick={() => setAdjustingEmp(rec)}
                        className="rounded-lg border border-gray-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Add / Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {adjustingEmp && (
        <PayrollAdjustmentsModal
          employee={adjustingEmp}
          year={year}
          month={month}
          monthLabel={monthLabel}
          onClose={() => setAdjustingEmp(null)}
          onChanged={() => fetchPayroll({ silent: true })}
        />
      )}

      {/* Edit Salary Modal */}
      {editingEmp && (
        <ModalShell onClose={() => setEditingEmp(null)} disableClose={savingSalary} maxWidth="sm:max-w-md">
          <div className="space-y-5 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="min-w-0">
                <h3 className="text-base font-black text-gray-950">Update Base Salary</h3>
                <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {editingEmp.name} ({editingEmp.employee_id}) · {monthLabel} {year}
                </p>
              </div>
              <button
                onClick={() => setEditingEmp(null)}
                aria-label="Close"
                className="shrink-0 text-lg font-bold text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Stats Breakdown inside Modal */}
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs font-semibold text-gray-600">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Worked Days</span>
                <span className="text-sm font-black text-gray-900">{formatDays(editingEmp.worked_days)} days</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Paid Leaves</span>
                <span className="text-sm font-black text-gray-900">{formatDays(editingEmp.paid_leaves)} leaves</span>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-3 border-t border-gray-200 pt-2">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Paid Days</span>
                  <span className="text-sm font-black text-gray-950">{formatDays(editingEmp.total_paid_days)} / {editingEmp.total_working_days} days</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Payout for attendance</span>
                  <span className="text-sm font-black text-emerald-600">
                    {formatINR((parseFloat(editingSalaryVal) || 0) / editingEmp.total_working_days * editingEmp.total_paid_days)}
                  </span>
                </div>
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={(e) => handleSaveSalarySubmit(e, editingEmp.user_id)} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Base Monthly Salary (₹)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="Enter base monthly salary..."
                    value={editingSalaryVal}
                    onChange={(e) => setEditingSalaryVal(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-8 pr-4 text-base font-bold text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white sm:text-sm"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-bold text-gray-500 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSalary}
                  className="flex-1 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:bg-emerald-300"
                >
                  {savingSalary ? "Saving Changes..." : "Save Salary"}
                </button>
              </div>
            </form>
          </div>
        </ModalShell>
      )}
    </AdminLayout>
  )
}
