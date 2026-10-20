import { useState, useEffect } from 'react'

let globalInstallPrompt = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    globalInstallPrompt = e
  })
}

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState(() => globalInstallPrompt)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false)
  const [platform, setPlatform] = useState('desktop') // 'ios' | 'android' | 'desktop'
  const [browserInfo, setBrowserInfo] = useState({ name: 'other', isChromium: false })
  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('sipio-pwa-banner-dismissed') === 'true'
    } catch {
      return false
    }
  })

  const dismissBanner = () => {
    setIsBannerDismissed(true)
    try {
      sessionStorage.setItem('sipio-pwa-banner-dismissed', 'true')
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    // Detect Platform & Browser
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isAndroid = /android/.test(userAgent)

    if (isIOSDevice) {
      setPlatform('ios')
    } else if (isAndroid) {
      setPlatform('android')
    } else {
      setPlatform('desktop')
    }

    const isEdge = userAgent.includes('edg/')
    const isChrome = (userAgent.includes('chrome') || userAgent.includes('crios')) && !isEdge
    const isFirefox = userAgent.includes('firefox')
    const isSafari = userAgent.includes('safari') && !isChrome && !isEdge
    setBrowserInfo({
      isChromium: isChrome || isEdge,
      isFirefox,
      isSafari,
      name: isEdge ? 'edge' : isChrome ? 'chrome' : isFirefox ? 'firefox' : isSafari ? 'safari' : 'browser'
    })

    // Check standalone mode
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (isStandaloneMode) {
      setIsInstalled(true)
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      globalInstallPrompt = e
      setInstallPrompt(e)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      globalInstallPrompt = null
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
    const promptEvent = installPrompt || globalInstallPrompt
    if (promptEvent) {
      try {
        await promptEvent.prompt()
        const choice = await promptEvent.userChoice
        if (choice && choice.outcome === 'accepted') {
          globalInstallPrompt = null
          setInstallPrompt(null)
          setIsInstallModalOpen(false)
          return { triggered: true, outcome: 'accepted' }
        }
        return { triggered: true, outcome: choice ? choice.outcome : 'dismissed' }
      } catch (err) {
        console.warn('Install prompt error:', err)
        setIsInstallModalOpen(true)
        return { triggered: false, error: err }
      }
    } else {
      // If native prompt is not available, open the guided modal
      setIsInstallModalOpen(true)
      return { triggered: false, reason: 'no-prompt' }
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
    browserInfo,
    hasNativePrompt: Boolean(installPrompt || globalInstallPrompt),
    isInstallModalOpen,
    setIsInstallModalOpen,
    isBannerDismissed,
    dismissBanner,
    promptInstall,
    triggerHaptic
  }
}

