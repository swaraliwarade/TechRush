"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Shield, Fingerprint, Laptop, Smartphone, MapPin, Clock, Trash2, CheckCircle2, AlertCircle } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export interface DeviceSession {
  id: string
  device: string
  os: string
  browser: string
  ip: string
  location: string
  lastActive: string
  isCurrent: boolean
  authType: "Touch ID" | "Face ID" | "Windows Hello" | "Hardware Key"
}

export interface DeviceHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  customerName: string
  customerId: string
  email: string
  phone?: string
}

const INITIAL_SESSIONS: DeviceSession[] = [
  {
    id: "sess_1",
    device: "MacBook Pro 16\"",
    os: "macOS Sequoia",
    browser: "Chrome 128.0",
    ip: "192.168.1.45 (172.56.21.90)",
    location: "San Francisco, CA, USA",
    lastActive: "Just now",
    isCurrent: true,
    authType: "Touch ID",
  },
  {
    id: "sess_2",
    device: "iPhone 15 Pro",
    os: "iOS 18.1",
    browser: "Safari Mobile",
    ip: "172.56.21.91",
    location: "San Francisco, CA, USA",
    lastActive: "2 hours ago",
    isCurrent: false,
    authType: "Face ID",
  },
  {
    id: "sess_3",
    device: "Windows Workstation",
    os: "Windows 11 Enterprise",
    browser: "Edge 127.0",
    ip: "198.51.100.4",
    location: "San Jose, CA, USA",
    lastActive: "Yesterday at 4:15 PM",
    isCurrent: false,
    authType: "Windows Hello",
  },
]

export function DeviceHistoryModal({
  isOpen,
  onClose,
  customerName,
  customerId,
  email,
}: DeviceHistoryModalProps) {
  const [sessions, setSessions] = React.useState<DeviceSession[]>(INITIAL_SESSIONS)
  const [revokingId, setRevokingId] = React.useState<string | null>(null)
  const [revokedMessage, setRevokedMessage] = React.useState<string | null>(null)

  const handleRevokeSession = (id: string, deviceName: string) => {
    setRevokingId(id)
    setTimeout(() => {
      setSessions((prev) => prev.filter((s) => s.id !== id))
      setRevokingId(null)
      setRevokedMessage(`Session for ${deviceName} was successfully revoked.`)
      setTimeout(() => setRevokedMessage(null), 4000)
    }, 600)
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="sm:max-w-2xl">
      <div className="p-6 sm:p-8 flex flex-col gap-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Security & Device Audit Log</h2>
              <p className="text-xs text-muted-foreground">
                Manage registered biometric passkeys & active login sessions for <span className="font-semibold text-foreground">{customerName}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Account Info Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer ID</span>
            <span className="text-xs font-semibold text-foreground font-mono">{customerId || "TP-849102"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Registered Email</span>
            <span className="text-xs font-semibold text-foreground truncate">{email || "customer@trustpass.bank"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Authentication Mode</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Passwordless Passkey
            </span>
          </div>
        </div>

        {revokedMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{revokedMessage}</span>
          </motion.div>
        )}

        {/* Active Sessions List */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Laptop className="h-4 w-4 text-primary" />
              Active Login Sessions ({sessions.length})
            </h3>
            <span className="text-[11px] text-muted-foreground">Updated in real-time</span>
          </div>

          <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  sess.isCurrent
                    ? "bg-primary/[0.03] border-primary/30 ring-1 ring-primary/20"
                    : "bg-card border-border/60 hover:border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0 mt-0.5">
                    {sess.device.includes("iPhone") || sess.device.includes("Android") ? (
                      <Smartphone className="h-5 w-5 text-primary" />
                    ) : (
                      <Laptop className="h-5 w-5 text-primary" />
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{sess.device}</span>
                      {sess.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Current Session
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                        <Fingerprint className="h-3 w-3" />
                        {sess.authType}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-0.5">
                      <span>{sess.os} · {sess.browser}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {sess.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {sess.lastActive}
                      </span>
                    </div>
                  </div>
                </div>

                {!sess.isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={revokingId === sess.id}
                    onClick={() => handleRevokeSession(sess.id, sess.device)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 text-xs h-8 shrink-0 self-start sm:self-center"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {revokingId === sess.id ? "Revoking..." : "Revoke"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span>Noticed unfamiliar activity? Revoke session immediately.</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 px-4">
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
