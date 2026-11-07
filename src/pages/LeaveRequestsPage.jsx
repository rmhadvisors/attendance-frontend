import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import api, { getApiErrorMessage } from "../api/axios"
import PaidLeaveModal from "../components/PaidLeaveModal"
import Avatar from "../components/Avatar"
import { getPaidLeaves, removePaidLeave } from "../services/attendanceService"

function formatLeaveDate(value) {
  if (!value) return "-"
  return new Date(`${value}T00:00:00`).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })
}

const STATUS_TONE = {
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  pending: "bg-gray-100 text-gray-700",
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${STATUS_TONE[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  )
}

function DateRange({ req }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-gray-800">
      <span>{formatLeaveDate(req.start_date)}</span>
      {req.start_date !== req.end_date && (
        <>
          <span className="text-gray-300">→</span>
          <span>{formatLeaveDate(req.end_date)}</span>
        </>
      )}
      {req.leave_type === "first_half" && (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">First half</span>
      )}
      {req.leave_type === "second_half" && (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Second half</span>
      )}
    </div>
  )
}

function RequestActions({ req, onAction }) {
  if (req.status !== "pending") {
    return <span className="text-xs font-semibold text-gray-400">Processed</span>
  }
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onAction(req.id, "approve")}
        className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
      >
        Approve
      </button>
      <button
        onClick={() => onAction(req.id, "reject")}
        className="rounded-lg bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
      >
        Reject
      </button>
    </div>
  )
}

function EmptyState({ title, hint }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
      <p className="text-sm font-semibold text-gray-600">{title}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function LeaveRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showPaidLeave, setShowPaidLeave] = useState(false)
  const [paidLeaveNotice, setPaidLeaveNotice] = useState("")
  const [paidLeaves, setPaidLeaves] = useState([])
  const [paidLeavesError, setPaidLeavesError] = useState("")

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const { data } = await api.get("/leave/all")
      setRequests(data)
      setError("")
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load requests"))
    } finally {
      setLoading(false)
    }
  }

  const fetchPaidLeaves = async () => {
    try {
      setPaidLeaves(await getPaidLeaves())
      setPaidLeavesError("")
    } catch (err) {
      setPaidLeavesError(getApiErrorMessage(err, "Failed to load paid leaves"))
    }
  }

  useEffect(() => {
    fetchRequests()
    fetchPaidLeaves()
  }, [])

  const handleRemovePaidLeave = async (leave) => {
    if (!window.confirm(`Remove paid leave for ${leave.employee_name} on ${formatLeaveDate(leave.date)}? That day will count as absent again if it was a working day.`)) return
    try {
      await removePaidLeave(leave.id)
      setPaidLeaves((prev) => prev.filter((l) => l.id !== leave.id))
      setPaidLeaveNotice("Paid leave removed")
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to remove paid leave"))
    }
  }

  const handleAction = async (id, action) => {
    const notes = window.prompt(`Add note for ${action}ing this request (optional):`)
    if (notes === null) return // cancelled

    try {
      const { data } = await api.post(`/leave/${id}/action`, { action, notes })
      setRequests(prev => prev.map(r => r.id === id ? data : r))
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to perform action"))
    }
  }

  const pending = requests.filter((r) => r.status === "pending").length
  const approved = requests.filter((r) => r.status === "approved").length
  const rejected = requests.filter((r) => r.status === "rejected").length

  const noteText = (leave) =>
    (leave.note || "").replace("Paid leave granted by admin", "").replace(/^: /, "") || "-"

  return (
    <AdminLayout>
      {showPaidLeave && (
        <PaidLeaveModal
          onClose={() => setShowPaidLeave(false)}
          onGranted={(res) => { setPaidLeaveNotice(res.message); fetchPaidLeaves() }}
        />
      )}

      <div className="space-y-6">
        {/* Title + give paid leave */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-950">Leave Requests</h2>
            <p className="mt-1 text-sm text-gray-500">Review employee requests and give paid leave directly.</p>
          </div>
          <button
            onClick={() => { setPaidLeaveNotice(""); setShowPaidLeave(true) }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/25 transition hover:bg-emerald-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Give Paid Leave
          </button>
        </div>

        {paidLeaveNotice && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {paidLeaveNotice}.
          </p>
        )}

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

        {/* Counts */}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Pending", value: pending },
              { label: "Approved", value: approved },
              { label: "Rejected", value: rejected },
              { label: "Paid leaves given", value: paidLeaves.length },
            ].map((tile) => (
              <div key={tile.label} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{tile.label}</p>
                <p className="mt-1 text-2xl font-black text-gray-950">{tile.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Employee requests */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Employee requests</h3>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm font-semibold text-gray-400">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
              Loading requests…
            </div>
          ) : requests.length === 0 ? (
            <EmptyState title="No leave requests yet." hint="Requests from employees will show up here." />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      <th className="px-5 py-3.5">Employee</th>
                      <th className="px-5 py-3.5">Dates</th>
                      <th className="px-5 py-3.5">Reason</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {requests.map((req) => (
                      <tr key={req.id} className="transition hover:bg-emerald-50/30">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={req.employee_name} size="h-9 w-9" text="text-xs" />
                            <span className="font-bold text-gray-950">{req.employee_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4"><DateRange req={req} /></td>
                        <td className="max-w-xs truncate px-5 py-4 text-gray-600" title={req.reason}>{req.reason || "-"}</td>
                        <td className="px-5 py-4"><StatusPill status={req.status} /></td>
                        <td className="px-5 py-4"><RequestActions req={req} onAction={handleAction} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {requests.map((req) => (
                  <div key={req.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={req.employee_name} size="h-10 w-10" />
                        <p className="truncate text-sm font-bold text-gray-950">{req.employee_name}</p>
                      </div>
                      <StatusPill status={req.status} />
                    </div>
                    <div className="mt-3"><DateRange req={req} /></div>
                    {req.reason && <p className="mt-2 text-sm text-gray-600">{req.reason}</p>}
                    <div className="mt-3 border-t border-gray-100 pt-3"><RequestActions req={req} onAction={handleAction} /></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Paid leaves given */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Paid leaves given</h3>
            <p className="mt-1 text-sm text-gray-500">Leaves you granted directly. Remove one if it was given by mistake.</p>
          </div>

          {paidLeavesError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{paidLeavesError}</p>}

          {paidLeaves.length === 0 ? (
            <EmptyState title="No paid leaves given." hint="Use Give Paid Leave to add one." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <ul className="divide-y divide-gray-100">
                {paidLeaves.map((leave) => (
                  <li key={leave.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition hover:bg-emerald-50/30 sm:px-5">
                    <div className="flex min-w-0 flex-1 items-center gap-3 sm:min-w-[12rem]">
                      <Avatar name={leave.employee_name} size="h-9 w-9" text="text-xs" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-950">{leave.employee_name}</p>
                        <p className="text-xs text-gray-500">{leave.employee_id}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {formatLeaveDate(leave.date)}
                    </span>
                    <p className="order-last w-full truncate text-xs text-gray-500 sm:order-none sm:w-auto sm:max-w-[16rem] sm:flex-1 sm:text-sm" title={leave.note || ""}>
                      {noteText(leave)}
                    </p>
                    <button
                      onClick={() => handleRemovePaidLeave(leave)}
                      className="rounded-lg bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  )
}

export default LeaveRequestsPage
