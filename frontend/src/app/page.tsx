"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Users, Building } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { setSelectedBankProfile } = useAuth();

  const handleSelect = (profile: 'personal' | 'business') => {
    setSelectedBankProfile(profile);
    router.push('/signup');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        <Card className="cursor-pointer hover:shadow-xl transition-shadow" onClick={() => handleSelect('personal')}>
          <CardHeader className="flex flex-col items-center text-center">
            <Users className="h-12 w-12 mb-4 text-primary" />
            <CardTitle>Personal Banking</CardTitle>
            <CardDescription>Manage your personal accounts with ease and security.</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition">
              Continue
            </button>
          </CardFooter>
        </Card>
        <Card className="cursor-pointer hover:shadow-xl transition-shadow" onClick={() => handleSelect('business')}>
          <CardHeader className="flex flex-col items-center text-center">
            <Building className="h-12 w-12 mb-4 text-primary" />
            <CardTitle>Business Banking</CardTitle>
            <CardDescription>Powerful tools for your business finances.</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition">
              Continue
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

