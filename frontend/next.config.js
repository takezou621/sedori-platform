/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone mode for Docker production builds
  output: 'standalone',
  
  // Optimize for production
  swcMinify: true,
  
  // Image optimization
  images: {
    domains: ['cdn.jsdelivr.net', 'via.placeholder.com'],
    // For production, you may want to use a custom loader
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Environment variables
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;