// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    webpackBuildWorker: false,
    parallelServerCompiles: false
  }
}

module.exports = nextConfig