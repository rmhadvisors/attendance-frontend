import { useEffect, useState } from "react"
import ModalShell from "./ModalShell"
import api, { getApiErrorMessage } from "../api/axios"

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const inputClass =
  "block w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:text-sm"

/**
 * Admin-only: add / remove manual additions (bonus, incentive...) and deductions
 * (advance, penalty...) for one employee in one month. Shown on the payslip.
 */
export default function PayrollAdjustmentsModal({ employee, year, month, monthLabel, onClose, onChanged }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ kind: "addition", amount: "", reason: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    api
      .get(`/payroll/adjustments?user_id=${employee.user_id}&year=${year}&month=${month}`)
      .then((res) => {
        if (!cancelled) setItems(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Failed to load adjustments"))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [employee.user_id, year, month])

  const added = items.filter((i) => i.kind === "addition").reduce((sum, i) => sum + i.amount, 0)
  const deducted = items.filter((i) => i.kind === "deduction").reduce((sum, i) => sum + i.amount, 0)
  const attendanceSalary = Number(employee.calculated_salary || 0)
  const net = attendanceSalary + added - deducted

  const handleAdd = async (e) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) {
      setError("Enter an amount greater than 0")
      return
    }
    if (!form.reason.trim()) {
      setError("Please enter a reason")
      return
    }
    setSaving(true)
    setError("")
    try {
      const res = await api.post("/payroll/adjustments", {
        user_id: employee.user_id,
        year,
        month,
        kind: form.kind,
        amount,
        reason: form.reason.trim(),
      })
      setItems((prev) => [...prev, res.data])
      setForm((prev) => ({ ...prev, amount: "", reason: "" }))
      onChanged?.()
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add adjustment"))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (item) => {
    if (!window.confirm(`Remove this ${item.kind} of ${inr(item.amount)} (${item.reason})?`)) return
    try {
      await api.delete(`/payroll/adjustments/${item.id}`)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      onChanged?.()
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to remove adjustment"))
    }
  }

  return (
    <ModalShell onClose={onClose} disableClose={saving} maxWidth="sm:max-w-lg">
      <div className="space-y-5 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-950">Salary Adjustments</h3>
            <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wide text-gray-400">
              {employee.name} ({employee.employee_id}) · {monthLabel} {year}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pay breakdown */}
        <div className="space-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Salary for attendance</span>
            <span className="font-semibold text-gray-900">{inr(attendanceSalary)}</span>
          </div>
          <div className="flex justify-between text-emerald-700">
            <span>+ Additions</span>
            <span className="font-semibold">{inr(added)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>− Deductions</span>
            <span className="font-semibold">{inr(deducted)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-black text-gray-950">
            <span>Net payable</span>
            <span className={net < 0 ? "text-red-600" : "text-emerald-700"}>{inr(net)}</span>
          </div>
        </div>

        {/* Existing items */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">This month</p>
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-400">
              No adjustments yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-black ${
                      item.kind === "addition" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                    }`}
                  >
                    {item.kind === "addition" ? "+" : "−"}
                  </span>
                  <p className="min-w-0 flex-1 break-words text-sm font-medium text-gray-800">{item.reason}</p>
                  <span className={`shrink-0 text-sm font-bold ${item.kind === "addition" ? "text-emerald-700" : "text-red-600"}`}>
                    {inr(item.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    className="shrink-0 rounded bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600 transition hover:bg-red-100 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="space-y-3 border-t border-gray-100 pt-4" autoComplete="off">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Add adjustment</p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "addition", label: "+ Addition", active: "border-emerald-500 bg-emerald-50 text-emerald-700" },
              { value: "deduction", label: "− Deduction", active: "border-red-500 bg-red-50 text-red-600" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, kind: opt.value }))}
                className={`rounded-lg border px-3 py-2.5 text-sm font-bold transition ${
                  form.kind === opt.value ? opt.active : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[9rem_1fr]">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-bold text-gray-400">₹</span>
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="Amount"
                className={`${inputClass} pl-7`}
              />
            </div>
            <input
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
              maxLength={200}
              placeholder={form.kind === "addition" ? "e.g. Diwali bonus, incentive" : "e.g. Salary advance, penalty"}
              className={inputClass}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
          >
            {saving ? "Saving…" : form.kind === "addition" ? "Add Addition" : "Add Deduction"}
          </button>
        </form>
      </div>
    </ModalShell>
  )
}
