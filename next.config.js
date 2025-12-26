/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['cheerio', 'undici', 'playwright'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('cheerio', 'undici');
    }
    return config;
  },
}

module.exports = nextConfig
