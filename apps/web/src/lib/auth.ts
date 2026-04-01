import { type AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import axios from 'axios'

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL
          const response = await axios.post(
            `${apiUrl}/auth/login`,
            {
              email: credentials.email,
              password: credentials.password,
            }
          )

          const data = response.data

          if (data?.accessToken) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
              companyId: data.user.companyId,
              companyName: data.user.companyName ?? '',
              accessToken: data.accessToken,
              employeeId: data.user.employeeId ?? null,
            }
          }

          return null
        } catch (error) {
          console.error('[NextAuth] Login error:', error instanceof Error ? error.message : error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken
        token.id = user.id
        token.role = user.role
        token.companyId = user.companyId ?? null
        token.companyName = user.companyName ?? ''
        token.employeeId = user.employeeId ?? null
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.user = {
        ...session.user,
        id: token.id as string,
        role: (token.role as string) || '',
        companyId: (token.companyId as string | null) ?? null,
        companyName: (token.companyName as string) || '',
        employeeId: (token.employeeId as string) ?? null,
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
}
