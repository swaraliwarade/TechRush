"use client";
import * as React from "react";
import { RegistrationForm } from "@/components/RegistrationForm";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { setCurrentUser } = useAuth();

  const handleSuccess = (userData: { fullName: string; email: string; customerId: string; phoneNumber?: string }) => {
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
      <RegistrationForm onSuccess={handleSuccess} />
    </div>
  );
}
