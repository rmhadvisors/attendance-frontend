import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { requestAndSubscribePush } from "../utils/pushNotification.js"
import { useEffect, useState } from "react"
import ProfilePanel from "../components/ProfilePanel"

const navItems = [
  {
    label: "Home",
    path: "/home",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
      </svg>
    )
  },
  {
    label: "Attendance",
    path: "/my-attendance",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    label: "Leave",
    path: "/leave",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
]

function EmployeeLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [showProfile, setShowProfile] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const name = user?.name || localStorage.getItem("name") || "Employee"
  const employeeId = user?.employee_id || localStorage.getItem("employee_id") || ""

  useEffect(() => {
    requestAndSubscribePush()
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    navigate("/")
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7f9]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            aria-haspopup="dialog"
            aria-label="Open my profile"
            className="flex min-w-0 items-center gap-3 rounded-xl text-left transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white shadow-sm">
              RMH
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-sm font-bold leading-tight text-gray-900">
                <span className="truncate">{name}</span>
                <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                {employeeId && (
                  <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                    ID: {employeeId}
                  </span>
                )}
                <span>Employee Portal</span>
              </p>
            </div>
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Logout"
            className="group flex shrink-0 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-600 hover:text-white hover:shadow-md hover:shadow-emerald-600/20 hover:ring-emerald-600 active:scale-[0.97] disabled:opacity-60"
          >
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>{loggingOut ? "Logging out…" : "Logout"}</span>
          </button>
        </div>
      </header>

      {showProfile && <ProfilePanel user={user} onClose={() => setShowProfile(false)} />}

      {/* Content */}
      <main className="flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-20 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-8px_rgb(16_24_40/0.12)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${isActive ? "text-emerald-700" : "text-gray-400 hover:text-gray-600"
                  }`}
              >
                <span className={`grid h-8 w-14 place-items-center rounded-full transition ${isActive ? "bg-emerald-100 text-emerald-700" : ""}`}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default EmployeeLayout
