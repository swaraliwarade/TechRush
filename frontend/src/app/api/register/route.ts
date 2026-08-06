import { NextResponse } from "next/server"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface RegisterRequest {
  fullName: string
  email: string
  customerId: string
  phoneNumber?: string
}

export async function POST(request: Request) {
  try {
    const body: RegisterRequest = await request.json()
    const { fullName, email, customerId, phoneNumber } = body

    // 1. Server-Side Validation
    if (!fullName || fullName.trim().length < 2) {
      return NextResponse.json(
        { error: "Full name must be at least 2 characters long." },
        { status: 400 }
      )
    }

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

    if (phoneNumber && phoneNumber.trim()) {
      const phoneRegex = /^\+?[0-9]{10,14}$/
      if (!phoneRegex.test(phoneNumber.replace(/\s+/g, ""))) {
        return NextResponse.json(
          { error: "Please enter a valid phone number (10 to 14 digits)." },
          { status: 400 }
        )
      }
    }

    // 2. Database Insertion (Supabase)
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from("accounts")
        .insert([
          {
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            customer_id: customerId.trim(),
            phone_number: phoneNumber?.trim() || null,
          },
        ])
        .select()

      if (error) {
        console.error("Supabase Database Error:", error)
        
        // Handle specific unique constraint violations
        if (error.code === "23505") {
          if (error.message.includes("email")) {
            return NextResponse.json(
              { error: "An account with this email address is already registered." },
              { status: 400 }
            )
          }
          if (error.message.includes("customer_id")) {
            return NextResponse.json(
              { error: "This Customer ID / Account Number is already registered." },
              { status: 400 }
            )
          }
        }
        
        return NextResponse.json(
          { error: error.message || "An error occurred while creating your account." },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { 
          success: true, 
          message: "Account created successfully.", 
          account: data[0] 
        },
        { status: 201 }
      )
    } else {
      // 3. Fallback: Simulated Success when Supabase is not yet configured
      console.warn("Supabase is not configured. Simulating database registration...")
      
      // Artificial delay to simulate network latency
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Simulate a duplicate check for demo purposes
      if (email.toLowerCase() === "duplicate@test.com") {
        return NextResponse.json(
          { error: "An account with this email address is already registered." },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          message: "Account created successfully (Simulated mode). Please set up your .env.local keys.",
          account: {
            id: "simulated-uuid-1234-5678",
            full_name: fullName,
            email: email,
            customer_id: customerId,
            phone_number: phoneNumber || null,
            created_at: new Date().toISOString(),
          },
          warning: "Supabase not configured, running in simulation mode."
        },
        { status: 201 }
      )
    }
  } catch (err) {
    console.error("Server API Exception:", err)
    return NextResponse.json(
      { error: "Internal server error occurred." },
      { status: 500 }
    )
  }
}
