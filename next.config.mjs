/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  output: 'standalone',
  // Rute lama (UI authoring & /admin) digantikan panel; arahkan agar tautan lama tetap bekerja.
  async redirects() {
    return [
      { source: '/login', destination: '/#login', permanent: false },
      { source: '/jurnal-saya', destination: '/panel?tab=jurnal', permanent: false },
      { source: '/approval', destination: '/panel?tab=approval', permanent: false },
      { source: '/approval/:id', destination: '/panel?tab=approval', permanent: false },
      { source: '/pengajuan', destination: '/panel?tab=tambah', permanent: false },
      { source: '/lawet', destination: '/panel', permanent: false },
      { source: '/admin', destination: '/panel', permanent: false },
    ]
  },
  async headers() {
    return [
      {
        source: '/assets/:path*.webp',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Nama file unggahan memakai UUID, sehingga aman di-cache sangat lama.
        source: '/uploads/hero/:path*.webp',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
};

export default nextConfig;
