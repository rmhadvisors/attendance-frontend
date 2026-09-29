import { createContext, useContext, useEffect, useState } from "react"
import api from "../api/axios"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const verifyAuthWithRetry = async (retriesLeft = 3, delayMs = 1500) => {
      try {
        const res = await api.get("/auth/me")

        if (!isMounted) return

        if (res.data && typeof res.data === "object" && res.data.role) {
          setUser(res.data)
          localStorage.setItem("name", res.data.name || "")
          localStorage.setItem("role", res.data.role || "")
          localStorage.setItem("employee_id", res.data.employee_id || "")
        } else {
          throw new Error("Invalid auth response")
        }
      } catch (err) {
        if (!isMounted) return

        // 1. If explicitly 401 Unauthorized, the session/token is truly expired -> wipe and logout
        if (err.response && err.response.status === 401) {
          setUser(null)
          localStorage.removeItem("name")
          localStorage.removeItem("role")
          localStorage.removeItem("employee_id")
          return
        }

        // 2. If it's a server cold-start, timeout, or temporary network blip -> retry
        if (retriesLeft > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          return verifyAuthWithRetry(retriesLeft - 1, delayMs * 1.5)
        }

        // 3. Exhausted all retries without a 401 (e.g. completely offline or severe outage)
        // Only clear if no existing role was cached
        const cachedRole = localStorage.getItem("role")
        if (!cachedRole) {
          setUser(null)
        }
      }
    }

    verifyAuthWithRetry().finally(() => {
      if (isMounted) setLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem("name", userData.name)
    localStorage.setItem("role", userData.role)
    localStorage.setItem("employee_id", userData.employee_id)
  }

  const logout = async () => {
    try {
      await api.post("/auth/logout")
    } catch (_) {
      // ignore
    }
    setUser(null)
    localStorage.removeItem("name")
    localStorage.removeItem("role")
    localStorage.removeItem("employee_id")
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
