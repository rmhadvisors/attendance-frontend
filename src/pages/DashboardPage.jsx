import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getAdminStats } from "../services/dashboardService"
import AdminLayout from "../layouts/AdminLayout"
import { useAuth } from "../context/AuthContext"
import { getApiErrorMessage } from "../api/axios"

const ICONS = {
  users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  present: "M5 13l4 4L19 7",
  absent: "M6 18L18 6M6 6l12 12",
  full: "M13 10V3L4 14h7v7l9-11h-7z",
  half: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  arrow: "M9 5l7 7-7 7",
}

function Icon({ path, className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(new Date())
  )
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

/** Circular progress ring for the attendance rate. */
function RateRing({ percent }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100)
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={radius} fill="none" stroke="white" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-black leading-none text-white">{Math.round(percent)}%</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-emerald-100">Present</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, hint, icon, tone }) {
  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-gray-950">{value}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}>
          <Icon path={icon} />
        </span>
      </div>
      {hint && <p className="mt-3 text-xs font-medium text-gray-500">{hint}</p>}
    </div>
  )
}

function StatSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="h-3 w-24 rounded bg-gray-200" />
      <div className="mt-4 h-8 w-16 rounded bg-gray-200" />
      <div className="mt-4 h-3 w-32 rounded bg-gray-100" />
    </div>
  )
}

const QUICK_LINKS = [
  { label: "Add an employee", hint: "Create a new account", path: "/employees", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
  { label: "Today's attendance", hint: "See who checked in", path: "/attendance", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { label: "Leave requests", hint: "Approve or give paid leave", path: "/leave-requests", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { label: "Payroll", hint: "Salaries and adjustments", path: "/payroll", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
]

function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const name = user?.name || localStorage.getItem("name") || "Admin"
  const role = user?.role || localStorage.getItem("role") || "admin"

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let ignore = false

    getAdminStats()
      .then((data) => {
        if (!ignore) {
          setStats(data)
          setError("")
        }
      })
      .catch((loadError) => {
        console.error(loadError)

        if (!ignore) {
          setError(getApiErrorMessage(loadError, "Failed to load dashboard stats"))
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  const total = Number(stats?.total_employees || 0)
  const present = Number(stats?.today_present || 0)
  const ratePercent = total > 0 ? (present / total) * 100 : 0
  const firstName = String(name).split(" ")[0]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 p-6 text-white shadow-lg shadow-emerald-900/10 sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-emerald-300/10" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-100">{greeting()},</p>
              <h2 className="mt-1 truncate text-3xl font-black tracking-tight sm:text-4xl">{firstName}</h2>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold capitalize ring-1 ring-white/25">{role}</span>
                {stats && !error && (
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/25">
                    Today · {stats.date}
                  </span>
                )}
              </div>
              {stats && !error && total > 0 && (
                <p className="mt-4 max-w-md text-sm text-emerald-50">
                  <span className="font-bold text-white">{present}</span> of <span className="font-bold text-white">{total}</span> employees have checked in today.
                </p>
              )}
            </div>

            {stats && !error && <RateRing percent={ratePercent} />}
          </div>
        </section>

        {stats && stats.pending_regularizations > 0 && (
          <button
            onClick={() => navigate("/regularize")}
            className="flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left shadow-sm transition hover:bg-emerald-100/70"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
              <Icon path="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.4a2 2 0 112.8 2.8L11.8 15H9v-2.8l8.6-8.6z" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-emerald-900">
                {stats.pending_regularizations} regularization request{stats.pending_regularizations > 1 ? "s" : ""} waiting for your approval
              </span>
              <span className="block text-xs text-emerald-800/80">Review and approve or decline them.</span>
            </span>
            <Icon path={ICONS.arrow} className="h-4 w-4 shrink-0 text-emerald-700" />
          </button>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {/* Today's summary */}
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">Today&apos;s Summary</h2>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)}
            </div>
          ) : stats && !error ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Total Employees" value={stats.total_employees} icon={ICONS.users} tone="bg-emerald-50 text-emerald-600" hint="In the system" />
              <StatCard label="Present Today" value={stats.today_present} icon={ICONS.present} tone="bg-emerald-50 text-emerald-600" hint={total ? `${Math.round(ratePercent)}% of the team` : undefined} />
              <StatCard label="Absent Today" value={stats.today_absent} icon={ICONS.absent} tone="bg-emerald-50 text-emerald-600" hint={total ? `${Math.round(100 - ratePercent)}% of the team` : undefined} />
              <StatCard label="Full Day" value={stats.full_day_count} icon={ICONS.full} tone="bg-emerald-50 text-emerald-600" hint="Completed a full shift" />
              <StatCard label="Half Day" value={stats.half_day_count} icon={ICONS.half} tone="bg-emerald-50 text-emerald-600" hint="Worked 5 to 8.5 hours" />
            </div>
          ) : null}
        </section>

        {/* Quick links */}
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK_LINKS.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
                  <Icon path={link.icon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-gray-900">{link.label}</span>
                  <span className="block truncate text-xs text-gray-500">{link.hint}</span>
                </span>
                <Icon path={ICONS.arrow} className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}

export default DashboardPage
