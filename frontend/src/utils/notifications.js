/**
 * Utilitas Notifikasi Browser & Alarm Suara Web Audio API (Pure Software)
 */

export function playAlertSound(kind = 'warning') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return false

    const ctx = new AudioCtx()
    const now = ctx.currentTime

    const playTone = (freq, startOffset, duration) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = kind === 'danger' ? 'triangle' : 'sine'
      osc.frequency.setValueAtTime(freq, now + startOffset)

      gain.gain.setValueAtTime(0.001, now + startOffset)
      gain.gain.exponentialRampToValueAtTime(0.14, now + startOffset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + startOffset)
      osc.stop(now + startOffset + duration + 0.02)
    }

    if (kind === 'test') {
      playTone(587.33, 0, 0.16) // D5
      playTone(880.0, 0.18, 0.22) // A5
    } else if (kind === 'danger') {
      playTone(784.0, 0, 0.18)
      playTone(659.25, 0.22, 0.22)
      playTone(784.0, 0.48, 0.25)
    } else {
      playTone(659.25, 0, 0.18)
      playTone(587.33, 0.22, 0.22)
    }

    setTimeout(() => {
      if (ctx.state !== 'closed') ctx.close().catch(() => {})
    }, 1000)
    return true
  } catch {
    return false
  }
}

export function isBrowserNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestBrowserNotificationPermission() {
  if (!isBrowserNotificationSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export function sendBrowserNotification(title, body, tag = 'sipio-alert') {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return false
  }
  try {
    new Notification(title, {
      body,
      tag,
      icon: '/pwa-192x192.png'
    })
    return true
  } catch {
    return false
  }
}

