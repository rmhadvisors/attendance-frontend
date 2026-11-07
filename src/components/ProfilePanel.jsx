import { useEffect } from "react"
import { createPortal } from "react-dom"

function to12h(value) {
  if (!value) return ""
  const [h, m] = String(value).split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return value
  const suffix = h >= 12 ? "PM" : "AM"
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`
}

const icons = {
  mail: "M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  badge: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  building: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m6-14h2m-2 4h2m4-4h2m-2 4h2m-6 10v-4h2v4",
  users: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
}

/**
 * Profile card opened from the name in the header. A small card (not a full page)
 * listing the employee's details.
 */
export default function ProfilePanel({ user, onClose }) {
  const shift = user?.shift_start && user?.shift_end ? `${to12h(user.shift_start)} – ${to12h(user.shift_end)}` : ""

  const rows = [
    { key: "email", label: "Email", value: user?.email, icon: icons.mail },
    { key: "designation", label: "Designation", value: user?.designation, icon: icons.badge },
    { key: "department", label: "Department", value: user?.department, icon: icons.building },
    { key: "manager", label: "Reporting Manager", value: user?.reporting_manager, icon: icons.users },
    { key: "shift", label: "Shift Timing", value: shift, icon: icons.clock },
  ]

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const initials = (user?.name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="My profile"
        className="absolute left-3 right-3 top-[68px] max-h-[calc(100dvh-84px)] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:left-6 sm:right-auto sm:w-[22rem]"
      >
        {/* Header */}
        <div className="flex items-center gap-3 bg-gradient-to-br from-emerald-600 to-teal-600 px-4 py-4 text-white">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-bold ring-1 ring-white/30">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user?.name}</p>
            <p className="truncate text-xs text-emerald-50">ID: {user?.employee_id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full bg-white/15 p-1.5 transition hover:bg-white/25"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Details list */}
        <ul className="divide-y divide-gray-100 px-4 py-1">
          {rows.map((row) => (
            <li key={row.key} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={row.icon} />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{row.label}</p>
                <p className={`mt-0.5 break-words text-sm font-semibold ${row.value ? "text-gray-900" : "text-gray-400"}`}>
                  {row.value || "Not set"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  )
}
