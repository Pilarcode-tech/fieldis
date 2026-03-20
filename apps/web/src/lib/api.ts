import axios from 'axios'
import { getSession, signOut } from 'next-auth/react'

// Browser: use proxy via Vercel rewrites (avoids mixed content HTTPS→HTTP)
// Server (SSR): call API directly
const baseURL = typeof window !== 'undefined'
  ? '/api/proxy'
  : (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1')

const api = axios.create({
  baseURL,
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
    return Promise.reject(error)
  }
)

export default api
