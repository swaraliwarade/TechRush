import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PROTECTED_PREFIXES = ["/dashboard"]
const AUTH_FLOW_PREFIXES = ["/signin/otp", "/signin/biometric"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get("trustpass_session")

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthFlow = AUTH_FLOW_PREFIXES.some((p) => pathname.startsWith(p))

  if (isProtected && !sessionCookie) {
    const url = request.nextUrl.clone()
    url.pathname = "/signup"
    url.searchParams.set("mode", "signin")
    return NextResponse.redirect(url)
  }

  if (isAuthFlow && !sessionCookie) {
    const url = request.nextUrl.clone()
    url.pathname = "/signup"
    url.searchParams.set("mode", "signin")
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/signin/otp", "/signin/biometric"],
}
