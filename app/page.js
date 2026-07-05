'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Target,
  ShieldCheck,
  ChevronRight,
  Trophy,
  ListChecks,
  Building2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Share2,
  Download,
  X,
  Tag,
  User,
  MapPin,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  ShoppingCart,
  Settings,
  Search,
  Check,
} from 'lucide-react'
import { abbreviateInstituteName } from './lib/formatters'
import InteractiveParticles from '@/components/InteractiveParticles'
import Lenis from 'lenis'
import { useAuth } from '@/context/AuthContext'
import LoginModal from '@/components/LoginModal'
import { supabase } from '@/lib/supabase'
import { openRazorpayCheckout } from '@/lib/razorpayClient'

// Category dropdown: label shown to user, value used to match Seat Type in CSV.
const CATEGORIES = [
  { label: 'General (OPEN)', value: 'OPEN' },
  { label: 'EWS', value: 'EWS' },
  { label: 'OBC-NCL', value: 'OBC-NCL' },
  { label: 'SC', value: 'SC' },
  { label: 'ST', value: 'ST' },
  { label: 'General-PwD', value: 'OPEN (PwD)' },
  { label: 'EWS-PwD', value: 'EWS (PwD)' },
  { label: 'OBC-NCL-PwD', value: 'OBC-NCL (PwD)' },
  { label: 'SC-PwD', value: 'SC (PwD)' },
  { label: 'ST-PwD', value: 'ST (PwD)' },
]

const GENDERS = [
  { label: 'Gender-Neutral', value: 'Gender-Neutral' },
  { label: 'Female-only (including Supernumerary)', value: 'Female-only (including Supernumerary)' },
]

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Chandigarh', 'Dadra & Nagar Haveli',
  'Daman & Diu', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
  'Andaman & Nicobar Islands',
]

function ScrollReveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          observer.unobserve(el)
        }
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -40px 0px'
      }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal-container ${revealed ? 'revealed' : ''} ${className}`}
      style={{ '--delay': `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function TiltCard({ children, className = "", style = {} }) {
  const cardRef = useRef(null)

  const handleMouseMove = (e) => {
    if (window.innerWidth < 1024) return // desktop only
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const rotateY = ((x / rect.width) - 0.5) * 8
    const rotateX = (0.5 - (y / rect.height)) * 8

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`
    card.style.transition = 'transform 0.1s ease-out'
  }

  const handleMouseLeave = () => {
    const card = cardRef.current
    if (!card) return
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0deg)'
    card.style.transition = 'transform 0.4s ease-out'
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`card-hover-lift ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

function Magnetic({ children, className = "" }) {
  const ref = useRef(null)

  const handleMouseMove = (e) => {
    if (window.innerWidth < 1024) return // desktop only
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = e.clientX - centerX
    const dy = e.clientY - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 70) {
      const pullX = (dx / 70) * 12
      const pullY = (dy / 70) * 12
      el.style.transform = `translate3d(${pullX}px, ${pullY}px, 0)`
      el.style.transition = 'transform 0.1s ease-out'
    } else {
      el.style.transform = 'translate3d(0, 0, 0)'
      el.style.transition = 'transform 0.3s ease-out'
    }
  }

  const handleMouseLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'translate3d(0, 0, 0)'
    el.style.transition = 'transform 0.4s ease-out'
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`inline-block ${className}`}
    >
      {children}
    </div>
  )
}

function CountUp({ end, duration = 1200 }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTimestamp = null
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const easedProgress = progress * (2 - progress) // easeOutQuad
      setCount(Math.floor(easedProgress * end))
      if (progress < 1) {
        window.requestAnimationFrame(step)
      }
    }
    window.requestAnimationFrame(step)
  }, [end, duration])

  return <span>{count.toLocaleString()}</span>
}

function Nav({ hasResult, onReset, activeSection }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const containerRef = useRef(null)
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0, opacity: 0 })
  const { user, profile, openLoginModal, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownOpen && !e.target.closest('.dropdown-container')) {
        setDropdownOpen(false)
      }
    }
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [dropdownOpen])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const activeEl = containerRef.current.querySelector(`[data-section="${activeSection}"]`)
    if (activeEl) {
      setUnderlineStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        opacity: 1
      })
    } else {
      setUnderlineStyle({ left: 0, width: 0, opacity: 0 })
    }
  }, [activeSection])

  const scrollTo = (id) => {
    setMobileOpen(false)
    const el = document.getElementById(id)
    if (el) {
      if (window.lenis) {
        window.lenis.scrollTo(el, { duration: 1.2, offset: -60 })
      } else {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const NAV_LINKS = [
    { label: 'Predictor', id: 'predict' },
    { label: 'Choice Filling', id: 'choice-filling' },
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how' },
    { label: 'FAQ', id: 'faq' },
    { label: 'About', id: 'about' },
  ]

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ease-in-out border-b hero-entrance ${scrolled
        ? 'backdrop-blur-xl bg-background/80 border-border-custom shadow-[0_4px_30px_rgba(0,0,0,0.4)] h-14'
        : 'backdrop-blur-md bg-background/40 border-transparent shadow-none h-16'
      }`} style={{ animationDelay: '0ms' }}>
      <div className={`container mx-auto flex items-center justify-between px-4 transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'
        }`}>
        {/* Logo */}
        <button onClick={() => scrollTo('predict')} className="flex items-center gap-2.5 focus:outline-none cursor-pointer group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-purple to-accent-blue shadow-md transition-transform duration-300 group-hover:scale-105">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-primary-text">
            Sahi<span className="bg-gradient-to-r from-primary-purple to-secondary-purple bg-clip-text text-transparent">Seat</span>
          </span>
        </button>

        {/* Desktop Nav */}
        <nav ref={containerRef} className="hidden md:flex items-center gap-8 text-sm font-medium text-secondary-text relative">
          {NAV_LINKS.map(({ label, id }) => (
            <button
              key={id}
              data-section={id}
              onClick={() => scrollTo(id)}
              className={`nav-link transition-colors duration-300 focus:outline-none cursor-pointer py-1 ${activeSection === id ? 'text-primary-text font-bold' : 'text-secondary-text/80 hover:text-primary-text'
                }`}
            >
              {label}
            </button>
          ))}
          <span
            className="absolute bottom-0 h-[2px] bg-gradient-to-r from-primary-purple to-accent-blue transition-all duration-300 ease-out pointer-events-none"
            style={{
              left: `${underlineStyle.left}px`,
              width: `${underlineStyle.width}px`,
              opacity: underlineStyle.opacity,
            }}
          />
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          {hasResult && (
            <Button
              onClick={onReset}
              className="px-4 py-2 rounded-xl border border-border-custom bg-[#13131A] hover:bg-[#13131A]/75 text-xs text-[#FAFAFA] font-bold transition-all duration-300 cursor-pointer"
            >
              New Prediction
            </Button>
          )}

          {!user ? (
            <Button
              onClick={() => openLoginModal()}
              className="px-5 py-2.5 rounded-2xl bg-primary-text text-background text-sm font-semibold hover:bg-primary-text/90 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(250,250,250,0.15)] transition-all duration-300 active:scale-[0.96] cursor-pointer"
            >
              Sign In
            </Button>
          ) : (
            <div className="relative dropdown-container">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border-custom bg-[#13131A] hover:bg-[#13131A]/80 transition cursor-pointer select-none focus:outline-none"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="h-6 w-6 rounded-full object-cover border border-primary-purple/40"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary-purple/20 text-primary-purple flex items-center justify-center text-xs font-bold border border-primary-purple/40">
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                )}
                <span className="text-xs font-bold text-primary-text max-w-[100px] truncate">
                  {profile?.name || 'Student'}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-secondary-text transition-transform duration-250 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border-custom bg-[#13131A] p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <a
                    href="/dashboard"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#FAFAFA] hover:bg-primary-purple/10 hover:text-primary-purple transition"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Dashboard
                  </a>
                  <a
                    href="/dashboard?tab=requests"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#FAFAFA] hover:bg-primary-purple/10 hover:text-primary-purple transition"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    My Requests
                  </a>
                  <a
                    href="/dashboard?tab=purchases"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#FAFAFA] hover:bg-primary-purple/10 hover:text-primary-purple transition"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    My Purchases
                  </a>
                  <a
                    href="/dashboard?tab=settings"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#FAFAFA] hover:bg-primary-purple/10 hover:text-primary-purple transition"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                  </a>
                  <hr className="border-border-custom my-1" />
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-400 transition text-left cursor-pointer focus:outline-none"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile: hamburger + CTA row */}
        <div className="flex md:hidden items-center gap-2.5">
          {hasResult && (
            <Button
              onClick={onReset}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-xs font-semibold hover:shadow-[0_4px_20px_rgba(124,58,237,0.25)] transition-all duration-300 active:scale-[0.98] cursor-pointer"
            >
              New
            </Button>
          )}

          {!user ? (
            <button
              onClick={() => openLoginModal()}
              className="px-3.5 py-1.5 rounded-xl border border-border-custom bg-[#13131A] text-xs font-bold text-primary-text hover:bg-[#13131A]/80 transition cursor-pointer"
            >
              Sign In
            </button>
          ) : (
            <a
              href="/dashboard"
              className="flex h-7 w-7 rounded-full overflow-hidden border border-primary-purple/40 shrink-0"
              title="Go to Dashboard"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-primary-purple/20 text-primary-purple flex items-center justify-center text-[10px] font-bold">
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
                </div>
              )}
            </a>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-custom bg-card text-secondary-text hover:text-primary-text transition-colors duration-200 focus:outline-none cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border-custom bg-background/95 backdrop-blur-xl">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {NAV_LINKS.map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-secondary-text hover:text-primary-text hover:bg-card transition duration-200 focus:outline-none cursor-pointer"
              >
                {label}
              </button>
            ))}
            <div className="h-px bg-border-custom my-2" />
            <a
              href="/seniors"
              className="text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-primary-purple hover:text-secondary-purple hover:bg-card transition duration-200"
            >
              Talk to Verified Seniors ✨
            </a>

            {!user ? (
              <button
                onClick={() => {
                  setMobileOpen(false)
                  openLoginModal()
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-primary-text hover:bg-card transition duration-200 focus:outline-none cursor-pointer"
              >
                Sign In
              </button>
            ) : (
              <>
                <div className="h-px bg-border-custom my-2" />
                <div className="flex items-center gap-2.5 px-3 py-2">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name}
                      className="h-7 w-7 rounded-full object-cover border border-primary-purple/40"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-primary-purple/20 text-primary-purple flex items-center justify-center text-xs font-bold border border-primary-purple/40">
                      {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                  )}
                  <span className="text-sm font-bold text-primary-text truncate">
                    {profile?.name || 'Student'}
                  </span>
                </div>
                <a
                  href="/dashboard"
                  className="text-left px-3 py-2 rounded-xl text-xs font-semibold text-secondary-text hover:text-primary-text hover:bg-card transition duration-200"
                >
                  Dashboard
                </a>
                <a
                  href="/dashboard?tab=requests"
                  className="text-left px-3 py-2 rounded-xl text-xs font-semibold text-secondary-text hover:text-primary-text hover:bg-card transition duration-200"
                >
                  My Requests
                </a>
                <a
                  href="/dashboard?tab=purchases"
                  className="text-left px-3 py-2 rounded-xl text-xs font-semibold text-secondary-text hover:text-primary-text hover:bg-card transition duration-200"
                >
                  My Purchases
                </a>
                <a
                  href="/dashboard?tab=settings"
                  className="text-left px-3 py-2 rounded-xl text-xs font-semibold text-secondary-text hover:text-primary-text hover:bg-card transition duration-200"
                >
                  Settings
                </a>
                <button
                  onClick={() => {
                    setMobileOpen(false)
                    logout()
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-400 transition duration-200 focus:outline-none cursor-pointer"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

function Hero() {
  return (
    <section
      id="hero-section"
      className="relative overflow-hidden pt-8 pb-6 md:pt-14 md:pb-10"
    >
      {/* Premium subtle background radial glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[300px] w-[600px] md:h-[450px] md:w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary-purple/10 to-accent-blue/10 blur-[100px] md:blur-[140px]" />
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">

          {/* Small Trust Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border-custom bg-secondary-bg/60 px-3.5 py-1 text-xs text-secondary-text shadow-sm backdrop-blur-md hero-cinematic badge-glow-hover" style={{ animationDelay: '100ms' }}>
            <span className="text-sm">📊</span>
            <span className="font-semibold tracking-wide">Based on Official CSAB Cutoff Data</span>
          </div>

          {/* Main Heading (Reveal using masking) */}
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl leading-[1.15] text-primary-text">
            <span className="mask-reveal-container">
              <span className="mask-reveal-line" style={{ '--delay': '200ms' }}>CSAB 2026</span>
            </span>
            <span className="mask-reveal-container mt-1.5">
              <span className="block bg-gradient-to-r from-primary-purple via-secondary-purple to-accent-blue bg-clip-text text-transparent mask-reveal-line" style={{ '--delay': '320ms' }}>
                College Predictor
              </span>
            </span>
          </h1>

          {/* Short Description */}
          <p className="mt-4 text-sm sm:text-base text-secondary-text leading-relaxed hero-cinematic" style={{ animationDelay: '450ms' }}>
            Find colleges you can realistically get based on official CSAB opening and closing ranks.
          </p>

          {/* Credibility Badge */}
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border-custom bg-primary-purple/5 px-3 py-1 text-xs text-secondary-purple font-semibold hero-cinematic badge-glow-hover" style={{ animationDelay: '550ms' }}>
            <span>🎓</span>
            <span>Built by IIIT Vadodara Students</span>
          </div>

          {/* Feature Pills - 2x2 Grid */}
          <div className="mt-6 w-full max-w-xs grid grid-cols-2 gap-x-4 gap-y-2 px-4 justify-items-start text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary-text hero-cinematic" style={{ animationDelay: '650ms' }}>
              <span className="text-success font-bold">✓</span>
              <span>Completely Free</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary-text hero-cinematic" style={{ animationDelay: '700ms' }}>
              <span className="text-success font-bold">✓</span>
              <span>No Login Required</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary-text hero-cinematic" style={{ animationDelay: '750ms' }}>
              <span className="text-success font-bold">✓</span>
              <span>Official CSAB Data</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary-text hero-cinematic" style={{ animationDelay: '800ms' }}>
              <span className="text-success font-bold">✓</span>
              <span>Instant Results</span>
            </div>
          </div>

          {/* Hero CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
            {/* Primary CTA (Slightly lower for thumb reach) with spring reveals & magnetic button */}
            <div className="w-full sm:w-auto btn-spring-in" style={{ '--delay': '900ms' }}>
              <Magnetic>
                <Button
                  onClick={() => document.getElementById('predict')?.scrollIntoView({ behavior: 'smooth' })}
                  className="group w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-base font-bold shadow-md hover:shadow-[0_8px_32px_rgba(124,58,237,0.4)] transition-all duration-300 cursor-pointer inline-flex items-center justify-center gap-2 btn-premium"
                >
                  Predict My Colleges
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Magnetic>
            </div>

            {/* Secondary CTA - Talk to Verified Seniors */}
            <div className="w-full sm:w-auto">
              <Magnetic>
                <a
                  href="/seniors"
                  className="group w-full sm:w-auto px-8 py-3.5 rounded-2xl border border-primary-purple/35 bg-[#13131A]/85 backdrop-blur-md text-secondary-text hover:text-white text-base font-bold transition-all duration-300 hover:shadow-[0_0_20px_rgba(124,58,237,0.25)] hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer inline-flex items-center justify-center gap-2 btn-seniors-pulse"
                >
                  <span>Talk to Verified Seniors ✨</span>
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 text-secondary-purple font-bold" />
                </a>
              </Magnetic>
            </div>
            <style>{`
              @keyframes idleGlowPulse {
                0%, 100% {
                  border-color: rgba(124, 58, 237, 0.2);
                  box-shadow: 0 0 4px rgba(124, 58, 237, 0.05);
                }
                50% {
                  border-color: rgba(124, 58, 237, 0.45);
                  box-shadow: 0 0 12px rgba(124, 58, 237, 0.18);
                }
              }
              .btn-seniors-pulse {
                animation: idleGlowPulse 3s infinite ease-in-out;
              }
            `}</style>
          </div>

        </div>
      </div>
    </section>
  )
}

function fmt(n) {
  if (n === null || n === undefined || n === '') return '—'
  return Number(n).toLocaleString()
}

function ResultCard({ rec, index, highlight = false, savedPreferences = [], onSave }) {
  const [expanded, setExpanded] = useState(false);
  const shortInst = abbreviateInstituteName(rec.institute);
  const slideClass = index % 2 === 0 ? 'card-slide-left' : 'card-slide-right'
  const animDelay = `${(index % 6) * 70}ms`
  const isSaved = savedPreferences.some(
    p => p.institute === rec.institute && p.program === rec.program
  );

  return (
    <TiltCard
      className={slideClass}
      style={{ '--delay': animDelay }}
    >
      <div
        className={`relative rounded-2xl border p-4 transition-all duration-300 card-hover-lift ${highlight
            ? 'border-primary-purple/35 bg-gradient-to-br from-primary-purple/[0.08] via-card to-card/50 shadow-md shadow-primary-purple/[0.02]'
            : 'border-border-custom bg-card hover:bg-card/75 hover:border-secondary-text/25'
          }`}
      >
        <div className="flex justify-between items-start gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] mb-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#111118] border border-border-custom text-secondary-text text-[9px] font-bold font-mono">
                {index + 1}
              </span>
              {highlight && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-purple/10 border border-primary-purple/20 text-secondary-purple font-semibold uppercase tracking-wider text-[8px] sm:text-[9px]">
                  <Trophy className="h-2.5 w-2.5 shrink-0" /> Best Match
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-[#111118]/60 border border-border-custom text-secondary-text/80 text-[8px] sm:text-[9px] uppercase tracking-wider font-mono">
                R{rec.round}
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-bold leading-snug text-primary-text flex items-center gap-1.5">
              <Building2 className="h-4 w-4 shrink-0 text-primary-purple/80 hidden sm:block" />
              <span className="truncate" title={rec.institute}>{shortInst}</span>
            </h3>
            <p className="mt-1 text-xs text-secondary-text leading-snug flex items-center gap-1.5 font-medium">
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-secondary-text/40 hidden sm:block" />
              <span className="line-clamp-1" title={rec.program}>{rec.program}</span>
            </p>
          </div>

          <div className="shrink-0 text-right flex flex-col items-end">
            <div className="text-[10px] text-secondary-text/60 font-mono">
              CR: <strong className="text-primary-text font-bold">{fmt(rec.closingRank)}</strong>
            </div>
            <div className="text-xs sm:text-sm font-bold tabular-nums text-success bg-success/10 px-2 py-0.5 rounded border border-success/20 mt-1 inline-block">
              +{fmt(rec.rankGap)}
            </div>
            <div className="mt-2.5">
              {isSaved ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold">
                  Saved ✓
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSave && onSave({
                    institute: rec.institute,
                    program: rec.program,
                    branch: rec.branch || "Other",
                    type: rec.instituteType || "Other",
                    state: getInstituteState(rec.institute),
                    round: rec.round || 1
                  })}
                  className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-[10px] font-bold transition shadow-sm hover:shadow-primary-purple/20 cursor-pointer"
                >
                  Save College
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tags & Ranks Inline Strip */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-custom pt-2 text-[10px]">
          {/* Compact Metadata Tags */}
          <div className="flex flex-wrap items-center gap-1.5 text-secondary-text/50 font-mono text-[8px] sm:text-[9px]">
            <span>{rec.quota}</span>
            <span>|</span>
            <span>{rec.seatType}</span>
            <span>|</span>
            <span className="truncate max-w-[80px]">
              {rec.gender === 'Female-only (including Supernumerary)' ? 'Female' : 'Gender-Neutral'}
            </span>
          </div>

          {/* Ranks (Desktop shows opening rank, Mobile shows details toggle) */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 font-mono text-secondary-text/50 text-[9px] sm:text-[10px]">
              <span>Op: <strong className="text-primary-text/80 font-semibold">{fmt(rec.openingRank)}</strong></span>
            </div>

            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[9px] sm:hidden text-primary-purple hover:text-secondary-purple font-semibold transition py-0.5 px-2 rounded bg-primary-purple/5 border border-primary-purple/15"
            >
              {expanded ? "Hide Details" : "Show Details"}
            </button>
          </div>
        </div>

        {/* Collapsible details on mobile viewports */}
        {expanded && (
          <div className="mt-2.5 p-3 rounded-xl bg-background/80 border border-border-custom text-[10px] font-mono text-secondary-text/80 space-y-1 sm:hidden">
            <div>Opening Rank: <strong className="text-primary-text">{fmt(rec.openingRank)}</strong></div>
            <div>Seat Type: <strong className="text-primary-text">{rec.seatType}</strong></div>
            <div>Gender: <strong className="text-primary-text">{rec.gender}</strong></div>
            <div>Quota: <strong className="text-primary-text">{rec.quota}</strong></div>
          </div>
        )}
      </div>
    </TiltCard>
  )
}

// ─── Achievement Modal ──────────────────────────────────────────────────────
function AchievementModal({ isOpen, onClose, topColleges, eligibleCount }) {
  const cardRef = useRef(null)
  const [isSharing, setIsSharing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const generateImage = useCallback(async () => {
    if (!cardRef.current) return null
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      })
      return canvas
    } catch (err) {
      console.error('Canvas generation error:', err)
      return null
    }
  }, [])

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const canvas = await generateImage()
      if (!canvas) return
      const link = document.createElement('a')
      link.download = 'sahiseat-achievement.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setIsDownloading(false)
    }
  }

  const handleShare = async () => {
    setIsSharing(true)
    try {
      const canvas = await generateImage()
      if (!canvas) return
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const file = new File([blob], 'sahiseat-achievement.png', { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'My College Prediction Results',
            text: `I just found ${eligibleCount} eligible colleges on SahiSeat! Check it out.`,
            files: [file],
          })
        } else {
          // Fallback: download
          const link = document.createElement('a')
          link.download = 'sahiseat-achievement.png'
          link.href = canvas.toDataURL('image/png')
          link.click()
        }
      }, 'image/png')
    } catch (err) {
      console.error('Share error:', err)
    } finally {
      setIsSharing(false)
    }
  }

  if (!isOpen) return null

  const displayColleges = topColleges.slice(0, 4)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Achievement Card"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col gap-4 max-h-[95vh] overflow-y-auto">
        {/* The Achievement Card (rendered to canvas) */}
        <div
          ref={cardRef}
          id="achievement-card"
          style={{
            background: 'linear-gradient(135deg, #1a0533 0%, #2d0a6e 25%, #4c1199 50%, #6a21a6 75%, #9333ea 100%)',
            borderRadius: '24px',
            padding: '32px 28px',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            minWidth: '320px',
          }}
        >
          {/* Glassmorphism orb backgrounds */}
          <div style={{
            position: 'absolute', top: '-60px', right: '-60px',
            width: '200px', height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-40px', left: '-40px',
            width: '160px', height: '160px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(196,181,253,0.2) 0%, transparent 70%)',
            filter: 'blur(25px)',
          }} />
          <div style={{
            position: 'absolute', top: '40%', left: '50%',
            width: '300px', height: '300px',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} />

          {/* Grid texture overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            borderRadius: '24px',
          }} />

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '100px',
                padding: '4px 12px',
                backdropFilter: 'blur(8px)',
                marginBottom: '14px',
              }}>
                <span style={{ fontSize: '13px' }}>🎓</span>
                <span style={{ fontSize: '11px', color: 'rgba(216,180,254,0.9)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>SahiSeat Prediction</span>
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.95)',
                lineHeight: 1.35,
                letterSpacing: '-0.01em',
              }}>
                Your Rank Has More Potential
                <br />
                <span style={{ color: '#c4b5fd' }}>Than You Think</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{
              height: '1px',
              background: 'linear-gradient(to right, transparent, rgba(167,139,250,0.4), transparent)',
              marginBottom: '20px',
            }} />

            {/* Hero Count */}
            <div style={{
              textAlign: 'center',
              marginBottom: '20px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(167,139,250,0.25)',
              borderRadius: '16px',
              padding: '18px 16px',
              backdropFilter: 'blur(12px)',
            }}>
              <div style={{
                fontSize: '52px',
                fontWeight: 800,
                lineHeight: 1,
                background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 60%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '4px',
              }}>
                <CountUp end={eligibleCount} />
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'rgba(196,181,253,0.8)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}>
                Colleges Found
              </div>
            </div>

            {/* Top Matches */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'rgba(196,181,253,0.7)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: '10px',
                textAlign: 'center',
              }}>
                ✦ Top Matches ✦
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {displayColleges.map((college, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(167,139,250,0.2)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <span style={{ fontSize: '14px', flexShrink: 0 }}>🏆</span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.92)',
                      lineHeight: 1.3,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {abbreviateInstituteName(college)}
                    </span>
                  </div>
                ))}
                {displayColleges.length < 4 && Array.from({ length: 4 - displayColleges.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    style={{
                      height: '37px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px dashed rgba(167,139,250,0.15)',
                      borderRadius: '12px',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              textAlign: 'center',
              paddingTop: '14px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
              }}>
                <div style={{
                  width: '18px', height: '18px',
                  borderRadius: '5px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '10px' }}>🎓</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                  Sahi<span style={{ color: '#c084fc' }}>Seat</span>
                </span>
              </div>
              <div style={{
                fontSize: '8.5px',
                color: 'rgba(255,255,255,0.3)',
                lineHeight: 1.4,
                display: 'block',
              }}>
                Beta • Based on previous year JoSAA &amp; CSAB cutoff data. Predictions may vary.
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            id="achievement-share-btn"
            onClick={handleShare}
            disabled={isSharing}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
              border: 'none',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSharing ? 'wait' : 'pointer',
              opacity: isSharing ? 0.7 : 1,
              boxShadow: '0 4px 24px rgba(124,58,237,0.35)',
            }}
          >
            <Share2 size={15} />
            {isSharing ? 'Sharing…' : 'Share'}
          </button>
          <button
            id="achievement-download-btn"
            onClick={handleDownload}
            disabled={isDownloading}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isDownloading ? 'wait' : 'pointer',
              opacity: isDownloading ? 0.7 : 1,
              backdropFilter: 'blur(8px)',
            }}
          >
            <Download size={15} />
            {isDownloading ? 'Saving…' : 'Download'}
          </button>
          <button
            id="achievement-close-btn"
            onClick={onClose}
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function Results({ result, query, savedPreferences = [], onSave }) {
  const resultsRef = useRef(null)
  const [hsExpanded, setHsExpanded] = useState(false)
  const [achievementOpen, setAchievementOpen] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [instFilter, setInstFilter] = useState('All') // 'All', 'NIT', 'IIIT', 'GFTI'
  const [selectedBranches, setSelectedBranches] = useState([])
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [sortBy, setSortBy] = useState('Best Match') // 'Best Match', 'Lowest Closing Rank', 'Highest Closing Rank', 'Alphabetical'

  useEffect(() => {
    if (result && resultsRef.current) {
      if (window.lenis) {
        window.lenis.scrollTo(resultsRef.current, { duration: 1.2, offset: -60 })
      } else {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [result])

  if (!result) return null

  const {
    bestMatches = [],
    goodOptions = [],
    exploreMore = [],
    homeStateNitOpportunities = [],
    totalEligible = 0,
    totalEligibleColleges = 0
  } = result

  const firstNitName = homeStateNitOpportunities.length > 0
    ? abbreviateInstituteName(homeStateNitOpportunities[0].institute)
    : `NIT ${query.state}`

  // Filtering Logic
  const filterList = (list) => {
    return (list || []).filter(item => {
      if (!item) return false;
      const queryStr = searchTerm.toLowerCase().trim();
      const college = (item.institute || '').toLowerCase();
      const program = (item.program || '').toLowerCase();
      const instType = (item.instituteType || '').toLowerCase();
      const branchCode = (item.branch || '').toLowerCase();

      const matchesSearch = !searchTerm ||
        college.includes(queryStr) ||
        program.includes(queryStr) ||
        instType.includes(queryStr) ||
        branchCode.includes(queryStr);

      const matchesInst = instFilter === 'All' || instType === instFilter.toLowerCase();

      const programName = (
        item.program ||
        item.branch ||
        ''
      ).toLowerCase();

      const getBranchCategory = (programName) => {
        const p = (programName || '').toLowerCase();

        // CSE
        if (
          p.includes('computer science') ||
          p.includes('computer engineering')
        ) {
          return 'CSE';
        }

        // AI
        if (
          p.includes('artificial intelligence') ||
          p.includes('machine learning') ||
          p.includes('data science')
        ) {
          return 'AI';
        }

        // IT
        if (
          p.includes('information technology')
        ) {
          return 'IT';
        }

        // ECE
        if (
          p.includes('electronics and communication') ||
          p.includes('electronics & communication')
        ) {
          return 'ECE';
        }

        return 'OTHER';
      };

      const matchesBranch =
        selectedBranches.length === 0 ||
        selectedBranches.includes(
          getBranchCategory(programName)
        );
      console.log({
        program: item.program,
        selectedBranches,
        category: getBranchCategory(programName),
        matchesBranch
      });


      return matchesSearch && matchesInst && matchesBranch;
    });
  };

  // Sorting Logic
  const sortList = (list) => {
    const sorted = [...list];
    if (sortBy === 'Lowest Closing Rank') {
      sorted.sort((a, b) => (a.closingRank || 0) - (b.closingRank || 0));
    } else if (sortBy === 'Highest Closing Rank') {
      sorted.sort((a, b) => (b.closingRank || 0) - (a.closingRank || 0));
    } else if (sortBy === 'Alphabetical') {
      sorted.sort((a, b) => (a.institute || '').localeCompare(b.institute || ''));
    }
    return sorted;
  };

  const processedBest = sortList(filterList(bestMatches));
  const processedGood = sortList(filterList(goodOptions));
  const processedExplore = sortList(filterList(exploreMore));
  const processedHomeState = sortList(filterList(homeStateNitOpportunities));

  const hasMatches = processedBest.length > 0 || processedGood.length > 0 || processedExplore.length > 0 || processedHomeState.length > 0;

  return (
    <section ref={resultsRef} id="results" className="relative py-8 md:py-12 border-t border-border-custom bg-background">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">

          {/* Compact SaaS Filter Toolbar */}
          <div className="mb-6 space-y-3 hero-entrance">
            {/* Row 1: Search Input & Sorting */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Full-width Search */}
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-secondary-text/50">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search colleges or branches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border-custom bg-[#13131A] pl-10 pr-4 text-xs sm:text-sm text-primary-text placeholder:text-secondary-text/45 focus:outline-none focus:border-primary-purple/50 focus:ring-1 focus:ring-primary-purple/50 transition duration-200"
                />
              </div>

              {/* Sort By Dropdown */}
              <div className="w-full sm:w-52 relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border-custom bg-[#13131A] px-4 text-xs sm:text-sm text-primary-text focus:outline-none focus:border-primary-purple/50 transition appearance-none cursor-pointer pr-10"
                >
                  <option value="Best Match">Sort: Best Match</option>
                  <option value="Lowest Closing Rank">Sort: Lowest Closing</option>
                  <option value="Highest Closing Rank">Sort: Highest Closing</option>
                  <option value="Alphabetical">Sort: Alphabetical</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-secondary-text/50">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Row 2: Institute Type Selector & Branch Filters Button */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Subtle selectors for Institute filter */}
              <div className="flex rounded-xl border border-border-custom bg-[#13131A] p-0.5 gap-0.5">
                {['All', 'NIT', 'IIIT', 'GFTI'].map((type) => {
                  const isSel = instFilter === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInstFilter(type)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${isSel
                          ? 'bg-[#1c1c24] border border-border-custom/50 text-primary-text shadow-sm'
                          : 'border border-transparent text-secondary-text hover:text-primary-text'
                        }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>

              {/* Collapsible Trigger */}
              <button
                type="button"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="h-11 px-4 rounded-xl border border-border-custom bg-[#13131A] text-xs font-semibold text-secondary-text hover:text-primary-text transition cursor-pointer flex items-center gap-1.5"
              >
                <span>⚡ Branch Filters</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showMoreFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Collapsible Branch Filter Pills */}
            {showMoreFilters && (
              <div className="p-4 rounded-xl border border-border-custom bg-[#13131A]/40 flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-secondary-text/60 mr-2">Branches:</span>
                {['CSE', 'AI', 'IT', 'ECE'].map((branch) => {
                  const isSel = selectedBranches.includes(branch);
                  return (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => {
                        if (isSel) {
                          setSelectedBranches(selectedBranches.filter((b) => b !== branch));
                        } else {
                          setSelectedBranches([...selectedBranches, branch]);
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${isSel
                          ? 'bg-[#1c1c24] border-border-custom text-primary-text'
                          : 'bg-transparent border-border-custom/50 text-secondary-text hover:border-secondary-text hover:text-primary-text'
                        }`}
                    >
                      {branch}
                    </button>
                  );
                })}
                {selectedBranches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedBranches([])}
                    className="text-xs text-primary-purple hover:underline font-bold ml-auto cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Results Lists */}
          {!hasMatches ? (
            <Card className="border border-border-custom bg-card/50 rounded-2xl shadow-sm mt-4">
              <CardContent className="p-10 text-center">
                <div className="text-base font-bold text-primary-text">No matching options found.</div>
                <p className="mt-2 text-sm text-secondary-text max-w-md mx-auto">
                  Try adjusting your search terms or filters above to find matching choices.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Feature 1: Home State NIT Opportunities - Collapsible Premium Card */}
              {processedHomeState.length > 0 && (
                <div className="mb-6 hero-entrance" style={{ animationDelay: '100ms' }}>
                  <div className="rounded-2xl border border-primary-purple/20 bg-gradient-to-r from-primary-purple/[0.05] via-card to-card shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setHsExpanded(!hsExpanded)}
                      className="w-full flex items-center justify-between p-5 text-left transition hover:bg-white/[0.01] cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm sm:text-base font-extrabold text-primary-text flex items-center gap-2">
                          🏠 Your Home State Advantage
                        </span>
                        <span className="text-xs text-primary-purple font-semibold mt-1 inline-flex items-center gap-1">
                          <span>{firstNitName}</span>
                          <span>·</span>
                          <CountUp end={processedHomeState.length} />
                          <span>Eligible Program{processedHomeState.length > 1 ? 's' : ''}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-primary-purple font-bold bg-primary-purple/10 border border-primary-purple/20 px-4 py-1.5 rounded-full transition hover:bg-primary-purple/20">
                        <span>{hsExpanded ? "▲ Collapse" : "▼ Expand"}</span>
                      </div>
                    </button>
                    {hsExpanded && (
                      <div className="p-4 border-t border-border-custom bg-[#09090B]/50">
                        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                          {processedHomeState.map((rec, i) => (
                            <ResultCard key={`hs-nit-${i}`} rec={rec} index={i} highlight savedPreferences={savedPreferences} onSave={onSave} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bucket 1: Best Matches */}
              {processedBest.length > 0 && (
                <div className="mb-6 hero-entrance" style={{ animationDelay: '150ms' }}>
                  <div className="mb-3.5 flex items-center justify-between border-b border-border-custom pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏆</span>
                      <h3 className="text-sm sm:text-base font-extrabold text-primary-text tracking-tight">Best Matches</h3>
                      <span className="text-[10px] sm:text-xs text-secondary-text/80 font-normal inline-flex items-center gap-1">
                        <span>·</span>
                        <CountUp end={processedBest.length} />
                        <span>matching choices</span>
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-primary-purple/10 border border-primary-purple/20 text-secondary-purple text-[10px] font-bold font-mono uppercase tracking-wider">Top Tier</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                    {processedBest.map((rec, i) => (
                      <ResultCard key={`best-${i}`} rec={rec} index={i} highlight savedPreferences={savedPreferences} onSave={onSave} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Share Achievement Button ── */}
              {processedBest.length > 0 && (
                <div className="mb-6 flex justify-center">
                  <button
                    id="share-achievement-btn"
                    onClick={() => setAchievementOpen(true)}
                    className="group relative inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm text-white overflow-hidden transition-all duration-300 cursor-pointer shadow-md bg-gradient-to-r from-primary-purple to-accent-blue border border-primary-purple/20 hover:shadow-[0_8px_32px_rgba(124,58,237,0.4)] btn-premium"
                  >
                    <span className="text-base">🎉</span>
                    <span>Share Achievement</span>
                    <Share2 className="h-4.5 w-4.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}

              {/* Achievement Modal */}
              <AchievementModal
                isOpen={achievementOpen}
                onClose={() => setAchievementOpen(false)}
                topColleges={[
                  ...processedBest.slice(0, 4).map(r => r.institute),
                  ...processedGood.slice(0, Math.max(0, 4 - processedBest.length)).map(r => r.institute),
                ].slice(0, 4)}
                eligibleCount={totalEligibleColleges}
              />

              {/* Bucket 2: Good Options */}
              {processedGood.length > 0 && (
                <div className="mb-6 hero-entrance" style={{ animationDelay: '200ms' }}>
                  <div className="mb-3.5 flex items-center justify-between border-b border-border-custom pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎯</span>
                      <h3 className="text-sm sm:text-base font-extrabold text-primary-text tracking-tight">Good Options</h3>
                      <span className="text-[10px] sm:text-xs text-secondary-text/80 font-normal">
                        · {processedGood.length} matching choices
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-[10px] font-bold font-mono uppercase tracking-wider">Suitable</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3.5">
                    {processedGood.map((rec, i) => (
                      <ResultCard key={`good-${i}`} rec={rec} index={i + 10} savedPreferences={savedPreferences} onSave={onSave} />
                    ))}
                  </div>
                </div>
              )}

              {/* Bucket 3: Explore More */}
              {processedExplore.length > 0 && (
                <div className="mb-6 hero-entrance" style={{ animationDelay: '250ms' }}>
                  <div className="mb-3.5 flex items-center justify-between border-b border-border-custom pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔍</span>
                      <h3 className="text-sm sm:text-base font-extrabold text-primary-text tracking-tight">Explore More</h3>
                      <span className="text-[10px] sm:text-xs text-secondary-text/80 font-normal">
                        · {processedExplore.length} matching choices
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-secondary-text/10 border border-secondary-text/20 text-secondary-text text-[10px] font-bold font-mono uppercase tracking-wider font-semibold">Explore</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3.5">
                    {processedExplore.map((rec, i) => (
                      <ResultCard key={`explore-${i}`} rec={rec} index={i + 30} savedPreferences={savedPreferences} onSave={onSave} />
                    ))}
                  </div>
                </div>
              )}

              {totalEligible > 50 && (
                <p className="mt-6 text-center text-xs text-secondary-text/60">
                  Showing the first 50 of {totalEligible.toLocaleString()} eligible records, prioritizing your preferred branches.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function PredictForm({ onResult, hasResult, query }) {
  const [rank, setRank] = useState('')
  const [category, setCategory] = useState('')
  const [gender, setGender] = useState('Gender-Neutral')
  const [state, setState] = useState('')
  const [preferredBranches, setPreferredBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault()
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rank: Number(rank),
          category,
          gender,
          state,
          preferredBranches,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to predict')
        onResult(null, null)
      } else {
        onResult(json, { rank, category, gender, state, preferredBranches })
      }
    } catch (err) {
      setError(err.message || 'Network error')
      onResult(null, null)
    } finally {
      setLoading(false)
    }
  }

  const ready = rank && category && gender && state

  const isDirty = query && (
    Number(query.rank) !== Number(rank) ||
    query.category !== category ||
    query.gender !== gender ||
    query.state !== state ||
    JSON.stringify(query.preferredBranches) !== JSON.stringify(preferredBranches)
  )

  const showSticky = !hasResult || isDirty

  return (
    <section id="predict" className="relative py-10 md:py-16 bg-secondary-bg/25">
      <div className="container mx-auto px-4">
        <ScrollReveal className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-8 text-center reveal-item">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-custom bg-[#13131A]/60 px-3.5 py-1 text-xs text-secondary-text shadow-sm badge-glow-hover">
              <Target className="h-3.5 w-3.5 text-primary-purple" />
              <span className="font-semibold tracking-wide">CSAB College Analyzer</span>
            </div>
            <h2 className="mt-4 text-2xl md:text-4xl font-extrabold tracking-tight text-primary-text">
              Enter your details
            </h2>
            <p className="mt-2 text-sm text-secondary-text">
              We match your JEE Main CRL rank against official historical round cutoffs.
            </p>
          </div>

          {/* Premium Glassmorphic Form Card */}
          <Card className="relative overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[#13131A]/90 backdrop-blur-xl rounded-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.5)] reveal-item" style={{ '--delay': '150ms' }}>
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[80%] -translate-x-1/2 rounded-full bg-primary-purple/10 blur-3xl" />

            <CardContent className="relative p-6 md:p-10">
              <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">

                {/* JEE Rank Input */}
                <div className="md:col-span-2">
                  <Label htmlFor="rank" className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary-text">
                    <Trophy className="h-4 w-4 text-primary-purple shrink-0" />
                    <span>JEE Main CRL Rank</span>
                  </Label>
                  <Input
                    id="rank"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="e.g. 15000"
                    value={rank}
                    onChange={(e) => setRank(e.target.value.replace(/[^0-9]/g, ''))}
                    className="h-[56px] w-full rounded-2xl border border-border-custom bg-[#09090B] px-5 text-sm sm:text-base text-primary-text placeholder:text-secondary-text/30 focus-visible:ring-2 focus-visible:ring-primary-purple/20 focus-visible:border-primary-purple focus-visible:outline-none transition-all duration-200"
                  />
                  <p className="mt-2 text-xs text-secondary-text/60">
                    Provide your Common Rank List (CRL) rank, not category rank.
                  </p>
                </div>

                {/* Category Dropdown */}
                <div>
                  <Label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary-text">
                    <Tag className="h-4 w-4 text-primary-purple shrink-0" />
                    <span>Category</span>
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-[56px] rounded-2xl border border-border-custom bg-[#09090B] px-5 text-sm sm:text-base text-primary-text focus:outline-none focus:ring-2 focus:ring-primary-purple/20 focus:border-primary-purple transition-all duration-200">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender Dropdown */}
                <div>
                  <Label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary-text">
                    <User className="h-4 w-4 text-primary-purple shrink-0" />
                    <span>Gender</span>
                  </Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="h-[56px] rounded-2xl border border-border-custom bg-[#09090B] px-5 text-sm sm:text-base text-primary-text focus:outline-none focus:ring-2 focus:ring-primary-purple/20 focus:border-primary-purple transition-all duration-200">
                      <SelectValue placeholder="Select gender pool" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Home State Dropdown */}
                <div className="md:col-span-2">
                  <Label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary-text">
                    <MapPin className="h-4 w-4 text-primary-purple shrink-0" />
                    <span>Home State</span>
                  </Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger className="h-[56px] rounded-2xl border border-border-custom bg-[#09090B] px-5 text-sm sm:text-base text-primary-text focus:outline-none focus:ring-2 focus:ring-primary-purple/20 focus:border-primary-purple transition-all duration-200">
                      <SelectValue placeholder="Select your home state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Preferred Branches (Pills Selection) */}
                <div className="md:col-span-2">
                  <Label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary-text">
                    <Target className="h-4 w-4 text-primary-purple shrink-0" />
                    <span>Preferred Branches (Optional)</span>
                  </Label>
                  <div className="flex flex-wrap gap-2.5 mt-2">
                    {['CSE', 'AI', 'IT', 'ECE'].map((branch) => {
                      const isSel = preferredBranches.includes(branch);
                      return (
                        <button
                          key={branch}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              setPreferredBranches(preferredBranches.filter(b => b !== branch));
                            } else {
                              setPreferredBranches([...preferredBranches, branch]);
                            }
                          }}
                          className={`px-4 py-2 rounded-2xl text-xs font-semibold border transition-all duration-200 cursor-pointer ${isSel
                              ? 'bg-gradient-to-r from-primary-purple to-accent-blue border-transparent text-white shadow-md shadow-primary-purple/20'
                              : 'bg-[#111118] border-border-custom text-secondary-text hover:border-primary-purple/50 hover:text-primary-text'
                            }`}
                        >
                          {branch}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action CTA Button */}
                <div className="md:col-span-2 mt-4">
                  <Button
                    type="submit"
                    disabled={!ready || loading}
                    className="group h-[56px] w-full rounded-2xl bg-gradient-to-r from-primary-purple to-accent-blue text-base font-semibold text-white shadow-md hover:shadow-[0_8px_32px_rgba(124,58,237,0.4)] transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:shadow-none cursor-pointer flex items-center justify-center gap-2 btn-premium"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-white" />
                        Analyzing...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        Predict Colleges
                        <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </Button>
                  {error && (
                    <p className="mt-3 text-center text-xs text-rose-400 font-semibold">{error}</p>
                  )}
                  <p className="mt-3 text-center text-xs text-secondary-text/60">
                    Predicting across 1,400+ historical JoSAA &amp; CSAB counseling allocations.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </section>
  )
}

function Features() {
  const live = [
    { emoji: '🎯', title: 'Rank-Based Prediction', desc: 'Find colleges and branches based on your JEE Main rank.' },
    { emoji: '🏠', title: 'Home State Advantage', desc: 'Discover opportunities available through your home state quota.' },
    { emoji: '📊', title: 'Smart Recommendations', desc: 'Results grouped into Best Matches, Good Options and Explore More.' },
    { emoji: '⚡', title: 'Instant Results', desc: 'No signup required. Get recommendations instantly.' },
  ]
  const coming = [
    { emoji: '📋', title: 'Personalized Choice List Generator' },
    { emoji: '⚖', title: 'College Comparison Tool' },
    { emoji: '🧠', title: 'CSAB Strategy Assistant' },
    { emoji: '💾', title: 'Save & Track Choices' },
  ]
  return (
    <section id="features" className="py-12 md:py-20 bg-secondary-bg/15 border-t border-b border-border-custom">
      <div className="container mx-auto px-4">
        <ScrollReveal className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-primary-text">Features</h2>
        </ScrollReveal>

        {/* Live features */}
        <ScrollReveal className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {live.map(({ emoji, title, desc }, i) => (
              <TiltCard
                key={title}
                className="rounded-2xl border border-border-custom bg-card p-6 hover:border-primary-purple/35 transition-all duration-300 shadow-sm features-reveal-item"
                style={{
                  '--delay': `${i * 150}ms`,
                  '--rot': `${i % 2 === 0 ? '-1.5deg' : '1.5deg'}`
                }}
              >
                <div className="text-3xl mb-4">{emoji}</div>
                <h3 className="text-sm font-bold text-primary-text mb-2">{title}</h3>
                <p className="text-xs text-secondary-text leading-relaxed">{desc}</p>
              </TiltCard>
            ))}
          </div>
        </ScrollReveal>

        {/* Coming Soon */}
        <ScrollReveal className="mx-auto max-w-5xl mt-10">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs font-bold text-secondary-text uppercase tracking-widest">Coming Soon</span>
            <span className="text-base">🚀</span>
            <div className="flex-1 h-px bg-border-custom" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {coming.map(({ emoji, title }, i) => (
              <TiltCard
                key={title}
                className="rounded-2xl border border-border-custom bg-[#111118]/50 p-4.5 flex items-center gap-3.5 opacity-65 hover:opacity-85 transition-opacity features-reveal-item"
                style={{
                  '--delay': `${(i + 4) * 150}ms`,
                  '--rot': `${i % 2 === 0 ? '1.2deg' : '-1.2deg'}`
                }}
              >
                <span className="text-xl shrink-0">{emoji}</span>
                <span className="text-xs font-semibold text-secondary-text">{title}</span>
              </TiltCard>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', t: 'Enter details & rank', d: 'Provide your JEE CRL rank, category, gender, home state, and preferred branches.' },
    { n: '02', t: 'Smart analysis', d: 'We process your criteria against historical JoSAA and CSAB cutoff databases.' },
    { n: '03', t: 'Instant matches', d: 'Receive recommended engineering seats grouped logically by admission likelihood.' },
    { n: '04', t: 'Counseling strategy', d: 'Analyze safe options and reach strategy choices with historical assurance.' },
  ]
  return (
    <section id="how" className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <ScrollReveal className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-primary-text">How It Works</h2>
        </ScrollReveal>
        <ScrollReveal className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 how-grid-container">
            {steps.map((s, i) => (
              <TiltCard
                key={s.n}
                className="relative rounded-2xl border border-border-custom bg-[#13131A] bg-gradient-to-b from-card to-transparent p-6 hover:border-primary-purple/20 transition duration-300 step-reveal-item"
                style={{ '--delay': `${i * 200}ms` }}
              >
                <div className="text-xs font-bold tracking-widest text-primary-purple mb-3 font-mono">STEP {s.n}</div>
                <div className="text-sm font-bold text-primary-text mb-2">{s.t}</div>
                <p className="text-xs text-secondary-text leading-relaxed">{s.d}</p>
              </TiltCard>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function FAQ() {
  const [openIdx, setOpenIdx] = useState(null)
  const items = [
    {
      q: 'Is SahiSeat official?',
      a: 'No. SahiSeat is an independent guidance tool and is not affiliated with NTA, JoSAA or CSAB.',
    },
    {
      q: 'Does SahiSeat guarantee admission?',
      a: 'No. Recommendations are based on historical cutoff trends and should be used as a guide, not a guarantee.',
    },
    {
      q: 'Is the data based on JoSAA and CSAB cutoffs?',
      a: 'Yes. All predictions use official JoSAA and CSAB published closing rank data from previous rounds.',
    },
    {
      q: 'Do I need to create an account?',
      a: 'No. SahiSeat requires no registration. Just enter your details and get results instantly.',
    },
    {
      q: 'Is SahiSeat free?',
      a: 'Yes. SahiSeat is completely free to use.',
    },
  ]
  return (
    <section id="faq" className="py-12 md:py-20 bg-secondary-bg/15 border-t border-border-custom">
      <div className="container mx-auto px-4">
        <ScrollReveal className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-primary-text">Frequently Asked Questions</h2>
        </ScrollReveal>
        <ScrollReveal className="mx-auto max-w-2xl">
          <div className="space-y-3.5">
            {items.map(({ q, a }, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border-custom bg-card overflow-hidden transition duration-300 reveal-item"
                style={{ '--delay': `${i * 100}ms` }}
              >
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left text-sm font-semibold text-primary-text hover:bg-[#111118]/50 transition focus:outline-none cursor-pointer"
                >
                  <span>{q}</span>
                  <ChevronDown
                    className={`h-4.5 w-4.5 shrink-0 text-secondary-text/60 transition-transform duration-250 ${openIdx === i ? 'rotate-180' : ''
                      }`}
                  />
                </button>
                <div
                  className={`border-t border-border-custom bg-[#09090B]/30 leading-relaxed text-sm text-secondary-text transition-all duration-300 ${openIdx === i
                      ? 'max-h-[300px] px-6 pb-5 pt-4 opacity-100'
                      : 'max-h-0 px-6 py-0 opacity-0 overflow-hidden'
                    }`}
                >
                  {a}
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function About() {
  return (
    <section id="about" className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <ScrollReveal className="mx-auto max-w-xl">
          <div className="p-8 rounded-3xl border border-border-custom bg-card shadow-lg relative overflow-hidden card-hover-lift reveal-item">
            <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-primary-purple to-transparent" />

            <h2 className="text-2xl md:text-3xl font-extrabold text-primary-text tracking-tight mb-4">About SahiSeat</h2>
            <p className="text-sm text-secondary-text leading-relaxed mb-6">
              SahiSeat helps JEE aspirants make smarter JoSAA and CSAB counseling decisions using
              historical cutoff data and transparent recommendations. No guesswork. No black boxes.
            </p>
            <p className="text-sm text-secondary-text mb-6">
              Built by <span className="text-primary-purple font-bold">Vijayendra Ch &amp; Avinash</span> · IIIT Vadodara
            </p>

            <div className="grid grid-cols-2 gap-3.5 max-w-sm">
              <a
                href="https://www.linkedin.com/in/ch-vijayendraswamy/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-border-custom bg-secondary-bg px-4.5 py-3.5 text-xs font-semibold text-secondary-text hover:text-primary-text hover:bg-card hover:border-secondary-text/30 hover:-translate-y-0.5 transition duration-200"
              >
                <svg className="h-4 w-4 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </a>
              <a
                href="https://www.linkedin.com/in/avinash-mondenor-0579ab407/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-border-custom bg-secondary-bg px-4.5 py-3.5 text-xs font-semibold text-secondary-text hover:text-primary-text hover:bg-card hover:border-secondary-text/30 hover:-translate-y-0.5 transition duration-200"
              >
                <svg className="h-4 w-4 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </a>
              <a
                href="https://www.youtube.com/@SahiSeat"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-border-custom bg-secondary-bg px-4.5 py-3.5 text-xs font-semibold text-secondary-text hover:text-primary-text hover:bg-card hover:border-secondary-text/30 hover:-translate-y-0.5 transition duration-200"
              >
                <svg className="h-4 w-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                YouTube
              </a>
              <a
                href="https://www.instagram.com/sahiseat.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-border-custom bg-secondary-bg px-4.5 py-3.5 text-xs font-semibold text-secondary-text hover:text-primary-text hover:bg-card hover:border-secondary-text/30 hover:-translate-y-0.5 transition duration-200"
              >
                <svg className="h-4 w-4 text-pink-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                Instagram
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border-custom py-12 bg-background">
      <ScrollReveal className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row reveal-item">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary-purple to-accent-blue shadow-md">
              <GraduationCap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-primary-text">
              Sahi<span className="bg-gradient-to-r from-primary-purple to-secondary-purple bg-clip-text text-transparent">Seat</span>
            </span>
          </div>
          <p className="text-xs text-secondary-text/80 font-medium">
            © {new Date().getFullYear()} SahiSeat. Not affiliated with NTA, JoSAA or CSAB.
          </p>
        </div>
      </ScrollReveal>
    </footer>
  )
}

function getInstituteState(instName) {
  const name = (instName || "").toLowerCase();

  if (name.includes("jalandhar") || name.includes("punjab")) return "Punjab";
  if (name.includes("shibpur") || name.includes("durgapur") || name.includes("west bengal")) return "West Bengal";
  if (name.includes("jaipur") || name.includes("rajasthan")) return "Rajasthan";
  if (name.includes("bhopal") || name.includes("madhya pradesh")) return "Madhya Pradesh";
  if (name.includes("allahabad") || name.includes("uttar pradesh") || name.includes("lucknow")) return "Uttar Pradesh";
  if (name.includes("agartala") || name.includes("tripura")) return "Tripura";
  if (name.includes("arunachal")) return "Arunachal Pradesh";
  if (name.includes("calicut") || name.includes("krala") || name.includes("kerala")) return "Kerala";
  if (name.includes("delhi")) return "Delhi";
  if (name.includes("goa")) return "Goa";
  if (name.includes("hamirpur") || name.includes("himachal")) return "Himachal Pradesh";
  if (name.includes("surathkal") || name.includes("karnataka") || name.includes("dharwad")) return "Karnataka";
  if (name.includes("meghalaya")) return "Meghalaya";
  if (name.includes("nagaland")) return "Nagaland";
  if (name.includes("patna") || name.includes("bihar")) return "Bihar";
  if (name.includes("puducherry")) return "Puducherry";
  if (name.includes("raipur") || name.includes("chhattisgarh")) return "Chhattisgarh";
  if (name.includes("sikkim")) return "Sikkim";
  if (name.includes("andhra pradesh") || name.includes("visakhapatnam")) return "Andhra Pradesh";
  if (name.includes("jamshedpur") || name.includes("jharkhand")) return "Jharkhand";
  if (name.includes("kurukshetra") || name.includes("haryana")) return "Haryana";
  if (name.includes("manipur")) return "Manipur";
  if (name.includes("mizoram")) return "Mizoram";
  if (name.includes("rourkela") || name.includes("odisha")) return "Odisha";
  if (name.includes("silchar") || name.includes("assam")) return "Assam";
  if (name.includes("srinagar") || name.includes("jammu")) return "Jammu & Kashmir";
  if (name.includes("tiruchirappalli") || name.includes("tamil nadu")) return "Tamil Nadu";
  if (name.includes("uttarakhand")) return "Uttarakhand";
  if (name.includes("warangal") || name.includes("telangana")) return "Telangana";
  if (name.includes("surat") || name.includes("gujarat")) return "Gujarat";
  if (name.includes("nagpur") || name.includes("maharashtra") || name.includes("pune") || name.includes("mumbai")) return "Maharashtra";

  return "Other";
}

function ChoiceFillingDashboard({
  savedPreferences,
  setSavedPreferences,
  addPreference,
  moveUp,
  moveDown,
  removePreference,
  clearAllPreferences,
  exportPreferenceList,
  saveToDatabase,
  saveLoading,
  saveStatus
}) {
  const [colleges, setColleges] = useState([])
  const [leftSearch, setLeftSearch] = useState('')
  const [leftBranch, setLeftBranch] = useState('All')
  const [leftState, setLeftState] = useState('All')
  const [leftLoading, setLeftLoading] = useState(true)
  const [displayLimit, setDisplayLimit] = useState(100)

  // Modals state
  const { user, setLoginModalOpen } = useAuth()
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [isExpertModalOpen, setIsExpertModalOpen] = useState(false)
  const [expertRemarks, setExpertRemarks] = useState('')
  const [expertModalStep, setExpertModalStep] = useState('details') // details, paying, success
  const [expertModalLoading, setExpertModalLoading] = useState(false)

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await fetch('/api/colleges')
        const data = await res.json()
        if (Array.isArray(data)) {
          setColleges(data)
        }
      } catch (err) {
        console.error('Failed to load colleges:', err)
      } finally {
        setLeftLoading(false)
      }
    }
    fetchColleges()
  }, [])

  // Left panel filtering
  const filteredColleges = colleges.filter(c => {
    const matchesSearch = !leftSearch ||
      c.institute.toLowerCase().includes(leftSearch.toLowerCase()) ||
      c.program.toLowerCase().includes(leftSearch.toLowerCase());

    const matchesBranch = leftBranch === 'All' || c.branch === leftBranch;
    const matchesState = leftState === 'All' || c.state === leftState;

    return matchesSearch && matchesBranch && matchesState;
  })

  // Sorting
 const sortedColleges = [...filteredColleges].sort((a, b) => {
  const instComp = a.institute.localeCompare(b.institute);
  if (instComp !== 0) return instComp;
  return a.program.localeCompare(b.program);
});

const uniqueColleges = Array.from(
  new Map(
    sortedColleges.map((c) => [
      `${c.institute}-${c.program}`,
      c
    ])
  ).values()
);

  // Drag-and-drop Handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
  }

  const handleDrop = (e, targetIndex) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) return

    const newList = [...savedPreferences]
    const [draggedItem] = newList.splice(draggedIndex, 1)
    newList.splice(targetIndex, 0, draggedItem)

    setSavedPreferences(newList)
    localStorage.setItem('sahiseat_preferences', JSON.stringify(newList))
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // PDF Generator using jsPDF
  const downloadPreferencePDF = () => {
    if (savedPreferences.length === 0) {
      alert("Your preference list is empty. Add some colleges first!")
      return
    }
    const { jsPDF } = require('jspdf')
    const doc = new jsPDF()

    // Title / Header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(20)
    doc.setTextColor(124, 58, 237) // SahiSeat Purple #7C3AED
    doc.text("SahiSeat", 20, 20)

    doc.setFontSize(10)
    doc.setTextColor(113, 113, 122) // Gray
    doc.setFont("helvetica", "normal")
    doc.text("JoSAA & CSAB Choice Filling Preference List", 20, 26)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 20, 31)

    // Divider line
    doc.setDrawColor(228, 228, 231)
    doc.line(20, 36, 190, 36)

    // Subheader
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(28, 25, 23) // Dark #1C1917
    doc.text(`Total Choices Saved: ${savedPreferences.length}`, 20, 45)

    // Table headers
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("No.", 20, 55)
    doc.text("Institute", 32, 55)
    doc.text("Academic Program Name", 115, 55)
    doc.text("State", 175, 55)

    doc.line(20, 58, 190, 58)

    // Table rows
    let y = 66
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(82, 82, 91) // Body text #52525B

    savedPreferences.forEach((pref, index) => {
      // Handle page overflow
      if (y > 275) {
        doc.addPage()
        y = 25
        doc.line(20, y - 5, 190, y - 5)
      }

      // Draw index number
      doc.setFont("helvetica", "bold")
      doc.text(String(index + 1), 20, y)
      doc.setFont("helvetica", "normal")

      const instLines = doc.splitTextToSize(pref.institute || "", 80)
      const progLines = doc.splitTextToSize(pref.program || "", 58)

      doc.text(instLines, 32, y)
      doc.text(progLines, 115, y)
      doc.text(pref.state || "N/A", 175, y)

      const rowHeight = Math.max(instLines.length, progLines.length) * 4.5 + 4

      doc.setDrawColor(244, 244, 245)
      doc.line(20, y + rowHeight - 2, 190, y + rowHeight - 2)
      doc.setDrawColor(228, 228, 231) // reset

      y += rowHeight
    })

    doc.setFontSize(8)
    doc.setFont("helvetica", "italic")
    doc.text("Generated via SahiSeat Simulator (sahiseat.vercel.app). All rights reserved.", 20, 288)

    doc.save("SahiSeat_Preference_List.pdf")
  }

  // Handle Review with Expert submit
  const handleExpertPay = async () => {
    if (!user) {
      setLoginModalOpen(true)
      return
    }
    setExpertModalLoading(true)
    setExpertModalStep('paying')

    try {
      const amountInPaise = 9900 // ₹99

      const payment = await openRazorpayCheckout({
        amountInPaise,
        student_id: user.id,
        service_type: 'preference',
        remarks: expertRemarks.trim(),
        college: savedPreferences.length > 0 ? savedPreferences[0].institute : 'Multiple',
        branch: savedPreferences.length > 0 ? savedPreferences[0].program : '',
        name: 'SahiSeat',
        description: 'Preference List Expert Review',
        prefill: {
          name: user.user_metadata?.full_name || '',
          email: user.email || '',
          contact: '',
        }
      })

      if (!payment) {
        setExpertModalStep('details')
        return
      }

      const { error } = await supabase
        .from('preference_reviews')
        .insert({
          student_id: user.id,
          original_list: savedPreferences,
          feedback: expertRemarks.trim(),
          status: 'pending'
        })

      if (error) throw error

      setExpertModalStep('success')
    } catch (err) {
      console.error('Failed to process payment:', err)
      alert(err.message || 'Payment processing failed. Please try again.')
      setExpertModalStep('details')
    } finally {
      setExpertModalLoading(false)
    }
  }

  const handleOpenExpertReview = () => {
    if (savedPreferences.length === 0) {
      alert("Please add some colleges to your preference list first!")
      return
    }
    if (!user) {
      setLoginModalOpen(true)
      return
    }
    setExpertRemarks('')
    setExpertModalStep('details')
    setIsExpertModalOpen(true)
  }

  return (
    <section id="choice-filling" className="relative py-16 border-y border-[#E4E4E7] bg-[#FAF7F2] text-[#1C1917]">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8 text-center hero-entrance">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E4E7] bg-white px-3.5 py-1 text-xs text-[#52525B] shadow-sm">
            <ListChecks className="h-3.5 w-3.5 text-[#7C3AED]" />
            <span className="font-semibold tracking-wide">JoSAA Choice Filling Simulator</span>
          </div>
          <h2 className="mt-4 text-2xl md:text-3xl font-extrabold tracking-tight text-[#1C1917]">
            Saved Colleges & Preference List
          </h2>
          <p className="mt-2 text-xs text-[#52525B] max-w-xl mx-auto">
            Review available seats, drag to reorder preferences, and submit your list for manual auditing.
          </p>
        </div>

        {/* Outer Dashboard box */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto items-stretch">

          {/* LEFT PANEL: Available Choices */}
          <div className="bg-white border border-[#E4E4E7] rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col h-[650px] text-left">
            <div className="space-y-4 pb-4 border-b border-[#E4E4E7] shrink-0">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#1C1917] flex items-center gap-2">
                  <span>📖</span> Available Choices
                </h3>
                <span className="text-[10px] text-[#71717A] font-mono">Found: <strong>{uniqueColleges.length}</strong></span>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#A1A1AA]">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search college, program, or branch..."
                  value={leftSearch}
                  onChange={(e) => {
                    setLeftSearch(e.target.value);
                    setDisplayLimit(100);
                  }}
                  className="h-10 w-full rounded-xl border border-[#D4D4D8] bg-white pl-9 pr-4 text-xs text-[#1C1917] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all"
                />
              </div>

              {/* Advanced Filter grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="prefBranch" className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block">Branch</label>
                  <select
                    id="prefBranch"
                    value={leftBranch}
                    onChange={(e) => { setLeftBranch(e.target.value); setDisplayLimit(100); }}
                    className="h-10 w-full rounded-xl border border-[#D4D4D8] bg-white px-3 text-xs text-[#1C1917] focus:outline-none focus:border-[#7C3AED] cursor-pointer truncate shadow-sm"
                  >
                    <option value="All">All Branches</option>
                    <option value="CSE">CSE</option>
                    <option value="AI">AI</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                    <option value="EE">EE</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                    <option value="Chemical">Chemical</option>
                    <option value="Biotechnology">Biotechnology</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="prefState" className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block">State</label>
                  <select
                    id="prefState"
                    value={leftState}
                    onChange={(e) => { setLeftState(e.target.value); setDisplayLimit(100); }}
                    className="h-10 w-full rounded-xl border border-[#D4D4D8] bg-white px-3 text-xs text-[#1C1917] focus:outline-none focus:border-[#7C3AED] cursor-pointer truncate shadow-sm"
                  >
                    <option value="All">All States</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Available options list */}
            <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-2.5 no-scrollbar">
              {leftLoading ? (
                <div className="text-center py-10 text-xs text-[#71717A]">Loading college list...</div>
              ) : sortedColleges.length === 0 ? (
                <div className="text-center py-10 text-xs text-[#71717A]">No choices matching criteria.</div>
              ) : (
                <>
                  {uniqueColleges.slice(0, displayLimit).map((c, i) => {
                    const isAdded = savedPreferences.some(
                      p => p.institute === c.institute && p.program === c.program
                    );
                    const uniqueColleges = Array.from(
  new Map(
    sortedColleges.map((c) => [
      `${c.institute}-${c.program}`,
      c
    ])
  ).values()
);
                    return (
                      <div key={i} className="p-3 rounded-xl border border-[#E4E4E7] bg-[#FAF9F6] hover:border-[#7C3AED]/50 hover:bg-white transition-all duration-200 flex items-center justify-between gap-3 text-left shadow-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-[11px] font-bold text-[#1C1917] leading-snug truncate flex-1" title={c.institute}>
                              {c.institute}
                            </h4>
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold bg-accent-blue/10 border border-accent-blue/20 text-[#0369A1]">{c.state}</span>
                          </div>
                          <p className="text-[10px] text-[#52525B] leading-relaxed mt-0.5 truncate" title={c.program}>
                            {c.program}
                          </p>
                        </div>
                        {isAdded ? (
                          <span className="shrink-0 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[9px] font-bold">
                            Added ✓
                          </span>
                        ) : (
                          <button
                            onClick={() => addPreference(c)}
                            className="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-105 text-white text-[9px] font-bold transition cursor-pointer shadow-sm"
                          >
                            + Add Choice
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {uniqueColleges.length > displayLimit && (
                    <button
                      onClick={() => setDisplayLimit(prev => prev + 100)}
                      className="w-full py-2 rounded-xl border border-[#D4D4D8] bg-white hover:bg-[#FAF9F6] text-[10px] text-[#52525B] hover:text-[#1C1917] transition cursor-pointer font-bold shadow-sm"
                    >
                      Load More ({uniqueColleges.length - displayLimit} remaining)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Selected Preferences list */}
          <div className="bg-white border border-[#E4E4E7] rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col h-[650px] text-left">
            <div className="space-y-4 pb-4 border-b border-[#E4E4E7] shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#1C1917] flex items-center gap-2">
                  <span>📋</span> Your Preference List
                </h3>
                <button
                  onClick={clearAllPreferences}
                  className="px-2.5 py-1 rounded-lg border border-[#D4D4D8] bg-white hover:bg-rose-50 hover:border-rose-200 text-[#52525B] hover:text-rose-600 text-[10px] font-bold transition cursor-pointer"
                >
                  Clear All
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#52525B]">
                  Total Saved Preferences: <strong>{savedPreferences.length}</strong>
                </span>
                <span className="text-[9px] text-[#7C3AED] font-mono uppercase font-bold tracking-wider">Drag row to reorder</span>
              </div>
            </div>

            {/* Priority order preference list */}
            <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-2.5 no-scrollbar">
              {savedPreferences.length === 0 ? (
                <div className="text-center py-20 text-xs text-[#71717A] flex flex-col items-center justify-center space-y-3 h-full border border-dashed border-[#D4D4D8] rounded-2xl bg-[#FAF9F6]/40">
                  <span className="text-lg">📥</span>
                  <span className="max-w-[200px] text-center text-[#52525B]">Your preference list is empty. Click "+ Add Choice" on the left to start.</span>
                </div>
              ) : (
                savedPreferences.map((p, index) => {
                  const isDragTarget = dragOverIndex === index;
                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnter={() => setDragOverIndex(index)}
                      onDragLeave={() => setDragOverIndex(null)}
                      className={`p-3 rounded-xl border bg-white flex items-center justify-between gap-3 text-left transition-all duration-200 cursor-grab active:cursor-grabbing shadow-sm ${isDragTarget
                          ? 'border-[#7C3AED] bg-[#7C3AED]/5 shadow-md scale-[1.01]'
                          : 'border-[#E4E4E7] hover:border-[#7C3AED]/40'
                        }`}
                    >
                      <div className="min-w-0 flex items-start gap-2.5">
                        {/* Preference Number tag */}
                        <span className="h-5.5 w-5.5 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#6D28D9] text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-[11px] font-bold text-[#1C1917] leading-snug truncate" title={p.institute}>
                            {p.institute}
                          </h4>
                          <p className="text-[10px] text-[#52525B] mt-0.5 truncate" title={p.program}>
                            {p.program}
                          </p>
                        </div>
                      </div>

                      {/* Item controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg border border-[#E4E4E7] hover:bg-[#FAF9F6] text-[#52525B] hover:text-[#1C1917] transition disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => moveDown(index)}
                          disabled={index === savedPreferences.length - 1}
                          className="p-1.5 rounded-lg border border-[#E4E4E7] hover:bg-[#FAF9F6] text-[#52525B] hover:text-[#1C1917] transition disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removePreference(p.institute, p.program)}
                          className="p-1.5 rounded-lg border border-[#E4E4E7] hover:bg-rose-50 hover:border-rose-200 text-[#52525B] hover:text-rose-600 transition cursor-pointer"
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="sticky bottom-4 left-0 right-0 z-40 max-w-6xl mx-auto px-4 mt-6">
          <div className="backdrop-blur-xl bg-white/90 border border-[#FAF7F2] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
            <div className="text-center sm:text-left hidden sm:block">
              <span className="text-[10px] text-[#7C3AED] font-mono uppercase font-bold tracking-wider">JoSAA Preference List</span>
              <h4 className="text-xs sm:text-sm font-extrabold text-[#1C1917] mt-0.5">{savedPreferences.length} choices saved</h4>
            </div>

            <div className="sm:hidden text-left w-full border-b border-[#E4E4E7] pb-1.5 mb-0.5 flex justify-between items-center">
              <span className="text-[11px] font-bold text-[#1C1917]">{savedPreferences.length} choices saved</span>
              <span className="text-[9px] text-[#7C3AED] font-mono font-bold uppercase tracking-wider">JoSAA Simulator</span>
            </div>

            <div className="flex gap-2.5 flex-wrap w-full sm:w-auto justify-center sm:justify-end">
              <button
                onClick={downloadPreferencePDF}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white hover:bg-[#FAF9F6] border border-[#D4D4D8] text-[#1C1917] text-xs font-bold transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>⬇️</span> Download PDF
              </button>
              <button
                onClick={handleOpenExpertReview}
                className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] hover:brightness-105 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>⭐</span> Review with Expert ₹99
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* EXPERT REVIEW & PAYMENT MODAL OVERLAY */}
      {isExpertModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !expertModalLoading && setIsExpertModalOpen(false)} />

          <div className="relative z-10 w-full max-w-lg bg-white border border-[#E4E4E7] rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col justify-between text-left animate-in zoom-in-95 duration-200 text-[#1C1917]">
            {!expertModalLoading && (
              <button
                onClick={() => setIsExpertModalOpen(false)}
                className="absolute right-6 top-6 text-[#71717A] hover:text-[#1C1917] transition cursor-pointer focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {/* STEP 1: ENTER DETAILS */}
            {expertModalStep === 'details' && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-[#7C3AED] font-mono uppercase font-bold tracking-wider">Premium Choice-Filling Audit</span>
                  <h3 className="text-lg font-black text-[#1C1917]">Review with SahiSeat Expert</h3>
                  <p className="text-xs text-[#52525B] leading-relaxed">
                    Have verified college seniors and counseling experts audit your preference order. Get detailed corrections returned to your dashboard in 12 hours.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E4E4E7] space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#1C1917]">
                    <span className="font-medium text-[#52525B]">Preference List Imported:</span>
                    <strong className="text-emerald-600">✓ Connected</strong>
                  </div>
                  <div className="text-xs text-[#1C1917] flex justify-between">
                    <span className="font-medium text-[#52525B]">Total Choices Selected:</span>
                    <strong className="font-bold">{savedPreferences.length} Colleges</strong>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="remarks" className="text-xs font-bold text-[#1C1917]">Tell us about yourself / Remarks</label>
                  <textarea
                    id="remarks"
                    rows={4}
                    value={expertRemarks}
                    onChange={(e) => setExpertRemarks(e.target.value)}
                    placeholder="How should I prepare from Day One?&#10;What are your current strengths?&#10;What are you struggling with?&#10;What do you want to improve?&#10;Any specific goals or concerns?"
                    className="w-full p-3.5 bg-white border border-[#D4D4D8] rounded-xl text-xs text-[#1C1917] focus:border-[#7C3AED] outline-none transition font-sans resize-none placeholder:text-[#A1A1AA]/70 shadow-sm"
                  />
                </div>

                <div className="pt-4 border-t border-[#E4E4E7] flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[9px] text-[#71717A] uppercase font-mono block">Premium Audit</span>
                    <strong className="text-lg font-black text-[#1C1917]">₹99</strong>
                  </div>
                  <button
                    onClick={handleExpertPay}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white text-xs font-black rounded-xl hover:brightness-105 shadow-md transition cursor-pointer"
                  >
                    Proceed to Payment (₹99) →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PROCESSING MOCK PAYMENT */}
            {expertModalStep === 'paying' && (
              <div className="text-center py-10 space-y-6">
                <div className="h-10 w-10 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-[#1C1917]">Escrow Payment Processing...</h4>
                  <p className="text-xs text-[#52525B] max-w-xs mx-auto">
                    Please do not close this modal or refresh the page. We are securely validating your ₹99 transaction.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: PAYMENT SUCCESS */}
            {expertModalStep === 'success' && (
              <div className="text-center py-4 space-y-5">
                <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <Check className="h-7 w-7 text-emerald-600" />
                </div>

                <div className="space-y-1.5">
                  <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-mono font-bold uppercase tracking-wider">
                    Payment Successful
                  </Badge>
                  <h3 className="text-base font-extrabold text-[#1C1917]">Review Request Created!</h3>
                  <p className="text-xs text-[#52525B] leading-relaxed max-w-sm mx-auto">
                    Your preference list has been securely imported. Our senior choice-filling experts will review your details and send a completed audit directly to your dashboard in <strong>12 Hours</strong>.
                  </p>
                </div>

                <button
                  onClick={() => setIsExpertModalOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-[#D4D4D8] bg-[#FAF9F6] hover:bg-white text-xs text-[#1C1917] transition font-extrabold shadow-sm"
                >
                  Got It
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

const App = () => {
  const [result, setResult] = useState(null)
  const [query, setQuery] = useState(null)

  // PREFERENCE LIST STATES
  const [savedPreferences, setSavedPreferences] = useState([])
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const { user, openLoginModal } = useAuth()

  // Load preferences on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('sahiseat_preferences')
      if (local) {
        try {
          setSavedPreferences(JSON.parse(local))
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [])

  // Sync preferences on login state change
  useEffect(() => {
    const syncPreferences = async () => {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from('saved_preferences')
          .select('preferences')
          .eq('student_id', user.id)
          .maybeSingle()

        if (error) throw error

        const localListStr = localStorage.getItem('sahiseat_preferences')
        const localList = localListStr ? JSON.parse(localListStr) : []

        if (data && data.preferences) {
          setSavedPreferences(data.preferences)
          localStorage.setItem('sahiseat_preferences', JSON.stringify(data.preferences))
        } else if (localList && localList.length > 0) {
          // First login after signup: insert local preferences to cloud
          await supabase
            .from('saved_preferences')
            .upsert({
              student_id: user.id,
              name: 'Main Choice List',
              preferences: localList,
              created_at: new Date().toISOString()
            }, {
              onConflict: 'student_id'
            })
          setSavedPreferences(localList)
        }
      } catch (err) {
        console.error('Failed to sync preferences:', err)
      }
    }
    syncPreferences()
  }, [user])

  const syncToCloud = async (updatedList) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('saved_preferences')
        .upsert({
          student_id: user.id,
          name: 'Main Choice List',
          preferences: updatedList,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'student_id'
        })
      if (error) throw error
    } catch (err) {
      console.error('Failed to auto-sync preferences to cloud:', err)
    }
  }

  const saveLocally = (updatedList) => {
    localStorage.setItem('sahiseat_preferences', JSON.stringify(updatedList))
  }

  const addPreference = (college) => {
    const exists = savedPreferences.some(
      p => p.institute === college.institute && p.program === college.program
    )
    if (exists) return
    const updated = [...savedPreferences, college]
    setSavedPreferences(updated)
    saveLocally(updated)
    syncToCloud(updated)
  }

  const moveUp = (index) => {
    if (index === 0) return
    const updated = [...savedPreferences]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    setSavedPreferences(updated)
    saveLocally(updated)
    syncToCloud(updated)
  }

  const moveDown = (index) => {
    if (index === savedPreferences.length - 1) return
    const updated = [...savedPreferences]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    setSavedPreferences(updated)
    saveLocally(updated)
    syncToCloud(updated)
  }

  const removePreference = (institute, program) => {
    const updated = savedPreferences.filter(
      p => !(p.institute === institute && p.program === program)
    )
    setSavedPreferences(updated)
    saveLocally(updated)
    syncToCloud(updated)
  }

  const clearAllPreferences = () => {
    if (window.confirm("Are you sure you want to clear your preference list?")) {
      setSavedPreferences([])
      saveLocally([])
      syncToCloud([])
    }
  }

  const exportPreferenceList = () => {
    if (savedPreferences.length === 0) {
      alert("Your preference list is empty. Add some colleges first!")
      return
    }
    let text = "SahiSeat JoSAA/CSAB Choice Preference List\n"
    text += "==================================================\n\n"
    savedPreferences.forEach((p, idx) => {
      text += `${idx + 1}. [${p.type}] ${p.institute} -- ${p.program} (State: ${p.state})\n`
    })

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "sahiseat_choices.txt"
    link.click()
    URL.revokeObjectURL(url)
  }

  const saveToDatabase = async () => {
    if (!user) {
      openLoginModal()
      return
    }
    setSaveLoading(true)
    setSaveStatus('')
    try {
      await syncToCloud(savedPreferences)
      setSaveStatus('Preferences saved to cloud successfully! ✓')
      setTimeout(() => setSaveStatus(''), 4000)
    } catch (err) {
      console.error('Database save error:', err)
      setSaveStatus('Failed to save to database. Please check connection.')
    } finally {
      setSaveLoading(false)
    }
  }

  const onResult = (r, q) => {
    if (r) {
      const filterRecord = (item) => {
        if (!item) return false;
        const program = (item.program || '').toLowerCase();
        const institute = (item.institute || '').toLowerCase();
        const seatType = (item.seatType || '').toLowerCase();
        const quota = (item.quota || '').toLowerCase();

        // 1. Exclude ALL Architecture-related programs
        if (program.includes('arch') || program.includes('architecture')) {
          return false;
        }

        // 2. Exclude ALL Planning-related programs
        if (program.includes('planning') || program.includes('bplan') || program.includes('b.plan')) {
          return false;
        }

        // 3. Exclude ALL Schools of Planning and Architecture
        if (
          institute.includes('school of planning') ||
          institute.includes('spa') ||
          institute.includes('planning and architecture')
        ) {
          return false;
        }

        // 4. Exclude DASA / Foreign / NRI / OCI / PIO / CIWG / International quota
        if (
          quota.includes('dasa') ||
          quota.includes('foreign') ||
          quota.includes('nri') ||
          quota.includes('oci') ||
          quota.includes('pio') ||
          quota.includes('ciwg') ||
          quota.includes('international') ||
          seatType.includes('dasa') ||
          seatType.includes('foreign') ||
          seatType.includes('nri') ||
          seatType.includes('oci') ||
          seatType.includes('pio') ||
          seatType.includes('ciwg') ||
          seatType.includes('international') ||
          program.includes('dasa') ||
          program.includes('nri') ||
          program.includes('foreign')
        ) {
          return false;
        }

        // Only allow B.Tech / B.E. programs
        const isBTech =
          program.includes('b.tech') ||
          program.includes('b.e.') ||
          program.includes('bachelor of technology') ||
          program.includes('bachelor of engineering') ||
          program.includes('b. tech') ||
          program.includes('b. e.');
        if (!isBTech) return false;

        return true;
      };

      // Final Validation Step (Bulletproof Verification)
      const finalValidation = (list) => {
        return (list || []).filter(item => {
          if (!item) return false;
          const p = (item.program || '').toLowerCase();
          const inst = (item.institute || '').toLowerCase();
          const q = (item.quota || '').toLowerCase();
          const st = (item.seatType || '').toLowerCase();

          const isArch = p.includes('arch') || p.includes('architecture');
          const isPlan = p.includes('planning') || p.includes('bplan') || p.includes('b.plan');
          const isSpa = inst.includes('school of planning') || inst.includes('spa') || inst.includes('planning and architecture');
          const isDasa = q.includes('dasa') || q.includes('foreign') || q.includes('nri') || q.includes('oci') || q.includes('pio') ||
            st.includes('dasa') || st.includes('foreign') || st.includes('nri') || st.includes('oci') || st.includes('pio') ||
            p.includes('dasa') || p.includes('nri') || p.includes('foreign');

          return !isArch && !isPlan && !isSpa && !isDasa;
        });
      };

      const filteredBestMatches = finalValidation((r.bestMatches || []).filter(filterRecord));
      const filteredGoodOptions = finalValidation((r.goodOptions || []).filter(filterRecord));
      const filteredExploreMore = finalValidation((r.exploreMore || []).filter(filterRecord));
      const filteredHomeState = finalValidation((r.homeStateNitOpportunities || []).filter(filterRecord));
      const filteredAllEligible = finalValidation((r.allEligible || []).filter(filterRecord));

      const allFiltered = [...filteredBestMatches, ...filteredGoodOptions, ...filteredExploreMore];

      const filteredResult = {
        ...r,
        bestMatches: filteredBestMatches,
        goodOptions: filteredGoodOptions,
        exploreMore: filteredExploreMore,
        homeStateNitOpportunities: filteredHomeState,
        allEligible: filteredAllEligible,
        totalEligible: allFiltered.length,
        totalEligibleColleges: new Set(
          [...allFiltered, ...filteredHomeState].map(item => item.institute)
        ).size,
      };

      if (filteredResult.diagnostics) {
        let nit = 0, iiit = 0, gfti = 0, other = 0;
        allFiltered.forEach(item => {
          if (item.instituteType === 'NIT') nit++;
          else if (item.instituteType === 'IIIT') iiit++;
          else if (item.instituteType === 'GFTI') gfti++;
          else other++;
        });
        filteredResult.diagnostics = {
          ...filteredResult.diagnostics,
          totalEligibleBeforeSorting: allFiltered.length,
          eligibleNitCount: nit,
          eligibleIiitCount: iiit,
          eligibleGftiCount: gfti,
          eligibleOtherCount: other,
        };
      }

      setResult(filteredResult);
    } else {
      setResult(null);
    }
    setQuery(q);
  }

  const onReset = () => {
    setResult(null)
    setQuery(null)
    const element = document.getElementById("predict")
    if (element) {
      if (window.lenis) {
        window.lenis.scrollTo(element, { duration: 1.2, offset: -60 })
      } else {
        element.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  const [showFloatingCta, setShowFloatingCta] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const predictEl = document.getElementById("predict");
      if (!predictEl) return;
      const predictRect = predictEl.getBoundingClientRect();
      const isFormVisible = predictRect.top < window.innerHeight && predictRect.bottom > 0;

      const choiceFillingEl = document.getElementById("choice-filling");
      let isChoiceFillingVisible = false;
      if (choiceFillingEl) {
        const cfRect = choiceFillingEl.getBoundingClientRect();
        isChoiceFillingVisible = cfRect.top < window.innerHeight && cfRect.bottom > 0;
      }

      setShowFloatingCta(window.scrollY > 350 && !isFormVisible && !isChoiceFillingVisible);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [activeSection, setActiveSection] = useState('predict')

  // Lenis smooth scroll (Only on Desktop to prevent mobile touch scroll locking)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.innerWidth <= 768) return

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      direction: 'vertical',
      smooth: true,
    })

    window.lenis = lenis

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    const resizeObserver = new ResizeObserver(() => {
      lenis.resize()
    })
    resizeObserver.observe(document.body)

    return () => {
      resizeObserver.disconnect()
      lenis.destroy()
      window.lenis = null
    }
  }, [])

  // Section observer for header link highlights
  useEffect(() => {
    const sections = ['predict', 'choice-filling', 'features', 'how', 'faq', 'about']
    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -60% 0px',
      threshold: 0,
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      })
    }, observerOptions)

    sections.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <div className="grain-overlay" />
      <InteractiveParticles />
      <Nav hasResult={!!result} onReset={onReset} activeSection={activeSection} />
      <Hero />
      <PredictForm onResult={onResult} hasResult={!!result} query={query} />
      {result && query && (
        <Results
          result={result}
          query={query}
          savedPreferences={savedPreferences}
          onSave={addPreference}
        />
      )}
      <ChoiceFillingDashboard
        savedPreferences={savedPreferences}
        setSavedPreferences={setSavedPreferences}
        addPreference={addPreference}
        moveUp={moveUp}
        moveDown={moveDown}
        removePreference={removePreference}
        clearAllPreferences={clearAllPreferences}
        exportPreferenceList={exportPreferenceList}
        saveToDatabase={saveToDatabase}
        saveLoading={saveLoading}
        saveStatus={saveStatus}
      />
      <Features />
      <HowItWorks />
      <FAQ />
      <About />
      <Footer />

      {/* Floating Hero CTA */}
      {showFloatingCta && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[280px] sm:max-w-sm px-4 pb-safe transition-all duration-300 animate-hero-entrance">
          <Button
            onClick={() => {
              const el = document.getElementById('predict');
              if (el) {
                if (window.lenis) {
                  window.lenis.scrollTo(el, { duration: 1.2, offset: -60 })
                } else {
                  el.scrollIntoView({ behavior: 'smooth' })
                }
              }
            }}
            className="w-full h-11 sm:h-[52px] rounded-full sm:rounded-2xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-xs sm:text-sm font-bold shadow-lg shadow-primary-purple/20 hover:shadow-[0_8px_32px_rgba(124,58,237,0.4)] transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 btn-premium"
          >
            <span>Predict My Colleges</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Button>
        </div>
      )}
      <LoginModal />
    </main>
  )
}

export default App
