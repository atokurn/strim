/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '**.dramadash.com',
      },
      {
        protocol: 'https',
        hostname: '**.dramabox.com',
      },
      {
        protocol: 'https',
        hostname: '**.shortmax.com',
      },
      {
        protocol: 'https',
        hostname: '**.reelshort.com',
      },
      {
        protocol: 'https',
        hostname: 'img.**.com',
      },
      {
        protocol: 'https',
        hostname: 'images.**.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
