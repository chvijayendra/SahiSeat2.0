'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import ChatPanel from '@/components/ChatPanel'

const TABS = [
  { id: 'seniors', label: 'Approve Seniors', icon: UserCheck },
  { id: 'assign', label: 'Assign Seniors', icon: GraduationCap },
  { id: 'requests', label: 'Manage Requests', icon: ClipboardList },
  { id: 'chats', label: 'Monitor Chats', icon: MessageSquare },
  { id: 'payments', label: 'View Payments', icon: DollarSign },
]

// Mock Transactions List
const MOCK_PAYMENTS = [
  { id: 'TXN001', student: 'Aman Gupta', college: 'NIT Trichy', service: 'Voice Consultation', amount: '₹99', status: 'completed', date: '2026-06-25' },
  { id: 'TXN002', student: 'Rohan Sharma', college: 'IIIT Vadodara', service: 'Live Chat', amount: '₹39', status: 'completed', date: '2026-06-26' },
  { id: 'TXN003', student: 'Priya Patel', college: 'NIT KKR', service: 'Roadmap Blueprint', amount: '₹149', status: 'completed', date: '2026-06-26' },
]

function AdminDashboardContent() {
  const router = useRouter()
  const { user, profile, loading: authLoading, logout } = useAuth()

  const [activeTab, setActiveTab] = useState('seniors')
  const [loadingData, setLoadingData] = useState(false)

  // Data states
  const [pendingSeniors, setPendingSeniors] = useState([])
  const [approvedSeniors, setApprovedSeniors] = useState([])
  const [requests, setRequests] = useState([])
  const [conversations, setConversations] = useState([])

  // Selection states
  const [selectedSeniorForRequest, setSelectedSeniorForRequest] = useState({}) // request_id -> senior_id
  const [activeChat, setActiveChat] = useState(null)

  // Fetch admin dashboards datasets
  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchAdminData()
    }
  }, [user, profile])

  const fetchAdminData = async () => {
    setLoadingData(true)
    try {
      // 1. Fetch pending seniors
      const { data: pendingData, error: pendingError } = await supabase
        .from('profiles')
        .select('*')
        .eq('verification_status', 'pending_approval')



      console.log("Pending Seniors:", pendingData)
      console.log("Pending Error:", pendingError)

      if (pendingData) setPendingSeniors(pendingData)

      // 2. Fetch approved seniors
      const { data: approvedData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'senior')
        .eq('verification_status', 'approved')
      if (approvedData) setApprovedSeniors(approvedData)

      // 3. Fetch requests
      const { data: reqData } = await supabase
        .from('requests')
        .select(`
          *,
          student:student_id ( id, name, email, avatar_url )
        `)
        .order('created_at', { ascending: false })
      if (reqData) setRequests(reqData)

      // 4. Fetch conversations
      const { data: convData } = await supabase
        .from('conversations')
        .select(`
          *,
          student:student_id ( id, name, email, avatar_url ),
          senior:senior_id ( id, name, email, avatar_url, college )
        `)
      if (convData) setConversations(convData)

    } catch (err) {
      console.error('Error fetching admin dashboard data:', err)
    } finally {
      setLoadingData(false)
    }
  }

  // 1. Approve Senior Account
  const handleApproveSenior = async (seniorId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          role: 'senior',
          verification_status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', seniorId)
        .select()

      if (error) throw error

      alert("Approved successfully!")

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

    } catch (err) {
      console.error(err)
      alert(err.message || 'Failed to approve senior')
    }
  }

  // 2. Reject Senior Account
  const handleRejectSenior = async (seniorId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'student',
          verification_status: 'unverified',
          official_email: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', seniorId)

      if (error) throw error
      setPendingSeniors(prev => prev.filter(s => s.id !== seniorId))
    } catch (err) {
      console.error(err)
      alert(err.message || 'Failed to reject senior')
    }
  }

  // 3. Assign Senior to Student Request
  const handleAssignSenior = async (requestId, studentId) => {
    const seniorId = selectedSeniorForRequest[requestId]
    if (!seniorId) {
      alert('Please select a senior to assign.')
      return
    }

    try {
      // A. Update request assigned details
      const { error: reqError } = await supabase
        .from('requests')
        .update({
          assigned_senior_id: seniorId,
          status: 'assigned',
        })
        .eq('id', requestId)

      if (reqError) throw reqError

      // B. Create a private conversation channel
      const { error: convError } = await supabase
        .from('conversations')
        .insert({
          student_id: studentId,
          senior_id: seniorId,
          request_id: requestId,
        })
      console.log("Conversation Error:", convError)
      alert(JSON.stringify(convError))

      if (convError && convError.code !== '23505') { // Ignore unique constraint violation if exists
        throw convError
      }

      alert('Senior matched and assigned! Chat conversation automatically created.')
      fetchAdminData() // reload dashboard data
    } catch (err) {
      console.error(err)
      alert(err.message || 'Failed to assign senior')
    }
  }

  // 4. Delete Request
  const handleDeleteRequest = async (requestId) => {
    if (!confirm('Are you sure you want to delete this request?')) return
    try {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', requestId)

      if (error) throw error
      setRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (err) {
      console.error(err)
      alert(err.message || 'Failed to delete request')
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary-purple mx-auto" />
          <p className="text-xs text-secondary-text">Loading SahiSeat Admin...</p>
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
            Your account role is not authorized to access this administration page.
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

      {/* Admin Top Navbar */}
      <header className="border-b border-border-custom bg-[#09090B]/85 backdrop-blur-md sticky top-0 z-40 h-16 flex items-center px-4 sm:px-8 justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#2563EB] shadow-md">
            <ShieldCheck className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-[#FAFAFA]">
            SahiSeat <span className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] bg-clip-text text-transparent font-medium">Console</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-secondary-text font-mono uppercase bg-[#13131A] px-2.5 py-1 rounded border border-border-custom">
            ⚡ Admin Authorization
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-custom bg-[#13131A] hover:bg-[#13131A]/75 text-xs text-[#FAFAFA] hover:text-white transition duration-200 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
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
                  setActiveChat(null)
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${isSel
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
        <main className="flex-1 bg-[#13131A]/40 border border-border-custom rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm min-h-[500px] flex flex-col">

          {loadingData && (
            <div className="text-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary-purple mx-auto" />
            </div>
          )}

          {/* TAB: APPROVE SENIORS */}
          {activeTab === 'seniors' && !loadingData && (
            <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Approve Seniors</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Review verified college emails and approve mentor access.</p>
              </div>

              {pendingSeniors.length === 0 ? (
                <div className="border border-dashed border-border-custom rounded-2xl p-12 text-center space-y-3 flex-1 flex flex-col justify-center">
                  <div className="text-2xl">🎉</div>
                  <h3 className="text-xs font-bold text-[#FAFAFA]">No pending approvals</h3>
                  <p className="text-[11px] text-secondary-text max-w-xs mx-auto">
                    All submitted senior verifications have been resolved.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pendingSeniors.map((senior) => (
                    <div key={senior.id} className="p-5 rounded-2xl border border-border-custom bg-[#13131A] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1 text-left">
                        <span className="text-[10px] font-bold text-primary-purple uppercase tracking-wider block font-mono">PENDING VERIFICATION</span>
                        <h4 className="text-sm font-bold text-[#FAFAFA]">{senior.name}</h4>
                        <div className="text-xs text-secondary-text">Google Account: <strong className="text-primary-text">{senior.email}</strong></div>
                        <div className="text-xs text-secondary-text">Verified College Email: <strong className="text-accent-blue font-mono">{senior.official_email}</strong></div>
                        {senior.college && <div className="text-xs text-secondary-text">College Claim: <strong className="text-primary-text">{senior.college}</strong></div>}
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Button
                          onClick={() => handleRejectSenior(senior.id)}
                          className="px-4 py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition cursor-pointer"
                        >
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleApproveSenior(senior.id)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white text-xs font-bold shadow-md transition cursor-pointer border-none"
                        >
                          Approve Senior
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ASSIGN SENIORS */}
          {activeTab === 'assign' && !loadingData && (
            <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Assign Seniors to Students</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Connect students to approved seniors to create private chats.</p>
              </div>

              {requests.filter(r => r.status === 'pending').length === 0 ? (
                <div className="border border-dashed border-border-custom rounded-2xl p-12 text-center space-y-3 flex-1 flex flex-col justify-center">
                  <div className="text-2xl">💡</div>
                  <h3 className="text-xs font-bold text-[#FAFAFA]">No pending matching requests</h3>
                  <p className="text-[11px] text-secondary-text max-w-xs mx-auto">
                    All students are currently matched with verified college seniors.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {requests.filter(r => r.status === 'pending').map((req) => (
                    <div key={req.id} className="p-5 rounded-2xl border border-border-custom bg-[#13131A] space-y-4">
                      <div className="flex justify-between items-start gap-2 flex-wrap text-left">
                        <div>
                          <h4 className="text-sm font-bold text-primary-text">Student: {req.student?.name || 'Aman Gupta'}</h4>
                          <span className="text-[10px] text-secondary-text block">{req.student?.email}</span>
                        </div>
                        <Badge className="bg-[#7C3AED]/15 border border-[#7C3AED]/20 text-[#A855F7] text-[9px] uppercase tracking-wider font-mono">
                          {req.service_type} Service
                        </Badge>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#09090B]/60 border border-border-custom text-xs space-y-1 text-left">
                        <div><span className="text-secondary-text">Target College:</span> <strong className="text-primary-text">{req.college}</strong></div>
                        {req.branch && <div><span className="text-secondary-text">Preferred Branch:</span> <strong className="text-primary-text">{req.branch}</strong></div>}
                        {req.details && <div className="pt-1 text-secondary-text italic">"{req.details}"</div>}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        {/* Senior Dropdown selection */}
                        <div className="flex-1">
                          <select
                            value={selectedSeniorForRequest[req.id] || ''}
                            onChange={(e) => setSelectedSeniorForRequest(prev => ({ ...prev, [req.id]: e.target.value }))}
                            className="w-full h-11 px-3 bg-[#09090B]/60 border border-border-custom rounded-xl text-xs text-primary-text focus:border-[#7C3AED] outline-none cursor-pointer"
                          >
                            <option value="">-- Choose Approved Senior --</option>
                            {approvedSeniors.map(senior => (
                              <option key={senior.id} value={senior.id}>
                                {senior.name} (College: {senior.college || 'IIITV'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <Button
                          onClick={() => handleAssignSenior(req.id, req.student_id)}
                          className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white text-xs font-bold shadow-md transition cursor-pointer border-none shrink-0"
                        >
                          Match & Assign Senior
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: MANAGE REQUESTS */}
          {activeTab === 'requests' && !loadingData && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">All Match Requests</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Review active, completed, or unassigned guidance requests.</p>
              </div>

              {requests.length === 0 ? (
                <div className="border border-dashed border-border-custom rounded-2xl p-12 text-center text-xs text-secondary-text">
                  No requests found in system database.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border-custom rounded-xl bg-[#09090B]/40">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border-custom bg-[#13131A]/60">
                        <th className="p-3 text-secondary-text font-bold uppercase tracking-wider">Student</th>
                        <th className="p-3 text-secondary-text font-bold uppercase tracking-wider">College/Branch</th>
                        <th className="p-3 text-secondary-text font-bold uppercase tracking-wider">Service</th>
                        <th className="p-3 text-secondary-text font-bold uppercase tracking-wider">Status</th>
                        <th className="p-3 text-secondary-text font-bold uppercase tracking-wider">Matched Senior</th>
                        <th className="p-3 text-secondary-text font-bold uppercase tracking-wider text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom">
                      {requests.map((req) => {
                        const matchedSenior = approvedSeniors.find(s => s.id === req.assigned_senior_id)
                        return (
                          <tr key={req.id} className="hover:bg-[#13131A]/30 transition">
                            <td className="p-3">
                              <span className="font-bold text-primary-text block">{req.student?.name || 'Student'}</span>
                              <span className="text-[10px] text-secondary-text block">{req.student?.email}</span>
                            </td>
                            <td className="p-3">
                              <span className="text-primary-text block">{req.college}</span>
                              <span className="text-[10px] text-secondary-text block">{req.branch || '—'}</span>
                            </td>
                            <td className="p-3 font-mono text-[#A855F7] uppercase">{req.service_type}</td>
                            <td className="p-3">
                              {req.status === 'pending' ? (
                                <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-mono font-bold">PENDING</Badge>
                              ) : (
                                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-mono font-bold">ASSIGNED</Badge>
                              )}
                            </td>
                            <td className="p-3 font-semibold">
                              {matchedSenior ? matchedSenior.name : <span className="text-secondary-text font-normal">Not matched</span>}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDeleteRequest(req.id)}
                                className="p-1.5 rounded-lg border border-border-custom hover:bg-rose-500/10 text-rose-400 transition cursor-pointer"
                                title="Delete request"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: MONITOR CHATS */}
          {activeTab === 'chats' && !loadingData && (
            <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Monitor Conversations</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Read conversation logs for active matches to support/moderate.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[400px]">
                {/* Rooms selection list */}
                <div className="lg:col-span-4 border border-border-custom rounded-2xl bg-[#09090B]/40 p-3 space-y-1.5 max-h-[420px] overflow-y-auto">
                  <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block px-2.5 py-1 font-mono">Active Rooms</span>
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 text-xs text-secondary-text">No active conversations.</div>
                  ) : (
                    conversations.map((conv) => {
                      const isSel = activeChat?.id === conv.id
                      return (
                        <button
                          key={conv.id}
                          onClick={() => setActiveChat(conv)}
                          className={`w-full flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${isSel
                              ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#A855F7]'
                              : 'border-transparent text-secondary-text hover:bg-[#13131A] hover:text-[#FAFAFA]'
                            }`}
                        >
                          <div className="truncate space-y-0.5">
                            <span className="text-[10px] font-black text-[#FAFAFA] block truncate">Student: {conv.student?.name}</span>
                            <span className="text-[10px] font-black text-secondary-text block truncate">Senior: {conv.senior?.name}</span>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>

                {/* Mod chat log */}
                <div className="lg:col-span-8 border border-border-custom rounded-2xl bg-[#13131A]/60 flex flex-col overflow-hidden min-h-[420px]">
                  {activeChat ? (
                    <ChatPanel
                      conversationId={activeChat.id}
                      currentUserId={user.id}
                      otherPartyName={`Moderator [${activeChat.student?.name} + ${activeChat.senior?.name}]`}
                      isAdminMod={true}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-center p-8 space-y-2">
                      <MessageSquare className="h-8 w-8 text-secondary-text/30" />
                      <h4 className="text-xs font-bold text-[#FAFAFA]">Select a conversation</h4>
                      <p className="text-[10px] text-secondary-text max-w-xs leading-relaxed">
                        Pick a conversation to monitor the messages. You can participate or moderate messages as admin.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PAYMENTS */}
          {activeTab === 'payments' && !loadingData && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Payments Ledger</h2>
                <p className="text-xs text-[#A1A1AA] mt-1">Review active transactions and student match service payments.</p>
              </div>

              <div className="overflow-x-auto border border-border-custom rounded-xl bg-[#09090B]/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-custom bg-[#13131A]/60">
                      <th className="p-3 text-secondary-text font-bold uppercase tracking-wider">Transaction ID</th>
                      <th className="p-3 text-secondary-text font-bold uppercase tracking-wider">Student Name</th>
                      <th className="p-3 text-secondary-text font-bold uppercase tracking-wider">Service Type</th>
                      <th className="p-3 text-secondary-text font-bold uppercase tracking-wider">Amount Paid</th>
                      <th className="p-3 text-secondary-text font-bold uppercase tracking-wider">Transaction Status</th>
                      <th className="p-3 text-secondary-text font-bold uppercase tracking-wider">Transaction Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom">
                    {MOCK_PAYMENTS.map((p) => (
                      <tr key={p.id} className="hover:bg-[#13131A]/30 transition">
                        <td className="p-3 font-mono font-bold text-accent-blue">{p.id}</td>
                        <td className="p-3 font-semibold text-primary-text">{p.student}</td>
                        <td className="p-3 font-mono text-[#A855F7] uppercase">{p.service}</td>
                        <td className="p-3 font-bold text-primary-text">{p.amount}</td>
                        <td className="p-3">
                          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-mono font-bold uppercase">
                            {p.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-secondary-text font-mono">{p.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
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
