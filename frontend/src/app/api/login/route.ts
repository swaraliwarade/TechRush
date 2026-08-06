import { NextResponse } from "next/server"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface LoginRequest {
  email: string
  customerId: string
}

export async function POST(request: Request) {
  try {
    const body: LoginRequest = await request.json()
    const { email, customerId } = body

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      )
    }

    const customerIdRegex = /^[a-zA-Z0-9]{6,12}$/
    if (!customerId || !customerIdRegex.test(customerId)) {
      return NextResponse.json(
        { error: "Customer ID must be 6 to 12 alphanumeric characters." },
        { status: 400 }
      )
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, full_name, email, customer_id")
        .eq("email", email.trim().toLowerCase())
        .eq("customer_id", customerId.trim())
        .maybeSingle()

      if (error) {
        console.error("Supabase login error:", error)
        return NextResponse.json(
          { error: "An error occurred while signing in." },
          { status: 500 }
        )
      }

      if (!data) {
        return NextResponse.json(
          { error: "No account found with this email and Customer ID combination." },
          { status: 401 }
        )
      }

      return NextResponse.json({
        success: true,
        account: data,
      })
    }

    // Simulation mode when Supabase is not configured
    await new Promise((resolve) => setTimeout(resolve, 600))

    if (email.toLowerCase() === "notfound@test.com") {
      return NextResponse.json(
        { error: "No account found with this email and Customer ID combination." },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      account: {
        id: "simulated-uuid",
        full_name: "Demo User",
        email: email.trim().toLowerCase(),
        customer_id: customerId.trim(),
      },
      warning: "Supabase not configured, running in simulation mode.",
    })
  } catch (err) {
    console.error("Login API exception:", err)
    return NextResponse.json(
      { error: "Internal server error occurred." },
      { status: 500 }
    )
  }
}
