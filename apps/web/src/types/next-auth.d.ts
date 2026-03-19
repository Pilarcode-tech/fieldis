import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
    role: string
    companyId: string
    companyName: string
    accessToken: string
    employeeId?: string | null
  }

  interface Session {
    accessToken: string
    user: {
      id: string
      email: string
      name: string
      role: string
      companyId: string
      companyName: string
      employeeId?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken: string
    id: string
    role: string
    companyId: string
    companyName: string
    employeeId?: string | null
  }
}
