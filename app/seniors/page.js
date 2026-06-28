'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  GraduationCap,
  ShieldCheck,
  Search,
  X,
  Check,
  Clock,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Sparkles,
  Upload,
  Sparkle,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  ShoppingCart,
  Settings,
} from 'lucide-react'
import InteractiveParticles from '@/components/InteractiveParticles'
import { useAuth } from '@/context/AuthContext'
import LoginModal from '@/components/LoginModal'
import { supabase } from '@/lib/supabase'
import { openRazorpayCheckout } from '@/lib/razorpayClient'

const DISCUSS_TOPICS = [
  "Placements",
  "Scholarships",
  "Hostel Life",
  "Coding Culture",
  "Internships",
  "Professors",
  "Attendance",
  "Clubs",
  "Hidden Opportunities",
  "College Reality",
  "Branch Comparison",
  "Campus Life"
]

const SECTIONS = [
  { id: 'hero', label: 'Hero' },
  { id: 'guidance', label: 'Guidance' },
  { id: 'classmates', label: 'Classmates' },
  { id: 'preference-review', label: 'Preference Review' },
  { id: 'roadmaps', label: 'Roadmap' },
  { id: 'communities', label: 'Communities' },
  { id: 'trust', label: 'Trust' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'pricing', label: 'Pricing' }
]

// Reusable TiltCard component
function TiltCard({ children, className = "", style = {} }) {
  const cardRef = useRef(null)

  const handleMouseMove = (e) => {
    if (window.innerWidth < 1024) return
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

// Reusable Magnetic component for CTA buttons
function Magnetic({ children, className = "" }) {
  const ref = useRef(null)

  const handleMouseMove = (e) => {
    if (window.innerWidth < 1024) return
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

function SeniorsContent() {
  const router = useRouter()
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

  // Navigation and active slide tracking state
  const [scrolled, setScrolled] = useState(false)
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)

  // Scroll container and smooth track translation refs
  const containerRef = useRef(null)
  const trackRef = useRef(null)
  const navRef = useRef(null)
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0, opacity: 0 })

  // General Guidance Match confirmation Modal state
  const [isGuidanceModalOpen, setIsGuidanceModalOpen] = useState(false)

  // Interactive Modal: Preference Review (Section 3)
  const [isPreferenceModalOpen, setIsPreferenceModalOpen] = useState(false)
  const [preferenceProofFile, setPreferenceProofFile] = useState(null)
  const [preferenceText, setPreferenceText] = useState("")
  const [preferenceQuestions, setPreferenceQuestions] = useState("")
  const [preferenceSubmitted, setPreferenceSubmitted] = useState(false)
  const [preferenceErrors, setPreferenceErrors] = useState({})
  const prefFileInputRef = useRef(null)

  // Interactive Modal: 4-Year Success Plan (Section 4)
  const [isSuccessPlanModalOpen, setIsSuccessPlanModalOpen] = useState(false)
  const [planCollege, setPlanCollege] = useState("")
  const [planBranch, setPlanBranch] = useState("")
  const [planYear, setPlanYear] = useState("Pre-college")
  const [planCodingLevel, setPlanCodingLevel] = useState("Beginner")
  const [planCompany, setPlanCompany] = useState("Google")
  const [planGoal, setPlanGoal] = useState("Internship")
  const [planSubmitted, setPlanSubmitted] = useState(false)
  const [planErrors, setPlanErrors] = useState({})

  // Form State - SECTION 1 (Guidance)
  const [guidanceCollege, setGuidanceCollege] = useState("")
  const [guidanceServiceType, setGuidanceServiceType] = useState("chat") // 'chat' = ₹39, 'voice' = ₹99
  const [guidanceBranch, setGuidanceBranch] = useState("")
  const [guidanceRank, setGuidanceRank] = useState("")
  const [guidanceLanguage, setGuidanceLanguage] = useState("English / Hindi")
  const [guidanceTopic, setGuidanceTopic] = useState("Placements")
  const [guidanceQuestion, setGuidanceQuestion] = useState("")
  const [guidanceErrors, setGuidanceErrors] = useState({})

  // Form State - SECTION 2 (Classmates)
  const [classmatesCollege, setClassmatesCollege] = useState("")
  const [classmatesProof, setClassmatesProof] = useState(null)
  const [classmatesSubmitted, setClassmatesSubmitted] = useState(false)
  const [classmatesNotifications, setClassmatesNotifications] = useState(false)
  const [classmatesErrors, setClassmatesErrors] = useState({})
  const fileInputRef = useRef(null)

  // Form State - SECTION 5 (Anonymous Communities)
  const [communityContact, setCommunityContact] = useState("")
  const [communitySubmitted, setCommunitySubmitted] = useState(false)
  const [communityError, setCommunityError] = useState("")

  // General coming soon popups (e.g. Starter predictor plan or Anonymous Communities)
  const [comingSoonModal, setComingSoonModal] = useState(null)

  // Voice Call Razorpay payment state
  const [voiceCallLoading, setVoiceCallLoading] = useState(false)

  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Snappy Mouse wheel scroll translator for horizontal Desktop layout
  const activeIdxRef = useRef(0)
  useEffect(() => {
    activeIdxRef.current = activeSectionIndex
  }, [activeSectionIndex])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !isDesktop) return

    let isAnimating = false

    const handleWheel = (e) => {
      // If there is significant horizontal swipe, let the trackpad handle it natively
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return

      if (e.deltaY === 0) return
      
      // Filter out micro-scroll noise/jitter
      if (Math.abs(e.deltaY) < 12) return

      e.preventDefault()

      if (isAnimating) return

      const direction = e.deltaY > 0 ? 1 : -1
      const width = container.clientWidth
      if (width <= 0) return

      const targetIdx = Math.min(Math.max(activeIdxRef.current + direction, 0), SECTIONS.length - 1)

      if (targetIdx !== activeIdxRef.current) {
        isAnimating = true
        
        container.scrollTo({
          left: targetIdx * width,
          behavior: 'smooth'
        })

        // Debounce lock: ignore subsequent wheel input signals for 700ms (duration of smooth scroll)
        setTimeout(() => {
          isAnimating = false
        }, 700)
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [isDesktop])

  const handleScroll = () => {
    const container = containerRef.current
    if (!container) return

    if (window.innerWidth > 768) {
      const scrollLeft = container.scrollLeft
      const clientWidth = container.clientWidth
      if (clientWidth <= 0) return

      const activeIdx = Math.min(Math.max(Math.round(scrollLeft / clientWidth), 0), 8)
      setActiveSectionIndex(activeIdx)
      activeIdxRef.current = activeIdx // Keep target index synchronized
      setScrolled(scrollLeft > 20)
    } else {
      const scrollTop = container.scrollTop
      const clientHeight = container.clientHeight
      if (clientHeight <= 0) return

      const activeIdx = Math.min(Math.max(Math.round(scrollTop / clientHeight), 0), 8)
      setActiveSectionIndex(activeIdx)
      setScrolled(scrollTop > 20)
    }
  }

  const scrollTo = (id) => {
    const container = containerRef.current
    if (!container) return

    const idx = SECTIONS.findIndex(sec => sec.id === id)
    if (idx !== -1) {
      activeIdxRef.current = idx // Keep target index synchronized
      if (window.innerWidth > 768) {
        const targetScrollLeft = idx * container.clientWidth
        container.scrollTo({
          left: targetScrollLeft,
          behavior: 'smooth'
        })
      } else {
        const targetScrollTop = idx * container.clientHeight
        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        })
      }
    }
  }

  const activeId = SECTIONS[activeSectionIndex]?.id

  useEffect(() => {
    if (!navRef.current) return
    const activeEl = navRef.current.querySelector(`[data-section="${activeId}"]`)
    if (activeEl) {
      setUnderlineStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        opacity: 1
      })
    } else {
      setUnderlineStyle({ left: 0, width: 0, opacity: 0 })
    }
  }, [activeSectionIndex, activeId])

  // Section Guidance submission
  const handleGuidanceSubmit = (e) => {
    e.preventDefault()
    const errors = {}
    if (!guidanceCollege.trim()) errors.college = "College Name is required"
    if (!guidanceBranch.trim()) errors.branch = "Branch is required"
    if (!guidanceLanguage.trim()) errors.language = "Preferred Language is required"

    if (Object.keys(errors).length > 0) {
      setGuidanceErrors(errors)
      return
    }

    setGuidanceErrors({})

    const proceedGuidance = async () => {
      try {
        const detailsText = JSON.stringify({
          rank: guidanceRank || "Not Provided",
          language: guidanceLanguage,
          topic: guidanceTopic,
          question: guidanceQuestion || "None"
        })

        const priceMap = {
          chat: 3900,
          voice: 9900,
        }
        const amountInPaise = priceMap[guidanceServiceType] || 3900

        const payment = await openRazorpayCheckout({
          amountInPaise,
          student_id: user.id,
          service_type: guidanceServiceType,
          remarks: detailsText,
          college: guidanceCollege,
          branch: guidanceBranch,
          name: 'SahiSeat',
          description: `${guidanceServiceType.toUpperCase()} Guidance Match`,
          prefill: {
            name: profile?.name || '',
            email: user?.email || '',
            contact: profile?.phone || '',
          }
        })

        if (!payment) return

        setIsGuidanceModalOpen(true)
      } catch (err) {
        console.error(err)
        alert(err.message || "Failed to register request. Please try again.")
      }
    }

    if (!user) {
      openLoginModal(proceedGuidance)
    } else {
      proceedGuidance()
    }
  }

  // Section Classmates document submission
  const handleClassmatesSubmit = (e) => {
    e.preventDefault()
    const errors = {}
    if (!classmatesCollege.trim()) errors.college = "College is required"
    if (!classmatesProof) errors.proof = "Admission proof document is required"

    if (Object.keys(errors).length > 0) {
      setClassmatesErrors(errors)
      return
    }

    setClassmatesErrors({})
    setClassmatesSubmitted(true)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setClassmatesProof(file.name)
      setClassmatesErrors(prev => ({ ...prev, proof: null }))
    }
  }

  // Preference Review Modal submit
  const handlePreferenceSubmit = (e) => {
    e.preventDefault()
    const errors = {}
    if (!preferenceProofFile && !preferenceText.trim()) {
      errors.list = "Please upload a preference PDF or paste your choice order"
    }

    if (Object.keys(errors).length > 0) {
      setPreferenceErrors(errors)
      return
    }

    setPreferenceErrors({})
    setPreferenceSubmitted(true)
  }

  const handlePrefFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPreferenceProofFile(file.name)
      setPreferenceErrors(prev => ({ ...prev, list: null }))
    }
  }

  // Success Plan Modal submit
  const handleSuccessPlanSubmit = (e) => {
    e.preventDefault()
    const errors = {}
    if (!planCollege.trim()) errors.college = "College name is required"
    if (!planBranch.trim()) errors.branch = "Branch name is required"

    if (Object.keys(errors).length > 0) {
      setPlanErrors(errors)
      return
    }

    setPlanErrors({})
    setPlanSubmitted(true)
  }

  // Community subscription
  const handleCommunitySubmit = (e) => {
    e.preventDefault()
    if (!communityContact.trim()) {
      setCommunityError("Please enter your email or phone number")
      return
    }
    setCommunityError("")
    setCommunitySubmitted(true)
  }

  // Eased visual transition class generator for internal slide content wrappers
  const getInnerClassName = (idx) => {
    return "w-full flex-1 flex flex-col justify-center items-center"
  }

  // Voice Call — Razorpay ₹99 payment handler
  const handleVoiceCallPayment = async () => {
    if (voiceCallLoading) return
    setVoiceCallLoading(true)
    try {
      const result = await openRazorpayCheckout({
        amountInPaise: 9900,
        student_id:    user.id,
        service_type:  'voice',
        remarks:       '20-min Voice Consultation with Verified Senior',
        college:       guidanceCollege || 'Any',
        branch:        guidanceBranch || 'Any',
        name:          'SahiSeat',
        description:   '20-min Voice Consultation with Verified Senior',
        receipt:       `rcpt_voice_${user.id}`,
        prefill: {
          name:    profile?.name  || '',
          email:   user?.email    || '',
          contact: profile?.phone || '',
        },
        theme: { color: '#7C3AED' },
      })

      if (!result) {
        alert('Payment cancelled.')
        return
      }

      alert(`✅ Payment successful!\nPayment ID: ${result.paymentId}\nYour voice call slot is verified and counseling request registered.`)
    } catch (err) {
      alert(err.message || 'Payment failed. Please try again.')
    } finally {
      setVoiceCallLoading(false)
    }
  }

  // Pricing click actions mapping
  const handlePricingClick = (plan) => {
    if (plan === 'chat') {
      setGuidanceServiceType('chat')
      scrollTo('guidance')
    } else if (plan === 'voice') {
      // Require login before opening Razorpay
      if (!user) {
        openLoginModal(handleVoiceCallPayment)
      } else {
        handleVoiceCallPayment()
      }
    } else if (plan === 'preference') {
      const openPref = () => {
        setPreferenceSubmitted(false)
        setPreferenceProofFile(null)
        setPreferenceText("")
        setPreferenceQuestions("")
        setPreferenceErrors({})
        setIsPreferenceModalOpen(true)
      }
      if (!user) {
        openLoginModal(openPref)
      } else {
        openPref()
      }
    } else if (plan === 'roadmap') {
      const openPlan = () => {
        setPlanSubmitted(false)
        setPlanCollege("")
        setPlanBranch("")
        setPlanYear("Pre-college")
        setPlanCodingLevel("Beginner")
        setPlanCompany("Google")
        setPlanGoal("Internship")
        setPlanErrors({})
        setIsSuccessPlanModalOpen(true)
      }
      if (!user) {
        openLoginModal(openPlan)
      } else {
        openPlan()
      }
    }
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`h-screen w-screen bg-[#09090B] relative no-scrollbar ${
        isDesktop
          ? 'flex flex-row overflow-y-hidden overflow-x-auto snap-x snap-mandatory'
          : 'flex flex-col overflow-y-auto overflow-x-hidden'
      }`}
    >
      {/* STICKY GLASS NAVBAR */}
      <header className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ease-in-out border-b ${
        scrolled
          ? 'backdrop-blur-xl bg-[#09090B]/85 border-border-custom shadow-[0_4px_30px_rgba(0,0,0,0.6)] h-14'
          : 'backdrop-blur-md bg-transparent border-transparent shadow-none h-16'
      }`}>
        <div className={`container mx-auto flex items-center justify-between px-4 sm:px-6 transition-all duration-300 ${
          scrolled ? 'h-14' : 'h-16'
        }`}>
          {/* Logo */}
          <button onClick={() => scrollTo('hero')} className="flex items-center gap-2 focus:outline-none cursor-pointer group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#2563EB] shadow-md transition-transform duration-300 group-hover:scale-105">
              <GraduationCap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-[#FAFAFA]">
              SahiSeat <span className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] bg-clip-text text-transparent font-medium">Seniors</span>
            </span>
          </button>

          {/* Navigation Links with animated sliding underline */}
          <nav ref={navRef} className="hidden lg:flex items-center gap-6 text-xs font-semibold text-secondary-text relative py-2 select-none">
            {[
              { label: 'Guidance', id: 'guidance' },
              { label: 'Classmates', id: 'classmates' },
              { label: 'Preference Review', id: 'preference-review' },
              { label: 'Roadmap', id: 'roadmaps' },
              { label: 'Communities', id: 'communities' },
              { label: 'Trust', id: 'trust' },
              { label: 'How It Works', id: 'how-it-works' },
              { label: 'Pricing', id: 'pricing' }
            ].map(({ label, id }) => (
              <button
                key={id}
                data-section={id}
                onClick={() => scrollTo(id)}
                className={`transition-colors duration-300 py-1 cursor-pointer focus:outline-none ${
                  activeId === id || (id === 'roadmaps' && activeId === 'roadmaps')
                    ? 'text-[#FAFAFA]/100 font-bold'
                    : 'text-[#A1A1AA]/50 hover:text-[#FAFAFA]'
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

          {/* Desktop Right Side CTA */}
          <div className="hidden sm:flex items-center gap-3">
            <Button
              onClick={() => router.push('/')}
              className="group px-3 py-1.5 rounded-xl border border-border-custom bg-[#13131A] hover:bg-[#13131A]/75 text-[11px] text-[#FAFAFA] font-bold transition-all duration-300 cursor-pointer flex items-center gap-1"
            >
              Predictor App
              <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Button>

            {!user ? (
              <Button
                onClick={() => openLoginModal()}
                className="px-4.5 py-1.5 rounded-xl bg-[#FAFAFA] hover:bg-[#FAFAFA]/90 text-[#09090B] text-[11px] font-extrabold transition-all duration-300 cursor-pointer"
              >
                Sign In
              </Button>
            ) : (
              <div className="relative dropdown-container">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border-custom bg-[#13131A] hover:bg-[#13131A]/80 transition cursor-pointer select-none focus:outline-none"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name}
                      className="h-5 w-5 rounded-full object-cover border border-[#7C3AED]/40"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-[#7C3AED]/20 text-[#A855F7] flex items-center justify-center text-[9px] font-bold border border-[#7C3AED]/40">
                      {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-[#FAFAFA] max-w-[70px] truncate">
                    {profile?.name || 'Student'}
                  </span>
                  <ChevronDown className={`h-3 w-3 text-[#A1A1AA] transition-transform duration-250 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border-custom bg-[#13131A] p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    <a
                      href="/dashboard"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-semibold text-[#FAFAFA] hover:bg-[#7C3AED]/10 hover:text-[#A855F7] transition"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 text-secondary-text" />
                      Dashboard
                    </a>
                    <a
                      href="/dashboard?tab=requests"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-semibold text-[#FAFAFA] hover:bg-[#7C3AED]/10 hover:text-[#A855F7] transition"
                    >
                      <ClipboardList className="h-3.5 w-3.5 text-secondary-text" />
                      My Requests
                    </a>
                    <a
                      href="/dashboard?tab=purchases"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-semibold text-[#FAFAFA] hover:bg-[#7C3AED]/10 hover:text-[#A855F7] transition"
                    >
                      <ShoppingCart className="h-3.5 w-3.5 text-secondary-text" />
                      My Purchases
                    </a>
                    <a
                      href="/dashboard?tab=settings"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-semibold text-[#FAFAFA] hover:bg-[#7C3AED]/10 hover:text-[#A855F7] transition"
                    >
                      <Settings className="h-3.5 w-3.5 text-secondary-text" />
                      Settings
                    </a>
                    <hr className="border-border-custom my-1" />
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-400 transition text-left cursor-pointer focus:outline-none"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Right Side CTA */}
          <div className="flex sm:hidden items-center gap-1.5">
            {!user ? (
              <Button
                onClick={() => openLoginModal()}
                className="px-3 py-1.5 rounded-lg bg-[#FAFAFA] hover:bg-[#FAFAFA]/90 text-[#09090B] text-[10px] font-extrabold transition cursor-pointer"
              >
                Sign In
              </Button>
            ) : (
              <div className="relative dropdown-container">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1 px-1.5 py-1.5 rounded-lg border border-border-custom bg-[#13131A] focus:outline-none"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name}
                      className="h-5 w-5 rounded-full object-cover border border-[#7C3AED]/40"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-[#7C3AED]/20 text-[#A855F7] flex items-center justify-center text-[9px] font-bold border border-[#7C3AED]/40">
                      {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                  )}
                  <ChevronDown className="h-3 w-3 text-[#A1A1AA]" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-xl border border-border-custom bg-[#13131A] p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    <a
                      href="/dashboard"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-semibold text-[#FAFAFA] hover:bg-[#7C3AED]/10 hover:text-[#A855F7] transition"
                    >
                      Dashboard
                    </a>
                    <a
                      href="/dashboard?tab=requests"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-semibold text-[#FAFAFA] hover:bg-[#7C3AED]/10 hover:text-[#A855F7] transition"
                    >
                      My Requests
                    </a>
                    <a
                      href="/dashboard?tab=purchases"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-semibold text-[#FAFAFA] hover:bg-[#7C3AED]/10 hover:text-[#A855F7] transition"
                    >
                      My Purchases
                    </a>
                    <a
                      href="/dashboard?tab=settings"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-semibold text-[#FAFAFA] hover:bg-[#7C3AED]/10 hover:text-[#A855F7] transition"
                    >
                      Settings
                    </a>
                    <hr className="border-border-custom my-1" />
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-400 transition text-left cursor-pointer focus:outline-none"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* STICKY STAGE CONTAINER (PINNED VIEWPORT) */}
      <div className={`${
        isDesktop
          ? 'sticky top-0 left-0 h-screen overflow-hidden shrink-0'
          : 'relative w-full shrink-0'
      }`}>
        {/* Horizontal track carrying all slides */}
        <div 
          ref={trackRef} 
          className={
            isDesktop 
              ? "flex flex-row h-full w-[900vw]" 
              : "flex flex-col w-full space-y-16 py-12"
          }
        >
          
          {/* SLIDE 1: HERO SECTION */}
          <div id="hero-slide" className={`section-slide flex-shrink-0 flex flex-col justify-center items-center py-20 px-4 md:px-12 ${isDesktop ? 'w-screen h-screen snap-start' : 'w-full min-h-screen'}`}>
            <div className={getInnerClassName(0)}>
              <div className="pointer-events-none absolute inset-0 -z-10 flex justify-center items-center">
                <div className="h-[300px] w-[600px] md:h-[450px] md:w-[800px] rounded-full bg-gradient-to-tr from-primary-purple/10 to-accent-blue/10 blur-[110px] md:blur-[140px] animate-pulse" />
              </div>

              <div className="container mx-auto px-4 text-center max-w-4xl">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border-custom bg-[#111118]/80 px-3.5 py-1 text-[11px] text-[#A1A1AA] shadow-sm backdrop-blur-md mb-6">
                  <span className="text-yellow-400">⭐</span>
                  <span className="font-semibold tracking-wide">Premium Personal Matchmaking Service</span>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.12] text-[#FAFAFA]">
                  Connect with a<br />
                  <span className="bg-gradient-to-r from-primary-purple via-secondary-purple to-accent-blue bg-clip-text text-transparent font-black">
                    Verified Senior.
                  </span>
                </h1>

                <p className="mt-6 max-w-xl mx-auto text-sm sm:text-base md:text-lg text-secondary-text leading-relaxed">
                  Tell us what you need. We'll personally connect you with the best verified senior from your target college.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Magnetic>
                    <Button
                      onClick={() => scrollTo('guidance')}
                      className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-sm font-bold shadow-md hover:shadow-[0_8px_32px_rgba(124,58,237,0.45)] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 btn-premium"
                    >
                      Request Guidance
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Magnetic>

                  <Button
                    onClick={() => scrollTo('how-it-works')}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-border-custom bg-[#13131A] hover:bg-[#13131A]/75 text-sm text-secondary-text hover:text-white transition-all duration-300 cursor-pointer"
                  >
                    How It Works
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 2: SECTION 1 - GET GUIDANCE */}
          <div id="guidance-slide" className={`section-slide flex-shrink-0 flex flex-col justify-center items-center py-12 md:py-20 px-4 md:px-12 ${isDesktop ? 'w-screen h-screen snap-start' : 'w-full min-h-screen'}`}>
            <div className={getInnerClassName(1)}>
              <div className="container mx-auto px-4 max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  
                  {/* Left Panel */}
                  <div className="lg:col-span-5 space-y-6 text-left">
                    <Badge className="bg-primary-purple/10 border border-primary-purple/20 text-primary-purple text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 font-mono">
                      Know the Reality Before You Join
                    </Badge>
                    <h2 className="text-3xl font-extrabold tracking-tight text-[#FAFAFA] leading-tight">
                      Get Guidance Before<br />
                      Choosing Your College
                    </h2>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      Talk to seniors who are actually studying in your selected college.
                    </p>

                    <div className="space-y-3 pt-2">
                      <span className="text-[10px] text-secondary-text font-bold uppercase tracking-wider font-mono">Get answers about:</span>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          "Placements", "Hostels", "Campus Life", "Coding Culture",
                          "Academics", "Clubs", "Internships", "College vs College",
                          "Branch Choice", "Anything else you want"
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[#A855F7] text-xs">✓</span>
                            <span className="text-xs text-[#FAFAFA] font-medium">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Small Trust Box */}
                    <div className="p-4 rounded-2xl bg-[#13131A]/60 border border-border-custom space-y-2.5">
                      <div className="flex items-center gap-2 text-xs text-[#FAFAFA] font-medium">
                        <span className="text-emerald-500">✅</span>
                        <span>Real students only</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#FAFAFA] font-medium">
                        <span className="text-emerald-500">✅</span>
                        <span>Verified using official college email</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#FAFAFA] font-medium">
                        <span className="text-emerald-500">✅</span>
                        <span>Manual matching by SahiSeat</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel */}
                  <div className="lg:col-span-7 backdrop-blur-xl bg-[#13131A]/40 border border-border-custom rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.5)] w-full text-left">
                    <h3 className="text-lg font-bold text-[#FAFAFA] mb-4">Request Guidance</h3>
                    <form onSubmit={handleGuidanceSubmit} className="space-y-4">
                      
                      {/* target college & branch */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="guidanceCollege" className="text-xs font-bold text-[#A1A1AA]">College Name <span className="text-red-500">*</span></Label>
                          <Input
                            id="guidanceCollege"
                            type="text"
                            placeholder="e.g. IIIT Vadodara, NIT Trichy"
                            value={guidanceCollege}
                            onChange={(e) => {
                              setGuidanceCollege(e.target.value)
                              setGuidanceErrors(prev => ({ ...prev, college: null }))
                            }}
                            className={`w-full h-10 px-3 bg-[#09090B]/60 border rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/35 focus:border-[#7C3AED] outline-none transition ${
                              guidanceErrors.college ? 'border-red-500/60' : 'border-border-custom'
                            }`}
                          />
                          {guidanceErrors.college && (
                            <p className="text-[10px] text-red-500 font-semibold">{guidanceErrors.college}</p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="guidanceBranch" className="text-xs font-bold text-[#A1A1AA]">Branch <span className="text-red-500">*</span></Label>
                          <Input
                            id="guidanceBranch"
                            type="text"
                            placeholder="e.g. Computer Science"
                            value={guidanceBranch}
                            onChange={(e) => {
                              setGuidanceBranch(e.target.value)
                              setGuidanceErrors(prev => ({ ...prev, branch: null }))
                            }}
                            className={`w-full h-10 px-3 bg-[#09090B]/60 border rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/35 focus:border-[#7C3AED] outline-none transition ${
                              guidanceErrors.branch ? 'border-red-500/60' : 'border-border-custom'
                            }`}
                          />
                          {guidanceErrors.branch && (
                            <p className="text-[10px] text-red-500 font-semibold">{guidanceErrors.branch}</p>
                          )}
                        </div>
                      </div>

                      {/* Rank & Language */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="guidanceRank" className="text-xs font-bold text-[#A1A1AA]">Your Rank <span className="text-secondary-text/50 font-normal">(Optional)</span></Label>
                          <Input
                            id="guidanceRank"
                            type="text"
                            placeholder="e.g. 15000"
                            value={guidanceRank}
                            onChange={(e) => setGuidanceRank(e.target.value)}
                            className="w-full h-10 px-3 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] outline-none transition"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="guidanceLanguage" className="text-xs font-bold text-[#A1A1AA]">Preferred Language <span className="text-red-500">*</span></Label>
                          <Input
                            id="guidanceLanguage"
                            type="text"
                            placeholder="e.g. English / Hindi"
                            value={guidanceLanguage}
                            onChange={(e) => {
                              setGuidanceLanguage(e.target.value)
                              setGuidanceErrors(prev => ({ ...prev, language: null }))
                            }}
                            className={`w-full h-10 px-3 bg-[#09090B]/60 border rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/35 focus:border-[#7C3AED] outline-none transition ${
                              guidanceErrors.language ? 'border-red-500/60' : 'border-border-custom'
                            }`}
                          />
                          {guidanceErrors.language && (
                            <p className="text-[10px] text-red-500 font-semibold">{guidanceErrors.language}</p>
                          )}
                        </div>
                      </div>

                      {/* Topic Selection Dropdown */}
                      <div className="space-y-1.5">
                        <Label htmlFor="guidanceTopic" className="text-xs font-bold text-[#A1A1AA]">Topic <span className="text-red-500">*</span></Label>
                        <select
                          id="guidanceTopic"
                          value={guidanceTopic}
                          onChange={(e) => setGuidanceTopic(e.target.value)}
                          className="w-full h-10 px-3 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text focus:border-[#7C3AED] outline-none cursor-pointer"
                        >
                          <option value="Placements">Placements</option>
                          <option value="Hostel Life">Hostel Life</option>
                          <option value="Academics">Academics</option>
                          <option value="Coding Culture">Coding Culture</option>
                          <option value="College Comparison">College Comparison</option>
                          <option value="Branch Selection">Branch Selection</option>
                          <option value="Internships">Internships</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Question textarea */}
                      <div className="space-y-1.5">
                        <Label htmlFor="guidanceQuestion" className="text-xs font-bold text-[#A1A1AA]">Question <span className="text-secondary-text/50 font-normal">(Optional)</span></Label>
                        <textarea
                          id="guidanceQuestion"
                          placeholder="What would you like to ask the senior?"
                          value={guidanceQuestion}
                          onChange={(e) => setGuidanceQuestion(e.target.value)}
                          className="w-full h-16 p-2 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] outline-none resize-none transition"
                          rows={2}
                        />
                      </div>

                      {/* Pricing Selection */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-[#A1A1AA] block">Pricing <span className="text-red-500">*</span></Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition ${
                            guidanceServiceType === 'chat'
                              ? 'border-primary-purple bg-primary-purple/[0.04]'
                              : 'border-border-custom bg-[#09090B]/40 hover:border-border-custom/80'
                          }`}>
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="serviceType"
                                value="chat"
                                checked={guidanceServiceType === 'chat'}
                                onChange={() => setGuidanceServiceType('chat')}
                                className="accent-primary-purple h-3.5 w-3.5"
                              />
                              <div className="text-left">
                                <span className="text-xs font-bold text-primary-text block">💬 Chat</span>
                                <span className="text-[10px] text-[#A1A1AA] block">Unlimited for 24 Hours</span>
                              </div>
                            </div>
                            <span className="text-xs font-black text-primary-text">₹39</span>
                          </label>

                          <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition ${
                            guidanceServiceType === 'voice'
                              ? 'border-primary-purple bg-primary-purple/[0.04]'
                              : 'border-border-custom bg-[#09090B]/40 hover:border-border-custom/80'
                          }`}>
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="serviceType"
                                value="voice"
                                checked={guidanceServiceType === 'voice'}
                                onChange={() => setGuidanceServiceType('voice')}
                                className="accent-primary-purple h-3.5 w-3.5"
                              />
                              <div className="text-left">
                                <span className="text-xs font-bold text-primary-text block">📞 Voice Call</span>
                                <span className="text-[10px] text-[#A1A1AA] block">Scheduled via Meet</span>
                              </div>
                            </div>
                            <span className="text-xs font-black text-primary-text">₹99</span>
                          </label>
                        </div>
                      </div>

                      {/* Submit */}
                      <div className="pt-2">
                        <Button
                          type="submit"
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-xs font-bold shadow-md hover:shadow-primary-purple/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          Proceed
                        </Button>
                      </div>
                    </form>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 3: SECTION 2 - FUTURE CLASSMATES */}
          <div id="classmates-slide" className={`section-slide flex-shrink-0 flex flex-col justify-center items-center py-20 px-4 md:px-12 ${isDesktop ? 'w-screen h-screen snap-start' : 'w-full min-h-screen py-24'}`}>
            <div className={getInnerClassName(2)}>
              <div className="container mx-auto px-4 max-w-3xl">
                <div className="text-center mb-8">
                  <Badge className="bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 mb-2 font-mono">
                    100% Free
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FAFAFA]">
                    Meet Your Future Batchmates Before College Starts.
                  </h2>
                  <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 max-w-md mx-auto">
                    Received a seat? Get verified manually by our team, and we'll alert you as soon as your future batchmates join.
                  </p>
                </div>

                <div className="backdrop-blur-xl bg-[#13131A]/40 border border-border-custom rounded-3xl p-6 md:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                  {!classmatesSubmitted ? (
                    <form onSubmit={handleClassmatesSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="classmatesCollege" className="text-xs font-bold text-secondary-text font-sans">Allotted College <span className="text-red-500">*</span></Label>
                          <Input
                            id="classmatesCollege"
                            type="text"
                            placeholder="e.g. IIIT Vadodara, NIT Trichy"
                            value={classmatesCollege}
                            onChange={(e) => {
                              setClassmatesCollege(e.target.value)
                              setClassmatesErrors(prev => ({ ...prev, college: null }))
                            }}
                            className={`w-full h-11 px-4 bg-[#13131A] border rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/35 focus:border-[#2563EB] transition ${
                              classmatesErrors.college ? 'border-red-500/60' : 'border-border-custom'
                            }`}
                          />
                          {classmatesErrors.college && (
                            <p className="text-[11px] text-red-500 font-semibold">{classmatesErrors.college}</p>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-accent-blue/[0.02] border border-accent-blue/15 flex items-start gap-3">
                          <ShieldCheck className="h-5 w-5 text-accent-blue shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-bold text-[#FAFAFA]">Privacy Protected</h4>
                            <p className="text-[10px] text-[#A1A1AA] leading-relaxed mt-1">
                              We do not share your documents or identity. Verification is done manually by SahiSeat to restrict spam.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-secondary-text">Upload Admission Proof <span className="text-red-500">*</span></Label>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                        />

                        {classmatesProof ? (
                          <div className="flex items-center justify-between p-4 rounded-xl bg-[#111118] border border-border-custom">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <Check className="h-4.5 w-4.5" />
                              </div>
                              <span className="text-xs text-[#FAFAFA] font-mono truncate">{classmatesProof}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setClassmatesProof(null)}
                              className="text-[#A1A1AA] hover:text-white transition p-1 focus:outline-none"
                            >
                              <X className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors duration-300 hover:bg-[#13131A]/30 ${
                              classmatesErrors.proof ? 'border-red-500/40' : 'border-border-custom hover:border-accent-blue/40'
                            }`}
                          >
                            <Upload className="h-8 w-8 text-[#A1A1AA]/50 mb-3" />
                            <p className="text-xs text-[#FAFAFA] font-bold">Click to upload document</p>
                            <p className="text-[10px] text-secondary-text/65 mt-1.5 text-center leading-relaxed">
                              Accepted: JoSAA Allotment, CSAB Allotment, or Institute Admission Letter<br />
                              PDF, PNG, JPG (Max 5MB)
                            </p>
                          </div>
                        )}

                        {classmatesErrors.proof && (
                          <p className="text-[11px] text-red-500 font-semibold">{classmatesErrors.proof}</p>
                        )}
                      </div>

                      <div className="pt-2 flex justify-end">
                        <Button
                          type="submit"
                          className="px-8 py-3 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-bold transition cursor-pointer"
                        >
                          Submit
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-300">
                      <div className="h-12 w-12 rounded-full bg-yellow-500/10 border border-yellow-500/35 text-yellow-500 flex items-center justify-center mx-auto mb-4">
                        <Clock className="h-6 w-6 animate-pulse" />
                      </div>

                      <Badge className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] uppercase font-bold tracking-wider px-3 py-1 font-mono mb-2">
                        Verification Pending
                      </Badge>

                      <h3 className="text-lg font-bold text-[#FAFAFA]">Classmates Registration Submitted</h3>
                      <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto mt-2 leading-relaxed">
                        Our admin team is manually verifying your allotment letter. Estimated verification completion time is <strong>24–48 Hours</strong>.
                      </p>

                      <div className="mt-6 flex justify-center">
                        {classmatesNotifications ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/10 border border-emerald-500/25 px-5 py-2 rounded-xl">
                            <Check className="h-4 w-4" />
                            Notifications Enabled ✓
                          </div>
                        ) : (
                          <Button
                            onClick={() => setClassmatesNotifications(true)}
                            className="px-6 py-2 rounded-xl border border-border-custom bg-[#13131A] hover:bg-border-custom/50 text-xs text-secondary-text hover:text-white transition cursor-pointer font-bold"
                          >
                            Enable Notifications
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 4: SECTION 3 - EXPERT PREFERENCE REVIEW */}
          <div id="preference-review-slide" className={`section-slide flex-shrink-0 flex flex-col justify-center items-center py-20 px-4 md:px-12 ${isDesktop ? 'w-screen h-screen snap-start' : 'w-full min-h-screen py-24'}`}>
            <div className={getInnerClassName(3)}>
              <div className="container mx-auto px-4 max-w-5xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6 text-left">
                    <Badge className="bg-primary-purple/10 border border-primary-purple/20 text-primary-purple text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 font-mono">
                      Avoid Mistakes That Can Cost You Your Dream College
                    </Badge>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#FAFAFA] leading-tight">
                      Don't Lose Your Dream College Because of One Wrong Preference.
                    </h2>
                    <p className="text-xs sm:text-sm text-secondary-text leading-relaxed">
                      Already drafted your JoSAA/CSAB preference order? Have it audited by experienced choice-filling mentors and verified seniors.
                    </p>

                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {[
                        { text: "Better ordering", desc: "Optimize rank boundaries" },
                        { text: "Branch suggestions", desc: "Based on interest & trends" },
                        { text: "Safer backups", desc: "Protect against seat loss" },
                        { text: "Final review", desc: "Thorough verification" }
                      ].map((item, idx) => (
                        <li key={idx} className="flex gap-3">
                          <span className="h-5 w-5 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#A855F7] flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 font-mono">✓</span>
                          <div>
                            <h4 className="text-xs font-bold text-primary-text">{item.text}</h4>
                            <p className="text-[10px] text-secondary-text/80 mt-0.5">{item.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="w-full max-w-md mx-auto">
                    <TiltCard>
                      <div className="relative rounded-3xl border border-border-custom bg-gradient-to-b from-[#13131A] to-[#09090B] p-8 overflow-hidden shadow-2xl flex flex-col justify-between text-left">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] text-secondary-text font-semibold uppercase tracking-wider font-mono">CHOICE OPTIMIZATION</span>
                              <h3 className="text-xl font-bold text-[#FAFAFA] mt-1">Preference Audit</h3>
                            </div>
                            <Badge className="bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#A855F7] text-[10px] font-mono font-bold px-2 py-0.5">
                              PAID AUDIT
                            </Badge>
                          </div>
                          <p className="text-xs text-[#A1A1AA] leading-relaxed">
                            Reviewed by verified seniors from NITs, IIITs and experienced choice-filling mentors. Receive feedback with an updated choice order inside 12 hours.
                          </p>

                          <div className="pt-2">
                            <span className="text-2xl font-black text-[#FAFAFA]">₹149</span>
                            <span className="text-xs text-secondary-text ml-1">/ review audit</span>
                          </div>
                        </div>

                        <div className="mt-8">
                          <Button
                            onClick={() => {
                              const openPref = () => {
                                setPreferenceSubmitted(false)
                                setPreferenceProofFile(null)
                                setPreferenceText("")
                                setPreferenceQuestions("")
                                setPreferenceErrors({})
                                setIsPreferenceModalOpen(true)
                              }
                              if (!user) {
                                openLoginModal(openPref)
                              } else {
                                openPref()
                              }
                            }}
                            className="w-full py-3.5 rounded-xl bg-[#FAFAFA] hover:bg-[#FAFAFA]/90 text-[#09090B] text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            Review My Preference List
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </TiltCard>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 5: SECTION 4 - PERSONALIZED ROADMAP */}
          <div id="roadmaps-slide" className={`section-slide flex-shrink-0 flex flex-col justify-center items-center py-20 px-4 md:px-12 ${isDesktop ? 'w-screen h-screen snap-start' : 'w-full min-h-screen py-24'}`}>
            <div className={getInnerClassName(4)}>
              <div className="container mx-auto px-4 max-w-5xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  
                  {/* Left Blueprint card: Visual Grayscale tech logo + questionnaire modal */}
                  <div className="w-full max-w-md mx-auto order-last lg:order-first">
                    <TiltCard>
                      <div className="relative rounded-3xl border border-border-custom bg-gradient-to-b from-[#13131A] to-[#09090B] p-6 sm:p-8 overflow-hidden shadow-2xl flex flex-col justify-between text-left">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] text-secondary-text font-semibold uppercase tracking-wider font-mono">COMPLETE PREPARATION</span>
                              <h3 className="text-xl font-bold text-[#FAFAFA] mt-1">4-Year Success Plan</h3>
                            </div>
                            <Badge className="bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#A855F7] text-[10px] font-mono font-bold px-2 py-0.5">
                              PAID SERVICE
                            </Badge>
                          </div>
                          <p className="text-xs text-[#A1A1AA] leading-relaxed">
                            Written directly by highly active seniors of your allotted college. Standard resources leave out college secrets; we build it specifically for you.
                          </p>

                          <div className="pt-2">
                            <span className="text-2xl font-black text-[#FAFAFA]">₹299</span>
                            <span className="text-xs text-[#A1A1AA] ml-1">/ success plan</span>
                          </div>
                        </div>

                        {/* Visual Grayscale Logos */}
                        <div className="pt-4 border-t border-border-custom/50">
                          <span className="text-[8px] text-[#A1A1AA]/50 font-bold uppercase tracking-wider block mb-2 font-mono">Seniors Placed At</span>
                          <div className="flex items-center gap-5 flex-wrap opacity-30 select-none">
                            {/* Google inline SVG grayscale style */}
                            <span className="text-[10px] font-extrabold tracking-widest text-[#FAFAFA] uppercase font-mono">Google</span>
                            <span className="text-[10px] font-extrabold tracking-widest text-[#FAFAFA] uppercase font-mono">Microsoft</span>
                            <span className="text-[10px] font-extrabold tracking-widest text-[#FAFAFA] uppercase font-mono">Amazon</span>
                          </div>
                        </div>

                        <div className="mt-6">
                          <Button
                            onClick={() => {
                              const openPlan = () => {
                                setPlanSubmitted(false)
                                setPlanCollege("")
                                setPlanBranch("")
                                setPlanYear("Pre-college")
                                setPlanCodingLevel("Beginner")
                                setPlanCompany("Google")
                                setPlanGoal("Internship")
                                setPlanErrors({})
                                setIsSuccessPlanModalOpen(true)
                              }
                              if (!user) {
                                openLoginModal(openPlan)
                              } else {
                                openPlan()
                              }
                            }}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 btn-premium"
                          >
                            Get My Roadmap
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </TiltCard>
                  </div>

                  <div className="space-y-6 text-left">
                    <Badge className="bg-primary-purple/10 border border-primary-purple/20 text-primary-purple text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 font-mono">
                      Start Building Your Career From Day One
                    </Badge>

                    {/* Emotional Hook Callout */}
                    <div className="border-l-2 border-primary-purple pl-4 my-2">
                      <p className="text-sm font-extrabold text-[#FAFAFA] tracking-tight italic leading-snug">
                        "Most students waste their first two years figuring things out. Don't."
                      </p>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FAFAFA] leading-tight">
                      Want to Crack Google, Microsoft or Top Startups?
                    </h2>
                    <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                      Don't waste your first year. Follow a roadmap prepared by seniors who already did it.
                    </p>

                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-2">
                      {[
                        "Semester-by-semester action plan",
                        "Complete coding roadmap (Beginner → Internship Ready)",
                        "How to Maintain a High CGPA Without Burning Out",
                        "Exactly When and How to Prepare for Internships",
                        "Placement Preparation That Actually Works",
                        "The Exact Resources Seniors Actually Used",
                        "What To Do Every Semester",
                        "Mistakes That Cost Students Internships",
                        "Which Clubs Are Actually Worth Joining",
                        "Mentor check-ins"
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 text-[8px] font-bold font-mono mt-0.5">✓</span>
                          <span className="text-[11px] text-[#A1A1AA] font-medium leading-normal">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 6: SECTION 5 - ANONYMOUS COMMUNITIES */}
          <div id="communities-slide" className={`section-slide flex-shrink-0 flex flex-col justify-center items-center py-20 px-4 md:px-12 ${isDesktop ? 'w-screen h-screen snap-start' : 'w-full min-h-screen py-24'}`}>
            <div className={getInnerClassName(5)}>
              <div className="container mx-auto px-4 max-w-3xl text-center">
                <div className="backdrop-blur-xl bg-gradient-to-b from-[#13131A] to-[#09090B] border border-border-custom rounded-3xl p-8 md:p-14 shadow-2xl relative overflow-hidden">
                  <div className="absolute -right-24 -bottom-24 h-48 w-48 rounded-full bg-[#EAB308]/5 blur-3xl animate-pulse" />
                  
                  <Badge className="bg-[#EAB308]/10 border border-[#EAB308]/20 text-[#EAB308] text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 mb-4 font-mono">
                    Coming Soon
                  </Badge>

                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FAFAFA] mb-4">
                    Ask Anything. Stay Anonymous.
                  </h2>
                  <p className="text-xs sm:text-sm text-secondary-text max-w-lg mx-auto leading-relaxed mb-8">
                    Anonymous discussion spaces where students ask questions and verified seniors answer. Get honest campus reviews, discuss hostels, fests, or coding culture without revealing your identity.
                  </p>

                  {!communitySubmitted ? (
                    <form onSubmit={handleCommunitySubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <Input
                          type="text"
                          placeholder="Enter your email or phone number"
                          value={communityContact}
                          onChange={(e) => setCommunityContact(e.target.value)}
                          className="w-full h-11 px-4 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#EAB308] transition"
                        />
                        {communityError && (
                          <p className="text-[10px] text-red-500 font-semibold text-left mt-1 ml-1">{communityError}</p>
                        )}
                      </div>
                      <Button
                        type="submit"
                        className="px-6 py-3 h-11 rounded-xl bg-[#EAB308] hover:bg-[#EAB308]/90 text-[#09090B] text-xs font-bold transition cursor-pointer shrink-0"
                      >
                        Notify Me
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center py-4 animate-in fade-in zoom-in-95">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/35 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                        <Check className="h-5 w-5" />
                      </div>
                      <h4 className="text-sm font-bold text-[#FAFAFA]">You are on the list!</h4>
                      <p className="text-[11px] text-secondary-text mt-1 max-w-xs mx-auto">
                        We'll notify you as soon as the community network for your college goes live.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 7: SECTION 6 - WHY TRUST */}
          <div id="trust-slide" className={`section-slide flex-shrink-0 flex flex-col justify-center items-center py-20 px-4 md:px-12 ${isDesktop ? 'w-screen h-screen snap-start' : 'w-full min-h-screen py-24'}`}>
            <div className={getInnerClassName(6)}>
              <div className="container mx-auto px-4 max-w-5xl">
                <div className="text-center mb-10">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FAFAFA]">
                    Why Trust SahiSeat?
                  </h2>
                  <p className="text-xs sm:text-sm text-secondary-text mt-2">
                    We focus entirely on security, privacy, and manual auditing.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      title: "Verified College Email",
                      desc: "Seniors must verify their status using their official college domain emails (e.g. name@iitb.ac.in).",
                      emoji: "📧"
                    },
                    {
                      title: "College ID Verification",
                      desc: "Every match verified senior is manually checked with their student ID cards by our operations team.",
                      emoji: "🪪"
                    },
                    {
                      title: "Manual Verification",
                      desc: "We personally cross-check profiles and verify details to ensure only genuine, helpful students are matchlisted.",
                      emoji: "🔍"
                    },
                    {
                      title: "Handpicked by SahiSeat",
                      desc: "We review your requirements and personally select the senior who best matches your queries.",
                      emoji: "🤝"
                    },
                    {
                      title: "Secure Platform",
                      desc: "Payment is held safely in escrow and only released to the senior after you confirm the session is complete.",
                      emoji: "💳"
                    },
                    {
                      title: "Private Sessions",
                      desc: "All calls are private 1:1 secure video slots. No public catalogs or mentor cards to browse.",
                      emoji: "🔒"
                    }
                  ].map((trust, idx) => (
                    <TiltCard key={idx}>
                      <div className="rounded-2xl border border-border-custom bg-[#13131A]/60 p-5 flex flex-col justify-between h-full hover:border-[#7C3AED]/30 transition-all duration-300">
                        <div>
                          <div className="h-10 w-10 rounded-xl bg-primary-purple/5 border border-primary-purple/15 flex items-center justify-center text-lg mb-3">
                            {trust.emoji}
                          </div>
                          <h3 className="text-xs font-bold text-primary-text mb-2">{trust.title}</h3>
                          <p className="text-[11px] text-[#A1A1AA] leading-relaxed">{trust.desc}</p>
                        </div>
                      </div>
                    </TiltCard>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 8: SECTION 7 - HOW IT WORKS */}
          <div id="how-it-works-slide" className={`section-slide flex-shrink-0 flex flex-col justify-center items-center py-20 px-4 md:px-12 ${isDesktop ? 'w-screen h-screen snap-start' : 'w-full min-h-screen py-24'}`}>
            <div className={getInnerClassName(7)}>
              <div className="container mx-auto px-4 max-w-5xl">
                <div className="text-center mb-10">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FAFAFA]">
                    How It Works
                  </h2>
                  <p className="text-xs sm:text-sm text-secondary-text mt-2">
                    From submission to scheduling: our smooth matching sequence
                  </p>
                </div>

                <div className="flex overflow-x-auto gap-5 pb-6 snap-x snap-mandatory no-scrollbar px-2 max-w-4xl mx-auto">
                  {[
                    { step: "1", label: "Submit Request", desc: "Submit target college, topic selection, and specific queries." },
                    { step: "2", label: "Login (Soon)", desc: "Quick verification via secure mobile login OTP screen." },
                    { step: "3", label: "Payment (Soon)", desc: "Complete ₹249 secure escrow deposit to hold the match." },
                    { step: "4", label: "SahiSeat Matching", desc: "We manually search and assign the perfect verified senior." },
                    { step: "5", label: "Scheduled", desc: "Select a comfortable slot that matches both schedules." },
                    { step: "6", label: "Google Meet", desc: "Connect on a secure, private 1:1 call for 30 minutes." },
                    { step: "7", label: "Feedback", desc: "Confirm the session resolved your doubts and release payment." }
                  ].map((item, idx) => (
                    <div key={idx} className="snap-center shrink-0 w-[220px] rounded-2xl border border-border-custom bg-[#13131A]/35 p-5 flex flex-col justify-between relative">
                      <div className="absolute right-4 top-4 font-mono font-bold text-xs text-primary-purple/40">
                        STEP {item.step}
                      </div>
                      <div>
                        <div className="h-9 w-9 rounded-full bg-primary-purple/10 border border-primary-purple/25 flex items-center justify-center text-xs font-bold text-primary-purple font-mono mb-4">
                          {item.step}
                        </div>
                        <h4 className="text-xs font-bold text-[#FAFAFA]">{item.label}</h4>
                        <p className="text-[10px] text-secondary-text/80 mt-2 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 9: PRICING & FOOTER */}
          <div id="pricing-slide" className={`section-slide flex-shrink-0 flex flex-col justify-between items-center py-20 px-4 md:px-12 ${isDesktop ? 'w-screen h-screen snap-start' : 'w-full min-h-screen'}`}>
            <div className={getInnerClassName(8)}>
              <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center py-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FAFAFA]">
                    Premium Pricing
                  </h2>
                  <p className="text-xs sm:text-sm text-secondary-text mt-1">
                    Select a package to fast-track your seat allocation and college prep
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Plan 1: Live Chat */}
                  <TiltCard className="h-full">
                    <div className="rounded-3xl border border-border-custom bg-[#13131A] p-5 flex flex-col justify-between h-full relative overflow-hidden group">
                      <div className="space-y-4 text-left">
                        <span className="text-[9px] text-[#A1A1AA] font-bold uppercase tracking-wider font-mono">STARTER</span>
                        <h3 className="text-base font-bold text-[#FAFAFA]">Reality Chat</h3>
                        <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                          Live chat with a verified senior from your target college for 24 hours.
                        </p>
                        <div className="pt-1">
                          <span className="text-2xl font-extrabold text-[#FAFAFA]">₹39</span>
                        </div>
                        <hr className="border-border-custom" />
                        <ul className="text-[9px] text-[#A1A1AA] space-y-2 font-medium">
                          <li className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Unlimited 24h Chat</li>
                          <li className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Direct student realities</li>
                          <li className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Real placement reviews</li>
                        </ul>
                      </div>
                      <div className="mt-6">
                        <Button
                          onClick={() => handlePricingClick('chat')}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-xs font-bold shadow-md hover:shadow-primary-purple/20 transition cursor-pointer"
                        >
                          Request Chat
                        </Button>
                      </div>
                    </div>
                  </TiltCard>

                  {/* Plan 2: Voice Call */}
                  <TiltCard className="h-full">
                    <div className="rounded-3xl border border-border-custom bg-[#13131A] p-5 flex flex-col justify-between h-full relative overflow-hidden group">
                      <div className="space-y-4 text-left">
                        <span className="text-[9px] text-[#A1A1AA] font-bold uppercase tracking-wider font-mono">POPULAR</span>
                        <h3 className="text-base font-bold text-[#FAFAFA]">Voice Consultation</h3>
                        <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                          Secure a private 20-minute voice call with a verified senior on Google Meet.
                        </p>
                        <div className="pt-1">
                          <span className="text-2xl font-extrabold text-[#FAFAFA]">₹99</span>
                        </div>
                        <hr className="border-border-custom" />
                        <ul className="text-[9px] text-[#A1A1AA] space-y-2 font-medium">
                          <li className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> 20-min 1:1 Voice Call</li>
                          <li className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Ask any question directly</li>
                          <li className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Refund if senior is absent</li>
                        </ul>
                      </div>
                      <div className="mt-6">
                        <Button
                          onClick={() => handlePricingClick('voice')}
                          disabled={voiceCallLoading}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-xs font-bold shadow-md hover:shadow-primary-purple/20 transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          {voiceCallLoading ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                              </svg>
                              Processing...
                            </>
                          ) : (
                            'Book Voice Call'
                          )}
                        </Button>
                      </div>
                    </div>
                  </TiltCard>

                  {/* Plan 3: Preference review */}
                  <TiltCard className="h-full">
                    <div className="rounded-3xl border border-primary-purple/40 bg-gradient-to-b from-[#13131A] to-[#09090B] p-5 flex flex-col justify-between h-full relative overflow-hidden group shadow-[0_0_20px_rgba(124,58,237,0.1)]">
                      <div className="absolute right-4 top-4 bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#A855F7] text-[8px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider animate-pulse">
                        Best Value
                      </div>
                      <div className="space-y-4 text-left">
                        <span className="text-[9px] text-[#A855F7] font-bold uppercase tracking-wider font-mono">EXPERT</span>
                        <h3 className="text-base font-bold text-[#FAFAFA]">Preference Audit</h3>
                        <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                          Choice filling audit by verified seniors and experienced mentors.
                        </p>
                        <div className="pt-1">
                          <span className="text-2xl font-extrabold text-[#FAFAFA]">₹149</span>
                        </div>
                        <hr className="border-border-custom" />
                        <ul className="text-[9px] text-secondary-text space-y-2 font-medium">
                          <li className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Better choice list ordering</li>
                          <li className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Avoid ordering errors</li>
                          <li className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Delivered inside 12h</li>
                        </ul>
                      </div>
                      <div className="mt-6">
                        <Button
                          onClick={() => handlePricingClick('preference')}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-xs font-bold shadow-md hover:shadow-primary-purple/20 transition cursor-pointer"
                        >
                          Audit My List
                        </Button>
                      </div>
                    </div>
                  </TiltCard>

                  {/* Plan 4: Career Plan */}
                  <TiltCard className="h-full">
                    <div className="rounded-3xl border border-border-custom bg-[#13131A] p-5 flex flex-col justify-between h-full relative overflow-hidden group">
                      <div className="space-y-4 text-left">
                        <span className="text-[9px] text-secondary-text font-bold uppercase tracking-wider font-mono">PREMIUM</span>
                        <h3 className="text-base font-bold text-[#FAFAFA]">4-Year Success Plan</h3>
                        <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                          Custom tailored roadmap compiled by placing seniors + mentorship.
                        </p>
                        <div className="pt-1">
                          <span className="text-2xl font-extrabold text-[#FAFAFA]">₹299</span>
                        </div>
                        <hr className="border-border-custom" />
                        <ul className="text-[9px] text-secondary-text space-y-2 font-medium">
                          <li className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Semester academic action plan</li>
                          <li className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Coding & internship roadmap</li>
                          <li className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Senior checking & advice</li>
                        </ul>
                      </div>
                      <div className="mt-6">
                        <Button
                          onClick={() => handlePricingClick('roadmap')}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-xs font-bold shadow-md hover:shadow-primary-purple/20 transition cursor-pointer"
                        >
                          Build My Plan
                        </Button>
                      </div>
                    </div>
                  </TiltCard>
                </div>

                <div className="mt-6 text-center text-xs text-secondary-text/80 font-medium">
                  Future Classmates connections are <strong className="text-accent-blue">FREE</strong> • Anonymous Communities are <strong className="text-[#EAB308]">FREE</strong>
                </div>
              </div>

              {/* FOOTER */}
              <footer className="w-full py-6 border-t border-border-custom bg-[#111118]/60 relative z-10">
                <div className="container mx-auto px-4 text-center text-xs text-secondary-text">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded bg-gradient-to-br from-primary-purple to-accent-blue flex items-center justify-center">
                      <GraduationCap className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-extrabold text-[#FAFAFA] text-sm tracking-tight">SahiSeat</span>
                  </div>
                  <p>© 2026 SahiSeat. Built with dedication by students of IIIT Vadodara.</p>
                  <div className="mt-2.5 flex items-center justify-center gap-4 text-[9px]">
                    <a href="#" className="hover:text-white transition">Terms of Service</a>
                    <span>•</span>
                    <a href="#" className="hover:text-white transition">Privacy Policy</a>
                    <span>•</span>
                    <a href="#" className="hover:text-white transition">Refund Guidelines</a>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>



      {/* INTERACTIVE MODAL: PREFERENCE REVIEW (SECTION 3) */}
      {isPreferenceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setIsPreferenceModalOpen(false)} />

          <div className="relative z-10 w-full max-w-md bg-[#13131A] border border-border-custom rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <button
              onClick={() => setIsPreferenceModalOpen(false)}
              className="absolute right-4 top-4 text-[#A1A1AA] hover:text-white transition cursor-pointer focus:outline-none"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {!preferenceSubmitted ? (
              <form onSubmit={handlePreferenceSubmit} className="space-y-4">
                <div className="mb-4">
                  <Badge className="bg-primary-purple/10 border border-primary-purple/20 text-primary-purple text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 font-mono">
                    Audited by Seniors
                  </Badge>
                  <h3 className="text-base font-bold text-[#FAFAFA] mt-1">Audit My Preference List</h3>
                  <p className="text-xs text-secondary-text mt-0.5">Reviewed by verified seniors from NITs, IIITs and experienced choice mentors.</p>
                </div>

                {/* Upload Section */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#A1A1AA]">Upload Preference List (PDF)</Label>
                  <input
                    type="file"
                    ref={prefFileInputRef}
                    onChange={handlePrefFileChange}
                    accept=".pdf"
                    className="hidden"
                  />
                  {preferenceProofFile ? (
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#111118] border border-border-custom">
                      <span className="text-xs text-[#FAFAFA] font-mono truncate">{preferenceProofFile}</span>
                      <button
                        type="button"
                        onClick={() => setPreferenceProofFile(null)}
                        className="text-[#A1A1AA] hover:text-white transition p-1 focus:outline-none"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => prefFileInputRef.current?.click()}
                      className="border border-dashed border-border-custom hover:border-primary-purple/40 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition"
                    >
                      <Upload className="h-5 w-5 text-[#A1A1AA]/50 mb-1" />
                      <span className="text-xs font-bold text-[#FAFAFA]">Select PDF file</span>
                    </div>
                  )}
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-border-custom/50"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-secondary-text font-mono uppercase">or paste below</span>
                  <div className="flex-grow border-t border-border-custom/50"></div>
                </div>

                {/* Paste Area */}
                <div className="space-y-1.5">
                  <textarea
                    rows={3}
                    placeholder="1. IIT Bombay CSE&#10;2. IIT Delhi CSE&#10;3. IIT Madras Electrical"
                    value={preferenceText}
                    onChange={(e) => {
                      setPreferenceText(e.target.value)
                      setPreferenceErrors({})
                    }}
                    className="w-full px-3 py-2 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] outline-none transition resize-none font-mono"
                  />
                  {preferenceErrors.list && (
                    <p className="text-[10px] text-red-500 font-semibold">{preferenceErrors.list}</p>
                  )}
                </div>

                {/* Additional Questions */}
                <div className="space-y-1.5">
                  <Label htmlFor="prefQues" className="text-xs font-bold text-[#A1A1AA]">Additional Questions / Doubts</Label>
                  <textarea
                    id="prefQues"
                    rows={2}
                    placeholder="Ask about specific branch backups, quota options, etc."
                    value={preferenceQuestions}
                    onChange={(e) => setPreferenceQuestions(e.target.value)}
                    className="w-full px-3 py-2 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] outline-none transition resize-none"
                  />
                </div>

                <div className="pt-2 border-t border-border-custom/40 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-[#A1A1AA] block uppercase font-mono tracking-wider font-semibold">Total Price</span>
                    <strong className="text-base text-primary-text">₹149</strong>
                  </div>
                  <Button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-xs font-bold shadow-md hover:shadow-primary-purple/20 transition cursor-pointer flex items-center gap-1.5"
                  >
                    Continue to Payment →
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 animate-in fade-in zoom-in-95">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/35 text-emerald-500 flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-[#FAFAFA]">Preference List Submitted!</h3>
                <p className="text-xs text-secondary-text max-w-xs mx-auto mt-2 leading-relaxed">
                  Your choice list order has been submitted. Our verified seniors and choice-filling mentors will send your fully audited order to your email inside **12 Hours**.
                </p>
                <Button
                  onClick={() => setIsPreferenceModalOpen(false)}
                  className="w-full mt-6 py-2.5 rounded-xl border border-border-custom bg-[#09090B] hover:bg-border-custom/50 text-xs text-[#FAFAFA] hover:text-white transition font-bold"
                >
                  Got It
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INTERACTIVE MODAL: 4-YEAR SUCCESS PLAN (SECTION 4) */}
      {isSuccessPlanModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setIsSuccessPlanModalOpen(false)} />

          <div className="relative z-10 w-full max-w-md bg-[#13131A] border border-border-custom rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <button
              onClick={() => setIsSuccessPlanModalOpen(false)}
              className="absolute right-4 top-4 text-[#A1A1AA] hover:text-white transition cursor-pointer focus:outline-none"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {!planSubmitted ? (
              <form onSubmit={handleSuccessPlanSubmit} className="space-y-4">
                <div className="mb-4">
                  <Badge className="bg-primary-purple/10 border border-primary-purple/20 text-primary-purple text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 font-mono">
                    Success Roadmap
                  </Badge>
                  <h3 className="text-base font-bold text-[#FAFAFA] mt-1">Order 4-Year Success Plan</h3>
                  <p className="text-xs text-secondary-text mt-0.5">Let's collect your target profiles so seniors can custom-build your plan.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="planCollege" className="text-xs font-bold text-[#A1A1AA]">College <span className="text-red-500">*</span></Label>
                    <Input
                      id="planCollege"
                      type="text"
                      placeholder="e.g. NIT Trichy"
                      value={planCollege}
                      onChange={(e) => {
                        setPlanCollege(e.target.value)
                        setPlanErrors(prev => ({ ...prev, college: null }))
                      }}
                      className={`w-full h-10 px-3 bg-[#09090B]/60 border rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] outline-none transition ${
                        planErrors.college ? 'border-red-500/60' : 'border-border-custom'
                      }`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="planBranch" className="text-xs font-bold text-[#A1A1AA]">Branch <span className="text-red-500">*</span></Label>
                    <Input
                      id="planBranch"
                      type="text"
                      placeholder="e.g. CSE"
                      value={planBranch}
                      onChange={(e) => {
                        setPlanBranch(e.target.value)
                        setPlanErrors(prev => ({ ...prev, branch: null }))
                      }}
                      className={`w-full h-10 px-3 bg-[#09090B]/60 border rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] outline-none transition ${
                        planErrors.branch ? 'border-red-500/60' : 'border-border-custom'
                      }`}
                    />
                  </div>
                </div>

                {planErrors.college && <p className="text-[10px] text-red-500 font-semibold">{planErrors.college}</p>}
                {planErrors.branch && <p className="text-[10px] text-red-500 font-semibold">{planErrors.branch}</p>}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="planYear" className="text-xs font-bold text-[#A1A1AA]">Current Year</Label>
                    <select
                      id="planYear"
                      value={planYear}
                      onChange={(e) => setPlanYear(e.target.value)}
                      className="w-full h-10 px-3 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text focus:border-[#7C3AED] outline-none cursor-pointer"
                    >
                      <option value="Pre-college">Pre-college (Lander)</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="planCodingLevel" className="text-xs font-bold text-[#A1A1AA]">Coding Level</Label>
                    <select
                      id="planCodingLevel"
                      value={planCodingLevel}
                      onChange={(e) => setPlanCodingLevel(e.target.value)}
                      className="w-full h-10 px-3 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text focus:border-[#7C3AED] outline-none cursor-pointer"
                    >
                      <option value="Beginner">Beginner (Hello World)</option>
                      <option value="Intermediate">Intermediate (Arrays, OOP)</option>
                      <option value="Advanced">Advanced (DSA, CP, WebDev)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="planCompany" className="text-xs font-bold text-[#A1A1AA]">Target Company</Label>
                    <select
                      id="planCompany"
                      value={planCompany}
                      onChange={(e) => setPlanCompany(e.target.value)}
                      className="w-full h-10 px-3 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text focus:border-[#7C3AED] outline-none cursor-pointer"
                    >
                      <option value="Google">Google / Microsoft</option>
                      <option value="Amazon">Amazon / Adobe</option>
                      <option value="Top Startups">Top Tech Startups</option>
                      <option value="Other">Other / Non-Tech</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="planGoal" className="text-xs font-bold text-[#A1A1AA]">Primary Goal</Label>
                    <select
                      id="planGoal"
                      value={planGoal}
                      onChange={(e) => setPlanGoal(e.target.value)}
                      className="w-full h-10 px-3 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text focus:border-[#7C3AED] outline-none cursor-pointer"
                    >
                      <option value="Internship">Internship Prep</option>
                      <option value="Placement">Full-time Placement</option>
                      <option value="Higher Studies">Higher Studies (GATE/MS)</option>
                      <option value="GPA Strategy">Only CGPA maintenance</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-border-custom/40 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-[#A1A1AA] block uppercase font-mono tracking-wider font-semibold">Total Price</span>
                    <strong className="text-base text-primary-text">₹299</strong>
                  </div>
                  <Button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-xs font-bold shadow-md hover:shadow-primary-purple/20 transition cursor-pointer"
                  >
                    Proceed to Payment →
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 animate-in fade-in zoom-in-95">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/35 text-emerald-500 flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-[#FAFAFA]">Success Plan Ordered!</h3>
                <p className="text-xs text-secondary-text max-w-xs mx-auto mt-2 leading-relaxed">
                  Your details have been submitted. Our verified seniors at <strong>{planCollege}</strong> will construct your custom <strong>4-Year Success Plan + Mentorship blueprint</strong>. Delivered to your dashboard in 48 hours.
                </p>
                <Button
                  onClick={() => setIsSuccessPlanModalOpen(false)}
                  className="w-full mt-6 py-2.5 rounded-xl border border-border-custom bg-[#09090B] hover:bg-border-custom/50 text-xs text-[#FAFAFA] hover:text-white transition font-bold"
                >
                  Got It
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMING SOON MODALS (STARTER PLAN) */}
      {comingSoonModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setComingSoonModal(null)} />

          <div className="relative z-10 w-full max-w-md bg-[#13131A] border border-border-custom rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <button
              onClick={() => setComingSoonModal(null)}
              className="absolute right-4 top-4 text-[#A1A1AA] hover:text-white transition cursor-pointer focus:outline-none"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="text-center pt-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-[#EAB308]/10 border border-[#EAB308]/30 text-[#EAB308] flex items-center justify-center mb-5">
                <Sparkles className="h-5 w-5" />
              </div>

              <h3 className="text-base font-bold text-[#FAFAFA] mb-2">{comingSoonModal.title}</h3>
              <p className="text-xs text-secondary-text leading-relaxed mb-6">
                {comingSoonModal.message}
              </p>

              <Button
                onClick={() => setComingSoonModal(null)}
                className="w-full py-2.5 rounded-xl border border-border-custom bg-[#09090B] hover:bg-border-custom/50 text-xs text-[#FAFAFA] hover:text-white transition font-bold"
              >
                Got It
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GENERAL MOCK MODAL: GET GUIDANCE (SECTION 1) SUBMIT CONFIRMATION */}
      {isGuidanceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setIsGuidanceModalOpen(false)} />

          <div className="relative z-10 w-full max-w-md bg-[#13131A] border border-border-custom rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <button
              onClick={() => setIsGuidanceModalOpen(false)}
              className="absolute right-4 top-4 text-[#A1A1AA] hover:text-white transition cursor-pointer focus:outline-none"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="text-center pt-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary-purple/10 border border-primary-purple/35 text-primary-purple flex items-center justify-center mb-5">
                <Check className="h-6 w-6 text-emerald-500" />
              </div>

              <h3 className="text-base font-bold text-[#FAFAFA] mb-2">Guidance Request Submitted!</h3>
              <p className="text-xs text-secondary-text leading-relaxed mb-6">
                Your request has been registered. Our admin team will manually match you with a verified senior from your selected college. Payment of ₹{guidanceServiceType === 'chat' ? '39' : '99'} will proceed next.
              </p>

              <div className="rounded-xl border border-border-custom bg-[#09090B]/50 p-4 mb-6 text-left space-y-2 text-[11px] font-mono">
                <div>
                  <span className="text-secondary-text/50">TARGET COLLEGE:</span>
                  <strong className="text-[#FAFAFA] block">{guidanceCollege}</strong>
                </div>
                <div>
                  <span className="text-secondary-text/50">BRANCH:</span>
                  <strong className="text-[#FAFAFA] block">{guidanceBranch}</strong>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-custom/40">
                  <div>
                    <span className="text-secondary-text/50 block">TOPIC:</span>
                    <strong className="text-[#FAFAFA]">{guidanceTopic}</strong>
                  </div>
                  <div>
                    <span className="text-secondary-text/50 block">TYPE:</span>
                    <strong className="text-[#FAFAFA]">{guidanceServiceType === 'chat' ? 'Live Chat (₹39)' : 'Voice Call (₹99)'}</strong>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => {
                  setIsGuidanceModalOpen(false)
                  setGuidanceCollege("")
                  setGuidanceBranch("")
                  setGuidanceRank("")
                  setGuidanceQuestion("")
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-xs font-bold transition cursor-pointer"
              >
                Got It
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hide horizontal scrollbar style */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <LoginModal />
    </div>
  )
}

export default function VerifiedSeniorsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-primary-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-secondary-text">Loading SahiSeat Seniors...</p>
        </div>
      </div>
    }>
      <SeniorsContent />
    </Suspense>
  )
}
