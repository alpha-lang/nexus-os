/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL || 'http://localhost:3001';

const nextConfig = {
  allowedDevOrigins: [
    '3000-firebase-academix-1781506716100.cluster-ikslh4rdsnbqsvu5nw3v4dqjj2.cloudworkstations.dev',
    '3001-firebase-academix-1781506716100.cluster-ikslh4rdsnbqsvu5nw3v4dqjj2.cloudworkstations.dev',
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
