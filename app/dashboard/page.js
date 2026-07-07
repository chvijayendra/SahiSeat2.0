'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  GraduationCap,
  LayoutDashboard,
  ClipboardList,
  ShoppingCart,
  User as UserIcon,
  Settings as SettingsIcon,
  LogOut,
  ArrowLeft,
  ChevronRight,
  Check,
  Save,
  Loader2,
  ListOrdered,
  BookOpen,
  MessageSquare,
  Plus,
  Send,
} from 'lucide-react'
import ChatPanel from '@/components/ChatPanel'
import { openRazorpayCheckout } from '@/lib/razorpayClient'
import { useToast } from '@/context/ToastContext'


// Updated Student tabs matching requirements
const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'requests', label: 'My Requests', icon: ClipboardList },
  { id: 'purchases', label: 'Orders & Payments', icon: ShoppingCart },
  { id: 'preferences', label: 'Saved Preferences', icon: ListOrdered },
  { id: 'roadmaps', label: 'Roadmaps', icon: BookOpen },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'profile', label: 'Profile Settings', icon: UserIcon },
]

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading: authLoading, logout } = useAuth()
  const { toast } = useToast()


  // Tab State
  const [activeTab, setActiveTab] = useState('overview')
  const [loadingData, setLoadingData] = useState(false)

  // Profile fields state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [college, setCollege] = useState('')
  const [targetCollege, setTargetCollege] = useState('')
  const [branch, setBranch] = useState('')
  const [year, setYear] = useState('Pre-college')
  
  // UI feedback states
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Student specific data states
  const [requests, setRequests] = useState([])
  const [preferences, setPreferences] = useState([])
  const [roadmaps, setRoadmaps] = useState([])
  const [conversations, setConversations] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [preferenceReviews, setPreferenceReviews] = useState([])

  // Create Request Form states
  const [reqCollege, setReqCollege] = useState('')
  const [reqBranch, setReqBranch] = useState('')
  const [reqServiceType, setReqServiceType] = useState('chat')
  const [reqDetails, setReqDetails] = useState('')
  const [reqCreating, setReqCreating] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)

  // Read URL query parameter "?tab=..."
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Sync profile details
  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setPhone(profile.phone || '')
      setCollege(profile.college || '')
      setTargetCollege(profile.target_college || '')
      setBranch(profile.branch || '')
      setYear(profile.year || 'Pre-college')
    }
  }, [profile])

  // Fetch Student data
  useEffect(() => {
    if (user) {
      fetchStudentData()
    }
  }, [user])

  const fetchStudentData = async () => {
    setLoadingData(true)
    try {
      // 1. Fetch Requests (updated table and mentor_id relation name)
      const { data: reqData } = await supabase
        .from('guidance_requests')
        .select(`
          *,
          assigned_senior:mentor_id ( id, name, college, branch, avatar_url )
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
      if (reqData) setRequests(reqData)

      // 2. Fetch Saved Preferences (retrieve single preference row)
      const { data: prefData } = await supabase
        .from('saved_preferences')
        .select('*')
        .eq('student_id', user.id)
        .maybeSingle()
      if (prefData) {
        setPreferences(prefData ? [prefData] : [])
      } else {
        setPreferences([])
      }

      // 3. Fetch Roadmaps
      const { data: roadmapData } = await supabase
        .from('roadmaps')
        .select(`
          *,
          creator:created_by ( name, college )
        `)
        .eq('student_id', user.id)
      if (roadmapData) setRoadmaps(roadmapData)

      // 4. Fetch Conversations
      const { data: convData } = await supabase
        .from('conversations')
        .select(`
          *,
          senior:senior_id ( id, name, email, avatar_url, college )
        `)
        .eq('student_id', user.id)
      if (convData) setConversations(convData)

      // 5. Fetch Preference Reviews (Expert Audits)
      const { data: reviewData } = await supabase
        .from('preference_reviews')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
      if (reviewData) setPreferenceReviews(reviewData)

    } catch (err) {
      console.error('Error fetching student data:', err)
    } finally {
      setLoadingData(false)
    }
  }

  // Create a new match request (payment-gated via Razorpay)
  const handleCreateRequest = async (e) => {
    e.preventDefault()
    if (!reqCollege.trim()) {
      toast.warning('Please specify your target college.')
      return
    }
    setReqCreating(true)
    try {
      const priceMap = {
        chat: 3900,
        voice: 9900,
        preference: 19900,
        roadmap: 14900,
      }
      const amountInPaise = priceMap[reqServiceType] || 9900

      const payment = await openRazorpayCheckout({
        amountInPaise,
        student_id: user.id,
        service_type: reqServiceType,
        remarks: reqDetails.trim() || `${reqServiceType.toUpperCase()} consultation request`,
        college: reqCollege.trim(),
        branch: reqBranch.trim(),
        name: 'SahiSeat',
        description: `${reqServiceType.toUpperCase()} Guidance Consultation`,
        prefill: {
          name: profile?.name || '',
          email: user?.email || '',
          contact: profile?.phone || '',
        },
        create_guidance: true,
      })

      if (!payment) {
        toast.info('Payment cancelled.')
        setReqCreating(false)
        return
      }

      setReqCollege('')
      setReqBranch('')
      setReqDetails('')
      setShowRequestForm(false)
      fetchStudentData() // reload list
      toast.success('Payment successful and counseling request submitted! SahiSeat will match you shortly.')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to submit match request. Please try again.')
    } finally {
      setReqCreating(false)
    }
  }

  // Update profile details
  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)
    setSaveError('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          phone,
          college,
          target_college: targetCollege,
          branch,
          year,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      setSaveError(err.message || 'Failed to update profile details')
    } finally {
      setSaving(false)
    }
  }

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently Joined'

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col font-sans selection:bg-primary-purple/30">
      {/* Background radial overlays */}
      <div className="pointer-events-none absolute inset-0 flex justify-center items-center overflow-hidden">
        <div className="h-[250px] w-[500px] rounded-full bg-gradient-to-tr from-primary-purple/5 to-accent-blue/5 blur-[120px] absolute top-10 left-10" />
        <div className="h-[300px] w-[600px] rounded-full bg-gradient-to-br from-primary-purple/5 to-accent-blue/5 blur-[140px] absolute bottom-10 right-10" />
      </div>

      {/* Navigation Top bar */}
      <header className="border-b border-border-custom bg-[#09090B]/85 backdrop-blur-md sticky top-0 z-40 h-16 flex items-center px-4 sm:px-8 justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-custom bg-[#13131A] hover:bg-[#13131A]/75 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition duration-200 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <button onClick={() => router.push('/')} className="flex items-center gap-2 focus:outline-none cursor-pointer">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#2563EB] shadow-md">
              <GraduationCap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-[#FAFAFA] hidden sm:inline">
              SahiSeat <span className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] bg-clip-text text-transparent font-medium">Dashboard</span>
            </span>
          </button>
        </div>

        {/* User identification */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-bold text-primary-text block">{profile?.name || 'Student'}</span>
            <span className="text-[8px] text-secondary-text block">{user?.email}</span>
          </div>

          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="h-8 w-8 rounded-full object-cover border border-[#7C3AED]/40"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-[#7C3AED]/20 text-[#A855F7] flex items-center justify-center text-xs font-bold border border-[#7C3AED]/40">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
            </div>
          )}
        </div>
      </header>

      {/* Main Grid Wrapper */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-8 gap-8 relative z-10">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isSel = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setActiveChat(null) // Reset chat state
                  router.push(`/dashboard?tab=${tab.id}`)
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                  isSel
                    ? 'bg-gradient-to-r from-primary-purple/10 to-accent-blue/10 border border-primary-purple/35 text-[#A855F7]'
                    : 'border border-transparent text-[#A1A1AA] hover:bg-[#13131A] hover:text-[#FAFAFA]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4.5 w-4.5" />
                  <span>{tab.label}</span>
                </div>
                <ChevronRight className={`h-3.5 w-3.5 transition opacity-60 ${isSel ? 'opacity-100' : 'opacity-0'}`} />
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
        <main className="flex-1 bg-[#13131A]/40 border border-border-custom rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm min-h-[500px] flex flex-col">
          
          {loadingData && (
            <div className="text-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary-purple mx-auto" />
            </div>
          )}

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && !loadingData && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Overview</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Snapshot of your counseling applications and success roadmaps.</p>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Requests */}
                <div className="bg-[#13131A] border border-border-custom rounded-2xl p-5 space-y-3">
                  <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block font-mono">1:1 MATCH GUIDANCE</span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-[#FAFAFA]">{requests.length}</span>
                    <Badge className="bg-[#7C3AED]/10 text-[#A855F7] border border-[#7C3AED]/20 text-[9px] font-mono">ACTIVE</Badge>
                  </div>
                </div>

                {/* 2. Success Plans */}
                <div className="bg-[#13131A] border border-border-custom rounded-2xl p-5 space-y-3">
                  <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block font-mono">SUCCESS PLANS</span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-[#FAFAFA]">{roadmaps.length}</span>
                    <Badge className="bg-[#7C3AED]/10 text-[#A855F7] border border-[#7C3AED]/20 text-[9px] font-mono">ACTIVE</Badge>
                  </div>
                </div>

                {/* 3. Saved Preferences */}
                <div className="bg-[#13131A] border border-border-custom rounded-2xl p-5 space-y-3">
                  <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block font-mono">SAVED PREFERENCES</span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-[#FAFAFA]">{preferences.length}</span>
                    <Badge className="bg-[#7C3AED]/10 text-[#A855F7] border border-[#7C3AED]/20 text-[9px] font-mono">SAVED</Badge>
                  </div>
                </div>

                {/* 4. Transactions */}
                <div className="bg-[#13131A] border border-border-custom rounded-2xl p-5 space-y-3">
                  <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block font-mono">TRANSACTIONS</span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-[#FAFAFA]">₹0</span>
                    <Badge className="bg-[#A1A1AA]/10 text-[#A1A1AA] border border-[#A1A1AA]/20 text-[9px] font-mono">SECURE</Badge>
                  </div>
                </div>

              </div>

              {/* Action Callout */}
              <div className="p-4 rounded-2xl bg-[#13131A] border border-border-custom flex gap-3.5 items-start">
                <div className="h-8 w-8 rounded-lg bg-[#7C3AED]/10 text-[#A855F7] flex items-center justify-center shrink-0">
                  <GraduationCap className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#FAFAFA]">Ready to build your career from day one?</h4>
                  <p className="text-[11px] text-secondary-text leading-relaxed mt-1">
                    Connect with highly placing seniors at your allotted college, audit your choice filling order safely, and build custom tailored roadmaps targeting high package tech placement slots.
                  </p>
                  <Button
                    onClick={() => {
                      setActiveTab('requests')
                      router.push('/dashboard?tab=requests')
                    }}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white text-[10px] font-bold shadow-md hover:shadow-[#7C3AED]/20 transition cursor-pointer border-none"
                  >
                    View Services
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MY REQUESTS */}
          {activeTab === 'requests' && !loadingData && (
            <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col">
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">My Requests</h2>
                  <p className="text-xs text-[#A1A1AA] mt-1">Manage your active matching requests with verified seniors.</p>
                </div>

                {!showRequestForm && (
                  <Button
                    onClick={() => setShowRequestForm(true)}
                    className="px-4.5 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white text-xs font-bold shadow-md hover:shadow-[#7C3AED]/25 transition cursor-pointer border-none flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Request Match
                  </Button>
                )}
              </div>

              {/* REQUEST FORM MODAL (INLINE) */}
              {showRequestForm && (
                <form onSubmit={handleCreateRequest} className="p-5 border border-border-custom bg-[#09090B]/60 rounded-2xl space-y-4 text-left animate-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center border-b border-border-custom pb-2">
                    <h3 className="text-xs font-bold text-primary-text uppercase tracking-wider">Request Match Guidance</h3>
                    <button
                      type="button"
                      onClick={() => setShowRequestForm(false)}
                      className="text-secondary-text hover:text-white transition focus:outline-none"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reqCol" className="text-xs font-bold text-[#A1A1AA]">Target College *</Label>
                      <Input
                        id="reqCol"
                        placeholder="e.g. NIT Trichy"
                        value={reqCollege}
                        onChange={(e) => setReqCollege(e.target.value)}
                        className="h-11 px-4 bg-[#13131A] border border-border-custom rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] transition"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reqBr" className="text-xs font-bold text-[#A1A1AA]">Preferred Branch</Label>
                      <Input
                        id="reqBr"
                        placeholder="e.g. CSE"
                        value={reqBranch}
                        onChange={(e) => setReqBranch(e.target.value)}
                        className="h-11 px-4 bg-[#13131A] border border-border-custom rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reqService" className="text-xs font-bold text-[#A1A1AA]">Service Format</Label>
                      <select
                        id="reqService"
                        value={reqServiceType}
                        onChange={(e) => setReqServiceType(e.target.value)}
                        className="w-full h-11 px-3 bg-[#13131A] border border-border-custom rounded-xl text-xs text-primary-text focus:border-[#7C3AED] outline-none cursor-pointer"
                      >
                        <option value="chat">Live Chat (₹39)</option>
                        <option value="voice">Voice Call Consultation (₹99)</option>
                        <option value="preference">Choice Sheet Review (₹199)</option>
                        <option value="roadmap">4-Year Success Roadmap (₹149)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reqDet" className="text-xs font-bold text-[#A1A1AA]">Consultation Details / Queries</Label>
                      <Input
                        id="reqDet"
                        placeholder="e.g. Help me compare CSE at NIT Trichy vs IIIT Hyderabad"
                        value={reqDetails}
                        onChange={(e) => setReqDetails(e.target.value)}
                        className="h-11 px-4 bg-[#13131A] border border-border-custom rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] transition"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border-custom">
                    <Button
                      type="submit"
                      disabled={reqCreating}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white text-xs font-bold shadow-md hover:shadow-[#7C3AED]/20 transition cursor-pointer border-none flex items-center gap-1.5"
                    >
                      {reqCreating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Guidance Request'
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {/* REQUESTS LIST */}
              {requests.length === 0 ? (
                <div className="border border-dashed border-border-custom rounded-2xl p-12 text-center space-y-3 flex-1 flex flex-col justify-center">
                  <div className="text-2xl">📋</div>
                  <h3 className="text-xs font-bold text-[#FAFAFA]">No matching requests yet</h3>
                  <p className="text-[11px] text-secondary-text max-w-xs mx-auto leading-relaxed">
                    Request college reality checks, live chats, or voice consultations.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {requests.map((req) => (
                    <div key={req.id} className="p-5 rounded-2xl border border-border-custom bg-[#13131A] space-y-4">
                      <div className="flex justify-between items-start flex-wrap gap-2 text-left">
                        <div>
                          <Badge className="bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#A855F7] text-[9px] font-mono uppercase tracking-wider font-bold">
                            {req.service_type} guidance
                          </Badge>
                          <h4 className="text-sm font-bold text-[#FAFAFA] pt-1">Target: {req.college}</h4>
                          {req.branch && <span className="text-[10px] text-secondary-text block">Preferred Branch: {req.branch}</span>}
                        </div>

                        <div className="text-right">
                          {req.status === 'pending' ? (
                            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-mono font-bold">PENDING MATCH</Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold">MATCHED</Badge>
                          )}
                          <span className="text-[9px] text-secondary-text block pt-1">Submitted: {new Date(req.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>

                      {req.details && (
                        <p className="text-xs text-secondary-text bg-[#09090B]/60 p-3 rounded-xl border border-border-custom italic text-left">
                          "{req.details}"
                        </p>
                      )}

                      {req.status === 'assigned' && req.assigned_senior && (
                        <div className="p-3 border border-border-custom bg-[#09090B]/40 rounded-xl flex items-center justify-between gap-3 text-left">
                          <div className="flex items-center gap-2.5">
                            {req.assigned_senior.avatar_url ? (
                              <img
                                src={req.assigned_senior.avatar_url}
                                alt={req.assigned_senior.name}
                                className="h-8 w-8 rounded-full object-cover border border-[#7C3AED]/20"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-[#7C3AED]/20 text-[#A855F7] flex items-center justify-center text-xs font-bold border border-[#7C3AED]/20">
                                {req.assigned_senior.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="text-xs font-bold text-primary-text block">{req.assigned_senior.name}</span>
                              <span className="text-[9px] text-secondary-text block">Matched Senior (Enrolled at {req.assigned_senior.college})</span>
                            </div>
                          </div>

                          <Button
                            onClick={() => {
                              const chat = conversations.find(c => c.senior_id === req.mentor_id)
                              if (chat) {
                                setActiveChat(chat)
                                setActiveTab('messages')
                              } else {
                                toast.info('Private chat room loading. Please check the Messages tab.')
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white text-[10px] font-bold shadow transition cursor-pointer"
                          >
                            Chat Now
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ORDERS & PAYMENTS */}
          {activeTab === 'purchases' && !loadingData && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Orders & Payments</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Your purchased roadmaps, expert preference reviews, and other orders.</p>
              </div>

              {preferenceReviews.length === 0 ? (
                <div className="border border-dashed border-border-custom rounded-2xl p-12 text-center space-y-3">
                  <div className="h-10 w-10 rounded-full bg-[#13131A] border border-border-custom flex items-center justify-center mx-auto text-[14px]">
                    🛍️
                  </div>
                  <h3 className="text-xs font-bold text-[#FAFAFA]">No orders yet</h3>
                  <p className="text-[11px] text-secondary-text max-w-xs mx-auto leading-relaxed">
                    Expert preference reviews and other purchased services will appear here once ordered.
                  </p>
                  <Button
                    onClick={() => router.push('/#choice-filling')}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white text-xs font-bold shadow-md hover:brightness-105 transition cursor-pointer border-none"
                  >
                    Review with Expert ₹99
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {preferenceReviews.map(review => {
                    const statusMap = {
                      pending: { label: 'Pending Review', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
                      paid: { label: 'Paid', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                      assigned: { label: 'Senior Assigned', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                      completed: { label: 'Completed', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                    }
                    const statusInfo = statusMap[review.status] || statusMap.pending
                    return (
                      <div key={review.id} className="p-4 rounded-2xl border border-border-custom bg-[#13131A] flex items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-[#FAFAFA]">Expert Preference Review</span>
                            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold uppercase tracking-wider ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-secondary-text">
                            <span className="font-mono">₹99</span>
                            <span>•</span>
                            <span>{new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span>•</span>
                            <span>{review.original_list?.length ?? 0} Choices Submitted</span>
                          </div>
                          {review.feedback && (
                            <p className="text-[10px] text-[#A1A1AA] italic truncate max-w-sm">
                              &ldquo;{review.feedback}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: SAVED PREFERENCES */}
          {activeTab === 'preferences' && !loadingData && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Saved Preferences</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Colleges and branches saved from your predictor audits.</p>
              </div>

              {preferences.length === 0 ? (
                <div className="border border-dashed border-border-custom rounded-2xl p-12 text-center space-y-3">
                  <div className="text-2xl">📋</div>
                  <h3 className="text-xs font-bold text-[#FAFAFA]">No saved preference lists</h3>
                  <p className="text-[11px] text-secondary-text max-w-xs mx-auto">
                    Use the College Predictor tool on the landing page, and click Save Preference on list matches.
                  </p>
                  <Button
                    onClick={() => router.push('/')}
                    className="px-5 py-2 rounded-xl border border-border-custom bg-[#13131A] text-xs font-semibold text-secondary-text hover:text-white transition duration-200 cursor-pointer"
                  >
                    Open Predictor App
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {preferences.map(pref => (
                    <div key={pref.id} className="p-4 rounded-xl border border-border-custom bg-[#13131A] text-left">
                      <span className="text-xs font-bold text-[#FAFAFA] block">{pref.name}</span>
                      <span className="text-[10px] text-secondary-text font-mono">Saved on: {new Date(pref.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ROADMAPS */}
          {activeTab === 'roadmaps' && !loadingData && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Custom Roadmaps</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Personalized academic and technology blueprints created for you by seniors.</p>
              </div>

              {roadmaps.length === 0 ? (
                <div className="border border-dashed border-border-custom rounded-2xl p-12 text-center space-y-3">
                  <div className="text-2xl">🗺️</div>
                  <h3 className="text-xs font-bold text-[#FAFAFA]">No blueprints assigned yet</h3>
                  <p className="text-[11px] text-secondary-text max-w-xs mx-auto">
                    Request a roadmap blueprint from an assigned senior. They will display here once delivered.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {roadmaps.map(roadmap => (
                    <div key={roadmap.id} className="p-5 rounded-2xl border border-border-custom bg-[#13131A] text-left space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-primary-text">{roadmap.title}</h3>
                        <span className="text-[10px] text-secondary-text font-mono">Creator: {roadmap.creator?.name} ({roadmap.creator?.college})</span>
                      </div>
                      <p className="text-xs text-secondary-text leading-relaxed whitespace-pre-wrap">
                        {roadmap.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: MESSAGES */}
          {activeTab === 'messages' && !loadingData && (
            <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col h-full">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Private Messages</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Direct private chats with your matched college seniors.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[400px]">
                {/* Rooms selection list */}
                <div className="lg:col-span-4 border border-border-custom rounded-2xl bg-[#09090B]/40 p-3 space-y-1.5 max-h-[420px] overflow-y-auto">
                  <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block px-2.5 py-1 font-mono">Matched Seniors</span>
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 text-xs text-secondary-text">No active conversations. Match with a senior first.</div>
                  ) : (
                    conversations.map((conv) => {
                      const isSel = activeChat?.id === conv.id
                      return (
                        <button
                          key={conv.id}
                          onClick={() => setActiveChat(conv)}
                          className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            isSel
                              ? 'border-primary-purple bg-primary-purple/10 text-[#A855F7]'
                              : 'border-transparent text-secondary-text hover:bg-[#13131A] hover:text-[#FAFAFA]'
                          }`}
                        >
                          {conv.senior?.avatar_url ? (
                            <img
                              src={conv.senior.avatar_url}
                              alt={conv.senior.name}
                              className="h-7 w-7 rounded-full object-cover border border-[#7C3AED]/25"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-[#7C3AED]/15 text-[#A855F7] flex items-center justify-center text-xs font-bold border border-[#7C3AED]/25">
                              {conv.senior?.name ? conv.senior.name.charAt(0).toUpperCase() : 'M'}
                            </div>
                          )}
                          <div className="truncate">
                            <span className="text-xs font-bold text-[#FAFAFA] block truncate">{conv.senior?.name || 'Mentor'}</span>
                            <span className="text-[9px] text-[#A1A1AA] block truncate">Enrolled in {conv.senior?.college}</span>
                          </div>
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
                      otherPartyName={activeChat.senior?.name || 'Mentor'}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-center p-8 space-y-2">
                      <MessageSquare className="h-8 w-8 text-secondary-text/30" />
                      <h4 className="text-xs font-bold text-[#FAFAFA]">Select a conversation</h4>
                      <p className="text-[10px] text-secondary-text max-w-xs leading-relaxed">
                        Pick a verified senior chat room from the list to load your real-time private messenger.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PROFILE */}
          {activeTab === 'profile' && !loadingData && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Profile Details</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Complete your academic profile details so matched seniors have complete context.</p>
              </div>

              {saveError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  Profile updated successfully!
                </div>
              )}

              <form onSubmit={handleProfileSave} className="space-y-5">
                
                {/* Account details wrapper */}
                <div className="p-4 rounded-2xl bg-[#13131A]/60 border border-border-custom flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name}
                      className="h-16 w-16 rounded-full object-cover border border-[#7C3AED]/40 shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-[#7C3AED]/20 text-[#A855F7] flex items-center justify-center text-xl font-black border border-[#7C3AED]/40 shrink-0">
                      {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                  )}
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider block font-mono">SUPABASE STUDENT ACCOUNT</span>
                    <h3 className="text-base font-black text-[#FAFAFA]">{name || 'Student'}</h3>
                    <p className="text-xs text-secondary-text">{user?.email}</p>
                    <span className="text-[10px] text-secondary-text/50 block pt-1">Member since: {joinedDate}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="profName" className="text-xs font-bold text-[#A1A1AA]">Full Name</Label>
                    <Input
                      id="profName"
                      type="text"
                      placeholder="e.g. Vijay Swamy"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 px-4 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] transition"
                    />
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="profPhone" className="text-xs font-bold text-[#A1A1AA]">Phone Number</Label>
                    <Input
                      id="profPhone"
                      type="tel"
                      placeholder="e.g. +91 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 px-4 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Allotted College */}
                  <div className="space-y-1.5">
                    <Label htmlFor="profCollege" className="text-xs font-bold text-[#A1A1AA]">Allotted College <span className="text-[#A1A1AA]/50 font-normal">(Optional)</span></Label>
                    <Input
                      id="profCollege"
                      type="text"
                      placeholder="e.g. IIIT Vadodara"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="h-11 px-4 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] transition"
                    />
                  </div>

                  {/* Target College */}
                  <div className="space-y-1.5">
                    <Label htmlFor="profTarget" className="text-xs font-bold text-[#A1A1AA]">Target College <span className="text-[#A1A1AA]/50 font-normal">(Optional)</span></Label>
                    <Input
                      id="profTarget"
                      type="text"
                      placeholder="e.g. NIT Trichy"
                      value={targetCollege}
                      onChange={(e) => setTargetCollege(e.target.value)}
                      className="h-11 px-4 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Branch */}
                  <div className="space-y-1.5">
                    <Label htmlFor="profBranch" className="text-xs font-bold text-[#A1A1AA]">Branch / Course <span className="text-[#A1A1AA]/50 font-normal">(Optional)</span></Label>
                    <Input
                      id="profBranch"
                      type="text"
                      placeholder="e.g. CSE"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="h-11 px-4 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] transition"
                    />
                  </div>

                  {/* Year selector */}
                  <div className="space-y-1.5">
                    <Label htmlFor="profYear" className="text-xs font-bold text-[#A1A1AA]">Current Year</Label>
                    <select
                      id="profYear"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full h-11 px-3 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text focus:border-[#7C3AED] outline-none cursor-pointer"
                    >
                      <option value="Pre-college">Pre-college (Lander)</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-border-custom flex justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white text-xs font-bold shadow-md hover:shadow-[#7C3AED]/20 transition cursor-pointer border-none flex items-center gap-1.5"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Saving Profile...
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        Save Changes
                      </>
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

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-primary-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-[#A1A1AA]">Loading SahiSeat Dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
