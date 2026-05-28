/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pdf-parse must not be bundled by webpack — it reads files from its own
    // directory at import time and breaks when bundled. Next.js 14 uses this
    // option (renamed to serverExternalPackages in Next.js 15+).
    serverComponentsExternalPackages: ['pdf-parse'],
  },
  webpack(config, { isServer }) {
    if (isServer) {
      // Ensure the flight-action-entry-loader also skips pdf-parse entirely,
      // delegating resolution to Node.js at runtime.
      const existing = Array.isArray(config.externals) ? config.externals : []
      config.externals = [
        ...existing,
        ({ request }, callback) => {
          if (request && request.startsWith('pdf-parse')) {
            return callback(null, `commonjs ${request}`)
          }
          callback()
        },
      ]
    }
    return config
  },
}

export default nextConfig
