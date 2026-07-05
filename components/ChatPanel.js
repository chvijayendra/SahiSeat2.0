'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Send, Loader2, ShieldAlert } from 'lucide-react'
import { Badge } from "@/components/ui/badge"

export default function ChatPanel({ conversationId, currentUserId, otherPartyName, isAdminMod = false }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef(null)

  // 1. Fetch initial messages and subscribe to real-time updates
  useEffect(() => {
    if (!conversationId) return

    setLoading(true)
    fetchMessages()

    // Subscribe to messages changes in Postgres for this conversation
    const channel = supabase
      .channel(`public:messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Deduplicate in case message was already appended on send response
            if (prev.some((m) => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // Scroll to bottom on messages load/updates
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputText.trim() || sending) return

    const textToSend = inputText.trim()
    setInputText('')
    setSending(true)

    try {
      // Optimistic message append
      const tempId = Math.random().toString()
      const optimisticMsg = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: textToSend,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimisticMsg])

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: textToSend,
        })
        .select()
        .single()

      if (error) throw error

      // Swap the optimistic message with the database record
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      )
    } catch (err) {
      console.error('Error sending message:', err)
      alert('Failed to send message. Please check connection and database RLS permissions.')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (isoString) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden text-left bg-[#13131A]/30">
      {/* Header banner */}
      <div className="p-4 border-b border-border-custom bg-[#09090B]/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-primary-text">{otherPartyName}</span>
        </div>
        {isAdminMod && (
          <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-mono flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            MODERATOR VIEW
          </Badge>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0 bg-[#09090B]/10">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary-purple" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-secondary-text space-y-1.5 p-6">
            <span className="text-xl">💬</span>
            <p className="text-xs font-bold text-[#FAFAFA]">Private counseling channel</p>
            <p className="text-[10px] leading-relaxed max-w-xs">
              Say hello! Only the student, matched senior, and support admins can view messages here.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${
                  isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                {/* Chat Bubble */}
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words whitespace-pre-wrap ${
                    isMe
                      ? 'bg-gradient-to-br from-[#7C3AED] to-[#2563EB] text-white rounded-tr-none'
                      : 'bg-[#13131A] border border-border-custom text-primary-text rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Message Meta Info */}
                <div className="flex items-center gap-1.5 mt-1 text-[8px] text-secondary-text px-1 font-mono">
                  <span>{formatTime(msg.created_at)}</span>
                  {isAdminMod && (
                    <>
                      <span>•</span>
                      <span>Sender: {msg.sender_id.substring(0, 5)}...</span>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border-custom bg-[#09090B]/60 flex gap-2 shrink-0">
        <Input
          type="text"
          placeholder={isAdminMod ? "You are viewing this chat as a moderator" : "Type a secure message..."}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={sending || isAdminMod}
          className="flex-1 h-10 px-4 bg-[#09090B] border border-border-custom rounded-xl text-xs text-primary-text placeholder:text-[#A1A1AA]/30 focus:border-[#7C3AED] transition outline-none"
        />
        <Button
          type="submit"
          disabled={sending || !inputText.trim() || isAdminMod}
          className="h-10 w-10 p-0 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white flex items-center justify-center shrink-0 cursor-pointer border-none shadow"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  )
}
