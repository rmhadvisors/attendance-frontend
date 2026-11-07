// Small building blocks shared by the admin forms (Add/Edit Employee, Paid Leave)

export function Icon({ path, className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

export function Section({ icon, title, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
          <Icon path={icon} className="h-4 w-4" />
        </span>
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</h4>
        <span className="h-px flex-1 bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

export function Field({ label, required, hint, full = false, children }) {
  return (
    <div className={`min-w-0 ${full ? "sm:col-span-2" : ""}`}>
      <label className="mb-1.5 block text-xs font-semibold text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
