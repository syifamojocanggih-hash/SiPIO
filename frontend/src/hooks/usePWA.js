import { useState, useEffect } from 'react'

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false)
  const [platform, setPlatform] = useState('android') // 'ios' | 'android' | 'desktop'

  useEffect(() => {
    // Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (isIOSDevice) {
      setPlatform('ios')
    } else if (/android/.test(userAgent)) {
      setPlatform('android')
    } else {
      setPlatform('desktop')
    }

    // Check standalone mode
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (isStandaloneMode) {
      setIsInstalled(true)
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      setIsInstallModalOpen(false)
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const promptInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setInstallPrompt(null)
        setIsInstallModalOpen(false)
      }
    } else {
      // If native prompt is not available (e.g. iOS or already installed or desktop browser), show guide modal
      setIsInstallModalOpen(true)
    }
  }

  const triggerHaptic = (duration = 40) => {
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
    canInstall: !isInstalled,
    isInstalled,
    platform,
    isInstallModalOpen,
    setIsInstallModalOpen,
    promptInstall,
    triggerHaptic
  }
}

