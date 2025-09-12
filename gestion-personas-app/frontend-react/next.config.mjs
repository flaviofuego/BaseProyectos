/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Habilitar standalone para Docker
  output: 'standalone',
  // Configuración de puertos y hosts
  experimental: {
    serverComponentsExternalPackages: []
  }
}

export default nextConfig
