'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle,
  MessageSquare,
  DollarSign,
  ClipboardList,
  LogOut,
  ChevronRight,
  UserCheck,
  Loader2,
  Trash2,
  AlertCircle,
  Users,
  Search,
  Filter,
  BarChart3,
  Settings,
  Check,
  X,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
} from 'lucide-react'
import ChatPanel from '@/components/ChatPanel'
import { useToast } from '@/context/ToastContext'


const TABS = [
  { id: 'dashboard', label: 'Console Dashboard', icon: BarChart3 },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'mentors', label: 'Mentors & Seniors', icon: ShieldCheck },
  { id: 'requests', label: 'Guidance Requests', icon: ClipboardList },
  { id: 'payments', label: 'Payments ledger', icon: DollarSign },
  { id: 'chats', label: 'Monitor Chats', icon: MessageSquare },
]

function AdminDashboardContent() {
  const router = useRouter()
  const { user, profile, loading: authLoading, logout } = useAuth()
  const { toast } = useToast()


  const [activeTab, setActiveTab] = useState('dashboard')
  const [loadingData, setLoadingData] = useState(false)

  // Datasets
  const [stats, setStats] = useState({
    totalStudents: 0,
    verifiedMentors: 0,
    pendingRequests: 0,
    completedRequests: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    pendingVerifications: 0,
    pendingPayments: 0,
  })

  // List Datasets
  const [students, setStudents] = useState([])
  const [mentors, setMentors] = useState([])
  const [requests, setRequests] = useState([])
  const [payments, setPayments] = useState([])
  const [conversations, setConversations] = useState([])

  // Search & Filter & Pagination states
  const [searchQuery, setSearchQuery] = useState('')
  const [collegeFilter, setCollegeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Expanded student inspector details
  const [inspectingStudent, setInspectingStudent] = useState(null)
  const [inspectedPrefs, setInspectedPrefs] = useState([])
  const [inspectedPayments, setInspectedPayments] = useState([])
  const [inspectedRequests, setInspectedRequests] = useState([])
  const [inspectingLoading, setInspectingLoading] = useState(false)
  // Selection states
  const [selectedSeniorForRequest, setSelectedSeniorForRequest] = useState({}) // request_id -> senior_id
  const [requestNotes, setRequestNotes] = useState({}) // request_id -> notes_text
  const [activeChat, setActiveChat] = useState(null)

  // Load Admin Data on tab changes or auth loaded
  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchAdminData()
    }
  }, [user, profile, activeTab])

  const fetchAdminData = async () => {
    setLoadingData(true)
    try {
      if (activeTab === 'dashboard') {
        await loadAnalytics()

        // Fetch pending seniors
        const { data: pendingData, error: pendingError } = await supabase
          .from('profiles')
          .select('*')
          .eq('verification_status', 'pending_approval')

        console.log("Pending Seniors:", pendingData)
        console.log("Pending Error:", pendingError)

        if (pendingData) setPendingSeniors(pendingData)

        // Fetch approved seniors
        const { data: approvedData } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'senior')
          .eq('verification_status', 'approved')

        if (approvedData) setApprovedSeniors(approvedData)

        // Fetch requests
        const { data: reqData } = await supabase
          .from('requests')
          .select(`
      *,
      student:student_id ( id, name, email, avatar_url )
    `)
          .order('created_at', { ascending: false })

        if (reqData) setRequests(reqData)

        // Fetch conversations
        const { data: convData } = await supabase
          .from('conversations')
          .select(`
      *,
      student:student_id ( id, name, email, avatar_url ),
      senior:senior_id ( id, name, email, avatar_url, college )
    `)

        if (convData) setConversations(convData)

      } else if (activeTab === 'students') {
        await loadStudents()
      } else if (activeTab === 'mentors') {
        await loadMentors()
      } else if (activeTab === 'requests') {
        await loadRequests()
        await loadMentors()
      } else if (activeTab === 'payments') {
        await loadPayments()
      } else if (activeTab === 'chats') {
        await loadChats()
      }
    } catch (err) {
      console.error('Error loading admin dataset:', err)
    } finally {
      setLoadingData(false)
    }
  }

  // 1. Dashboard Analytics loader
  const loadAnalytics = async () => {
    // Total Students
    const { count: studentCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')

    // Verified Mentors
    const { count: mentorCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'senior')
      .eq('is_verified', true)

    // Pending Requests
    const { count: pendingReqs } = await supabase
      .from('guidance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Completed Requests
    const { count: completedReqs } = await supabase
      .from('guidance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')

    // Pending Mentor Verification
    const { count: pendingMentors } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending_approval')

    // Payments ledger sum
    const { data: payLedger } = await supabase
      .from('payments')
      .select('amount, created_at, status')
      .eq('status', 'completed')

    let totalRevenue = 0
    let todayRevenue = 0
    const todayStr = new Date().toISOString().split('T')[0]

    if (payLedger) {
      payLedger.forEach((p) => {
        totalRevenue += Number(p.amount)
        const pDateStr = new Date(p.created_at).toISOString().split('T')[0]
        if (pDateStr === todayStr) {
          todayRevenue += Number(p.amount)
        }
      })
    }

    // Pending Payments
    const { count: pendingPays } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    setStats({
      totalStudents: studentCount || 0,
      verifiedMentors: mentorCount || 0,
      pendingRequests: pendingReqs || 0,
      completedRequests: completedReqs || 0,
      totalRevenue,
      todayRevenue,
      pendingVerifications: pendingMentors || 0,
      pendingPayments: pendingPays || 0,
    })
  }

  // 2. Load Students
  const loadStudents = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false })
    if (data) setStudents(data)
  }

  // 3. Load Inspecting Student details
  const inspectStudent = async (student) => {
    setInspectingStudent(student)
    setInspectingLoading(true)
    try {
      // Preference list
      const { data: prefData } = await supabase
        .from('saved_preferences')
        .select('*')
        .eq('student_id', student.id)
        .maybeSingle()
      setInspectedPrefs(prefData?.preferences || [])

      // Payments history
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', student.id)
        .order('created_at', { ascending: false })
      setInspectedPayments(payData || [])

      // Requests history
      const { data: reqData } = await supabase
        .from('guidance_requests')
        .select(`
          *,
          mentor:mentor_id ( name, college )
        `)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
      setInspectedRequests(reqData || [])
    } catch (err) {
      console.error('Failed student inspect fetch:', err)
    } finally {
      setInspectingLoading(false)
    }
  }

  // 4. Load Mentors
  const loadMentors = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or('role.eq.senior,verification_status.eq.pending_approval')
      .order('created_at', { ascending: false })
    if (data) setMentors(data)
  }

  // 5. Load Requests
  const loadRequests = async () => {
    const { data } = await supabase
      .from('guidance_requests')
      .select(`
        *,
        student:student_id ( id, name, email, avatar_url ),
        mentor:mentor_id ( id, name, college )
      `)
      .order('created_at', { ascending: false })
    if (data) {
      setRequests(data)
      // Populate admin notes editor state
      const notes = {}
      data.forEach((r) => {
        notes[r.id] = r.admin_notes || ''
      })
      setRequestNotes(notes)
    }
  }

  // 6. Load Payments
  const loadPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select(`
        *,
        student:user_id ( name, email )
      `)
      .order('created_at', { ascending: false })
    if (data) setPayments(data)
  }

  // 7. Load Chats
  const loadChats = async () => {
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        student:student_id ( id, name, email, avatar_url ),
        senior:senior_id ( id, name, email, avatar_url, college )
      `)
      .order('created_at', { ascending: false })
    if (data) setConversations(data)
  }

  // Mentor approvals / control actions
  const handleApproveMentor = async (seniorId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          role: 'senior',
          verification_status: 'approved',
          is_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', seniorId)
        .select()

      if (error) throw error

      toast.success('Mentor verification approved successfully!')

      // Update local state
      const approvedSenior = pendingSeniors.find(s => s.id === seniorId)
      setPendingSeniors(prev => prev.filter(s => s.id !== seniorId))

      if (approvedSenior) {
        setApprovedSeniors(prev => [
          ...prev,
          {
            ...approvedSenior,
            role: 'senior',
            verification_status: 'approved'
          }
        ])
      }

      fetchAdminData()

    } catch (err) {
      toast.error(err.message || 'Approval failed')
    }
  }

  const handleRejectMentor = async (seniorId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'student',
          verification_status: 'unverified',
          is_verified: false,
          official_email: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', seniorId)

      if (error) throw error
      toast.success('Mentor application rejected and reset to student.')
      fetchAdminData()
    } catch (err) {
      toast.error(err.message || 'Rejection failed')
    }
  }

  const handleToggleMentorAvailability = async (seniorId, currentAvailability) => {
    const nextAvailability = currentAvailability === 'Available' ? 'Unavailable' : 'Available'
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          availability: nextAvailability,
          updated_at: new Date().toISOString(),
        })
        .eq('id', seniorId)

      if (error) throw error
      fetchAdminData()
    } catch (err) {
      toast.error(err.message || 'Failed to toggle availability status')
    }
  }

  // Guidance matching actions
  const handleAssignMentor = async (requestId, studentId) => {
    const seniorId = selectedSeniorForRequest[requestId]
    if (!seniorId) {
      toast.warning('Please select a senior mentor to match.')
      return
    }

    try {
      // 1. Assign in guidance requests
      const { error: reqError } = await supabase
        .from('guidance_requests')
        .update({
          mentor_id: seniorId,
          status: 'assigned',
        })
        .eq('id', requestId)

      if (reqError) throw reqError

      // 2. Automatically spin up a private chat channel
      const { error: convError } = await supabase
        .from('conversations')
        .insert({
          student_id: studentId,
          senior_id: seniorId,
          request_id: requestId,
        })
      console.log("Conversation Error:", convError)

      if (convError && convError.code !== '23505') { // unique key ignore
        toast.error('Conversation spin up error: ' + JSON.stringify(convError))
        throw convError
      }

      toast.success('Mentor successfully matched! Chat conversation automatically created.')
      fetchAdminData()
    } catch (err) {
      toast.error(err.message || 'Matching process failed')
    }
  }

  const handleUpdateStatus = async (requestId, nextStatus) => {
    try {
      const { error } = await supabase
        .from('guidance_requests')
        .update({ status: nextStatus })
        .eq('id', requestId)
      if (error) throw error
      toast.success(`Request status successfully marked as: ${nextStatus}`)
      fetchAdminData()
    } catch (err) {
      toast.error(err.message || 'Status update failed')
    }
  }

  const handleSaveRequestNotes = async (requestId) => {
    const notesText = requestNotes[requestId] || ''
    try {
      const { error } = await supabase
        .from('guidance_requests')
        .update({ admin_notes: notesText })
        .eq('id', requestId)
      if (error) throw error
      toast.success('Admin notes updated successfully for request!')
      fetchAdminData()
    } catch (err) {
      toast.error(err.message || 'Notes save failed')
    }
  }

  const handleDeleteRequest = async (requestId) => {
    if (!confirm('Are you sure you want to delete this request permanently?')) return
    try {
      const { error } = await supabase
        .from('guidance_requests')
        .delete()
        .eq('id', requestId)
      if (error) throw error
      toast.success('Guidance request deleted.')
      fetchAdminData()
    } catch (err) {
      toast.error(err.message || 'Failed to delete request')
    }
  }

  const handleTriggerMockRefund = async (paymentId) => {
    toast.info(`Refund Request initiated for Transaction: ${paymentId}.\nRefund Status: PENDING (mock placeholder - funds will settle inside original channel).`)
  }

  // Filtering & Pagination Calculations
  const resetFilters = () => {
    setSearchQuery('')
    setCollegeFilter('All')
    setStatusFilter('All')
    setCurrentPage(1)
  }

  const getFilteredItems = (items) => {
    return items.filter((item) => {
      // 1. Search Query Match
      const matchesSearch =
        searchQuery === '' ||
        (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.email && item.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.student?.name && item.student.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.student?.email && item.student.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.razorpay_payment_id && item.razorpay_payment_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.razorpay_order_id && item.razorpay_order_id.toLowerCase().includes(searchQuery.toLowerCase()))

      // 2. College Filter Match
      const matchesCollege =
        collegeFilter === 'All' ||
        (item.college && item.college.toLowerCase().includes(collegeFilter.toLowerCase()))

      // 3. Status Filter Match
      const matchesStatus =
        statusFilter === 'All' ||
        item.status === statusFilter ||
        item.verification_status === statusFilter

      return matchesSearch && matchesCollege && matchesStatus
    })
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary-purple mx-auto" />
          <p className="text-xs text-secondary-text">Loading SahiSeat Console...</p>
        </div>
      </div>
    )
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex items-center justify-center">
        <div className="text-center space-y-4 p-6 border border-border-custom bg-[#13131A] rounded-2xl max-w-sm">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-primary-text">Access Denied</h3>
          <p className="text-xs text-secondary-text leading-relaxed">
            Your account is not authorized to access this administration page.
          </p>
          <Button onClick={() => router.replace('/')} className="w-full text-xs font-bold py-2 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white cursor-pointer">
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col font-sans selection:bg-primary-purple/30">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0 flex justify-center items-center overflow-hidden">
        <div className="h-[250px] w-[500px] rounded-full bg-gradient-to-tr from-primary-purple/5 to-accent-blue/5 blur-[120px] absolute top-10 left-10" />
        <div className="h-[300px] w-[600px] rounded-full bg-gradient-to-br from-primary-purple/5 to-accent-blue/5 blur-[140px] absolute bottom-10 right-10" />
      </div>

      {/* Navbar Header */}
      <header className="border-b border-border-custom bg-[#09090B]/85 backdrop-blur-md sticky top-0 z-40 h-16 flex items-center px-4 sm:px-8 justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#2563EB] shadow-md">
            <ShieldCheck className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-[#FAFAFA]">
            SahiSeat <span className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] bg-clip-text text-transparent font-medium">Console Admin</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-secondary-text font-mono uppercase bg-[#13131A] px-2.5 py-1 rounded border border-border-custom">
            ⚡ PRODUCTION SYSTEM AUDIT
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-custom bg-[#13131A] hover:bg-rose-500/10 text-rose-400 text-xs font-bold transition duration-200 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 sm:p-8 gap-8 relative z-10">

        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-60 shrink-0 flex flex-col gap-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isSel = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setActiveChat(null)
                  setInspectingStudent(null)
                  resetFilters()
                }}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${isSel
                  ? 'bg-gradient-to-r from-primary-purple/10 to-accent-blue/10 border border-primary-purple/35 text-[#A855F7]'
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
        </aside>

        {/* Console Viewport */}
        <main className="flex-1 bg-[#13131A]/40 border border-border-custom rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm min-h-[600px] flex flex-col">upstream/main
          {loadingData && (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary-purple" />
            </div>
          )}

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && !loadingData && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">System Performance & Health</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Real-time indicators processed from SahiSeat database logs.</p>
              </div>

              {/* Stats Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Students', value: stats.totalStudents, badge: 'Registered', color: 'text-purple-400' },
                  { label: 'Verified Mentors', value: stats.verifiedMentors, badge: 'Approved', color: 'text-emerald-400' },
                  { label: 'Pending Requests', value: stats.pendingRequests, badge: 'Needs Action', color: 'text-amber-400' },
                  { label: 'Completed Matches', value: stats.completedRequests, badge: 'Delivered', color: 'text-blue-400' },
                  { label: 'Cumulative Revenue', value: `₹${stats.totalRevenue}`, badge: 'Gross Income', color: 'text-primary-text' },
                  { label: "Today's Revenue", value: `₹${stats.todayRevenue}`, badge: 'Captured', color: 'text-emerald-400' },
                  { label: 'Pending Verification', value: stats.pendingVerifications, badge: 'Seniors Onboarding', color: 'text-amber-400' },
                  { label: 'Pending Payments', value: stats.pendingPayments, badge: 'Escrow', color: 'text-zinc-500' },
                ].map((item, i) => (
                  <div key={i} className="bg-[#13131A] border border-border-custom rounded-2xl p-5 space-y-2">
                    <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block font-mono">{item.label}</span>
                    <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
                    <Badge className="bg-[#13131A] border border-border-custom text-secondary-text text-[8px] font-mono">{item.badge}</Badge>
                  </div>
                ))}
              </div>

              {/* Quick Actions Callout */}
              <div className="p-5 border border-border-custom bg-[#13131A] rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1 text-left">
                  <h3 className="text-sm font-bold text-[#FAFAFA]">Fast System Checkup</h3>
                  <p className="text-xs text-secondary-text leading-relaxed">
                    Check college cutoffs count, user session logs, or database migrations sync status.
                  </p>
                </div>
                <Button onClick={() => fetchAdminData()} className="px-4 py-2 text-xs font-bold bg-[#13131A] border border-border-custom rounded-xl flex items-center gap-1.5 cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sync Console
                </Button>
              </div>
            </div>
          )}

          {/* TAB: STUDENTS */}
          {activeTab === 'students' && !loadingData && (
            <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Student Accounts</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Review student preferences lists, purchased services, and historical matching.</p>
              </div>

              {/* Search bar */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="Search students by name or email address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-11 bg-[#13131A]/60 border-border-custom text-xs rounded-xl"
                  />
                </div>
                {searchQuery && (
                  <Button onClick={() => setSearchQuery('')} className="bg-transparent border border-border-custom text-xs text-zinc-400 hover:text-white px-3.5 rounded-xl cursor-pointer">
                    Clear
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">

                {/* Students List */}
                <div className="lg:col-span-7 space-y-3">
                  {getFilteredItems(students).length === 0 ? (
                    <div className="text-center py-12 text-xs text-secondary-text bg-[#13131A]/30 border border-dashed border-border-custom rounded-2xl">
                      No matching students found.
                    </div>
                  ) : (
                    getFilteredItems(students)
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((student) => (
                        <button
                          key={student.id}
                          onClick={() => inspectStudent(student)}
                          className={`w-full p-4 rounded-xl border text-left transition flex justify-between items-center ${inspectingStudent?.id === student.id
                            ? 'border-[#7C3AED] bg-[#7C3AED]/5'
                            : 'border-border-custom bg-[#13131A] hover:bg-[#13131A]/85'
                            }`}
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#FAFAFA] block truncate">{student.name}</span>
                            <span className="text-[10px] text-secondary-text font-mono truncate block">{student.email}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-zinc-500" />
                        </button>
                      ))
                  )}

                  {/* Pagination */}
                  {getFilteredItems(students).length > itemsPerPage && (
                    <div className="flex justify-between items-center pt-2">
                      <Button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((c) => c - 1)}
                        className="p-2 bg-[#13131A] text-xs disabled:opacity-40"
                      >
                        Prev
                      </Button>
                      <span className="text-[10px] text-zinc-500">Page {currentPage} of {Math.ceil(getFilteredItems(students).length / itemsPerPage)}</span>
                      <Button
                        disabled={currentPage >= Math.ceil(getFilteredItems(students).length / itemsPerPage)}
                        onClick={() => setCurrentPage((c) => c + 1)}
                        className="p-2 bg-[#13131A] text-xs disabled:opacity-40"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>

                {/* Inspect Details panel */}
                <div className="lg:col-span-5 border border-border-custom bg-[#13131A]/60 rounded-2xl p-5 min-h-[400px]">
                  {inspectingStudent ? (
                    inspectingLoading ? (
                      <div className="flex justify-center items-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-primary-purple" />
                      </div>
                    ) : (
                      <div className="space-y-6 text-left">
                        <div>
                          <h3 className="text-sm font-bold text-[#FAFAFA]">{inspectingStudent.name}</h3>
                          <span className="text-[10px] text-secondary-text font-mono block">{inspectingStudent.email}</span>
                        </div>

                        {/* Preferred List */}
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-primary-purple font-mono uppercase tracking-wider block">Choice Preference List</span>
                          {inspectedPrefs.length === 0 ? (
                            <div className="text-[10px] text-zinc-500 italic bg-[#09090B]/35 border border-border-custom p-3 rounded-xl">Empty or list not synchronized yet.</div>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {inspectedPrefs.map((p, index) => (
                                <div key={index} className="text-[10px] bg-[#09090B]/40 border border-border-custom p-2 rounded-lg leading-snug">
                                  <span className="font-bold text-primary-purple">{index + 1}.</span> {p.institute} — {p.program}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Matching requests */}
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-accent-blue font-mono uppercase tracking-wider block">Active Guidance Requests</span>
                          {inspectedRequests.length === 0 ? (
                            <div className="text-[10px] text-zinc-500 italic">No guidance requests recorded.</div>
                          ) : (
                            <div className="space-y-1.5">
                              {inspectedRequests.map((r) => (
                                <div key={r.id} className="text-[10px] bg-[#09090B]/40 border border-border-custom p-2 rounded-lg flex justify-between items-center">
                                  <div>
                                    <span className="font-bold uppercase text-[#A855F7]">{r.service_type}</span>
                                    {r.mentor && <span className="block text-zinc-500">Mentor: {r.mentor.name}</span>}
                                  </div>
                                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] font-mono uppercase">{r.status}</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Payments list */}
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-emerald-400 font-mono uppercase tracking-wider block">Transaction Ledger</span>
                          {inspectedPayments.length === 0 ? (
                            <div className="text-[10px] text-zinc-500 italic">No payments processed.</div>
                          ) : (
                            <div className="space-y-1.5">
                              {inspectedPayments.map((p) => (
                                <div key={p.id} className="text-[10px] bg-[#09090B]/40 border border-border-custom p-2 rounded-lg flex justify-between items-center">
                                  <div>
                                    <span className="font-mono text-emerald-400">₹{p.amount}</span> • <span className="uppercase text-zinc-400 font-mono">{p.service}</span>
                                  </div>
                                  <span className="text-[9px] text-zinc-500 font-mono">{new Date(p.created_at).toLocaleDateString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col justify-center items-center h-full text-center text-zinc-500 space-y-2 py-20">
                      <Users className="h-8 w-8 text-zinc-600" />
                      <h4 className="text-xs font-bold text-[#FAFAFA]">Select a student</h4>
                      <p className="text-[10px] text-secondary-text max-w-xs leading-relaxed">
                        Pick a student account from the list to inspect their cloud choice lists, active requests, and transaction ledger logs.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: MENTORS */}
          {activeTab === 'mentors' && !loadingData && (
            <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Senior Mentors Verification</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Approve pending applications, manage availability, or restrict mentor accounts.</p>
              </div>

              {/* Status Select Filter */}
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 h-10 bg-[#13131A]/60 border border-border-custom rounded-xl text-xs text-[#FAFAFA] outline-none cursor-pointer"
                >
                  <option value="All">All Application Statuses</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved Seniors</option>
                  <option value="unverified">Unverified Students</option>
                </select>
              </div>

              {getFilteredItems(mentors).length === 0 ? (
                <div className="border border-dashed border-border-custom rounded-2xl p-12 text-center text-xs text-secondary-text">
                  No mentors matching current filters found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {getFilteredItems(mentors).map((mentor) => (
                    <div key={mentor.id} className="p-5 rounded-2xl border border-border-custom bg-[#13131A] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#FAFAFA]">{mentor.name}</h4>
                          {mentor.verification_status === 'pending_approval' ? (
                            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-mono">PENDING VERIFICATION</Badge>
                          ) : mentor.verification_status === 'approved' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-mono">APPROVED SENIOR</Badge>
                          ) : (
                            <Badge className="bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[8px] font-mono">STUDENT</Badge>
                          )}
                          <Badge className="bg-zinc-800 text-[#FAFAFA] text-[8px] font-mono">Availability: {mentor.availability || 'Available'}</Badge>
                        </div>
                        <div className="text-xs text-secondary-text">Google Account: <strong className="text-primary-text">{mentor.email}</strong></div>
                        <div className="text-xs text-secondary-text">Verified College Email: <strong className="text-accent-blue font-mono">{mentor.official_email || '—'}</strong></div>
                        <div className="text-xs text-secondary-text">College Claim: <strong className="text-primary-text">{mentor.college || '—'}</strong> • Branch: <strong className="text-primary-text">{mentor.branch || '—'}</strong> • Year: <strong className="text-primary-text">{mentor.year || '—'}</strong></div>
                        {mentor.linkedin_url && (
                          <a
                            href={mentor.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary-purple hover:underline font-semibold inline-block pt-1"
                          >


                            View LinkedIn Profile Link ↗
                          </a>
                        )}
                      </div>

                      <div className="flex gap-2 shrink-0 flex-wrap">
                        {mentor.verification_status === 'pending_approval' && (
                          <>
                            <Button
                              onClick={() => handleRejectMentor(mentor.id)}
                              className="px-3.5 py-2 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold cursor-pointer"
                            >
                              Reject
                            </Button>
                            <Button
                              onClick={() => handleApproveMentor(mentor.id)}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-xs font-bold cursor-pointer border-none shadow-md"
                            >
                              Approve Senior
                            </Button>
                          </>
                        )}
                        {mentor.verification_status === 'approved' && (
                          <>
                            <Button
                              onClick={() => handleToggleMentorAvailability(mentor.id, mentor.availability)}
                              className="px-3.5 py-2 rounded-xl border border-border-custom bg-[#13131A] text-xs font-semibold cursor-pointer text-secondary-text hover:text-white"
                            >
                              {mentor.availability === 'Available' ? 'Disable Availability' : 'Enable Availability'}
                            </Button>
                            <Button
                              onClick={() => handleRejectMentor(mentor.id)}
                              className="px-3.5 py-2 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold cursor-pointer"
                            >
                              Revoke Approved Status
                            </Button>
                          </>
                        )}
                        upstream/main
                      </div >
                    </div >
                  ))
                  }
                </div >
              )}
            </div >
          )}

          {/* TAB: GUIDANCE REQUESTS */}
          {
            activeTab === 'requests' && !loadingData && (
              <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col">
                <div>
                  <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Match Requests & Assignments</h2>
                  <p className="text-xs text-[#A1A1AA] mt-1">Review active transactions, assign verified mentors, update request status, and track admin remarks.</p>
                </div>

                {/* Search/Filters */}
                <div className="flex gap-3 flex-wrap">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 h-10 bg-[#13131A]/60 border border-border-custom rounded-xl text-xs text-[#FAFAFA] outline-none cursor-pointer"
                  >
                    <option value="All">All Match Statuses</option>
                    <option value="pending">Pending Match</option>
                    <option value="assigned">Assigned Senior</option>
                    <option value="completed">Completed Matches</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {getFilteredItems(requests).length === 0 ? (
                  <div className="border border-dashed border-border-custom rounded-2xl p-12 text-center text-xs text-secondary-text">
                    No matching guidance requests found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {getFilteredItems(requests).map((req) => {
                      const approvedMentors = mentors.filter((m) => m.verification_status === 'approved')
                      return (
                        <div key={req.id} className="p-5 rounded-2xl border border-border-custom bg-[#13131A] space-y-4 text-left">
                          <div className="flex justify-between items-start flex-wrap gap-3">
                            <div>
                              <span className="text-[9px] font-bold text-[#A855F7] font-mono uppercase tracking-wider block">GUIDANCE MATCH SERVICE</span>
                              <h4 className="text-sm font-bold text-primary-text pt-0.5">Student: {req.student?.name} ({req.student?.email})</h4>
                              <span className="text-[10px] text-zinc-500 block font-mono">Submitted Date: {new Date(req.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge className="bg-[#7C3AED]/15 border border-[#7C3AED]/20 text-[#A855F7] text-[8px] uppercase tracking-wider font-mono">
                                {req.service_type}
                              </Badge>
                              <Badge className={`text-[8px] font-mono uppercase ${req.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : req.status === 'assigned'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : req.status === 'completed'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                {req.status}
                              </Badge>
                            </div>
                          </div>

                          {/* College details & remarks */}
                          <div className="p-3.5 rounded-xl bg-[#09090B]/60 border border-border-custom text-xs space-y-1">
                            <div><span className="text-secondary-text">Target College:</span> <strong className="text-primary-text">{req.college || 'Any'}</strong></div>
                            {req.branch && <div><span className="text-secondary-text">Preferred Branch:</span> <strong className="text-primary-text">{req.branch}</strong></div>}
                            {req.remarks && <div className="pt-1 text-secondary-text italic">&ldquo;{req.remarks}&rdquo;</div>}
                          </div>

                          {/* Assigned Senior status */}
                          {req.status === 'assigned' && req.mentor && (
                            <div className="p-3 bg-[#09090B]/40 border border-border-custom rounded-xl text-xs flex justify-between items-center">
                              <span>Matched Senior Mentor: <strong className="text-accent-blue">{req.mentor.name}</strong> ({req.mentor.college})</span>
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] uppercase font-mono">Matched ✓</Badge>
                            </div>
                          )}

                          {/* Admin Action Interface */}
                          <div className="pt-2 border-t border-border-custom space-y-3">
                            {req.status === 'pending' && (
                              <div className="flex flex-col sm:flex-row gap-3">
                                {/* Match selection */}
                                <div className="flex-1">
                                  <select
                                    value={selectedSeniorForRequest[req.id] || ''}
                                    onChange={(e) => setSelectedSeniorForRequest(prev => ({ ...prev, [req.id]: e.target.value }))}
                                    className="w-full h-10 px-3 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text focus:border-[#7C3AED] outline-none cursor-pointer"
                                  >
                                    <option value="">-- Choose Approved Senior Mentor --</option>
                                    {approvedMentors.map((senior) => (
                                      <option key={senior.id} value={senior.id}>
                                        {senior.name} (College: {senior.college || '—'} • Branch: {senior.branch || '—'})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <Button
                                  onClick={() => handleAssignMentor(req.id, req.student_id)}
                                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-primary-purple to-accent-blue text-white text-xs font-bold cursor-pointer border-none shadow-md shrink-0"
                                >
                                  Match & Connect Senior
                                </Button>
                              </div>
                            )}

                            {/* Action toggle states */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                              {req.status === 'assigned' && (
                                <Button
                                  onClick={() => handleUpdateStatus(req.id, 'completed')}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg cursor-pointer border-none"
                                >
                                  Mark Complete
                                </Button>
                              )}
                              {req.status !== 'cancelled' && req.status !== 'completed' && (
                                <Button
                                  onClick={() => handleUpdateStatus(req.id, 'cancelled')}
                                  className="px-3.5 py-1.5 bg-rose-600/10 border border-rose-600/20 text-rose-400 hover:bg-rose-600/20 text-[10px] font-bold rounded-lg cursor-pointer"
                                >
                                  Cancel Request
                                </Button>
                              )}
                              <Button
                                onClick={() => handleDeleteRequest(req.id)}
                                className="p-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-lg cursor-pointer"
                                title="Delete permanently"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {/* Admin internal notes */}
                            <div className="flex items-center gap-2 pt-1">
                              <Input
                                placeholder="Add internal administrator notes or match tracking logs..."
                                value={requestNotes[req.id] || ''}
                                onChange={(e) => setRequestNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                                className="flex-1 h-9 bg-[#09090B]/60 text-[10px] border-border-custom rounded-lg"
                              />
                              <Button
                                onClick={() => handleSaveRequestNotes(req.id)}
                                className="px-3 h-9 bg-zinc-800 text-[10px] text-white rounded-lg cursor-pointer border-none"
                              >
                                Save Notes
                              </Button>
                            </div>

                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          {/* TAB: PAYMENTS */}
          {
            activeTab === 'payments' && !loadingData && (
              <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col">
                <div>
                  <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Payments Ledger</h2>
                  <p className="text-xs text-[#A1A1AA] mt-1">Audit active transaction signatures, Razorpay details, and student funds capture logs.</p>
                </div>

                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="Search payments ledger by student name, payment id, or order id..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-11 bg-[#13131A]/60 border-border-custom text-xs rounded-xl"
                  />
                </div>

                {getFilteredItems(payments).length === 0 ? (
                  <div className="border border-dashed border-border-custom rounded-2xl p-12 text-center text-xs text-secondary-text">
                    No payment records found.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-border-custom rounded-xl bg-[#09090B]/40">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border-custom bg-[#13131A]/60">
                          <th className="p-3.5 text-secondary-text font-bold uppercase tracking-wider">Student</th>
                          <th className="p-3.5 text-secondary-text font-bold uppercase tracking-wider">Service Format</th>
                          <th className="p-3.5 text-secondary-text font-bold uppercase tracking-wider">Captured Amount</th>
                          <th className="p-3.5 text-secondary-text font-bold uppercase tracking-wider">Razorpay Identifiers</th>
                          <th className="p-3.5 text-secondary-text font-bold uppercase tracking-wider">Date & Time</th>
                          <th className="p-3.5 text-secondary-text font-bold uppercase tracking-wider text-right">Refund Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-custom">
                        {getFilteredItems(payments).map((p) => (
                          <tr key={p.id} className="hover:bg-[#13131A]/30 transition">
                            <td className="p-3.5">
                              <span className="font-bold text-primary-text block">{p.student?.name || 'Unknown Student'}</span>
                              <span className="text-[9px] text-secondary-text block font-mono">{p.student?.email}</span>
                            </td>
                            <td className="p-3.5 uppercase font-mono text-[#A855F7] font-semibold">{p.service}</td>
                            <td className="p-3.5 font-bold text-emerald-400 font-mono">₹{p.amount}</td>
                            <td className="p-3.5 leading-relaxed font-mono text-[10px]">
                              <div>Payment: <span className="text-accent-blue">{p.razorpay_payment_id}</span></div>
                              <div>Order: <span className="text-zinc-500">{p.razorpay_order_id}</span></div>
                            </td>
                            <td className="p-3.5 text-secondary-text font-mono">
                              {new Date(p.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-3.5 text-right">
                              <Button
                                onClick={() => handleTriggerMockRefund(p.razorpay_payment_id)}
                                className="px-2.5 py-1 text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/20 cursor-pointer"
                              >
                                Refund
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          }

          {/* TAB: MONITOR CHATS */}
          {
            activeTab === 'chats' && !loadingData && (
              <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col">
                <div>
                  <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Monitor Conversations</h2>
                  <p className="text-xs text-[#A1A1AA] mt-1">Moderator log checker for matching channels. Direct admin response support enabled.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[450px]">
                  {/* Rooms selection list */}
                  <div className="lg:col-span-4 border border-border-custom rounded-2xl bg-[#09090B]/40 p-3 space-y-1.5 max-h-[450px] overflow-y-auto">
                    <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block px-2.5 py-1 font-mono">Active Matching Channels</span>
                    {conversations.length === 0 ? (
                      <div className="text-center py-8 text-xs text-secondary-text">No active conversations.</div>
                    ) : (
                      conversations.map((conv) => {
                        const isSel = activeChat?.id === conv.id
                        return (
                          <button
                            key={conv.id}
                            onClick={() => setActiveChat(conv)}
                            className={`w-full flex items-center gap-2.5 p-3 rounded-xl border text-left transition cursor-pointer ${
                              isSel
                              ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#A855F7]'
                              : 'border-transparent text-secondary-text hover:bg-[#13131A] hover:text-[#FAFAFA]'
                              }`}
                          >
                            <div className="truncate space-y-0.5 min-w-0 flex-1">
                              <span className="text-xs font-bold text-[#FAFAFA] block truncate">Student: {conv.student?.name}</span>
                              <span className="text-[10px] text-zinc-500 block truncate">Senior: {conv.senior?.name} ({conv.senior?.college})</span>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>

                  {/* Mod chat log */}
                  <div className="lg:col-span-8 border border-border-custom rounded-2xl bg-[#13131A]/60 flex flex-col overflow-hidden min-h-[450px]">
                    {activeChat ? (
                      <ChatPanel
                        conversationId={activeChat.id}
                        currentUserId={user.id}
                        otherPartyName={`MODERATOR [Student: ${activeChat.student?.name} + Senior: ${activeChat.senior?.name}]`}
                        isAdminMod={true}
                      />
                    ) : (
                      <div className="flex-1 flex flex-col justify-center items-center text-center p-8 space-y-2">
                        <MessageSquare className="h-8 w-8 text-secondary-text/30" />
                        <h4 className="text-xs font-bold text-[#FAFAFA]">Select a conversation channel</h4>
                        <p className="text-[10px] text-secondary-text max-w-xs leading-relaxed">
                          Pick a conversation to monitor the messages in real time. You can write messages as administrator to moderate or support.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          }

        </main >
      </div >
    </div >
  )
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-primary-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-[#A1A1AA]">Loading SahiSeat Console...</p>
        </div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  )
}
