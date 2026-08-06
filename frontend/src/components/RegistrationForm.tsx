"use client"

import * as React from "react"
import { User, Mail, ShieldCheck, Phone, ArrowRight, ShieldAlert, RefreshCw } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
// CardContent and CardFooter removed; not needed

// CAPTCHA generator (canvas based)
function generateCaptcha(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let captcha = "";
  for (let i = 0; i < length; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return captcha;
}

export interface UserData {
  fullName: string
  email: string
  customerId: string
  phoneNumber?: string
}

export interface RegistrationFormProps {
  onSuccess: (userData: UserData) => void
}

interface FormValues {
  fullName: string;
  email: string;
  customerId: string;
  phoneNumber: string;
  captcha: string;
}

export function RegistrationForm({ onSuccess }: RegistrationFormProps) {
  const [values, setValues] = React.useState<FormValues>({
    fullName: "",
    email: "",
    customerId: "",
    phoneNumber: "",
    captcha: "",
  });

  const [touched, setTouched] = React.useState<Record<keyof FormValues | "captcha", boolean>>({
    fullName: false,
    email: false,
    customerId: false,
    phoneNumber: false,
    captcha: false,
  });

  // Old math captcha removed




  const [isLoading, setIsLoading] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [captcha, setCaptcha] = React.useState(generateCaptcha());
  const [captchaInput, setCaptchaInput] = React.useState("");
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Validate fields dynamically
  const getErrors = React.useCallback((): Partial<Record<keyof FormValues | "captcha", string>> => {
    const errors: Partial<Record<keyof FormValues | "captcha", string>> = {}

    // Full Name
    if (!values.fullName.trim()) {
      errors.fullName = "Full name is required"
    } else if (values.fullName.trim().length < 2) {
      errors.fullName = "Name must be at least 2 characters long"
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!values.email.trim()) {
      errors.email = "Email address is required"
    } else if (!emailRegex.test(values.email)) {
      errors.email = "Please enter a valid email address (e.g. name@domain.com)"
    }

    // Customer ID / Account Number
    const customerIdRegex = /^[a-zA-Z0-9]{6,12}$/
    if (!values.customerId.trim()) {
      errors.customerId = "Customer ID or Account Number is required"
    } else if (!customerIdRegex.test(values.customerId)) {
      errors.customerId = "Customer ID must be 6 to 12 alphanumeric characters"
    }

    // Phone Number (Optional)
    if (values.phoneNumber.trim()) {
      const phoneRegex = /^\+?[0-9]{10,14}$/
      if (!phoneRegex.test(values.phoneNumber.replace(/\s+/g, ""))) {
        errors.phoneNumber = "Please enter a valid phone number (10 to 14 digits)"
      }
    }

    // CAPTCHA validation (case-sensitive)
    if (!captchaInput.trim()) {
      errors.captcha = "Please enter the CAPTCHA"
    } else if (captchaInput !== captcha) {
      errors.captcha = "CAPTCHA does not match"
    }

    return errors;
  }, [values, captcha, captchaInput])

  const errors = React.useMemo(() => getErrors(), [getErrors])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleBlur = (name: keyof FormValues) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

  // Draw CAPTCHA on canvas whenever it changes
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    const charArray = captcha.split('');
    const fontSize = 24;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = 'middle';
    const spacing = width / (charArray.length + 1);
    charArray.forEach((char, i) => {
      const x = spacing * (i + 1);
      const y = height / 2;
      const angle = (Math.random() - 0.5) * 0.4; // random rotation
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = '#000';
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
    // Noise lines
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = '#aaa';
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }
    // Noise dots
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = '#bbb';
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [captcha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")

    // Mark all fields as touched to trigger validation visuals
    const allTouched = {
      fullName: true,
      email: true,
      customerId: true,
      phoneNumber: true,
      captcha: true,
    }
    setTouched(allTouched)

    // Check if errors exist
    const currentErrors = getErrors()
    const errorKeys = Object.keys(currentErrors) as Array<keyof FormValues>

    if (errorKeys.length > 0) {
      // Focus first invalid input as required by accessibility guidelines
      const firstErrorKey = errorKeys[0]
      const inputElement = document.getElementById(firstErrorKey)
      if (inputElement) {
        inputElement.focus()
      }
      // If CAPTCHA error, generate a new one
      if (firstErrorKey === 'captcha') {
        setCaptcha(generateCaptcha())
        setCaptchaInput('')
      }
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        setSubmitError(data.error || "An error occurred during registration.")
        setIsLoading(false)
        return
      }

      setIsLoading(false)
      onSuccess({
        fullName: values.fullName,
        email: values.email,
        customerId: values.customerId,
        phoneNumber: values.phoneNumber,
      })
    } catch (err) {
      console.error(err)
      setSubmitError("Network connection failed. Please try again.")
      setIsLoading(false)
    }
  }

  return ( <form onSubmit={handleSubmit}>
    
      <div className="space-y-5">
        {/* Full Name */}
        <Input
          id="fullName"
          name="fullName"
          label="Full Name"
          placeholder="John Doe"
          value={values.fullName}
          onChange={handleChange}
          onBlur={() => handleBlur("fullName")}
          error={errors.fullName}
          isTouched={touched.fullName}
          icon={<User className="h-4.5 w-4.5" />}
          required
          autoComplete="name"
        />

        {/* Email Address */}
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

        {/* Customer ID */}
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
          hint="6-12 letters & numbers"
          required
        />

        {/* Phone Number */}
        <Input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          label="Phone Number (Optional)"
          placeholder="+1 (555) 000-0000"
          value={values.phoneNumber}
          onChange={handleChange}
          onBlur={() => handleBlur("phoneNumber")}
          error={errors.phoneNumber}
          isTouched={touched.phoneNumber}
          icon={<Phone className="h-4.5 w-4.5" />}
          hint="For security SMS fallbacks"
          autoComplete="tel"
        />

        {/* Captcha */}
        {/* Canvas CAPTCHA */}
        <div className="flex items-center gap-3 mb-4">
        <canvas ref={canvasRef} width={150} height={50} className="border rounded" />
        <Button type="button" onClick={() => { setCaptcha(generateCaptcha()); setCaptchaInput(""); }} className="rounded-full w-8 h-8 flex items-center justify-center p-0">
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>
        <Input
          id="captcha"
          name="captcha"
          label="Enter CAPTCHA"
          placeholder="Enter text"
          value={captchaInput}
          onChange={(e) => setCaptchaInput(e.target.value)}
          onBlur={() => setTouched(prev => ({ ...prev, captcha: true }))}
          error={errors.captcha}
          isTouched={touched.captcha}
          required
          className="mt-2"
        />

        <div className="p-3.5 rounded-xl border border-blue-500/10 bg-blue-500/[0.02] flex gap-3 text-left">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-foreground">Passwordless Enrollment</span>
            <span className="text-[11px] text-muted-foreground leading-relaxed">
              This secure setup doesn't require a password. You'll link a device-level biometric passkey next.
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {submitError && (
          <div className="w-full p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive flex gap-2.5 text-left mb-2 animate-pulse">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold">Registration Failed</span>
              <span className="text-[11px] font-medium leading-normal">{submitError}</span>
            </div>
          </div>
        )}
        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold shadow-md bg-primary text-primary-foreground hover:bg-primary/95 transition-all"
          isLoading={isLoading}
        >
          Create Secure Account
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <span className="text-[11px] text-muted-foreground text-center">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </span>
      </div></form>
  )
}
