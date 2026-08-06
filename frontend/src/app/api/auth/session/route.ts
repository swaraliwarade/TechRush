import { NextResponse } from "next/server"
import { requireSessionFromCookie } from "@/lib/auth/session"

export async function GET() {
  try {
    const status = await requireSessionFromCookie()
    if (!status) {
      return NextResponse.json({ authenticated: false, nextStep: "email" }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: status.nextStep === "dashboard",
      sessionId: status.sessionId,
      emailVerified: status.emailVerified,
      phoneVerified: status.phoneVerified,
      biometricVerified: status.biometricVerified,
      nextStep: status.nextStep,
      account: status.account,
    })
  } catch (err) {
    console.error("Session status error:", err)
    return NextResponse.json({ error: "Internal server error occurred." }, { status: 500 })
  }
}
