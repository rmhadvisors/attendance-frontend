import { useState } from "react"
import ModalShell from "./ModalShell"
import { createEmployee, updateEmployee } from "../services/employeeService"
import { getApiErrorMessage } from "../api/axios"
import { SATURDAY_POLICIES } from "../constants/saturdayPolicies"
import { inputClass } from "../constants/formStyles"
import { Icon, Section, Field } from "./FormParts"

const ICONS = {
  userPlus: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  pencil: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  briefcase: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  lock: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  eyeOff: "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21",
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
        checked ? "border-emerald-300 bg-emerald-50/60" : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-800">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-gray-500">{description}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-emerald-500" : "bg-gray-300"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  )
}

function PasswordInput({ value, onChange, placeholder, required }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete="new-password"
        className={`${inputClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-gray-400 transition hover:text-gray-600"
      >
        <Icon path={visible ? ICONS.eyeOff : ICONS.eye} className="h-5 w-5" />
      </button>
    </div>
  )
}

function initialForm(mode, employee) {
  if (mode === "edit") {
    return {
      employee_id: employee.employee_id || "",
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      role: employee.role || "employee",
      saturday_policy: employee.saturday_policy || "alt_sat_holiday",
      base_salary: employee.base_salary || 0,
      allow_remote_checkin: employee.allow_remote_checkin || false,
      date_of_joining: employee.date_of_joining || "",
      date_of_exit: employee.date_of_exit || "",
      department: employee.department || "",
      designation: employee.designation || "",
      reporting_manager: employee.reporting_manager || "",
      shift_start: employee.shift_start || "",
      shift_end: employee.shift_end || "",
      new_password: ""
    }
  }
  return {
    employee_id: "",
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "employee",
    saturday_policy: "alt_sat_holiday",
    allow_remote_checkin: false,
    department: "",
    designation: "",
    reporting_manager: "",
    date_of_joining: "",
    shift_start: "",
    shift_end: ""
  }
}

/**
 * Add / Edit employee form (admin). One sectioned layout for both.
 * mode="add"  -> onSaved(createdEmployee)
 * mode="edit" -> onSaved(updatedEmployee), `employee` is required
 */
export default function EmployeeFormModal({ mode = "add", employee, onClose, onSaved }) {
  const isEdit = mode === "edit"
  const [form, setForm] = useState(() => initialForm(mode, employee))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.employee_id.trim()) {
      setError("Employee ID is required")
      return
    }
    if (!EMAIL_REGEX.test(form.email)) {
      setError("Please enter a valid email address")
      return
    }
    if (isEdit && form.new_password && form.new_password.length < 6) {
      setError("New password must be at least 6 characters")
      return
    }
    if ((form.shift_start && !form.shift_end) || (!form.shift_start && form.shift_end)) {
      setError("Please set both shift start and shift end")
      return
    }
    if (isEdit && form.date_of_exit && form.date_of_joining && form.date_of_exit < form.date_of_joining) {
      setError("Date of exit cannot be before date of joining")
      return
    }

    setLoading(true)
    setError("")
    try {
      const common = {
        department: form.department.trim() || null,
        designation: form.designation.trim() || null,
        reporting_manager: form.reporting_manager.trim() || null,
        date_of_joining: form.date_of_joining || null,
        shift_start: form.shift_start || null,
        shift_end: form.shift_end || null
      }

      if (isEdit) {
        const { new_password, ...rest } = form
        const payload = {
          ...rest,
          ...common,
          employee_id: form.employee_id.trim(),
          base_salary: parseFloat(form.base_salary) || 0,
          date_of_exit: form.date_of_exit || null
        }
        if (new_password) payload.new_password = new_password
        onSaved(await updateEmployee(employee.id, payload))
      } else {
        onSaved(await createEmployee({ ...form, ...common }))
      }
    } catch (err) {
      setError(getApiErrorMessage(err, isEdit ? "Failed to update employee" : "Failed to create employee"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell onClose={onClose} disableClose={loading} maxWidth="sm:max-w-2xl">
      <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 px-5 py-5 text-white sm:px-6">
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30">
              <Icon path={isEdit ? ICONS.pencil : ICONS.userPlus} className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold">{isEdit ? "Edit Employee" : "Add Employee"}</h3>
              <p className="truncate text-xs text-emerald-50">
                {isEdit ? `${employee.name} · ${employee.employee_id}` : "Fill in the details to create a new account."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Close"
              className="shrink-0 rounded-full bg-white/15 p-1.5 transition hover:bg-white/25"
            >
              <Icon path="M6 18L18 6M6 6l12 12" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-7 px-5 py-6 sm:px-6">
          <Section icon={ICONS.user} title="Basic details">
            <Field label="Full name" required>
              <input value={form.name} onChange={set("name")} required placeholder="John Doe" className={inputClass} />
            </Field>
            <Field
              label="Employee ID"
              required
              hint={isEdit ? "Changing the ID does not affect attendance history, payroll or login." : undefined}
            >
              <input value={form.employee_id} onChange={set("employee_id")} required placeholder="EMP-001" className={inputClass} />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                required
                placeholder="john@company.com"
                autoComplete="new-email"
                className={inputClass}
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="+91 98765 43210"
                className={inputClass}
              />
            </Field>
          </Section>

          <Section icon={ICONS.briefcase} title="Job details">
            <Field label="Designation">
              <input value={form.designation} onChange={set("designation")} placeholder="e.g. Software Engineer" className={inputClass} />
            </Field>
            <Field label="Department">
              <input value={form.department} onChange={set("department")} placeholder="e.g. Engineering" className={inputClass} />
            </Field>
            <Field label="Reporting manager">
              <input value={form.reporting_manager} onChange={set("reporting_manager")} placeholder="Manager name" className={inputClass} />
            </Field>
            <Field label="Role">
              <select value={form.role} onChange={set("role")} className={inputClass}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="Date of joining">
              <input type="date" value={form.date_of_joining} onChange={set("date_of_joining")} className={inputClass} />
            </Field>
            {isEdit && (
              <Field label="Date of exit" hint="Last working day. Leave blank for current employees.">
                <input
                  type="date"
                  value={form.date_of_exit}
                  min={form.date_of_joining || undefined}
                  onChange={set("date_of_exit")}
                  className={inputClass}
                />
              </Field>
            )}
          </Section>

          <Section icon={ICONS.clock} title="Work settings">
            <Field label="Preferred shift timing" full>
              <div className="flex items-center gap-3">
                <input type="time" value={form.shift_start} onChange={set("shift_start")} className={inputClass} />
                <span className="shrink-0 text-xs font-semibold text-gray-400">to</span>
                <input type="time" value={form.shift_end} onChange={set("shift_end")} className={inputClass} />
              </div>
            </Field>
            <Field label="Saturday policy" full={!isEdit}>
              <select value={form.saturday_policy} onChange={set("saturday_policy")} className={inputClass}>
                {SATURDAY_POLICIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </Field>
            {isEdit && (
              <Field label="Base salary (monthly)">
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={form.base_salary}
                    onChange={set("base_salary")}
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </Field>
            )}
            <div className="sm:col-span-2">
              <Toggle
                checked={!!form.allow_remote_checkin}
                onChange={(value) => setForm((prev) => ({ ...prev, allow_remote_checkin: value }))}
                label="Allow remote / field check-in"
                description="Lets this employee check in from outside the office (with a reason)."
              />
            </div>
          </Section>

          <Section icon={ICONS.lock} title={isEdit ? "Reset password" : "Account password"}>
            <Field
              label={isEdit ? "New password" : "Password"}
              required={!isEdit}
              full
              hint={isEdit ? "Only fill this in if the employee forgot their password. Share the new one with them securely." : undefined}
            >
              <PasswordInput
                value={isEdit ? form.new_password : form.password}
                onChange={set(isEdit ? "new_password" : "password")}
                placeholder={isEdit ? "Leave blank to keep the current password" : "Set a password"}
                required={!isEdit}
              />
            </Field>
          </Section>
        </div>

        {/* Footer */}
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
              disabled={loading}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:bg-emerald-300 sm:flex-none sm:px-8"
            >
              {loading ? (isEdit ? "Saving…" : "Adding…") : isEdit ? "Save Changes" : "Add Employee"}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}
