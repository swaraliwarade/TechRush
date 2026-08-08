/**
 * Best-effort device labelling from the user agent.
 *
 * Used for two things: naming a freshly registered passkey, and building the
 * trusted-device fingerprint in phase 2. Deliberately coarse — UA strings are
 * unreliable and this only needs to be human-readable, not authoritative.
 */

type DeviceInfo = {
  browser: string
  os: string
  /** e.g. "Chrome on Windows" */
  label: string
}

export function describeDevice(ua: string = navigator.userAgent): DeviceInfo {
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Browser'

  const os =
    /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Unknown OS'

  return { browser, os, label: `${browser} on ${os}` }
}

export const isMobileDevice = (ua: string = navigator.userAgent) =>
  /Android|iPhone|iPad|iPod/.test(ua)
