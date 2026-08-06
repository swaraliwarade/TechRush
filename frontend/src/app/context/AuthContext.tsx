"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type BankProfile = "personal" | "business";
export interface UserData {
  fullName: string;
  email: string;
  customerId: string;
  phoneNumber?: string;
}
export interface AuthState {
  isAuthenticated: boolean;
  selectedBankProfile: BankProfile | null;
  currentUser: UserData | null;
  otp: string | null; // deprecated, keep for backward compatibility
  otpVerified: boolean;
  passkeyRegistered: boolean;
  trustedDeviceId: string | null;
  loginChallengeId: string | null;
  riskScore: number | null;
  pendingApproval: boolean;
}

interface AuthContextProps extends AuthState {
  setIsAuthenticated: (value: boolean) => void;
  setSelectedBankProfile: (profile: BankProfile | null) => void;
  setCurrentUser: (user: UserData | null) => void;
  setOtp: (otp: string | null) => void;
  setOtpVerified: (value: boolean) => void;
  setPasskeyRegistered: (value: boolean) => void;
  setTrustedDeviceId: (id: string | null) => void;
  setLoginChallengeId: (id: string | null) => void;
  setRiskScore: (score: number | null) => void;
  setPendingApproval: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextProps>(null as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedBankProfile, setSelectedBankProfile] = useState<BankProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState<boolean>(false);
  const [passkeyRegistered, setPasskeyRegistered] = useState<boolean>(false);
  const [trustedDeviceId, setTrustedDeviceId] = useState<string | null>(null);
  const [loginChallengeId, setLoginChallengeId] = useState<string | null>(null);
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [pendingApproval, setPendingApproval] = useState<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("trustpass_auth");
      if (stored) {
        try {
          const parsed: AuthState = JSON.parse(stored);
          setIsAuthenticated(parsed.isAuthenticated);
          setSelectedBankProfile(parsed.selectedBankProfile);
          setCurrentUser(parsed.currentUser);
          setOtp(parsed.otp);
        } catch (_) {}
      }
    }
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    const state: AuthState = {
    isAuthenticated,
    selectedBankProfile,
    currentUser,
    otp,
    otpVerified,
    passkeyRegistered,
    trustedDeviceId,
    loginChallengeId,
    riskScore,
    pendingApproval,
  };
    if (typeof window !== "undefined") {
      localStorage.setItem("trustpass_auth", JSON.stringify(state));
    }
  }, [isAuthenticated, selectedBankProfile, currentUser, otp, otpVerified, passkeyRegistered, trustedDeviceId, loginChallengeId, riskScore, pendingApproval]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        selectedBankProfile,
        currentUser,
        otp,
        otpVerified,
        passkeyRegistered,
        trustedDeviceId,
        loginChallengeId,
        riskScore,
        pendingApproval,
        setIsAuthenticated,
        setSelectedBankProfile,
        setCurrentUser,
        setOtp,
        setOtpVerified,
        setPasskeyRegistered,
        setTrustedDeviceId,
        setLoginChallengeId,
        setRiskScore,
        setPendingApproval,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
