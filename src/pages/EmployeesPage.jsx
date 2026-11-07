import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import { getEmployees, deleteEmployee } from "../services/employeeService"
import { getApiErrorMessage } from "../api/axios"
import EmployeeStatsDashboard from "../components/EmployeeStatsDashboard"
import EmployeeFormModal from "../components/EmployeeFormModal"
import ModalShell from "../components/ModalShell"
import Avatar from "../components/Avatar"
import { SATURDAY_POLICIES } from "../constants/saturdayPolicies"

const SYSTEM_ADMIN_EMAIL = "admin@glrattendance.com"

function formatRole(role) {
  if (!role) return "-"
  return role.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

function formatSaturdayPolicy(policy) {
  const matched = SATURDAY_POLICIES.find(p => p.value === policy)
  return matched ? matched.label : policy || "2nd & 4th Saturday Holiday"
}

const ICONS = {
  plus: "M12 4v16m8-8H4",
  search: "M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z",
  chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z",
  edit: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
  trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  close: "M6 18L18 6M6 6l12 12",
}

function Icon({ path, className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

function Pill({ tone, children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{children}</span>
  )
}

function ExitTag({ date }) {
  if (!date) return null
  const gone = date < new Date().toISOString().slice(0, 10)
  return (
    <span
      className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
        gone ? "bg-gray-200 text-gray-600" : "bg-gray-100 text-gray-700"
      }`}
      title={`Last working day: ${date}`}
    >
      {gone ? "Exited" : "Leaving"} {date}
    </span>
  )
}

function IconButton({ title, onClick, tone, path }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`grid h-9 w-9 place-items-center rounded-lg transition ${tone}`}
    >
      <Icon path={path} className="h-[18px] w-[18px]" />
    </button>
  )
}

function ActionButtons({ emp, onStats, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <IconButton
        title="View working stats"
        onClick={() => onStats(emp.id)}
        tone="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
        path={ICONS.chart}
      />
      <IconButton
        title="Edit employee"
        onClick={() => onEdit(emp)}
        tone="bg-gray-100 text-gray-600 hover:bg-gray-200"
        path={ICONS.edit}
      />
      {emp.email !== SYSTEM_ADMIN_EMAIL ? (
        <IconButton
          title="Delete employee"
          onClick={() => onDelete(emp.id)}
          tone="bg-red-50 text-red-500 hover:bg-red-100"
          path={ICONS.trash}
        />
      ) : (
        <span className="px-2 text-xs font-semibold italic text-gray-400">Protected</span>
      )}
    </div>
  )
}

function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  const [query, setQuery] = useState("")

  const fetchEmployees = () => {
    setLoading(true)
    getEmployees()
      .then((data) => { setEmployees(data); setError("") })
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load employees")))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const handleCreated = (newEmployee) => {
    setEmployees((prev) => [newEmployee, ...prev])
    setShowModal(false)
  }

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm("Are you sure you want to remove this employee? This will also remove their attendance history.")) return

    try {
      await deleteEmployee(id)
      setEmployees((prev) => prev.filter(emp => emp.id !== id))
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to delete employee"))
    }
  }

  const q = query.trim().toLowerCase()
  const visible = q
    ? employees.filter((emp) =>
        [emp.name, emp.employee_id, emp.email, emp.designation, emp.department, emp.reporting_manager]
          .some((value) => (value || "").toLowerCase().includes(q))
      )
    : employees

  const faceEnrolled = employees.filter((emp) => emp.face_enrolled).length
  const remoteAllowed = employees.filter((emp) => emp.allow_remote_checkin).length

  const actions = (emp) => (
    <ActionButtons emp={emp} onStats={setSelectedEmployeeId} onEdit={setEditingEmployee} onDelete={handleDeleteEmployee} />
  )

  return (
    <AdminLayout>
      {showModal && (
        <EmployeeFormModal mode="add" onClose={() => setShowModal(false)} onSaved={handleCreated} />
      )}
      {editingEmployee && (
        <EmployeeFormModal
          mode="edit"
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSaved={(updated) => {
            setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
            setEditingEmployee(null)
          }}
        />
      )}

      <div className="space-y-5">
        {/* Title + add button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-950">Employees</h2>
            <p className="mt-1 text-sm text-gray-500">Manage your team, roles and work settings.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/25 transition hover:bg-emerald-700"
          >
            <Icon path={ICONS.plus} className="h-4 w-4" />
            Add Employee
          </button>
        </div>

        {/* Quick counts */}
        {!loading && !error && employees.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "People", value: employees.length, tone: "text-gray-950" },
              { label: "Face enrolled", value: `${faceEnrolled}/${employees.length}`, tone: "text-emerald-700" },
              { label: "Remote allowed", value: remoteAllowed, tone: "text-emerald-700" },
            ].map((tile) => (
              <div key={tile.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{tile.label}</p>
                <p className={`mt-1 text-xl font-black ${tile.tone}`}>{tile.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
            <Icon path={ICONS.search} className="h-[18px] w-[18px]" />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID, email, designation or department…"
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-10 text-base font-medium text-gray-700 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 transition hover:text-gray-600"
            >
              <Icon path={ICONS.close} className="h-4 w-4" />
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-sm font-semibold text-gray-400">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            Loading employees…
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700">{error}</p>
        )}

        {!loading && !error && (
          <>
            {visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
                <p className="text-sm font-semibold text-gray-600">
                  {employees.length === 0 ? "No employees yet." : "No employees match your search."}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {employees.length === 0 ? "Add your first employee to get started." : "Try a different name, ID or email."}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop / tablet table */}
                <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        <th className="px-5 py-3.5">Employee</th>
                        <th className="px-5 py-3.5">Role &amp; Job</th>
                        <th className="px-5 py-3.5">Saturday Policy</th>
                        <th className="px-5 py-3.5 text-center">Remote</th>
                        <th className="px-5 py-3.5 text-center">Face</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {visible.map((emp) => (
                        <tr key={emp.id} className="transition hover:bg-emerald-50/30">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={emp.name} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-gray-950">
                                  {emp.name}
                                  <ExitTag date={emp.date_of_exit} />
                                </p>
                                <p className="truncate text-xs text-gray-500">
                                  <span className="font-semibold text-gray-600">{emp.employee_id}</span> · {emp.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <Pill tone={emp.role === "employee" ? "bg-gray-100 text-gray-700" : "bg-emerald-100 text-emerald-700"}>
                              {formatRole(emp.role)}
                            </Pill>
                            {(emp.designation || emp.department) && (
                              <p className="mt-1.5 max-w-[14rem] truncate text-xs text-gray-500">
                                {[emp.designation, emp.department].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600">{formatSaturdayPolicy(emp.saturday_policy)}</td>
                          <td className="px-5 py-4 text-center">
                            <Pill tone={emp.allow_remote_checkin ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}>
                              {emp.allow_remote_checkin ? "Allowed" : "Off"}
                            </Pill>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <Pill tone={emp.face_enrolled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-800"}>
                              {emp.face_enrolled ? "Enrolled" : "Pending"}
                            </Pill>
                          </td>
                          <td className="px-5 py-4">{actions(emp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-3 text-xs font-medium text-gray-500">
                    Showing {visible.length} of {employees.length} {employees.length === 1 ? "person" : "people"}
                  </div>
                </div>

                {/* Phone cards */}
                <div className="space-y-3 md:hidden">
                  {visible.map((emp) => (
                    <div key={emp.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <Avatar name={emp.name} size="h-11 w-11" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-950">
                            {emp.name}
                            <ExitTag date={emp.date_of_exit} />
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            <span className="font-semibold text-gray-600">{emp.employee_id}</span> · {emp.email}
                          </p>
                          {(emp.designation || emp.department) && (
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {[emp.designation, emp.department].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <Pill tone={emp.role === "employee" ? "bg-gray-100 text-gray-700" : "bg-emerald-100 text-emerald-700"}>
                          {formatRole(emp.role)}
                        </Pill>
                        <Pill tone={emp.face_enrolled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-800"}>
                          Face {emp.face_enrolled ? "enrolled" : "pending"}
                        </Pill>
                        {emp.allow_remote_checkin && <Pill tone="bg-emerald-100 text-emerald-700">Remote allowed</Pill>}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">{formatSaturdayPolicy(emp.saturday_policy)}</p>

                      <div className="mt-3 border-t border-gray-100 pt-3">{actions(emp)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Stats Modal */}
      {selectedEmployeeId && (
        <ModalShell onClose={() => setSelectedEmployeeId(null)} maxWidth="sm:max-w-4xl">
          <div className="p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-xl font-black text-gray-950">
                <span>📈</span> Employee Working Stats Dashboard
              </h3>
              <button
                onClick={() => setSelectedEmployeeId(null)}
                aria-label="Close"
                className="shrink-0 rounded-full bg-gray-100 p-2 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
              >
                <Icon path={ICONS.close} className="h-5 w-5" />
              </button>
            </div>
            <EmployeeStatsDashboard user_id={selectedEmployeeId} />
          </div>
        </ModalShell>
      )}
    </AdminLayout>
  )
}

export default EmployeesPage
