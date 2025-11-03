import type { NextRequest } from 'next/server'
import { injectAnonymousOrUser } from 'infra/middleware'

export default async function middleware(request: NextRequest) {
  return injectAnonymousOrUser(request)
}

export const config = {
  matcher: ['/api/:path*'],
  runtime: 'nodejs',
}
