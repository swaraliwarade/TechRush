"use client"

import * as React from "react"
import { Mail, ShieldCheck, ArrowRight, ShieldAlert, LogIn, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

// CAPTCHA generator
function generateCaptcha(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  let captcha = ""
  for (let i = 0; i < length; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return captcha
}

interface FormValues {
  email: string
  customerId: string
}

export function SignInForm() {
  const router = useRouter()
  const [values, setValues] = React.useState<FormValues>({ email: "", customerId: "" })
  const [touched, setTouched] = React.useState<Record<keyof FormValues | "captcha", boolean>>({
    email: false,
    customerId: false,
    captcha: false,
  })
  const [isLoading, setIsLoading] = React.useState(false)
  const [captcha, setCaptcha] = React.useState(generateCaptcha())
  const [captchaInput, setCaptchaInput] = React.useState("")
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [submitError, setSubmitError] = React.useState("")

  const getErrors = React.useCallback((): Partial<Record<keyof FormValues | "captcha", string>> => {
    const errors: Partial<Record<keyof FormValues | "captcha", string>> = {}

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!values.email.trim()) {
      errors.email = "Email address is required"
    } else if (!emailRegex.test(values.email)) {
      errors.email = "Please enter a valid email address"
    }

    const customerIdRegex = /^[a-zA-Z0-9]{6,12}$/
    if (!values.customerId.trim()) {
      errors.customerId = "Customer ID is required"
    } else if (!customerIdRegex.test(values.customerId)) {
      errors.customerId = "Customer ID must be 6 to 12 alphanumeric characters"
    }

    if (!captchaInput.trim()) {
      errors.captcha = "Please enter the CAPTCHA"
    } else if (captchaInput !== captcha) {
      errors.captcha = "CAPTCHA does not match"
    }
    return errors
  }, [values, captcha, captchaInput])

  const errors = React.useMemo(() => getErrors(), [getErrors])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setValues(prev => ({ ...prev, [name]: value }))
  }

  const handleBlur = (name: keyof FormValues) => {
    setTouched(prev => ({ ...prev, [name]: true }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")
    setTouched({ email: true, customerId: true, captcha: true })
    const currentErrors = getErrors()
    const errorKeys = Object.keys(currentErrors) as Array<keyof FormValues | "captcha">
    if (errorKeys.length > 0) {
      document.getElementById(errorKeys[0])?.focus()
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await response.json()
      if (!response.ok) {
        setSubmitError(data.error || "Sign in failed. Please try again.")
        setIsLoading(false)
        return
      }
      sessionStorage.setItem("trustpass_customer_name", data.account.full_name || "Demo User")
      sessionStorage.setItem("trustpass_customer_email", data.account.email || values.email)
      sessionStorage.setItem("trustpass_customer_id", data.account.customer_id || values.customerId)
      router.push("/dashboard")
    } catch {
      setSubmitError("Network connection failed. Please try again.")
      setIsLoading(false)
    }
  }

  // Draw captcha on canvas when it changes
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = "24px sans-serif"
    ctx.fillStyle = "#333"
    ctx.fillText(captcha, 10, 30)
  }, [captcha])

  return (
    <Card className="w-full max-w-lg border border-border shadow-2xl relative overflow-hidden bg-card/65 backdrop-blur-xl">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-primary to-blue-500" />

      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
          <LogIn className="h-4 w-4" />
          <span>Returning Customer</span>
        </div>
        <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground">
          Sign In to TrustPass
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Enter your registered email and Customer ID to access your banking portals.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-5">
          <Input
            id="email"
            name="email"
            type="email"
            label="Email Address"
            placeholder="john.doe@company.com"
            value={values.email}
            onChange={handleChange}
            onBlur={() => handleBlur("email")}
            error={errors.email}
            isTouched={touched.email}
            icon={<Mail className="h-4.5 w-4.5" />}
            required
            autoComplete="email"
          />
          <Input
            id="customerId"
            name="customerId"
            label="Customer ID / Account Number"
            placeholder="e.g. TP847192"
            value={values.customerId}
            onChange={handleChange}
            onBlur={() => handleBlur("customerId")}
            error={errors.customerId}
            isTouched={touched.customerId}
            icon={<ShieldCheck className="h-4.5 w-4.5" />}
            required
          />
          <div className="p-3.5 rounded-xl border border-blue-500/10 bg-blue-500/[0.02] flex gap-3 text-left">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">Passwordless Sign‑In</span>
              <span className="text-[11px] text-muted-foreground leading-relaxed">
                After verifying your identity, you’ll choose your bank portal and authenticate with your enrolled passkey.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <canvas ref={canvasRef} width={150} height={50} className="border rounded" />
            <Button
              type="button"
              onClick={() => { setCaptcha(generateCaptcha()); setCaptchaInput(""); }}
              className="rounded-full w-8 h-8 flex items-center justify-center p-0"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-4">
            <Input
              id="captcha"
              name="captcha"
              label="Enter CAPTCHA"
              placeholder="Enter text"
              value={captchaInput}
              onChange={e => setCaptchaInput(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, captcha: true }))}
              error={errors.captcha}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {submitError && (
            <div className="w-full p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive flex gap-2.5 text-left mb-2">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold">Sign In Failed</span>
                <span className="text-[11px] font-medium leading-normal">{submitError}</span>
              </div>
            </div>
          )}
          <Button type="submit" className="w-full h-12 text-base font-semibold shadow-md" isLoading={isLoading}>
            Sign In
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
