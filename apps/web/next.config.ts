import path from 'node:path'

import type { NextConfig } from 'next'

/* basePath ต้องตรงกัน 3 จุด — ที่นี่, SessionProvider ใน src/components/ClientProviders.tsx
   และ BASEPATH/NEXT_PUBLIC_BASEPATH ใน .env (ไฟล์รูปภาพทุกใบอ้างผ่าน NEXT_PUBLIC_BASEPATH) */
const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/beps',
  trailingSlash: true,

  transpilePackages: ['@beps/calc-engine', '@beps/shared-types'],

  /* ปักรากของ Turbopack ไว้ที่รากของ monorepo (ที่อยู่ของ pnpm-lock.yaml)
     ไม่งั้นมันไล่หา lockfile ขึ้นไปเรื่อยๆ จนไปเจอ package-lock.json ที่ home
     ของผู้ใช้แล้วเลือกรากผิด */
  turbopack: {
    root: path.join(__dirname, '..', '..')
  },

  redirects: async () => [
    {
      source: '/',
      destination: '/overview',
      permanent: false,
      locale: false
    }
  ]
}

export default nextConfig
