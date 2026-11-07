import { useEffect, useMemo, useState } from "react"
import ModalShell from "./ModalShell"
import { Icon, Section, Field } from "./FormParts"
import { inputClass } from "../constants/formStyles"
import { givePaidLeave } from "../services/attendanceService"
import { getEmployees } from "../services/employeeService"
import { getApiErrorMessage } from "../api/axios"

const ICONS = {
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  note: "M7 8h10M7 12h6m-6 8l-3-3V6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-2 3z",
  check: "M5 13l4 4L19 7",
  close: "M6 18L18 6M6 6l12 12",
}

const REASON_MAX = 200

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date()) // YYYY-MM-DD
}

function formatDate(value) {
  if (!value) return "-"
  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
}

function countDays(start, end) {
  if (!start || !end) return 0
  const a = new Date(`${start}T00:00:00`)
  const b = new Date(`${end}T00:00:00`)
  const diff = Math.round((b - a) / 86400000) + 1
  return diff > 0 ? diff : 0
}

/**
 * Admin form to grant paid leave to an employee for one date or a date range.
 * Same look as the Add / Edit Employee form.
 */
export default function PaidLeaveModal({ defaultDate, onClose, onGranted }) {
  const initialDate = defaultDate || todayIST()
  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [form, setForm] = useState({
    user_id: "",
    start_date: initialDate,
    end_date: initialDate,
    note: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState(null)

  useEffect(() => {
    let cancelled = false
    getEmployees()
      .then((list) => {
        if (cancelled) return
        setEmployees([...list].sort((a, b) => (a.name || "").localeCompare(b.name || "")))
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Failed to load employees"))
      })
      .finally(() => {
        if (!cancelled) setLoadingEmployees(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const dayCount = useMemo(() => countDays(form.start_date, form.end_date), [form.start_date, form.end_date])
  const selectedEmployee = employees.find((emp) => emp.id === form.user_id)

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleStartChange = (e) => {
    const value = e.target.value
    setForm((prev) => ({
      ...prev,
      start_date: value,
      end_date: !prev.end_date || prev.end_date < value ? value : prev.end_date
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.user_id) {
      setError("Please select an employee")
      return
    }
    if (dayCount <= 0) {
      setError("End date cannot be before start date")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await givePaidLeave({ ...form, note: form.note.trim() || null })
      setResult(res)
      onGranted?.(res)
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to grant paid leave"))
    } finally {
      setLoading(false)
    }
  }

  const header = (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-600 px-5 py-5 text-white sm:px-6">
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <div className="relative flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30">
          <Icon path={result ? ICONS.check : ICONS.calendar} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold">{result ? "Paid leave granted" : "Give Paid Leave"}</h3>
          <p className="truncate text-xs text-emerald-100">
            {result
              ? `${result.message}${selectedEmployee ? ` for ${selectedEmployee.name}` : ""}`
              : "Paid in full and not deducted from salary."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
          className="shrink-0 rounded-full bg-white/15 p-1.5 transition hover:bg-white/25"
        >
          <Icon path={ICONS.close} className="h-5 w-5" />
        </button>
      </div>
    </div>
  )

  return (
    <ModalShell onClose={onClose} disableClose={loading} maxWidth="sm:max-w-xl">
      {header}

      {result ? (
        <>
          <div className="space-y-5 px-5 py-6 sm:px-6">
            {result.granted?.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Paid leave on</p>
                <div className="flex flex-wrap gap-2">
                  {result.granted.map((d) => (
                    <span key={d} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {formatDate(d)}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
                No days were changed.
              </p>
            )}

            {result.skipped?.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-800">Skipped</p>
                <ul className="space-y-1 text-xs text-gray-900">
                  {result.skipped.map((s) => (
                    <li key={s.date}>
                      <span className="font-semibold">{formatDate(s.date)}</span> — {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 border-t border-gray-100 bg-white/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              Done
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col">
          <div className="space-y-7 px-5 py-6 sm:px-6">
            <Section icon={ICONS.user} title="Employee">
              <Field label="Select employee" required full>
                <select
                  value={form.user_id}
                  onChange={setField("user_id")}
                  required
                  disabled={loadingEmployees}
                  className={inputClass}
                >
                  <option value="">{loadingEmployees ? "Loading employees…" : "Choose an employee"}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </Field>
            </Section>

            <Section icon={ICONS.calendar} title="Dates">
              <Field label="From" required>
                <input type="date" value={form.start_date} onChange={handleStartChange} required className={inputClass} />
              </Field>
              <Field label="To" required>
                <input
                  type="date"
                  value={form.end_date}
                  min={form.start_date}
                  onChange={setField("end_date")}
                  required
                  className={inputClass}
                />
              </Field>
              {dayCount > 0 && (
                <p className="-mt-1 text-xs font-semibold text-emerald-700 sm:col-span-2">
                  {dayCount} day{dayCount > 1 ? "s" : ""} selected
                </p>
              )}
            </Section>

            <Section icon={ICONS.note} title="Reason">
              <Field label="Reason (optional)" full>
                <textarea
                  value={form.note}
                  onChange={setField("note")}
                  rows={3}
                  maxLength={REASON_MAX}
                  placeholder="e.g. Medical, approved by manager"
                  className={`${inputClass} resize-none`}
                />
                <p className="mt-1 text-right text-[11px] font-medium text-gray-400">
                  {form.note.length}/{REASON_MAX}
                </p>
              </Field>
            </Section>

            <p className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs leading-relaxed text-emerald-900">
              Week offs and holidays are skipped because they are already paid. Days that already have attendance are not
              changed, so use Override on the Attendance page for those.
            </p>
          </div>

          <div className="sticky bottom-0 border-t border-gray-100 bg-white/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
            {error && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:flex-none sm:px-6"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || loadingEmployees}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:bg-emerald-300 sm:flex-none sm:px-8"
              >
                {loading ? "Saving…" : "Grant Paid Leave"}
              </button>
            </div>
          </div>
        </form>
      )}
    </ModalShell>
  )
}
