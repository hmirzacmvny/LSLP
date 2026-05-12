import axios from 'axios'
import { auth } from './firebase'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    try {
      const token = await user.getIdToken()
      config.headers['Authorization'] = `Bearer ${token}`
    } catch {
      await auth.signOut()
    }
  }
  return config
})

// PROPERTIES
export const getProperties = (params) =>
  api.get('/api/properties/', { params })

export const getProperty = (accountNumber) =>
  api.get(`/api/properties/${accountNumber}`)

export const updateProperty = (accountNumber, data) =>
  api.patch(`/api/properties/${accountNumber}`, data)

// VISITS
export const getVisits = (params) =>
  api.get('/api/visits/', { params })

export const getVisit = (id) =>
  api.get(`/api/visits/${id}`)

export const createVisit = (formData) =>
  api.post('/api/visits/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// OUTREACH
export const getOutreach = (params) =>
  api.get('/api/outreach/', { params })

export const createOutreach = (data) =>
  api.post('/api/outreach/', data)

export default api