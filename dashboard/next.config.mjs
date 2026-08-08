/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the backend to be reached from Vercel serverless functions
  async rewrites() {
    return [];
  },
};

export default nextConfig;
