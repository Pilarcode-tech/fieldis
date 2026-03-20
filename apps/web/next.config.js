/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fieldis/shared'],
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: (process.env.API_URL || 'http://localhost:3001/api/v1') + '/:path*',
      },
    ]
  },
}

module.exports = nextConfig
