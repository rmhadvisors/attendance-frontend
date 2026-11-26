import { useState } from "react"
import ModalShell from "./ModalShell"
import { Field, Icon, Section } from "./FormParts"
import { inputClass } from "../constants/formStyles"
import { GROUPS, ICONS, LETTERS } from "../constants/letterTypes"
import { generateLetter } from "../services/letterService"
import { getApiErrorMessage } from "../api/axios"

// Dialog form for one letter type. Calls onGenerated(letterLabel, employeeName) after the file downloads.
export default function LetterModal({ type, employees, onClose, onGenerated }) {
  const letter = LETTERS[type]
  const [values, setValues] = useState(() => letter.initial())
  const [employeeId, setEmployeeId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }))

  const pickEmployee = (id) => {
    setEmployeeId(id)
    const emp = employees.find((e) => String(e.id) === id)
    if (emp) setValues((prev) => ({ ...prev, ...letter.fromEmployee(emp) }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await generateLetter(type, values)
      onGenerated(letter.label, values.employee_name)
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not generate the letter."))
    } finally {
      setLoading(false)
    }
  }

  // Fields grouped into form sections, in the order the groups first appear.
  const groups = []
  for (const field of letter.fields) {
    let group = groups.find((g) => g.key === field.group)
    if (!group) {
      group = { key: field.group, fields: [] }
      groups.push(group)
    }
    group.fields.push(field)
  }

  const renderInput = (f) => {
    const value = values[f.key] ?? ""
    if (f.type === "select") {
      return (
        <select value={value} onChange={(e) => set(f.key, e.target.value)} className={inputClass}>
          {f.options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
        </select>
      )
    }
    if (f.type === "textarea") {
      return (
        <textarea
          value={value} onChange={(e) => set(f.key, e.target.value)} required rows={3}
          maxLength={f.maxLength || 1000} placeholder={f.placeholder}
          className={`${inputClass} resize-none`}
        />
      )
    }
    return (
      <input
        type={f.type} value={value} onChange={(e) => set(f.key, e.target.value)} required={!f.optional}
        min={f.min} max={f.max} step={f.step} placeholder={f.placeholder} className={inputClass}
      />
    )
  }

  return (
    <ModalShell onClose={onClose} disableClose={loading} maxWidth="sm:max-w-2xl">
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 px-5 py-5 text-white sm:px-6">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30">
            <Icon path={ICONS.document} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold">{letter.label}</h3>
            <p className="truncate text-xs text-emerald-100">Fill in the details to download the Word file.</p>
          </div>
          <button
            type="button" onClick={onClose} disabled={loading} aria-label="Close"
            className="shrink-0 rounded-full bg-white/15 p-1.5 transition hover:bg-white/25"
          >
            <Icon path={ICONS.close} className="h-5 w-5" />
          </button>
        </div>
      </div>

      <form onSubmit={submit} autoComplete="off" className="flex flex-col">
        <div className="space-y-7 px-5 py-6 sm:px-6">
          <Section icon={ICONS.user} title="Fill from employee">
            <Field label="Select employee" full hint="Pick an employee to prefill the fields below, or choose “New person” and type the details yourself.">
              <select value={employeeId} onChange={(e) => pickEmployee(e.target.value)} className={inputClass}>
                <option value="">New person (not in employee records)</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_id})</option>
                ))}
              </select>
            </Field>
          </Section>

          {groups.map((g) => (
            <Section key={g.key} icon={GROUPS[g.key].icon} title={GROUPS[g.key].title}>
              {g.fields.map((f) => (
                <Field
                  key={f.key} label={f.label} required={!f.optional} full={f.full}
                  hint={f.optional ? "Optional — leave blank to use the standard wording." : undefined}
                >
                  {renderInput(f)}
                </Field>
              ))}
            </Section>
          ))}
        </div>

        <div className="sticky bottom-0 border-t border-gray-100 bg-white/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
          {error && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button" onClick={onClose} disabled={loading}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:flex-none sm:px-6"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:bg-emerald-300 sm:flex-none sm:px-8"
            >
              {loading ? "Generating…" : "Generate Word file"}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}
