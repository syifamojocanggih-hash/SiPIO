import React, { useState, useEffect } from 'react'
import { LayoutDashboard, PlayCircle, Camera, TrendingUp, Settings } from 'lucide-react'

export function MobileBottomNav({ 
  activeTab: externalActiveTab, 
  onTabChange, 
  onOpenSettings, 
  triggerHaptic 
}) {
  const [internalActiveTab, setInternalActiveTab] = useState('overview')
  const activeTab = externalActiveTab || internalActiveTab

  const navItems = [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard, targetId: 'sec-overview' },
    { id: 'feeder', label: 'Pakan', icon: PlayCircle, targetId: 'sec-feeder' },
    { id: 'camera', label: 'Kamera', icon: Camera, targetId: 'sec-camera' },
    { id: 'temp', label: 'Suhu', icon: TrendingUp, targetId: 'sec-temp' },
    { id: 'settings', label: 'Setelan', icon: Settings, action: onOpenSettings }
  ]

  const handleTabClick = (item) => {
    if (triggerHaptic) triggerHaptic(30)
    setInternalActiveTab(item.id)
    if (onTabChange) onTabChange(item.id)

    if (item.action) {
      item.action()
      return
    }

    if (item.targetId) {
      const el = document.getElementById(item.targetId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  // Auto-highlight active tab on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['sec-overview', 'sec-feeder', 'sec-camera', 'sec-temp']
      const scrollPos = window.scrollY + 180

      for (const secId of sections) {
        const el = document.getElementById(secId)
        if (el) {
          const top = el.offsetTop
          const height = el.offsetHeight
          if (scrollPos >= top && scrollPos < top + height) {
            const mappedId = secId.replace('sec-', '')
            setActiveTab(mappedId)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigasi Cepat Mobile PWA">
      <div className="mobile-bottom-nav-inner">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`bottom-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleTabClick(item)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="bottom-nav-icon-wrapper">
                <Icon size={20} />
              </div>
              <span className="bottom-nav-label">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
