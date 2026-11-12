import api from "../api/axios"

export const getAllAttendance = async (date_filter = null) => {
  const url = date_filter ? `/attendance/all?date_filter=${date_filter}` : "/attendance/all"
  const response = await api.get(url)
  return response.data
}

export const getTodayAttendance = async () => {
  const response = await api.get("/attendance/today")
  return response.data
}

export const getMyHistory = async () => {
  const response = await api.get("/attendance/history")
  return response.data
}

export const checkin = async (latitude, longitude, note = null, photo = null, mood = null, mood_note = null) => {
  const response = await api.post("/attendance/checkin", { latitude, longitude, note, photo, mood, mood_note })
  return response.data
}

export const checkout = async (latitude, longitude, note = null, photo = null, mood = null, mood_note = null) => {
  const response = await api.post("/attendance/checkout", { latitude, longitude, note, photo, mood, mood_note })
  return response.data
}

export const overrideAttendance = async (id, data) => {
  const response = await api.put(`/attendance/${id}/override`, data)
  return response.data
}

export const givePaidLeave = async (data) => {
  const response = await api.post("/attendance/paid-leave", data)
  return response.data
}

export const getPaidLeaves = async () => {
  const response = await api.get("/attendance/paid-leaves")
  return response.data
}

export const removePaidLeave = async (id) => {
  const response = await api.delete(`/attendance/paid-leave/${id}`)
  return response.data
}

export const getRegularizationQuota = async () => {
  const response = await api.get("/attendance/regularization-quota")
  return response.data
}

export const regularizeAttendance = async (data) => {
  const response = await api.post("/attendance/regularize", data)
  return response.data
}

export const getMyRegularizations = async () => {
  const response = await api.get("/attendance/my-regularizations")
  return response.data
}

export const getRegularizationRequests = async (status = "pending") => {
  const response = await api.get(`/attendance/regularization-requests?status=${status}`)
  return response.data
}

export const actionRegularization = async (id, data) => {
  const response = await api.post(`/attendance/regularization-requests/${id}/action`, data)
  return response.data
}
