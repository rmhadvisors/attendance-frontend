import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Avatar from "../components/Avatar"

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  },
  {
    label: "Employees",
    path: "/employees",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    label: "Attendance",
    path: "/attendance",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  },
  {
    label: "Locations",
    path: "/office-locations",
    icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    label: "Leave Requests",
    path: "/leave-requests",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    label: "Reports",
    path: "/reports",
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    label: "Payroll",
    path: "/payroll",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
]

function NavIcon({ path, className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

function SidebarContent({ name, role, pathname, onNavigate, onLogout, loggingOut }) {
  return (
    <div className="flex h-full flex-col px-4 py-5">
      {/* Brand */}
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-extrabold text-white shadow-md shadow-emerald-600/25">
          RMH
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold leading-tight text-gray-950">RMH Attendance</h2>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                isActive
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
              }`}
            >
              {isActive && <span className="absolute -left-4 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-emerald-600" />}
              <span className={`grid h-8 w-8 place-items-center rounded-lg transition ${isActive ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30" : "bg-gray-100 text-gray-500 group-hover:bg-emerald-100 group-hover:text-emerald-700"}`}>
                <NavIcon path={item.icon} className="h-[18px] w-[18px]" />
              </span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div className="mt-6 space-y-3 border-t border-gray-200 pt-5">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50/70 p-3 ring-1 ring-emerald-100">
          <Avatar name={name} size="h-10 w-10" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-950">{name}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">{role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-600 hover:text-white hover:shadow-md hover:shadow-emerald-600/20 hover:ring-emerald-600 active:scale-[0.98] disabled:opacity-60"
        >
          <svg className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {loggingOut ? "Logging out…" : "Logout"}
        </button>
      </div>
    </div>
  )
}

function AdminLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const currentPage = navItems.find((item) => item.path === location.pathname)
  const name = user?.name || localStorage.getItem("name") || "Admin User"
  const role = user?.role || localStorage.getItem("role") || "admin"

  const todayLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date())

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined
    const onKey = (event) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isMobileMenuOpen])

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    navigate("/")
  }

  const handleNavigate = (path) => {
    navigate(path)
    setIsMobileMenuOpen(false)
  }

  const sidebar = (
    <SidebarContent
      name={name}
      role={role}
      pathname={location.pathname}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      loggingOut={loggingOut}
    />
  )

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-gray-900 lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:sticky lg:top-0 lg:block lg:h-screen">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-gray-200 bg-white shadow-2xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        {/* Top bar (sticky): menu button on phones, page title, date + user */}
        <header className="sticky top-0 z-10 border-b border-gray-200/80 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8 lg:py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:bg-gray-50 lg:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <p className="hidden text-[11px] font-semibold uppercase tracking-widest text-emerald-700 sm:block">
                Admin Panel
              </p>
              <h1 className="truncate text-xl font-bold leading-tight text-gray-950 sm:mt-0.5 sm:text-2xl">
                {currentPage?.label || "Dashboard"}
              </h1>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 shadow-sm md:flex">
              <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {todayLabel}
            </div>

            <div className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-white py-1.5 pl-1.5 pr-3.5 shadow-sm">
              <Avatar name={name} size="h-8 w-8" text="text-xs" />
              <div className="hidden leading-tight sm:block">
                <p className="max-w-[10rem] truncate text-sm font-semibold text-gray-900">{name}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{role}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
