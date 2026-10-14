import { useState, useEffect } from 'react'

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const promptInstall = async () => {
    if (!installPrompt) {
      alert('Untuk memasang SiPio PWA:\n1. Di Chrome/Edge: Klik ikon Pasang di bilah alamat atau menu (titik tiga).\n2. Di Safari iOS: Klik tombol Share lalu pilih "Add to Home Screen".')
      return
    }
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
    }
  }

  const triggerHaptic = (duration = 50) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(duration)
      } catch {
        // Ignore if browser restricts vibration
      }
    }
  }

  return {
    isOnline,
    canInstall: !!installPrompt,
    isInstalled,
    promptInstall,
    triggerHaptic
  }
}
