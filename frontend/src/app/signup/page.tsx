"use client";
import * as React from "react";
<<<<<<< Updated upstream
=======
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
>>>>>>> Stashed changes
import { RegistrationForm } from "@/components/RegistrationForm";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

<<<<<<< Updated upstream
export default function SignupPage() {
=======
function SignupPageContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "signin" ? "signin" : "signup";
  const [authMode, setAuthMode] = React.useState<'signup' | 'signin'>(initialMode);
>>>>>>> Stashed changes
  const router = useRouter();
  const { setCurrentUser } = useAuth();

<<<<<<< Updated upstream
  const handleSuccess = (userData: { fullName: string; email: string; customerId: string; phoneNumber?: string }) => {
=======
  React.useEffect(() => {
    setAuthMode(searchParams.get("mode") === "signin" ? "signin" : "signup");
  }, [searchParams]);

  const handleSuccess = (name: string) => {
>>>>>>> Stashed changes
    if (typeof window !== "undefined") {
      sessionStorage.setItem("trustpass_customer_name", userData.fullName);
      sessionStorage.setItem("trustpass_customer_email", userData.email);
      sessionStorage.setItem("trustpass_customer_id", userData.customerId);
      if (userData.phoneNumber) {
        sessionStorage.setItem("trustpass_customer_phone", userData.phoneNumber);
      }
      setCurrentUser(userData);
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-4 py-8">
<<<<<<< Updated upstream
      <RegistrationForm onSuccess={handleSuccess} />
=======
      {authMode === 'signup' ? (
        <Card className="w-full max-w-lg border border-border shadow-2xl bg-card/65 backdrop-blur-xl relative overflow-hidden p-6">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-primary to-blue-500" />
          <CardHeader className="space-y-4 text-center">
            <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Create Your Secure Account
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Register your banking credentials. We use passwordless passkey technology to keep your profile secure.
            </CardDescription>
          </CardHeader>
          <div className="space-y-5">
            <RegistrationForm onSuccess={handleSuccess} />
          </div>
          <div className="flex flex-col items-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => setAuthMode('signin')}
              className="text-sm underline text-primary"
            >
              Already have an account? Sign In
            </button>
          </div>
        </Card>
      ) : (
        <div className="w-full flex flex-col items-center gap-4">
          <SignInForm />
          <button
            type="button"
            onClick={() => setAuthMode('signup')}
            className="text-sm underline text-primary"
          >
            Need an account? Sign Up
          </button>
        </div>
      )}
>>>>>>> Stashed changes
    </div>
  );
}

export default function SignupPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <SignupPageContent />
    </React.Suspense>
  );
}
