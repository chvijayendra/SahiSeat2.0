'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  GraduationCap,
  ShieldCheck,
  Clock,
  User,
  Calendar,
  MessageSquare,
  Home,
  LogOut,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import ChatPanel from '@/components/ChatPanel'
import { useToast } from '@/context/ToastContext'


const APPROVED_TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'students', label: 'Assigned Students', icon: GraduationCap },
  { id: 'chats', label: 'Chats', icon: MessageSquare },
  { id: 'sessions', label: 'Upcoming Sessions', icon: Calendar },
  { id: 'profile', label: 'Profile', icon: User },
]

const PENDING_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'students', label: 'Assigned Students', icon: GraduationCap },
  { id: 'predictor', label: 'Predictor', icon: GraduationCap },
  { id: 'profile', label: 'Profile', icon: User },
]

// Blocked email domains (personal, not college emails)
const BLOCKED_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'icloud.com', 'proton.me', 'protonmail.com', 'live.com',
  'yahoo.in', 'rediffmail.com', 'aol.com', 'msn.com'
]

function SeniorDashboardContent() {
  const router = useRouter()
  const { user, profile, loading: authLoading, logout } = useAuth()
  const { toast } = useToast()


  // Onboarding Form States
  const [step, setStep] = useState('unverified') // unverified, pending_approval, approved
  const [fullName, setFullName] = useState('')
  const [collegeName, setCollegeName] = useState('')
  const [officialEmail, setOfficialEmail] = useState('')
  const [branch, setBranch] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  
  const [onboardingError, setOnboardingError] = useState('')
  const [onboardingLoading, setOnboardingLoading] = useState(false)

  // Dashboard States
  const [activeTab, setActiveTab] = useState('home')
  const [requests, setRequests] = useState([])
  const [conversations, setConversations] = useState([])
  const [activeChat, setActiveChat] = useState(null)

  // Profile Editor state (inside Profile tab)
  const [seniorLinkedin, setSeniorLinkedin] = useState('')
  const [seniorAvailability, setSeniorAvailability] = useState('Available')
  const [seniorAvatarUrl, setSeniorAvatarUrl] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Sync profile data and check status
  useEffect(() => {
    if (profile) {
      setStep(profile.verification_status || 'unverified')
      
      setFullName(profile.name || '')
      setCollegeName(profile.college || '')
      setOfficialEmail(profile.official_email || '')
      setBranch(profile.branch || '')
      setGraduationYear(profile.year || '')
      setLinkedinUrl(profile.linkedin_url || '')

      setSeniorLinkedin(profile.linkedin_url || '')
      setSeniorAvailability(profile.availability || 'Available')
      setSeniorAvatarUrl(profile.avatar_url || '')
    }
  }, [profile])

  // Fetch approved senior datasets
  useEffect(() => {
    if (user && (step === 'approved' || profile?.role === 'senior')) {
      fetchAssignedData()
    }
  }, [user, step, profile])

  const fetchAssignedData = async () => {
    try {
      // 1. Fetch assigned student requests
      const { data: reqData } = await supabase
        .from('guidance_requests')
        .select(`
          *,
          student:student_id ( id, name, email, avatar_url, target_college, branch )
        `)
        .eq('mentor_id', user.id)
      
      if (reqData) setRequests(reqData)

      // 2. Fetch conversations
      const { data: convData } = await supabase
        .from('conversations')
        .select(`
          *,
          student:student_id ( id, name, email, avatar_url, college )
        `)
        .eq('senior_id', user.id)

      if (convData) setConversations(convData)
    } catch (err) {
      console.error('Error fetching data:', err)
    }
  }

  // Handle Senior Onboarding Submit
  const handleOnboardingSubmit = async (e) => {
    e.preventDefault()
    if (!fullName.trim() || !collegeName.trim() || !officialEmail.trim() || !branch.trim() || !graduationYear.trim() || !linkedinUrl.trim()) {
      setOnboardingError('Please fill out all required fields.')
      return
    }

    // Validate college email domain
    const emailDomain = officialEmail.split('@').pop()?.toLowerCase()
    if (BLOCKED_EMAIL_DOMAINS.includes(emailDomain)) {
      setOnboardingError('Please use your official college email address.')
      return
    }

    // Basic LinkedIn URL check
    if (!linkedinUrl.includes('linkedin.com/in/')) {
      setOnboardingError('Please enter a valid LinkedIn Profile URL (e.g. https://linkedin.com/in/your-profile).')
      return
    }

    setOnboardingError('')
    setOnboardingLoading(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: fullName.trim(),
          college: collegeName.trim(),
          official_email: officialEmail.trim(),
          branch: branch.trim(),
          year: graduationYear.trim(),
          linkedin_url: linkedinUrl.trim(),
          verification_status: 'pending_approval',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      setStep('pending_approval')
      // Navigate to the pending dashboard tab
      setActiveTab('dashboard')
    } catch (err) {
      console.error('Onboarding submission error:', err)
      setOnboardingError(err.message || 'Failed to submit onboarding form. Please verify connection.')
    } finally {
      setOnboardingLoading(false)
    }
  }

  // Handle Profile Save (editable fields only: linkedin, availability, avatar_url)
  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileSaved(false)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          linkedin_url: seniorLinkedin.trim(),
          availability: seniorAvailability,
          avatar_url: seniorAvatarUrl.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to save profile updates')
    } finally {
      setProfileSaving(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent-blue mx-auto" />
          <p className="text-xs text-secondary-text">Loading SahiSeat Senior Portal...</p>
        </div>
      </div>
    )
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ONBOARDING WORKFLOW (Unverified only - shows the application form)
  // ───────────────────────────────────────────────────────────────────────────
  if (step === 'unverified') {
    return (
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col font-sans relative">
        <div className="pointer-events-none absolute inset-0 flex justify-center items-center overflow-hidden">
          <div className="h-[300px] w-[600px] rounded-full bg-gradient-to-tr from-[#2563EB]/10 to-[#7C3AED]/5 blur-[120px]" />
        </div>

        {/* Header bar */}
        <header className="border-b border-border-custom bg-[#09090B]/85 backdrop-blur-md h-16 flex items-center px-4 sm:px-8 justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7C3AED] shadow-md">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-[#FAFAFA]">
              SahiSeat <span className="text-accent-blue font-medium">Mentor Portal</span>
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-custom bg-[#13131A] hover:bg-rose-500/10 text-rose-400 text-xs font-bold transition duration-200 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </header>

        {/* Form area */}
        <main className="flex-1 flex items-center justify-center p-6 z-10">
          <div className="w-full max-w-lg bg-[#13131A]/90 border border-border-custom rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-40 w-[80%] -translate-x-1/2 rounded-full bg-accent-blue/10 blur-3xl" />

            {/* Error notifications */}
            {onboardingError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold text-center">
                {onboardingError}
              </div>
            )}

            {/* ONBOARDING FORM */}
            <form onSubmit={handleOnboardingSubmit} className="space-y-5 text-left">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-[#FAFAFA]">Become a SahiSeat Mentor</h2>
                <p className="text-xs text-secondary-text max-w-sm mx-auto">
                  Apply to become a mentor on SahiSeat. Every application is manually reviewed before you receive student requests.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-secondary-text leading-relaxed">
                💡 <strong>Important:</strong> Use your official college email address (not Gmail, Yahoo, etc.) and provide your LinkedIn profile for verification.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="oName" className="text-xs font-bold text-[#A1A1AA]">Full Name *</Label>
                  <Input
                    id="oName"
                    placeholder="e.g. Aman Gupta"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={onboardingLoading}
                    className="w-full h-11 px-4 bg-[#09090B] border border-border-custom rounded-xl text-xs text-primary-text focus:border-accent-blue transition"
                    required
                  />
                </div>

                {/* College Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="oCol" className="text-xs font-bold text-[#A1A1AA]">College Name *</Label>
                  <Input
                    id="oCol"
                    placeholder="e.g. NIT Trichy"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    disabled={onboardingLoading}
                    className="w-full h-11 px-4 bg-[#09090B] border border-border-custom rounded-xl text-xs text-primary-text focus:border-accent-blue transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Official College Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="oEmail" className="text-xs font-bold text-[#A1A1AA]">Official College Email *</Label>
                  <Input
                    id="oEmail"
                    type="email"
                    placeholder="name@college.ac.in"
                    value={officialEmail}
                    onChange={(e) => setOfficialEmail(e.target.value)}
                    disabled={onboardingLoading}
                    className="w-full h-11 px-4 bg-[#09090B] border border-border-custom rounded-xl text-xs text-primary-text focus:border-accent-blue transition"
                    required
                  />
                </div>

                {/* Branch */}
                <div className="space-y-1.5">
                  <Label htmlFor="oBranch" className="text-xs font-bold text-[#A1A1AA]">Branch / Discipline *</Label>
                  <Input
                    id="oBranch"
                    placeholder="e.g. CSE"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    disabled={onboardingLoading}
                    className="w-full h-11 px-4 bg-[#09090B] border border-border-custom rounded-xl text-xs text-primary-text focus:border-accent-blue transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Graduation Year */}
                <div className="space-y-1.5">
                  <Label htmlFor="oGrad" className="text-xs font-bold text-[#A1A1AA]">Graduation Year *</Label>
                  <Input
                    id="oGrad"
                    placeholder="e.g. 2027"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    disabled={onboardingLoading}
                    className="w-full h-11 px-4 bg-[#09090B] border border-border-custom rounded-xl text-xs text-primary-text focus:border-accent-blue transition"
                    required
                  />
                </div>

                {/* LinkedIn URL */}
                <div className="space-y-1.5">
                  <Label htmlFor="oLinkedin" className="text-xs font-bold text-[#A1A1AA]">LinkedIn Profile URL *</Label>
                  <Input
                    id="oLinkedin"
                    type="url"
                    placeholder="https://linkedin.com/in/your-profile"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    disabled={onboardingLoading}
                    className="w-full h-11 px-4 bg-[#09090B] border border-border-custom rounded-xl text-xs text-primary-text focus:border-accent-blue transition"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[10px] text-secondary-text block leading-relaxed text-center">
                  🔒 Your account will be reviewed by the SahiSeat team before mentor access is granted.
                </span>
              </div>

              <Button
                type="submit"
                disabled={onboardingLoading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-accent-blue to-[#7C3AED] text-white text-xs font-bold shadow-md hover:shadow-accent-blue/20 transition flex items-center justify-center gap-1.5 cursor-pointer border-none"
              >
                {onboardingLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </form>
          </div>
        </main>
      </div>
    )
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PENDING APPROVAL DASHBOARD (full sidebar layout)
  // ───────────────────────────────────────────────────────────────────────────
  if (step === 'pending_approval') {
    const pendingTabs = PENDING_TABS
    return (
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col font-sans selection:bg-accent-blue/30">
        <div className="pointer-events-none absolute inset-0 flex justify-center items-center overflow-hidden">
          <div className="h-[250px] w-[500px] rounded-full bg-gradient-to-tr from-accent-blue/5 to-primary-purple/5 blur-[120px] absolute top-10 left-10" />
        </div>

        {/* Top pending verification banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs font-semibold px-4 py-2.5 text-center flex items-center justify-center gap-2">
          <span className="animate-pulse">🟡</span>
          <span>Verification in Progress — The SahiSeat team is manually reviewing your application. We'll notify you once approved.</span>
        </div>

        {/* Header */}
        <header className="border-b border-border-custom bg-[#09090B]/85 backdrop-blur-md sticky top-0 z-40 h-16 flex items-center px-4 sm:px-8 justify-between">
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7C3AED] shadow-md">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-[#FAFAFA]">
              SahiSeat <span className="text-accent-blue font-medium">Mentor Portal</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-mono font-bold uppercase tracking-wider hidden sm:flex">
              Pending Verification
            </Badge>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} className="h-8 w-8 rounded-full object-cover border border-amber-500/40" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold border border-amber-500/40">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'M'}
              </div>
            )}
          </div>
        </header>

        {/* Dashboard container */}
        <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-8 gap-8 relative z-10">
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0 flex flex-col gap-1">
            {pendingTabs.map((tab) => {
              const Icon = tab.icon
              const isSel = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                    isSel
                      ? 'bg-gradient-to-r from-accent-blue/10 to-primary-purple/10 border border-accent-blue/35 text-accent-blue'
                      : 'border border-transparent text-[#A1A1AA] hover:bg-[#13131A] hover:text-[#FAFAFA]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4.5 w-4.5" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              )
            })}
            <div className="h-px bg-border-custom my-4" />
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition duration-200 cursor-pointer text-left focus:outline-none"
            >
              <LogOut className="h-4.5 w-4.5" />
              Logout
            </button>
          </aside>

          {/* Main tab content */}
          <main className="flex-1 bg-[#13131A]/40 border border-border-custom rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm min-h-[550px] flex flex-col">

            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Dashboard</h2>
                  <p className="text-xs text-[#A1A1AA] mt-1">Your mentor application is under review.</p>
                </div>
                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Clock className="h-4.5 w-4.5 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#FAFAFA]">Application Submitted Successfully</h4>
                      <p className="text-[11px] text-secondary-text mt-0.5">Name: <strong className="text-primary-text">{profile?.name || fullName}</strong> • College: <strong className="text-primary-text">{profile?.college || collegeName}</strong></p>
                    </div>
                  </div>
                  <p className="text-xs text-secondary-text leading-relaxed">
                    The SahiSeat team is manually verifying your college details and LinkedIn profile. Expect a decision within <strong className="text-amber-400">24–48 hours</strong>. You can use the Predictor in the meantime.
                  </p>
                </div>
              </div>
            )}

            {/* Assigned Students (empty pending state) */}
            {activeTab === 'students' && (
              <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col">
                <div>
                  <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Assigned Students</h2>
                  <p className="text-xs text-[#A1A1AA] mt-1">Students matched to your mentor profile will appear here.</p>
                </div>
                <div className="border border-dashed border-border-custom rounded-2xl p-12 text-center space-y-3 flex-1 flex flex-col justify-center">
                  <div className="text-2xl">👤</div>
                  <h3 className="text-xs font-bold text-[#FAFAFA]">No Student Requests Yet</h3>
                  <p className="text-[11px] text-secondary-text max-w-xs mx-auto leading-relaxed">
                    You'll start receiving student requests after your mentor profile is approved by the SahiSeat team.
                  </p>
                </div>
              </div>
            )}

            {/* Predictor */}
            {activeTab === 'predictor' && (
              <div className="space-y-4 animate-in fade-in duration-200 flex-1 flex flex-col">
                <div>
                  <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">College Predictor</h2>
                  <p className="text-xs text-[#A1A1AA] mt-1">Use the predictor while you wait for approval.</p>
                </div>
                <div className="flex-1 rounded-2xl overflow-hidden border border-border-custom">
                  <iframe
                    src="/"
                    title="SahiSeat Predictor"
                    className="w-full h-full min-h-[600px] bg-[#09090B]"
                  />
                </div>
              </div>
            )}

            {/* Profile */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Profile</h2>
                  <p className="text-xs text-[#A1A1AA] mt-1">Review your application details. Editable fields are marked.</p>
                </div>

                {profileSaved && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    Profile updated successfully!
                  </div>
                )}

                <form onSubmit={handleProfileSave} className="space-y-5">
                  {/* Read-only fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[#A1A1AA]">Full Name <span className="text-secondary-text font-normal">(read-only)</span></Label>
                      <div className="h-11 px-4 bg-[#09090B]/30 border border-border-custom/50 rounded-xl text-xs text-secondary-text flex items-center">{profile?.name || '—'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[#A1A1AA]">College <span className="text-secondary-text font-normal">(read-only)</span></Label>
                      <div className="h-11 px-4 bg-[#09090B]/30 border border-border-custom/50 rounded-xl text-xs text-secondary-text flex items-center">{profile?.college || '—'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[#A1A1AA]">Branch <span className="text-secondary-text font-normal">(read-only)</span></Label>
                      <div className="h-11 px-4 bg-[#09090B]/30 border border-border-custom/50 rounded-xl text-xs text-secondary-text flex items-center">{profile?.branch || '—'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[#A1A1AA]">Official College Email <span className="text-secondary-text font-normal">(read-only)</span></Label>
                      <div className="h-11 px-4 bg-[#09090B]/30 border border-border-custom/50 rounded-xl text-xs text-secondary-text flex items-center font-mono">{profile?.official_email || '—'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[#A1A1AA]">Verification Status <span className="text-secondary-text font-normal">(read-only)</span></Label>
                      <div className="h-11 px-4 bg-[#09090B]/30 border border-border-custom/50 rounded-xl text-xs text-amber-400 flex items-center font-mono">Pending Verification</div>
                    </div>
                    {/* Editable: Availability */}
                    <div className="space-y-1.5">
                      <Label htmlFor="sAvail" className="text-xs font-bold text-[#A1A1AA]">Availability</Label>
                      <select
                        id="sAvail"
                        value={seniorAvailability}
                        onChange={(e) => setSeniorAvailability(e.target.value)}
                        className="h-11 w-full px-4 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text focus:border-accent-blue transition"
                      >
                        <option value="Available">Available</option>
                        <option value="Busy">Busy</option>
                        <option value="Unavailable">Unavailable</option>
                      </select>
                    </div>
                  </div>

                  {/* Editable: LinkedIn */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sLinkedin" className="text-xs font-bold text-[#A1A1AA]">LinkedIn Profile URL</Label>
                    <Input
                      id="sLinkedin"
                      type="url"
                      value={seniorLinkedin}
                      onChange={(e) => setSeniorLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/your-profile"
                      className="h-11 px-4 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text focus:border-accent-blue transition"
                    />
                  </div>

                  {/* Editable: Avatar URL */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sAvatar" className="text-xs font-bold text-[#A1A1AA]">Profile Photo URL</Label>
                    <Input
                      id="sAvatar"
                      type="url"
                      value={seniorAvatarUrl}
                      onChange={(e) => setSeniorAvatarUrl(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="h-11 px-4 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text focus:border-accent-blue transition"
                    />
                  </div>

                  <div className="pt-4 border-t border-border-custom flex justify-end">
                    <Button
                      type="submit"
                      disabled={profileSaving}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-primary-purple text-white text-xs font-bold shadow transition cursor-pointer border-none flex items-center gap-1.5"
                    >
                      {profileSaving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

          </main>
        </div>
      </div>
    )
  }

  // ───────────────────────────────────────────────────────────────────────────
  // APPROVED SENIOR DASHBOARD
  // ───────────────────────────────────────────────────────────────────────────
  const TABS = APPROVED_TABS
  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col font-sans selection:bg-accent-blue/30">
      <div className="pointer-events-none absolute inset-0 flex justify-center items-center overflow-hidden">
        <div className="h-[250px] w-[500px] rounded-full bg-gradient-to-tr from-accent-blue/5 to-primary-purple/5 blur-[120px] absolute top-10 left-10" />
        <div className="h-[300px] w-[600px] rounded-full bg-gradient-to-br from-accent-blue/5 to-primary-purple/5 blur-[140px] absolute bottom-10 right-10" />
      </div>

      {/* Header bar */}
      <header className="border-b border-border-custom bg-[#09090B]/85 backdrop-blur-md sticky top-0 z-40 h-16 flex items-center px-4 sm:px-8 justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7C3AED] shadow-md">
            <ShieldCheck className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-[#FAFAFA]">
            SahiSeat <span className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent font-medium">Senior Portal</span>
          </span>
        </div>

        {/* Identity Details */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-bold text-primary-text block">{profile?.name || 'Verified Senior'}</span>
            <span className="text-[8px] text-[#2563EB] bg-[#2563EB]/10 border border-[#2563EB]/20 px-1.5 py-0.5 rounded font-mono block mt-0.5 animate-pulse">
              🎓 {profile?.college || 'Mentor'}
            </span>
          </div>

          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="h-8 w-8 rounded-full object-cover border border-[#2563EB]/40"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-[#2563EB]/20 text-[#2563EB] flex items-center justify-center text-xs font-bold border border-[#2563EB]/40">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'M'}
            </div>
          )}
        </div>
      </header>

      {/* Dashboard container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-8 gap-8 relative z-10">
        
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isSel = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setActiveChat(null) // clear chat states
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                  isSel
                    ? 'bg-gradient-to-r from-accent-blue/10 to-primary-purple/10 border border-accent-blue/35 text-accent-blue'
                    : 'border border-transparent text-[#A1A1AA] hover:bg-[#13131A] hover:text-[#FAFAFA]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4.5 w-4.5" />
                  <span>{tab.label}</span>
                </div>
              </button>
            )
          })}

          <div className="h-px bg-border-custom my-4" />

          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition duration-200 cursor-pointer text-left focus:outline-none"
          >
            <LogOut className="h-4.5 w-4.5" />
            Logout
          </button>
        </aside>

        {/* Tab display stage */}
        <main className="flex-1 bg-[#13131A]/40 border border-border-custom rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm min-h-[550px] flex flex-col">
          
          {/* TAB: HOME */}
          {activeTab === 'home' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Overview</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Summary status statistics.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#13131A] border border-border-custom rounded-2xl p-5 space-y-2">
                  <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block font-mono">ASSIGNED STUDENTS</span>
                  <p className="text-2xl font-black text-[#FAFAFA]">{requests.length}</p>
                  <span className="text-[9px] text-[#A1A1AA] block">Matched counseling requests</span>
                </div>

                <div className="bg-[#13131A] border border-border-custom rounded-2xl p-5 space-y-2">
                  <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block font-mono">ACTIVE MESSAGES</span>
                  <p className="text-2xl font-black text-[#FAFAFA]">{conversations.length}</p>
                  <span className="text-[9px] text-[#A1A1AA] block">Private chat channels active</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#2563EB]/5 border border-[#2563EB]/20 flex gap-3.5 items-start">
                <div className="h-8 w-8 rounded-lg bg-[#2563EB]/10 text-accent-blue flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#FAFAFA]">Welcome to SahiSeat Senior Portal</h4>
                  <p className="text-[11px] text-secondary-text leading-relaxed mt-1">
                    Your account has been fully verified and approved by the SahiSeat administration team. You can now chat in real-time with assigned students and manage your profile bio.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ASSIGNED STUDENTS */}
          {activeTab === 'students' && (
            <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Assigned Students</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">List of counseling candidates manually matched to your profile.</p>
              </div>

              {requests.length === 0 ? (
                <div className="border border-dashed border-border-custom rounded-2xl p-12 text-center space-y-3 flex-1 flex flex-col justify-center">
                  <div className="text-2xl">👤</div>
                  <h3 className="text-xs font-bold text-[#FAFAFA]">No students assigned yet</h3>
                  <p className="text-[11px] text-secondary-text max-w-xs mx-auto">
                    Administrators will manually match student requests to your profile here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {requests.map((req) => (
                    <div key={req.id} className="p-5 rounded-2xl border border-border-custom bg-[#13131A] space-y-4">
                      <div className="flex justify-between items-start flex-wrap gap-2 text-left">
                        <div className="flex items-center gap-3">
                          {req.student?.avatar_url ? (
                            <img
                              src={req.student.avatar_url}
                              alt={req.student.name}
                              className="h-10 w-10 rounded-full object-cover border border-[#2563EB]/20"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-[#2563EB]/10 text-accent-blue flex items-center justify-center text-sm font-bold border border-[#2563EB]/20">
                              {req.student?.name ? req.student.name.charAt(0).toUpperCase() : 'S'}
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-bold text-[#FAFAFA]">{req.student?.name || 'Student'}</h4>
                            <span className="text-[10px] text-secondary-text block">{req.student?.email}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge className="bg-[#2563EB]/10 border border-[#2563EB]/20 text-accent-blue text-[9px] uppercase tracking-wider font-mono">
                            {req.service_type} Service
                          </Badge>
                          <span className="text-[9px] text-secondary-text block pt-1">Matched: {new Date(req.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#09090B]/60 border border-border-custom text-xs space-y-1 text-left">
                        <div><span className="text-secondary-text">College Request:</span> <strong className="text-primary-text">{req.college}</strong></div>
                        {req.branch && <div><span className="text-secondary-text">Preferred Branch:</span> <strong className="text-primary-text">{req.branch}</strong></div>}
                        {req.details && <div className="pt-1 text-secondary-text italic">"{req.details}"</div>}
                      </div>

                      <div className="flex justify-end">
                        <Button
                          onClick={() => {
                            const chat = conversations.find(c => c.student_id === req.student_id)
                            if (chat) {
                              setActiveChat(chat)
                              setActiveTab('chats')
                            } else {
                              toast.error('No private chat channel found. Please contact an administrator to activate.')
                            }
                          }}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-accent-blue to-primary-purple text-white text-[11px] font-bold shadow transition cursor-pointer border-none"
                        >
                          Chat with Student
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: CHATS */}
          {activeTab === 'chats' && (
            <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col h-full">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Chats</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Direct private messages with your manually matched students.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[400px]">
                {/* Rooms selection list */}
                <div className="lg:col-span-4 border border-border-custom rounded-2xl bg-[#09090B]/40 p-3 space-y-1.5 max-h-[420px] overflow-y-auto">
                  <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block px-2.5 py-1 font-mono">Matched Students</span>
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 text-xs text-secondary-text">No active chat sessions.</div>
                  ) : (
                    conversations.map((conv) => {
                      const isSel = activeChat?.id === conv.id
                      return (
                        <button
                          key={conv.id}
                          onClick={() => setActiveChat(conv)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            isSel
                              ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                              : 'border-transparent text-secondary-text hover:bg-[#13131A] hover:text-[#FAFAFA]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {conv.student?.avatar_url ? (
                              <img
                                src={conv.student.avatar_url}
                                alt={conv.student.name}
                                className="h-7 w-7 rounded-full object-cover border border-[#2563EB]/25"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-[#2563EB]/15 text-accent-blue flex items-center justify-center text-xs font-bold border border-[#2563EB]/25">
                                {conv.student?.name ? conv.student.name.charAt(0).toUpperCase() : 'S'}
                              </div>
                            )}
                            <div className="truncate">
                              <span className="text-xs font-bold text-[#FAFAFA] block truncate">{conv.student?.name || 'Student'}</span>
                              <span className="text-[9px] text-[#A1A1AA] block truncate">{conv.student?.college || 'Candidate'}</span>
                            </div>
                          </div>
                          <Badge className="bg-[#2563EB]/10 border border-[#2563EB]/20 text-accent-blue text-[8px] font-mono shrink-0">Open Chat</Badge>
                        </button>
                      )
                    })
                  )}
                </div>

                {/* Active Chat log */}
                <div className="lg:col-span-8 border border-border-custom rounded-2xl bg-[#13131A]/60 flex flex-col overflow-hidden min-h-[420px]">
                  {activeChat ? (
                    <ChatPanel
                      conversationId={activeChat.id}
                      currentUserId={user.id}
                      otherPartyName={activeChat.student?.name || 'Student'}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-center p-8 space-y-2">
                      <MessageSquare className="h-8 w-8 text-secondary-text/30" />
                      <h4 className="text-xs font-bold text-[#FAFAFA]">Select a Conversation</h4>
                      <p className="text-[10px] text-secondary-text max-w-xs leading-relaxed">
                        Pick a student chat room from the sidebar to open the real-time private messenger.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: UPCOMING SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Upcoming Sessions</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Timeline of meeting dates scheduled by administrators.</p>
              </div>

              <div className="border border-dashed border-border-custom rounded-2xl p-12 text-center text-xs text-secondary-text">
                No sessions booked this week. You will receive updates inside your private chats.
              </div>
            </div>
          )}

          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Profile Details</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Read-only fields cannot be changed. Edit LinkedIn, Availability, and Photo below.</p>
              </div>

              {profileSaved && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" />
                  Profile updated successfully!
                </div>
              )}

              <form onSubmit={handleProfileSave} className="space-y-5">
                {/* Read-only fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#A1A1AA]">Full Name <span className="text-secondary-text font-normal">(read-only)</span></Label>
                    <div className="h-11 px-4 bg-[#09090B]/30 border border-border-custom/50 rounded-xl text-xs text-secondary-text flex items-center">{profile?.name || '—'}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#A1A1AA]">College <span className="text-secondary-text font-normal">(read-only)</span></Label>
                    <div className="h-11 px-4 bg-[#09090B]/30 border border-border-custom/50 rounded-xl text-xs text-secondary-text flex items-center">{profile?.college || '—'}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#A1A1AA]">Branch <span className="text-secondary-text font-normal">(read-only)</span></Label>
                    <div className="h-11 px-4 bg-[#09090B]/30 border border-border-custom/50 rounded-xl text-xs text-secondary-text flex items-center">{profile?.branch || '—'}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#A1A1AA]">Official College Email <span className="text-secondary-text font-normal">(read-only)</span></Label>
                    <div className="h-11 px-4 bg-[#09090B]/30 border border-border-custom/50 rounded-xl text-xs text-secondary-text flex items-center font-mono">{profile?.official_email || '—'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#A1A1AA]">Verification Status <span className="text-secondary-text font-normal">(read-only)</span></Label>
                    <div className="h-11 px-4 bg-[#09090B]/30 border border-border-custom/50 rounded-xl text-xs text-emerald-400 flex items-center font-mono">✓ Approved</div>
                  </div>
                  {/* Editable: Availability */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sAvail" className="text-xs font-bold text-[#A1A1AA]">Availability</Label>
                    <select
                      id="sAvail"
                      value={seniorAvailability}
                      onChange={(e) => setSeniorAvailability(e.target.value)}
                      className="h-11 w-full px-4 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text focus:border-accent-blue transition"
                    >
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                      <option value="Unavailable">Unavailable</option>
                    </select>
                  </div>
                </div>

                {/* Editable: LinkedIn */}
                <div className="space-y-1.5">
                  <Label htmlFor="sLinkedin" className="text-xs font-bold text-[#A1A1AA]">LinkedIn Profile URL</Label>
                  <Input
                    id="sLinkedin"
                    type="url"
                    value={seniorLinkedin}
                    onChange={(e) => setSeniorLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/your-profile"
                    className="h-11 px-4 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text focus:border-accent-blue transition"
                  />
                </div>

                {/* Editable: Avatar URL */}
                <div className="space-y-1.5">
                  <Label htmlFor="sAvatar" className="text-xs font-bold text-[#A1A1AA]">Profile Photo URL</Label>
                  <Input
                    id="sAvatar"
                    type="url"
                    value={seniorAvatarUrl}
                    onChange={(e) => setSeniorAvatarUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="h-11 px-4 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text focus:border-accent-blue transition"
                  />
                </div>

                <div className="pt-4 border-t border-border-custom flex justify-end">
                  <Button
                    type="submit"
                    disabled={profileSaving}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-primary-purple text-white text-xs font-bold shadow transition cursor-pointer border-none flex items-center gap-1.5"
                  >
                    {profileSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Saving Profile...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

export default function SeniorDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-[#A1A1AA]">Loading Senior Dashboard...</p>
        </div>
      </div>
    }>
      <SeniorDashboardContent />
    </Suspense>
  )
}
