import { useEffect, useMemo, useState } from "react"
import ModalShell from "./ModalShell"
import api, { getApiErrorMessage } from "../api/axios"
import { downloadPdf } from "../utils/downloadPdf"

const baseInput =
  "block w-full min-w-0 rounded-lg border border-gray-300 bg-white py-2.5 text-base text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:text-sm"
const textInput = `${baseInput} px-3`
const moneyInput = `${baseInput} pl-7 pr-3`

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const num = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v))
const differs = (a, b) => Math.abs(Number(a) - Number(b)) > 0.005

// PAN: 5 letters, 4 digits, 1 letter; the 4th letter is the holder type.
function panProblem(pan) {
  const v = (pan || "").trim().toUpperCase()
  if (!v) return ""
  if (v.length < 10) return "PAN has 10 characters (e.g. ABCPE1234F)"
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v)) return "PAN format is 5 letters, 4 digits, 1 letter (e.g. ABCPE1234F)"
  if (!"ABCFGHJLPT".includes(v[3])) return "Not a valid PAN: the 4th letter must be one of A, B, C, F, G, H, J, L, P, T"
  return ""
}

const DETAIL_FIELDS = [
  { key: "pan_number", label: "PAN", placeholder: "ABCPE1234F", upper: true, maxLength: 10 },
  { key: "bank_name", label: "Salary bank", placeholder: "Bank name" },
  { key: "bank_account_no", label: "Salary A/c no.", placeholder: "Account number", numeric: true },
  { key: "pf_uan_no", label: "PF No. / UAN", placeholder: "PF number / UAN" },
  { key: "esic_no", label: "E.S.I.C. No.", placeholder: "ESIC number" },
  { key: "work_location", label: "Location", placeholder: "e.g. Vasai" },
]

const STATUTORY = [
  { key: "pf", label: "PF (employee)" },
  { key: "esic", label: "ESIC (employee)" },
  { key: "prof_tax", label: "Professional Tax" },
]
const EMPLOYER = [
  { key: "employer_pf", label: "Employer PF" },
  { key: "employer_esic", label: "Employer ESIC" },
]

function SectionTitle({ children, aside }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{children}</p>
      {aside}
    </div>
  )
}

function MoneyField({ label, value, onChange, hint }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-bold text-gray-400">₹</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={moneyInput}
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

function EmployeePicker({ employees, onPick }) {
  const [query, setQuery] = useState("")
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(
      (e) => (e.name || "").toLowerCase().includes(q) || (e.employee_id || "").toLowerCase().includes(q)
    )
  }, [employees, query])

  return (
    <div className="space-y-3">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search employee by name or ID…"
        className={textInput}
      />
      <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100">
        {matches.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-gray-400">No matching employees</li>
        ) : (
          matches.map((e) => (
            <li key={e.user_id}>
              <button
                type="button"
                onClick={() => onPick(e)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-emerald-50"
              >
                <span className="min-w-0 truncate text-sm font-semibold text-gray-800">{e.name}</span>
                <span className="shrink-0 text-xs text-gray-400">{e.employee_id}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

/**
 * Admin-only. "Generate Payslip": pick an employee, review what the payroll system
 * calculated, correct it if needed, fill in the payslip details and statutory amounts, then
 * download the PDF.
 */
export default function PayslipModal({ employees, initialEmployee = null, year, month, monthLabel, onClose }) {
  const [employee, setEmployee] = useState(initialEmployee)
  const [loading, setLoading] = useState(!!initialEmployee)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const [calc, setCalc] = useState(null)
  const [days, setDays] = useState("")
  const [base, setBase] = useState("")
  const [earned, setEarned] = useState("")
  const [earnedTouched, setEarnedTouched] = useState(false)
  const [details, setDetails] = useState({})
  const [amounts, setAmounts] = useState({})
  // HRA / other parts of the base salary. Basic = base - their total.
  const [components, setComponents] = useState([{ name: "HRA", amount: "" }])
  const [tdsPct, setTdsPct] = useState("")
  const [tdsAmt, setTdsAmt] = useState("")

  const pickEmployee = (emp) => {
    setLoading(true)
    setError("")
    setNotice("")
    setEmployee(emp)
  }

  useEffect(() => {
    if (!employee) return undefined
    let cancelled = false
    api
      .get(`/payroll/payslip-entry?user_id=${employee.user_id}&year=${year}&month=${month}`)
      .then((res) => {
        if (cancelled) return
        const d = res.data
        const c = d.calc || { base_salary: 0, total_paid_days: 0, calculated_salary: 0, adjustments_added: 0, adjustments_deducted: 0 }
        setCalc(c)
        const effDays = d.paid_days_override ?? c.total_paid_days
        const effBase = d.base_salary_override ?? c.base_salary
        const calcEarned =
          d.paid_days_override != null || d.base_salary_override != null
            ? round2((effBase / 30) * effDays)
            : c.calculated_salary
        const effEarned = d.basic_earned_override ?? calcEarned
        setDays(String(round2(effDays)))
        setBase(String(round2(effBase)))
        setEarned(String(round2(effEarned)))
        setEarnedTouched(d.basic_earned_override != null)
        setDetails(d.employee || {})
        const next = {}
        for (const { key } of [...STATUTORY, ...EMPLOYER]) next[key] = d[key] ? String(d[key]) : ""
        setAmounts(next)
        setComponents(
          d.earning_components?.length
            ? d.earning_components.map((c) => ({ name: c.name, amount: String(c.amount) }))
            : [{ name: "HRA", amount: "" }]
        )
        setTdsPct(d.tds_percent != null ? String(d.tds_percent) : "")
        setTdsAmt(d.tds ? String(d.tds) : "")
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Failed to load payslip details"))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [employee, year, month])

  // Changing days or base recalculates the earned amount, until it is typed in by hand.
  const onDays = (v) => {
    setDays(v)
    if (!earnedTouched) setEarned(String(round2((num(base) / 30) * num(v))))
  }
  const onBase = (v) => {
    setBase(v)
    if (!earnedTouched) setEarned(String(round2((num(v) / 30) * num(days))))
  }
  const resetToPayroll = () => {
    if (!calc) return
    setDays(String(round2(calc.total_paid_days)))
    setBase(String(round2(calc.base_salary)))
    setEarned(String(round2(calc.calculated_salary)))
    setEarnedTouched(false)
  }

  const added = calc?.adjustments_added || 0
  const deductedAdj = calc?.adjustments_deducted || 0
  const gross = num(earned) + added
  const tdsValue = tdsPct !== "" ? round2((gross * num(tdsPct)) / 100) : num(tdsAmt)
  const statutoryTotal = STATUTORY.reduce((sum, f) => sum + num(amounts[f.key]), 0) + tdsValue
  const totalDeductions = statutoryTotal + deductedAdj
  const componentTotal = components.reduce((sum, c) => sum + num(c.amount), 0)
  const basicMonthly = num(base) - componentTotal
  const panMsg = panProblem(details.pan_number)

  const setComponent = (index, patch) =>
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  const net = gross - totalDeductions

  const edited =
    calc &&
    (differs(days, calc.total_paid_days) || differs(base, calc.base_salary) || differs(earned, calc.calculated_salary))

  const buildPayload = () => {
    for (const { key, label } of [...STATUTORY, ...EMPLOYER]) {
      const value = num(amounts[key])
      if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a number, 0 or more`)
    }
    for (const [label, value] of [["Paid days", days], ["Base salary", base], ["Earned amount", earned]]) {
      const n = Number(value)
      if (value === "" || !Number.isFinite(n) || n < 0) throw new Error(`${label} must be a number, 0 or more`)
    }
    const panError = panProblem(details.pan_number)
    if (panError) throw new Error(panError)
    if (tdsPct !== "" && (num(tdsPct) < 0 || num(tdsPct) > 100)) throw new Error("TDS % must be between 0 and 100")
    if (tdsPct === "" && num(tdsAmt) < 0) throw new Error("TDS must be 0 or more")
    const filled = components.filter((c) => c.name.trim() || c.amount !== "")
    for (const c of filled) {
      if (!c.name.trim()) throw new Error("Give every extra earning a name")
      if (!(num(c.amount) > 0)) throw new Error(`Enter an amount for ${c.name.trim()}`)
    }
    if (basicMonthly < -0.005) throw new Error("HRA and other earnings are more than the base salary")

    const paidOv = differs(days, calc.total_paid_days) ? Number(days) : null
    const baseOv = differs(base, calc.base_salary) ? Number(base) : null
    const expectedEarned =
      paidOv !== null || baseOv !== null ? round2((Number(base) / 30) * Number(days)) : calc.calculated_salary
    const earnedOv = differs(earned, expectedEarned) ? Number(earned) : null

    const payload = {
      user_id: employee.user_id,
      year,
      month,
      paid_days_override: paidOv,
      base_salary_override: baseOv,
      basic_earned_override: earnedOv,
      earning_components: filled.map((c) => ({ name: c.name.trim(), amount: num(c.amount) })),
      tds: tdsPct !== "" ? 0 : num(tdsAmt),
      tds_percent: tdsPct !== "" ? num(tdsPct) : null,
    }
    for (const { key } of [...STATUTORY, ...EMPLOYER]) payload[key] = num(amounts[key])
    for (const { key } of DETAIL_FIELDS) payload[key] = (details[key] || "").trim()
    return payload
  }

  const run = async (download) => {
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await api.put("/payroll/payslip-entry", buildPayload())
      if (download) {
        await downloadPdf(
          `/payroll/payslip/${employee.user_id}?year=${year}&month=${month}`,
          `Payslip_${employee.employee_id}_${year}-${String(month).padStart(2, "0")}.pdf`
        )
      } else {
        setNotice("Saved.")
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Something went wrong"))
    } finally {
      setBusy(false)
    }
  }

  const ready = employee && !loading && calc

  return (
    <ModalShell onClose={onClose} disableClose={busy} maxWidth="sm:max-w-xl">
      <div className="space-y-5 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-950">Generate Payslip</h3>
            <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wide text-gray-400">
              {employee ? `${employee.name} (${employee.employee_id}) · ` : ""}
              {monthLabel} {year}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {employee && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEmployee(null)
                  setCalc(null)
                }}
                className="rounded-lg px-2 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
              >
                Change employee
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {!employee && (
          <>
            <p className="text-sm text-gray-500">Choose the employee you want to create a payslip for.</p>
            <EmployeePicker employees={employees} onPick={pickEmployee} />
          </>
        )}

        {employee && loading && <p className="text-sm text-gray-400">Loading…</p>}

        {ready && (
          <>
            {/* Payroll calculation (read-only reference) */}
            <div className="space-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">As calculated by payroll</p>
              <div className="flex justify-between text-gray-600">
                <span>Base salary (monthly)</span>
                <span className="font-semibold text-gray-900">{inr(calc.base_salary)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Paid days (of 30)</span>
                <span className="font-semibold text-gray-900">{round2(calc.total_paid_days)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Salary for attendance</span>
                <span className="font-semibold text-gray-900">{inr(calc.calculated_salary)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>+ Additions (Add / Manage)</span>
                <span className="font-semibold">{inr(added)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>− Deductions (Add / Manage)</span>
                <span className="font-semibold">{inr(deductedAdj)}</span>
              </div>
            </div>

            {/* Editable salary for this payslip */}
            <div>
              <SectionTitle
                aside={
                  edited ? (
                    <button
                      type="button"
                      onClick={resetToPayroll}
                      className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 transition hover:bg-amber-100"
                    >
                      Edited · Reset to payroll
                    </button>
                  ) : null
                }
              >
                Salary on this payslip
              </SectionTitle>
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
                <div className="min-w-0">
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Paid days</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="31"
                    step="0.01"
                    value={days}
                    onChange={(e) => onDays(e.target.value)}
                    className={textInput}
                  />
                </div>
                <MoneyField label="Base salary" value={base} onChange={onBase} />
                <MoneyField
                  label="Salary earned"
                  value={earned}
                  onChange={(v) => {
                    setEarned(v)
                    setEarnedTouched(true)
                  }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">
                Salary earned = base ÷ 30 × paid days. It updates as you change days or base; type in it to
                override the amount directly. It is split across Basic, HRA and the other earnings below.
              </p>
            </div>

            {/* Earnings breakup: parts of the base salary */}
            <div>
              <SectionTitle
                aside={
                  <button
                    type="button"
                    onClick={() => setComponents((prev) => [...prev, { name: "", amount: "" }])}
                    className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    + Add earning
                  </button>
                }
              >
                Earnings breakup (monthly)
              </SectionTitle>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_8.5rem_2rem] items-center gap-2">
                  <span className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700">Basic (remaining)</span>
                  <span
                    className={`rounded-lg bg-gray-50 px-3 py-2.5 text-right text-sm font-bold ${
                      basicMonthly < 0 ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    {inr(basicMonthly)}
                  </span>
                  <span />
                </div>
                {components.map((c, i) => (
                  <div key={i} className="grid grid-cols-[1fr_8.5rem_2rem] items-center gap-2">
                    <input
                      value={c.name}
                      maxLength={40}
                      onChange={(e) => setComponent(i, { name: e.target.value })}
                      placeholder="e.g. HRA, Conveyance"
                      className={textInput}
                    />
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-bold text-gray-400">₹</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={c.amount}
                        onChange={(e) => setComponent(i, { amount: e.target.value })}
                        placeholder="0"
                        className={moneyInput}
                      />
                    </div>
                    <button
                      type="button"
                      aria-label="Remove earning"
                      onClick={() => setComponents((prev) => prev.filter((_, idx) => idx !== i))}
                      className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">
                These are carved out of the base salary, so the total stays {inr(num(base))}. Each line is prorated by
                paid days. They are remembered for next month.
              </p>
            </div>

            {/* Employee details */}
            <div>
              <SectionTitle>Employee details (saved for every month)</SectionTitle>
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                {DETAIL_FIELDS.map((f) => (
                  <div key={f.key} className="min-w-0">
                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">{f.label}</label>
                    <input
                      value={details[f.key] || ""}
                      inputMode={f.numeric ? "numeric" : undefined}
                      maxLength={f.maxLength}
                      placeholder={f.placeholder}
                      onChange={(e) =>
                        setDetails((prev) => ({ ...prev, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value }))
                      }
                      className={`${textInput} ${f.key === "pan_number" && panMsg ? "border-red-400" : ""}`}
                    />
                    {f.key === "pan_number" && panMsg && <p className="mt-1 text-[11px] font-medium text-red-600">{panMsg}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Statutory amounts */}
            <div>
              <SectionTitle>Deductions this month</SectionTitle>
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
                {STATUTORY.map((f) => (
                  <MoneyField
                    key={f.key}
                    label={f.label}
                    value={amounts[f.key] ?? ""}
                    onChange={(v) => setAmounts((prev) => ({ ...prev, [f.key]: v }))}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
                <div className="min-w-0">
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">TDS %</label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.01"
                      value={tdsPct}
                      onChange={(e) => setTdsPct(e.target.value)}
                      placeholder="e.g. 10"
                      className={`${textInput} pr-8`}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-bold text-gray-400">%</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">Of gross earnings ({inr(gross)})</p>
                </div>
                {tdsPct !== "" ? (
                  <div className="min-w-0">
                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">TDS amount</label>
                    <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-900">{inr(tdsValue)}</p>
                    <button
                      type="button"
                      onClick={() => setTdsPct("")}
                      className="mt-1 text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      Enter a fixed amount instead
                    </button>
                  </div>
                ) : (
                  <MoneyField label="TDS amount (fixed)" value={tdsAmt} onChange={setTdsAmt} />
                )}
              </div>
            </div>
            <div>
              <SectionTitle>Employer contribution</SectionTitle>
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                {EMPLOYER.map((f) => (
                  <MoneyField
                    key={f.key}
                    label={f.label}
                    value={amounts[f.key] ?? ""}
                    onChange={(v) => setAmounts((prev) => ({ ...prev, [f.key]: v }))}
                  />
                ))}
              </div>
            </div>

            {/* Result */}
            <div className="space-y-1.5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Gross earnings</span>
                <span className="font-semibold text-gray-900">{inr(gross)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total deductions</span>
                <span className="font-semibold text-red-600">{inr(totalDeductions)}</span>
              </div>
              <div className="flex justify-between border-t border-emerald-100 pt-2 text-base font-black text-gray-950">
                <span>Net payable</span>
                <span className={net < 0 ? "text-red-600" : "text-emerald-700"}>{inr(net)}</span>
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{error}</p>
        )}
        {notice && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">{notice}</p>
        )}

        {ready && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
            >
              {busy ? "Working…" : "Save & Download PDF"}
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  )
}
