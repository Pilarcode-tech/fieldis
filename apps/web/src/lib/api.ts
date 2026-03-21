import axios from 'axios'
import { getSession, signOut } from 'next-auth/react'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(async (config) => {
  const session = await getSession()
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await signOut({ callbackUrl: '/login' })
    }
    if (error.response?.status === 403 && error.response?.data?.code === 'SUBSCRIPTION_INACTIVE') {
      if (typeof window !== 'undefined') {
        window.location.href = '/assinatura-inativa'
      }
    }
    return Promise.reject(error)
  }
)

export default api
