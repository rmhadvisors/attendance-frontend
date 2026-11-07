import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api, { getApiErrorMessage } from "../api/axios"

const ICONS = {
  mail: "M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z",
  lock: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4",
}

function Icon({ name, className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={ICONS[name]} />
    </svg>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState("")
  const [resetError, setResetError] = useState("")

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data } = await api.post("/auth/login", { email, password })

      // JWT is stored in httpOnly cookie by the server
      // We only store display values in localStorage
      login(data)

      // Redirect based on role
      if (data.role === "employee") {
        navigate(data.face_enrolled ? "/home" : "/enroll")
      } else {
        navigate("/dashboard")
      }
    } catch (err) {
      console.error(err)
      setError(getApiErrorMessage(err, "Login failed"))
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (event) => {
    event.preventDefault()
    setResetLoading(true)
    setResetError("")
    setResetMessage("")

    try {
      const { data } = await api.post("/auth/forgot-password", { email: resetEmail })
      setResetMessage(data.message || "Reset link sent successfully! Check your email.")
      setResetEmail("")
    } catch (err) {
      console.error(err)
      setResetError(getApiErrorMessage(err, "Failed to send reset link"))
    } finally {
      setResetLoading(false)
    }
  }

  const inputCls = "w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Form panel */}
      <div className="flex w-full flex-col">
        {/* Brand header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-800 px-6 pb-20 pt-12 text-white">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 left-6 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative mx-auto flex max-w-md items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 text-sm font-extrabold ring-1 ring-white/30">RMH</div>
            <div>
              <p className="text-lg font-bold leading-tight">RMH Attendance</p>
              <p className="text-xs text-emerald-100">Check in. Track. Done.</p>
            </div>
          </div>
        </div>

        <div className="relative -mt-12 flex flex-1 items-start justify-center px-4 pb-10">
          <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-7 shadow-xl shadow-gray-900/5 sm:p-9">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-950">Welcome back</h1>
              <p className="mt-2 text-sm text-gray-500">Sign in to access your RMH Attendance workspace.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Email</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                    <Icon name="mail" className="h-5 w-5" />
                  </span>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${inputCls} pl-12 pr-4`}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                    <Icon name="lock" className="h-5 w-5" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputCls} pl-12 pr-12`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400">
              No account? Ask your administrator to create one for you.
            </p>
          </div>
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/60 px-4 backdrop-blur-sm sm:items-center" onClick={() => setShowResetModal(false)}>
          <div
            className="mb-4 w-full max-w-md space-y-5 rounded-3xl border border-gray-100 bg-white p-7 shadow-2xl sm:mb-0 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <Icon name="lock" className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-950">Forgot password</h3>
                <p className="text-xs text-gray-500">We'll email you a reset link</p>
              </div>
            </div>

            {resetMessage ? (
              <div className="space-y-4">
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {resetMessage}
                </p>
                <button
                  onClick={() => {
                    setShowResetModal(false)
                    setResetMessage("")
                  }}
                  className="w-full rounded-xl bg-gray-950 py-3.5 text-sm font-bold text-white hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm leading-relaxed text-gray-600">
                  Enter your email address and we'll send you a secure link to reset your password.
                </p>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                      <Icon name="mail" className="h-5 w-5" />
                    </span>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className={`${inputCls} pl-12 pr-4`}
                      required
                    />
                  </div>
                </div>

                {resetError && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {resetError}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(false)
                      setResetError("")
                      setResetEmail("")
                    }}
                    className="flex-1 rounded-xl bg-gray-100 py-3.5 text-sm font-bold text-gray-600 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-violet-700 disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none"
                  >
                    {resetLoading ? "Sending..." : "Send Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginPage
