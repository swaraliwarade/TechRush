// src/services/otp.service.ts
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

interface OtpChallenge {
  id: string;
  user_id: string;
  otp_hash: string;
  otp_expires_at: string; // ISO string
  otp_attempts: number;
}

/** Generate a 6‑digit numeric OTP */
export async function generateOtp(userId: string): Promise<OtpChallenge> {
  const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
  const hash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

  const { data, error } = await supabase
    .from("login_challenges")
    .insert([
      {
        user_id: userId,
        otp_hash: hash,
        otp_expires_at: expiresAt,
        otp_attempts: 0,
      },
    ])
    .select("id, otp_hash, otp_expires_at, otp_attempts")
    .single();

  if (error) {
    console.error("OTP insert error:", error);
    throw new Error("Failed to create OTP challenge");
  }

  // Mock SMS – in real world integrate with Twilio / etc.
  console.log(`[MOCK SMS] OTP for user ${userId}: ${otp}`);

  return data as OtpChallenge;
}

/** Verify OTP against stored hash */
export async function verifyOtp(challengeId: string, otp: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("login_challenges")
    .select("otp_hash, otp_expires_at, otp_attempts")
    .eq("id", challengeId)
    .single();

  if (error || !data) {
    console.error("OTP fetch error:", error);
    return false;
  }

  const now = new Date();
  if (new Date(data.otp_expires_at) < now) {
    return false; // expired
  }

  const match = await bcrypt.compare(otp, data.otp_hash);
  // Increment attempts regardless of match
  await supabase
    .from("login_challenges")
    .update({ otp_attempts: (data.otp_attempts ?? 0) + 1 })
    .eq("id", challengeId);

  return match;
}
