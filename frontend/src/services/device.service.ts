// src/services/device.service.ts
import { supabase } from "@/lib/supabase";

export interface DeviceInfo {
  deviceId: string; // client‑generated UUID or random string
  name?: string;
  browser: string;
  os: string;
  fingerprint: string;
}

export interface Device extends DeviceInfo {
  id: string; // DB UUID
  user_id: string;
  last_login: string | null;
  trust_score: number | null;
  is_trusted: boolean;
}

/** Register a new device for a user */
export async function registerDevice(userId: string, info: DeviceInfo): Promise<Device> {
  const { data, error } = await supabase
    .from("devices")
    .insert([
      {
        user_id: userId,
        device_id: info.deviceId,
        name: info.name || "Unnamed Device",
        browser: info.browser,
        os: info.os,
        fingerprint: info.fingerprint,
        last_login: new Date().toISOString(),
        trust_score: null,
        is_trusted: false,
      },
    ])
    .select("id, user_id, device_id, name, browser, os, fingerprint, last_login, trust_score, is_trusted")
    .single();

  if (error) {
    console.error("Device registration error:", error);
    throw new Error("Failed to register device");
  }

  return data as Device;
}

/** Fetch a device by its DB id */
export async function getDeviceById(deviceId: string): Promise<Device | null> {
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("id", deviceId)
    .single();

  if (error) return null;
  return data as Device;
}

/** Mark device as trusted */
export async function markDeviceTrusted(deviceId: string): Promise<void> {
  const { error } = await supabase
    .from("devices")
    .update({ is_trusted: true })
    .eq("id", deviceId);
  if (error) console.error("Mark trusted error:", error);
}
