import React, { useState, useEffect } from 'react'
import { LayoutDashboard, PlayCircle, Camera, TrendingUp, Settings } from 'lucide-react'

export function MobileBottomNav({ 
  activeTab = 'overview', 
  onTabChange, 
  onOpenSettings, 
  triggerHaptic 
}) {
  const navItems = [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'feeder', label: 'Pakan', icon: PlayCircle },
    { id: 'camera', label: 'Kamera', icon: Camera },
    { id: 'temp', label: 'Suhu', icon: TrendingUp },
    { id: 'settings', label: 'Setelan', icon: Settings }
  ]

  const handleTabClick = (item) => {
    if (triggerHaptic) triggerHaptic(30)
    if (onTabChange) onTabChange(item.id)
  }

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
