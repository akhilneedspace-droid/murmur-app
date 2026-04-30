import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getAIResponse } from '../lib/ai'

// ── Greeting ───────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h >= 23 || h < 4)  return 'Still '
  if (h >= 4  && h < 12) return 'Good Mor'
  if (h >= 12 && h < 16) return 'Good af'
  if (h >= 16 && h < 18) return 'Good e'
  if (h >= 18 && h < 20) return 'Hope your evening is going great!'
  return "Don't forget to sleep on time. Good "
}

// ── Stars ──────────────────────────────────────────────────────
function getFilledStars(count) {
  if (count >= 10) return 3
  if (count >= 4)  return 2
  if (count >= 1)  return 1
  return 0
}

function ListenerStars({ count }) {
  const [hovered, setHovered] = useState(false)
  if (count < 1) return null
  const filled = getFilledStars(count)

  // One label per tier, no contradictions
  const title = filled === 3 ? "You're a Rockstar 💫"
               : filled === 2 ? "You're a Superstar 🌟"
               : "You're a Star ✨"

  // Progress toward next tier, or max message
  const progress = count < 4  ? `${4 - count} more listen${4 - count === 1 ? '' : 's'} to reach Superstar`
                 : count < 10 ? `${10 - count} more listen${10 - count === 1 ? '' : 's'} to reach Rockstar`
                 : 'You are at the top — thank you 🏆'

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginTop: 4, cursor: 'default', position: 'relative' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ fontSize: 15, opacity: i < filled ? 1 : 0.2, filter: i < filled ? 'none' : 'grayscale(1)', transition: 'opacity 0.2s' }}>⭐</span>
      ))}
      {hovered && (
        <div style={{ position: 'absolute', left: 0, top: '130%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--teal)', zIndex: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600 }}>{title}</span>
          <span style={{ color: 'rgba(240,239,232,0.5)', fontSize: 11 }}>{progress}</span>
        </div>
      )}
    </div>
  )
}

const SEED_POSTS = [
  { id: '00000000-0000-0000-0000-000000000010', content: "I've been really hard on myself lately. Like nothing I do is ever enough, no matter how hard I try.", emotion_tag: 'overwhelmed', is_anonymous: false, created_at: new Date(Date.now() - 4 * 60000).toISOString(), profiles: { full_name: 'Priya', avatar_url: null }, is_seed: true },
  { id: '00000000-0000-0000-0000-000000000002', content: "Had a panic attack at work today and had to pretend everything was fine. I'm exhausted from holding it together.", emotion_tag: 'anxious', is_anonymous: true, created_at: new Date(Date.now() - 9 * 60000).toISOString(), profiles: null, is_seed: true },
  { id: '00000000-0000-0000-0000-000000000003', content: "My relationship ended two weeks ago and I still reach for my phone to text them. I don't know how to stop.", emotion_tag: 'sad', is_anonymous: false, created_at: new Date(Date.now() - 14 * 60000).toISOString(), profiles: { full_name: 'Jordan', avatar_url: null }, is_seed: true },
  { id: '00000000-0000-0000-0000-000000000004', content: "I got the promotion I worked two years for and I feel... nothing. I thought I'd be happy. Is that normal?", emotion_tag: 'confused', is_anonymous: false, created_at: new Date(Date.now() - 22 * 60000).toISOString(), profiles: { full_name: 'Sam', avatar_url: null }, is_seed: true },
  { id: '00000000-0000-0000-0000-000000000005', content: "I've been cancelling plans with friends because I just don't have the energy. I miss who I used to be.", emotion_tag: 'numb', is_anonymous: false, created_at: new Date(Date.now() - 35 * 60000).toISOString(), profiles: { full_name: 'Marcus', avatar_url: null }, is_seed: true },
  { id: '00000000-0000-0000-0000-000000000006', content: "I snapped at someone I love today and I can't stop thinking about it. I hate when I'm like this.", emotion_tag: 'guilty', is_anonymous: false, created_at: new Date(Date.now() - 48 * 60000).toISOString(), profiles: { full_name: 'Aisha', avatar_url: null }, is_seed: true },
  { id: '00000000-0000-0000-0000-000000000007', content: "Just got back from my first solo trip and I feel so proud of myself. Six months ago I couldn't have done that.", emotion_tag: 'grateful', is_anonymous: false, created_at: new Date(Date.now() - 55 * 60000).toISOString(), profiles: { full_name: 'Lena', avatar_url: null }, is_seed: true },
  { id: '00000000-0000-0000-0000-000000000008', content: "I finally told my best friend how much they mean to me after years of being too scared. Feels amazing.", emotion_tag: 'happy', is_anonymous: false, created_at: new Date(Date.now() - 70 * 60000).toISOString(), profiles: { full_name: 'Carlos', avatar_url: null }, is_seed: true },
]

const seedChatStore = {}
// Journal queue helpers using sessionStorage (survives component remounts)
function queueJournal(postId, item) {
  try { const k = `jq_${postId}`; const q = JSON.parse(sessionStorage.getItem(k)||'[]'); q.push(item); sessionStorage.setItem(k, JSON.stringify(q)) } catch {}
}
function getJournalQueue(postId) {
  try { return JSON.parse(sessionStorage.getItem(`jq_${postId}`)||'[]') } catch { return [] }
}
function clearJournalQueue(postId) {
  try { sessionStorage.removeItem(`jq_${postId}`) } catch {}
}
const EMOJI_GROUPS = [
  ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💗'],
  ['😊','😢','😔','😰','😤','😌','🥺','😶','🤗','😓'],
  ['🙏','💪','🤝','👋','✨','🌱','🌊','🌙','☀️','🕊️'],
]

// ── Portal Modal ───────────────────────────────────────────────
function Modal({ title, body, primaryLabel, primaryAction, secondaryLabel, secondaryAction, danger }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--bg2)', borderRadius: 20, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
        <p style={{ fontSize: 17, fontWeight: 500, textAlign: 'center', lineHeight: 1.4, color: 'var(--text)' }}>{title}</p>
        {body && <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.7)', textAlign: 'center', lineHeight: 1.6 }}>{body}</p>}
        {primaryLabel && <button onClick={primaryAction} style={{ width: '100%', padding: 14, borderRadius: 'var(--radius)', background: danger ? '#E24B4A' : 'var(--accent)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>{primaryLabel}</button>}
        {secondaryLabel && <button onClick={secondaryAction} className="btn-ghost">{secondaryLabel}</button>}
      </div>
    </div>,
    document.body
  )
}

function Avatar({ url, name, size = 36, style: extra = {} }) {
  const initial = (name || '?')[0].toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: url ? 'transparent' : 'var(--accent-dim)', border: '1px solid rgba(139,124,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, color: 'var(--accent)', overflow: 'hidden', flexShrink: 0, ...extra }}>
      {url ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
    </div>
  )
}

function RatingScreen({ onSubmit, onSkip }) {
  const [selected, setSelected] = useState(null)
  const OPTIONS = [{ value: 1, emoji: '😔', label: 'Not great' }, { value: 2, emoji: '😊', label: 'It helped' }, { value: 3, emoji: '🤍', label: 'Really needed that' }]
  return (
    <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 28, textAlign: 'center' }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 10 }}>How did that feel?</h2>
        <p style={{ fontSize: 15, color: 'rgba(240,239,232,0.6)', lineHeight: 1.6 }}>Your honest feedback helps us make Murmur better for everyone.</p>
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        {OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setSelected(opt.value)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 20px', borderRadius: 'var(--radius)', background: selected === opt.value ? 'var(--accent-dim)' : 'var(--bg2)', border: `1px solid ${selected === opt.value ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all var(--transition)', minWidth: 80 }}>
            <span style={{ fontSize: 28 }}>{opt.emoji}</span>
            <span style={{ fontSize: 12, color: selected === opt.value ? 'var(--accent)' : 'rgba(240,239,232,0.6)' }}>{opt.label}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
        <button className="btn-primary" disabled={!selected} onClick={() => onSubmit(selected)}>Share my feedback</button>
        <button onClick={onSkip} style={{ fontSize: 14, color: 'rgba(240,239,232,0.5)', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none' }}>Skip for now</button>
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('home')
  const [profile, setProfile] = useState(null)
  const [visible, setVisible] = useState(false)
  const [activeExpresserSessions, setActiveExpresserSessions] = useState([])
  const [activeExpresserPost, setActiveExpresserPost] = useState(null) // post content for AI context
  const [siblingsSessions, setSiblingsSessions] = useState([]) // all sessions for selected chat's post // multi-listener: array
  const [currentListenerSession, setCurrentListenerSession] = useState(null) // which listener expresser is chatting with
  const currentListenerSessionRef = useRef(null) // ref to avoid stale closure in realtime listener
  const [newListenerNotif, setNewListenerNotif] = useState(null) // notification when new listener joins
  const [listenerCount, setListenerCount] = useState(0)
  const [todayListenerCount, setTodayListenerCount] = useState(0)
  const [pastChats, setPastChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [pendingListenerSession, setPendingListenerSession] = useState(null)
  const [showResumeModal, setShowResumeModal] = useState(false)

  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])

  useEffect(() => {
    if (!user) return
    loadProfile()
    loadListenerCount()
    loadSeedChats() // chatgpt try
    fetchPastChats()
  }, [user])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
  }

  async function loadListenerCount() {
    const today = new Date().toISOString().split('T')[0]
    const { count: total } = await supabase.from('sessions').select('id', { count: 'exact' }).eq('listener_id', user.id).eq('status', 'closed')
    const { count: todayCount } = await supabase.from('sessions').select('id', { count: 'exact' }).eq('listener_id', user.id).gte('created_at', today)
    setListenerCount(total ?? 0)
    setTodayListenerCount(todayCount ?? 0)
  }

  async function fetchPastChats() {
    const AI_EXPRESSER_ID = '00000000-0000-0000-0000-000000000001'
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*, posts(content, emotion_tag, is_anonymous, user_id, id)')
      .or(`expresser_id.eq.${user.id},listener_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!sessions) { setPastChats([]); return }

    const enriched = await Promise.all(
  sessions.map(async (session) => {
    // Check for your AI Expresser ID
    if (session.expresser_id === '00000000-0000-0000-0000-000000000001') {
      return { 
        ...session, 
        otherProfile: { full_name: 'AI Expresser', avatar_url: null }, 
        is_ai_seed: true 
      }
    }
        const otherId = session.expresser_id === user.id ? session.listener_id : session.expresser_id
        let otherProfile = null
        if (otherId && otherId !== AI_EXPRESSER_ID) {
          const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', otherId).single()
          otherProfile = data ?? null
        }
        return { ...session, otherProfile }
      })
    )

    //setPastChats(enriched.filter(s => !s.deleted_by || !Array.isArray(s.deleted_by) || !s.deleted_by.includes(user.id))) chatgpt try
    setPastChats(prev => {
  const cleaned = enriched.filter(s =>
    !s.deleted_by || !Array.isArray(s.deleted_by) || !s.deleted_by.includes(user.id)
  )

  // keep existing seed chats
  const existingIds = new Set(cleaned.map(c => c.id))
  const merged = [...cleaned, ...prev.filter(c => c.is_seed && !existingIds.has(c.id))]

  return merged
})
  }

  // Load seed chats from localStorage and add to pastChats
  function loadSeedChats() {
    const seedEntries = []
    for (const post of SEED_POSTS) {
      const stored = localStorage.getItem(`seed_msgs_${user.id}_${post.id}`) //chatgpt try
      if (!stored) continue
      try {
        const msgs = JSON.parse(stored)
        if (!msgs || msgs.length === 0) continue // only opening msg, user never replied //chatgpt try
        const isEnded = localStorage.getItem(`seed_msgs_${user.id}_${post.id}_ended`) === 'true'
        seedEntries.push({
          id: `seed-${post.id}`,
          is_seed: true,
          is_ai: true,
          status: isEnded ? 'closed' : 'active',
          expresser_id: 'ai',
          listener_id: user.id,
          created_at: msgs[msgs.length - 1]?.created_at ?? new Date().toISOString(),
          posts: { content: post.content, emotion_tag: post.emotion_tag, is_anonymous: false, user_id: 'ai', id: post.id },
          otherProfile: { full_name: post.profiles?.full_name ?? 'AI', avatar_url: null }
        })
      } catch {}
    }
    if (seedEntries.length > 0) {
      setPastChats(prev => {
        const ids = new Set(prev.map(c => c.id))
        const fresh = seedEntries.filter(e => !ids.has(e.id))
        return [...prev, ...fresh]
      })
    }
  }

  async function deleteChat(sessionId) {
    const { data: session } = await supabase.from('sessions').select('deleted_by').eq('id', sessionId).single()
    const existing = Array.isArray(session?.deleted_by) ? session.deleted_by : []
    const updated = [...new Set([...existing, user.id])]
    await supabase.from('sessions').update({ deleted_by: updated }).eq('id', sessionId)
    setPastChats(prev => prev.filter(c => c.id !== sessionId))
  }

  // Real-time: listen for NEW listeners joining expresser's posts
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('my-sessions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions', filter: `expresser_id=eq.${user.id}` },
        async (payload) => {
          const newSession = payload.new
          // Fetch listener's name for the FAB
          let listenerName = 'Listener'
          if (newSession.listener_id) {
            const { data: p } = await supabase.from('profiles').select('full_name').eq('id', newSession.listener_id).single()
            if (p?.full_name) listenerName = p.full_name.split(' ')[0]
          }
          const enrichedSession = { ...newSession, listenerName }
          setActiveExpresserSessions(prev => {
            if (prev.find(s => s.id === enrichedSession.id)) return prev
            const updated = [...prev, enrichedSession]
            if (prev.length > 0) setNewListenerNotif(enrichedSession)
            return updated
          })
        })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user]) // intentionally no currentListenerSession dep — using ref instead

  // Keep ref in sync with state (avoids stale closure in realtime listener)
  useEffect(() => { currentListenerSessionRef.current = currentListenerSession }, [currentListenerSession])

  // Session timeout: close inactive sessions every 5 minutes
  useEffect(() => {
    if (!user) return
    const iv = setInterval(async () => {
      await supabase.rpc('close_inactive_sessions')
    }, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [user])

  // If expresser got first session and no current chat, open it
  useEffect(() => {
    if (activeExpresserSessions.length === 1 && !currentListenerSession) {
      setCurrentListenerSession(activeExpresserSessions[0])
      // If browsing listener stories while waiting, bring them back to their chat
      if (view === 'listener') setView('home')
    }
  }, [activeExpresserSessions])

  // Show chat if: expresser has a session AND not actively in listener view
  // Exception: always show if it's an AI session (so wait screen transitions work)
  if (currentListenerSession && (view !== 'listener' || currentListenerSession.is_ai)) {
    return (
      <ChatView
        key={currentListenerSession.id}
        sessionId={currentListenerSession.id}
        isExpresser={true}
        isAISession={currentListenerSession.is_ai}
        post={activeExpresserPost}
        currentUserId={user.id}
        myProfile={profile}
        allListenerSessions={activeExpresserSessions}
        newListenerNotif={newListenerNotif}
        onNewListenerDismiss={() => setNewListenerNotif(null)}
        onSwitchListener={(session) => { setNewListenerNotif(null); setCurrentListenerSession(session) }}
        onBack={() => { setCurrentListenerSession(null); setView('home') }}
        onEnd={() => { setCurrentListenerSession(null); setView('home'); fetchPastChats(); loadListenerCount() }}
      />
    )
  }

  if (view === 'expresser') return <ExpresserView user={user} myProfile={profile} onBack={() => setView('home')} onBrowseListeners={() => setView('listener')} onPostCreated={(p) => setActiveExpresserPost(p)} onSessionStart={s => { setActiveExpresserSessions([s]); setCurrentListenerSession(s) }} />
  if (view === 'listener') return <ListenerView user={user} myProfile={profile} todayListenerCount={todayListenerCount}
    onBack={(s, didInteract) => {
      // Only show resume modal if: real session exists, listener sent at least one msg, and session still active
      if (s?.id && didInteract && s.status !== 'closed') {
        setPendingListenerSession(s)
        setShowResumeModal(true)
      }
      setView('home')
    }}
    onComplete={() => { fetchPastChats(); loadListenerCount() }} />
  if (view === 'chats') return <PastChatsView chats={pastChats} userId={user?.id} onOpen={async c => { setSelectedChat(c); setView('chat-detail'); if (c.expresser_id === user?.id && c.posts?.id) { const { data } = await supabase.from('sessions').select('*').eq('post_id', c.posts.id); setSiblingsSessions(data || []) } }} onDelete={deleteChat} onBack={() => { fetchPastChats(); setView('home') }} />
  if (view === 'chat-detail' && selectedChat) {
    const isExp = selectedChat.expresser_id === user?.id
    const isAISeed = selectedChat.is_seed === true || selectedChat.expresser_id === 'ai'
    return <ChatView
      key={selectedChat.id}
      sessionId={selectedChat.id}
      isExpresser={isExp}
      isSeedSession={isAISeed}
      isAISession={selectedChat.is_ai && !isAISeed}
      currentUserId={user.id}
      myProfile={profile}
      post={selectedChat.posts}
      preloadedOtherProfile={selectedChat.otherProfile}
      allListenerSessions={isExp ? (siblingsSessions.length > 0 ? siblingsSessions : activeExpresserSessions) : undefined}
      onSwitchListener={isExp ? (session) => { setSelectedChat(session) } : undefined}
      onBack={() => { setSelectedChat(null); setView('chats') }}
      onEnd={() => { setSelectedChat(null); setView('chats'); fetchPastChats() }}
    />
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  // Group past chats by post for expresser
  const myPosts = pastChats.filter(c => c.expresser_id === user?.id)
  const groupedByPost = myPosts.reduce((acc, chat) => {
    const key = chat.posts?.id ?? chat.id
    if (!acc[key]) acc[key] = { post: chat.posts, sessions: [] }
    acc[key].sessions.push(chat)
    return acc
  }, {})
  const groupedPostCount = Object.keys(groupedByPost).length

  return (
    <div className="page" style={{ padding: '0 24px', justifyContent: 'flex-start' }}>
      <div className="orb" style={{ width: 380, height: 380, background: 'radial-gradient(circle, rgba(139,124,246,0.10) 0%, transparent 70%)', top: '-60px', right: '-80px' }} />
      <div className="orb" style={{ width: 260, height: 260, background: 'radial-gradient(circle, rgba(93,202,165,0.08) 0%, transparent 70%)', bottom: '160px', left: '-60px' }} />

      {showResumeModal && pendingListenerSession && (
        <Modal title="You have an ongoing conversation" body="It looks like you stepped away from a chat. Would you like to continue where you left off?" primaryLabel="Continue conversation" primaryAction={() => { setShowResumeModal(false); setSelectedChat(pendingListenerSession); setView('chat-detail') }} secondaryLabel="Leave it for now" secondaryAction={() => { setShowResumeModal(false); setPendingListenerSession(null) }} />
      )}

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1, paddingTop: 52, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        <div>
          <p style={{ fontSize: 13, color: 'rgba(240,239,232,0.55)', marginBottom: 2 }}>{getGreeting()}</p>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>Hey, {firstName} 👋</h2>
          <ListenerStars count={listenerCount} />
        </div>
        <button onClick={() => navigate('/account')} style={{ background: 'none', cursor: 'pointer', border: 'none', marginTop: 4 }}>
          <Avatar url={profile?.avatar_url} name={profile?.full_name || '?'} size={40} />
        </button>
      </div>

      {/* Active listener sessions notification for expresser */}
      {activeExpresserSessions.length > 1 && (
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 16, padding: '14px 18px', background: 'rgba(93,202,165,0.08)', border: '1px solid rgba(93,202,165,0.25)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--teal)' }}>💬 {activeExpresserSessions.length} people are here for you</p>
          <button onClick={() => setCurrentListenerSession(activeExpresserSessions[0])} style={{ fontSize: 13, color: 'var(--teal)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>View chats</button>
        </div>
      )}

      {/* Role cards */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s' }}>
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 6vw, 30px)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6, color: 'var(--text)' }}>How do you want to show up today?</h1>
          <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.55)' }}>You can switch roles at any time.</p>
        </div>

        <RoleCard role="Expresser" title="Yes, I want to share my feelings"
          description="Write what's on your mind - thoughts, feelings, anything."
          color="var(--accent)" hoverBorder="rgba(139,124,246,0.4)" hoverBg="var(--accent-glow)" onClick={() => setView('expresser')} />

        <RoleCard role="Listener" title="I want to be there for someone"
          description="Browse what people are sharing. Pick one and listen with care."
          color="var(--teal)" hoverBorder="rgba(93,202,165,0.4)" hoverBg="rgba(93,202,165,0.05)" onClick={() => setView('listener')} />

        <button onClick={() => { fetchPastChats(); setView('chats') }} style={{ width: '100%', textAlign: 'left', padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color var(--transition)' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>Your conversations</p>
            <p style={{ fontSize: 13, color: 'rgba(240,239,232,0.5)' }}>
              {pastChats.length > 0 ? `${pastChats.length} past ${pastChats.length === 1 ? 'chat' : 'chats'}` : 'No conversations yet'}
            </p>
          </div>
          <svg style={{ opacity: 0.4 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
      <div style={{ height: 48 }} />
    </div>
  )
}

function RoleCard({ role, title, description, color, hoverBorder, hoverBg, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width: '100%', textAlign: 'left', padding: 20, background: hovered ? hoverBg : 'var(--bg2)', border: `1px solid ${hovered ? hoverBorder : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'border-color var(--transition), background var(--transition)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: 8 }}>{role}</div>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 6, color: 'var(--text)' }}>{title}</div>
          <div style={{ fontSize: 14, color: 'rgba(240,239,232,0.65)', lineHeight: 1.6 }}>{description}</div>
        </div>
        <svg style={{ flexShrink: 0, marginTop: 2, opacity: 0.4 }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
    </button>
  )
}

// ── Expresser View ─────────────────────────────────────────────
function ExpresserView({ user, myProfile, onBack, onBrowseListeners, onSessionStart, onPostCreated }) {
  const [text, setText] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [tag, setTag] = useState(null)
  const [phase, setPhase] = useState('write')
  const [postId, setPostId] = useState(null)
  const [postContent, setPostContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [waitSeconds, setWaitSeconds] = useState(0)
  const [aiJoining, setAiJoining] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)

  const ACK_DURATION_MS = 5000
  const AI_WAIT_SECS    = 15
  const DAILY_POST_LIMIT = 10

  useEffect(() => { setTimeout(() => setVisible(true), 80) }, [])

  // Check rate limit on mount
  useEffect(() => {
    async function checkLimit() {
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', user.id).gte('created_at', today)
      if ((count ?? 0) >= DAILY_POST_LIMIT) setRateLimited(true)
    }
    checkLimit()
  }, [user.id])

  useEffect(() => { if (phase !== 'acknowledge') return; const t = setTimeout(() => setPhase('wait'), ACK_DURATION_MS); return () => clearTimeout(t) }, [phase])

  useEffect(() => {
    if (phase !== 'wait') return
    const iv = setInterval(() => { setWaitSeconds(s => { const n = s + 1; if (n >= AI_WAIT_SECS && !aiJoining) { clearInterval(iv); triggerAI() } return n }) }, 1000)
    return () => clearInterval(iv)
  }, [phase, aiJoining])

  // Session joins handled by Dashboard realtime listener

  async function triggerAI() {
    setAiJoining(true)
    // Just insert — Dashboard realtime listener handles opening the chat
    await supabase.from('sessions').insert({ post_id: postId, expresser_id: user.id, listener_id: null, status: 'active', is_ai: true })
  }

  async function handleSubmit() {
    if (text.trim().length < 5 || rateLimited) return
    setLoading(true)
    try {
      const { data, error: e } = await supabase.from('posts').insert({ user_id: user.id, content: text.trim(), emotion_tag: tag, is_anonymous: anonymous, status: 'open' }).select().single()
      if (e) throw e
      setPostId(data.id); setPostContent(text.trim()); setPhase('acknowledge')
      onPostCreated?.({ id: data.id, content: text.trim(), emotion_tag: tag, is_anonymous: anonymous, user_id: user.id })
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }


  const TAGS = ['anxious', 'happy','overwhelmed', 'sad', 'angry', 'confused', 'numb', 'grateful', 'venting']

  if (rateLimited) {
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🌙</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--accent)' }}>You've shared a lot today.</h2>
        <p style={{ fontSize: 15, color: 'rgba(240,239,232,0.7)', lineHeight: 1.8, maxWidth: 300 }}>
          You've reached the limit of {DAILY_POST_LIMIT} posts for today. This isn't a punishment — it's a gentle reminder to rest. Your feelings will still be here tomorrow, and so will we.
        </p>
        <button className="btn-ghost" style={{ maxWidth: 280 }} onClick={onBack}>Back to home</button>
      </div>
    )
  }

  if (phase === 'acknowledge') {
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 24, textAlign: 'center' }}>
        <div style={{ animation: 'fadeUp 0.6s ease both' }}>
          <div style={{ fontSize: 52, marginBottom: 16, animation: 'float 3s ease-in-out infinite' }}>🤍</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 7vw, 34px)', fontWeight: 400, color: 'var(--accent)', letterSpacing: '-0.02em', marginBottom: 14 }}>Thank you for sharing.</h2>
          <p style={{ fontSize: 15, color: 'rgba(240,239,232,0.7)', lineHeight: 1.8, maxWidth: 300 }}>We know it wasn't easy to put your heart into words. Glad you shared it.</p>
        </div>
        <div style={{ width: '100%', maxWidth: 340, padding: '16px 20px', background: 'var(--bg2)', border: '1px solid rgba(139,124,246,0.2)', borderRadius: 'var(--radius)', textAlign: 'left', animation: 'fadeUp 0.6s ease 0.2s both' }}>
          <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Your words</p>
          <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.7)', lineHeight: 1.7, fontStyle: 'italic' }}>"{postContent.slice(0, 140)}{postContent.length > 140 ? '...' : ''}"</p>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(240,239,232,0.45)', animation: 'fadeUp 0.6s ease 0.4s both' }}>Finding a listener for you...</p>
      </div>
    )
  }

  if (phase === 'wait') {
    const pct = Math.min((waitSeconds / AI_WAIT_SECS) * 100, 100)
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
        <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '16px 20px', background: 'var(--bg2)', border: '1px solid rgba(139,124,246,0.2)', borderRadius: 'var(--radius)' }}>
            <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>You shared</p>
            <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.7)', lineHeight: 1.7, fontStyle: 'italic' }}>"{postContent.slice(0, 140)}{postContent.length > 140 ? '...' : ''}"</p>
          </div>
          <div style={{ padding: '18px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: aiJoining ? 'var(--accent)' : 'var(--teal)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
              <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{aiJoining ? 'Connecting you now...' : 'Looking for a listener who cares...'}</p>
            </div>
            {!aiJoining && (
              <>
                <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 1s linear' }} />
                </div>
                <p style={{ fontSize: 13, color: 'rgba(240,239,232,0.5)', lineHeight: 1.6 }}></p>  
              </>
            )}
          </div>

          {/* Browse while waiting */}
          <button onClick={onBrowseListeners} style={{ padding: '13px 20px', borderRadius: 'var(--radius)', background: 'transparent', border: '1px solid var(--border)', color: 'rgba(240,239,232,0.6)', fontSize: 14, cursor: 'pointer', textAlign: 'center', transition: 'border-color var(--transition)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(51, 137, 199, 0.5)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            Browse listener stories while you wait
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {showConfirm && <Modal title="Leave without sharing?" body="Your words are still here, waiting to be heard. If you go back now, they'll be lost." primaryLabel="Keep writing" primaryAction={() => setShowConfirm(false)} secondaryLabel="Yes, go back" secondaryAction={() => { setShowConfirm(false); onBack() }} />}
      <div className="page" style={{ padding: '0 24px', justifyContent: 'space-between' }}>
        <div className="orb" style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(139,124,246,0.10) 0%, transparent 70%)', top: '-40px', right: '-60px' }} />
        <div style={{ position: 'relative', zIndex: 1, paddingTop: 52 }}>
          <button onClick={() => text.trim().length > 0 ? setShowConfirm(true) : onBack()} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(240,239,232,0.5)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </button>
        </div>
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 24, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 0.35s ease, transform 0.35s ease' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 6, color: 'var(--text)' }}>What's on your mind?</h2>
            <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.55)', lineHeight: 1.6 }}>There's no right way to do this. Just say what's true for you.</p>
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Start wherever feels right..." rows={6}
            style={{ width: '100%', padding: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 15, lineHeight: 1.7, color: 'var(--text)', resize: 'none', transition: 'border-color var(--transition)' }}
            onFocus={e => e.target.style.borderColor = 'rgba(139,124,246,0.4)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <div>
            <p style={{ fontSize: 12, color: 'rgba(240,239,232,0.45)', marginBottom: 10, letterSpacing: '0.04em' }}>HOW ARE YOU FEELING? (optional)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TAGS.map(t => (
                <button key={t} onClick={() => setTag(tag === t ? null : t)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, border: `1px solid ${tag === t ? 'var(--accent)' : 'var(--border)'}`, background: tag === t ? 'var(--accent-dim)' : 'transparent', color: tag === t ? 'var(--accent)' : 'rgba(240,239,232,0.6)', transition: 'all var(--transition)', cursor: 'pointer' }}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, color: 'var(--text)' }}>Share anonymously</p>
              <p style={{ fontSize: 12, color: 'rgba(240,239,232,0.5)' }}>Your name stays hidden from listeners</p>
            </div>
            <button onClick={() => setAnonymous(a => !a)} style={{ width: 44, height: 26, borderRadius: 13, background: anonymous ? 'var(--accent)' : 'var(--bg3)', border: '1px solid var(--border)', position: 'relative', transition: 'background var(--transition)', cursor: 'pointer', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 3, left: anonymous ? 20 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left var(--transition)' }} />
            </button>
          </div>
          {error && <p style={{ fontSize: 14, color: 'var(--coral)', textAlign: 'center' }}>{error}</p>}
        </div>
        <div style={{ position: 'relative', zIndex: 1, paddingBottom: 48 }}>
          <button className="btn-primary" disabled={text.trim().length < 5 || loading} onClick={handleSubmit}>{loading ? 'Sharing...' : 'Yes, I want to share my feelings'}</button>
        </div>
      </div>
    </>
  )
}

// ── Listener View ──────────────────────────────────────────────
// ── Listener View ──────────────────────────────────────────────
function ListenerView({ user, myProfile, todayListenerCount, onBack, onComplete }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState(null)
  const [visible, setVisible] = useState(false)
  const [showEndTip, setShowEndTip] = useState(false)
  const [showBurnoutNudge, setShowBurnoutNudge] = useState(false)
  const [showBurnoutBlock, setShowBurnoutBlock] = useState(false)
  
  // State to hold active sessions for filtering
  const [myActiveSessions, setMyActiveSessions] = useState([])

  const DAILY_LISTEN_NUDGE  = 3
  const DAILY_LISTEN_LIMIT  = 10

  useEffect(() => { setTimeout(() => setVisible(true), 80) }, [])

  useEffect(() => {
    if (todayListenerCount >= DAILY_LISTEN_LIMIT) { setShowBurnoutBlock(true); return }
    if (todayListenerCount >= DAILY_LISTEN_NUDGE) setShowBurnoutNudge(true)
    
    loadListenerData()
    
    const ch = supabase.channel('open-posts').on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, loadListenerData).subscribe()
    return () => supabase.removeChannel(ch)
  }, [todayListenerCount])

  async function loadListenerData() {
    // 1. Fetch active sessions so we know what to hide
    const { data: sessions } = await supabase
      .from('sessions')
      .select('post_id')
      .eq('listener_id', user.id)
      .eq('status', 'active')
    
    setMyActiveSessions(sessions || [])

    // 2. Fetch the posts
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, profiles(full_name, avatar_url)')
      .eq('status', 'open')
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    setPosts([...(postsData || []), ...SEED_POSTS])
    setLoading(false)
  }

  async function handleSelectPost(post) {
    if (todayListenerCount >= DAILY_LISTEN_LIMIT) { setShowBurnoutBlock(true); return }
    
    if (post.is_seed) {
      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert({
          post_id: post.id,
          expresser_id: '00000000-0000-0000-0000-000000000001', 
          listener_id: user.id,
          status: 'active'
        })
        .select().single()

      if (newSession) {
        setActiveSession({ id: newSession.id, is_seed: true, post })
      } else {
        setActiveSession({ id: `seed-${post.id}`, is_seed: true, post })
      }
      setShowEndTip(true)
      return
    }

    const { data: existing } = await supabase.from('sessions')
      .select('*').eq('post_id', post.id).eq('listener_id', user.id).single()

    if (existing) {
      setActiveSession({ ...existing, post })
      return
    }

    setActiveSession({ id: null, post, isPending: true })
    setShowEndTip(true)
  }

  if (showBurnoutBlock) {
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🌿</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--teal)' }}>You've given a lot today.</h2>
        <p style={{ fontSize: 15, color: 'rgba(240,239,232,0.7)', lineHeight: 1.8, maxWidth: 300 }}>
          You've listened to {DAILY_LISTEN_LIMIT} people today. Come back tomorrow.
        </p>
        <button className="btn-ghost" style={{ maxWidth: 280 }} onClick={() => onBack(null)}>Back to home</button>
      </div>
    )
  }

  if (activeSession) {
    return <ChatView
      sessionId={activeSession.id}
      isExpresser={false}
      isSeedSession={activeSession.is_seed}
      post={activeSession.post}
      myProfile={myProfile}
      currentUserId={user.id}
      showEndTip={showEndTip}
      onEndTipDismiss={() => setShowEndTip(false)}
      onBack={(didInteract) => {
        if (activeSession.is_seed) { onBack(null, false); return }
        onBack(activeSession, didInteract)
      }}
      onEnd={() => { setActiveSession(null); onComplete?.(); loadListenerData() }}
    />
  }

  return (
    <div className="page" style={{ padding: '0 24px', justifyContent: 'flex-start' }}>
      <div className="orb" style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(93,202,165,0.08) 0%, transparent 70%)', top: '-40px', right: '-60px' }} />

      {showBurnoutNudge && (
        <Modal
          title="You've been showing up a lot today 💙"
          body={`You've listened to ${todayListenerCount} people today.`}
          primaryLabel="Keep going"
          primaryAction={() => setShowBurnoutNudge(false)}
          secondaryLabel="I'll rest"
          secondaryAction={() => onBack(null)}
        />
      )}

      {/* --- RESTORED HEADING --- */}
      <div style={{ position: 'relative', zIndex: 1, paddingTop: 52, marginBottom: 24 }}>
        <button onClick={() => onBack(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(240,239,232,0.5)', fontSize: 14, marginBottom: 20, background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 6, color: 'var(--text)' }}>Someone needs a listener.</h2>
        <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.5)' }}>Choose one person to be present with. · {DAILY_LISTEN_LIMIT - todayListenerCount} sessions remaining</p>
      </div>

      {/* --- STORIES LIST --- */}
      <div style={{ 
        position: 'relative', 
        zIndex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 12, 
        paddingBottom: 48, 
        opacity: visible ? 1 : 0, 
        transform: visible ? 'translateY(0)' : 'translateY(12px)', 
        transition: 'opacity 0.4s ease, transform 0.4s ease' 
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
          </div>
        ) : (
          posts
            .filter(post => !myActiveSessions.some(session => session.post_id === post.id))
            .map((post, idx) => (
              <PostCard 
                key={post.id} 
                post={post} 
                delay={idx * 0.06} 
                onClick={() => handleSelectPost(post)} 
              />
            ))
        )}
      </div>
    </div>
  )
}

function PostCard({ post, delay, onClick }) {
  const [hovered, setHovered] = useState(false)

  // 1. Find the matching seed data to get the correct name/avatar
  const seed = SEED_POSTS.find(s => s.id === post.id);

  // 2. Logic: If it's a seed, use the seed's profile name. Otherwise, check anonymity.
  const name = seed 
    ? (seed.is_anonymous ? 'Anonymous' : (seed.profiles?.full_name?.split(' ')[0] ?? 'Someone'))
    : (post.is_anonymous ? 'Anonymous' : (post.profiles?.full_name?.split(' ')[0] ?? 'Someone'));

  const avatarUrl = seed
    ? (seed.is_anonymous ? null : seed.profiles?.avatar_url)
    : (post.is_anonymous ? null : post.profiles?.avatar_url);

  const timeAgo = d => { const m = Math.floor((Date.now() - new Date(d)) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; return `${Math.floor(m / 60)}h ago` }
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width: '100%', textAlign: 'left', padding: 18, background: hovered ? 'rgba(93,202,165,0.04)' : 'var(--bg2)', border: `1px solid ${hovered ? 'rgba(93,202,165,0.35)' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all var(--transition)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar url={avatarUrl} name={name} size={28} />
          <span style={{ fontSize: 13, color: 'rgba(240,239,232,0.75)' }}>{name}</span>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(240,239,232,0.4)' }}>{timeAgo(post.created_at)}</span>
      </div>
      <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.7)', lineHeight: 1.65, marginBottom: 12 }}>"{post.content}"</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {post.emotion_tag && <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--teal)', border: '1px solid rgba(93,202,165,0.2)' }}>{post.emotion_tag}</span>}
        <span style={{ fontSize: 12, marginLeft: 'auto', color: hovered ? 'var(--teal)' : 'rgba(240,239,232,0.4)', transition: 'color var(--transition)' }}>{hovered ? 'Start listening →' : 'Tap to listen'}</span>
      </div>
    </button>
  )
}

function PastChatsView({ chats, userId, onOpen, onDelete, onBack }) {
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Date bucket label
  function dateBucket(isoStr) {
    const d = new Date(isoStr)
    const now = new Date()
    const diffDays = Math.floor((now - d) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7)  return 'This week'
    if (diffDays < 30) return 'This month'
    return 'Earlier'
  }

  const BUCKET_ORDER = ['Today', 'Yesterday', 'This week', 'This month', 'Earlier']

  // Flatten all chats into a unified list with role context
  // For expresser chats: group sessions by post, show one row per post
  const myExpressions = chats.filter(c => c.expresser_id === userId)
  const myListening   = chats.filter(c => c.listener_id === userId)

  // Group expressions by post
  const expressionGroups = Object.values(
    myExpressions.reduce((acc, chat) => {
      const key = chat.posts?.id ?? chat.id
      if (!acc[key]) acc[key] = { post: chat.posts, sessions: [], date: chat.created_at, id: key }
      acc[key].sessions.push(chat)
      // Use most recent session date for the group
      if (new Date(chat.created_at) > new Date(acc[key].date)) acc[key].date = chat.created_at
      return acc
    }, {})
  )

  // Build unified rows: { type, date, data }
  const rows = [
    ...expressionGroups.map(g => ({ type: 'expression', date: g.date, data: g })),
    ...myListening.map(c => ({ type: 'listening', date: c.created_at, data: c })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  // Group by date bucket
  const buckets = rows.reduce((acc, row) => {
    const b = dateBucket(row.date)
    if (!acc[b]) acc[b] = []
    acc[b].push(row)
    return acc
  }, {})

  return (
    <div className="page" style={{ padding: '0 24px', justifyContent: 'flex-start' }}>
      <div style={{ position: 'relative', zIndex: 1, paddingTop: 52, marginBottom: 24 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(240,239,232,0.5)', fontSize: 14, marginBottom: 20, background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 6, color: 'var(--text)' }}>Your conversations</h2>
        <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.5)' }}>{rows.length} total · grouped by date</p>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'rgba(240,239,232,0.4)' }}>
          <p style={{ fontSize: 32, marginBottom: 16 }}>◎</p>
          <p style={{ fontSize: 15 }}>No conversations yet.</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>When you connect with someone, it'll show up here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 48 }}>
          {BUCKET_ORDER.filter(b => buckets[b]).map(bucket => (
            <div key={bucket}>
              {/* Date header */}
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(240,239,232,0.35)', marginBottom: 10 }}>
                {bucket}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {buckets[bucket].map(row => {
                  if (row.type === 'expression') {
                    // Expression group card
                    const { post, sessions, id } = row.data
                    const hasActive = sessions.some(s => s.status === 'active')
                    const preview = post?.content?.slice(0, 100) ?? ''
                    const listenerCount = sessions.length
                    return (
                      <div key={`exp-${id}`} style={{ padding: '14px 16px', background: 'var(--bg2)', border: `1px solid ${hasActive ? 'rgba(93,202,165,0.25)' : 'var(--border)'}`, borderRadius: 'var(--radius)' }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)' }}>You expressed</span>
                            {hasActive && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'rgba(93,202,165,0.15)', color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Live</span>}
                          </div>
                          {post?.emotion_tag && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--bg3)', color: 'rgba(240,239,232,0.5)' }}>{post.emotion_tag}</span>}
                        </div>

                        {/* Post preview */}
                        <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.75)', lineHeight: 1.6, marginBottom: 10 }}>
                          "{preview}{preview.length === 100 ? '...' : ''}"
                        </p>

                        {/* Listener sessions — each as a compact row */}
                        {sessions.length === 1 ? (
                          // Single listener: just an "Open" button
                          <button onClick={() => onOpen(sessions[0])} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <span style={{ fontSize: 12, color: 'rgba(240,239,232,0.5)' }}>💬 1 listener ·</span>
                            <span style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'underline' }}>Open chat</span>
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: sessions[0].status === 'active' ? 'rgba(93,202,165,0.15)' : 'rgba(136,135,128,0.15)', color: sessions[0].status === 'active' ? 'var(--teal)' : 'rgba(240,239,232,0.4)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                              {sessions[0].status === 'active' ? 'Ongoing' : 'Ended'}
                            </span>
                            <button onClick={e => { e.stopPropagation(); setConfirmDelete(sessions[0].id) }} style={{ marginLeft: 'auto', color: 'rgba(240,239,232,0.25)', fontSize: 16, cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1 }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--coral)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,239,232,0.25)'}>×</button>
                          </button>
                        ) : (
                          // Multiple listeners: expandable list
                          <div>
                            <p style={{ fontSize: 12, color: 'rgba(240,239,232,0.5)', marginBottom: 6 }}>💬 {listenerCount} listeners responded</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {sessions.map((session, idx) => {
                                const oName = session.otherProfile?.full_name?.split(' ')[0] ?? `Listener ${idx + 1}`
                                const oAvatar = session.otherProfile?.avatar_url
                                return (
                                  <div key={session.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg3)', borderRadius: 8 }}>
                                    <Avatar url={oAvatar} name={oName} size={20} />
                                    <span style={{ fontSize: 13, color: 'rgba(240,239,232,0.7)', flex: 1 }}>{oName}</span>
                                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: session.status === 'active' ? 'rgba(93,202,165,0.15)' : 'rgba(136,135,128,0.15)', color: session.status === 'active' ? 'var(--teal)' : 'rgba(240,239,232,0.4)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                      {session.status === 'active' ? 'Live' : 'Ended'}
                                    </span>
                                    <button onClick={() => onOpen(session)} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Open</button>
                                    <button onClick={() => setConfirmDelete(session.id)} style={{ color: 'rgba(240,239,232,0.25)', fontSize: 14, cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1 }}
                                      onMouseEnter={e => e.currentTarget.style.color = 'var(--coral)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,239,232,0.25)'}>×</button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Listening card
                  const chat = row.data
                  const isOngoing = chat.status === 'active'
                  const preview = chat.posts?.content?.slice(0, 100) ?? ''
                  const isAnon = chat.posts?.is_anonymous
                 // 1. Identify if this conversation belongs to a Seed Post
                  const seedData = SEED_POSTS.find(s => s.id === chat.post_id);

                  // 2. Determine the name: Seed Name -> Profile Name -> Fallback
                  const otherName = seedData 
                    ? (seedData.profiles?.full_name?.split(' ')[0] ?? 'Someone')
                    : (chat.otherProfile?.full_name?.split(' ')[0] ?? 'Someone');

                  // 3. Determine the avatar
                  const otherAvatar = seedData
                    ? seedData.profiles?.avatar_url
                    : chat.otherProfile?.avatar_url;

                  return (
                    <div key={`listen-${chat.id}`} style={{ padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <button onClick={() => onOpen(chat)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar url={otherAvatar} name={otherName} size={24} />
                            <span style={{ fontSize: 13, color: 'rgba(240,239,232,0.8)', fontWeight: 500 }}>{otherName}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--teal)' }}>You listened</span>
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 600, background: isOngoing ? 'rgba(93,202,165,0.15)' : 'rgba(136,135,128,0.15)', color: isOngoing ? 'var(--teal)' : 'rgba(240,239,232,0.4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                              {isOngoing ? 'Live' : 'Ended'}
                            </span>
                          </div>
                        </div>
                        <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.7)', lineHeight: 1.6 }}>"{preview}{preview.length === 100 ? '...' : ''}"</p>
                        {chat.posts?.emotion_tag && <span style={{ display: 'inline-block', marginTop: 6, fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--bg3)', color: 'var(--teal)' }}>{chat.posts.emotion_tag}</span>}
                      </button>
                      <button onClick={() => setConfirmDelete(chat.id)} style={{ color: 'rgba(240,239,232,0.25)', fontSize: 20, cursor: 'pointer', flexShrink: 0, padding: 4, background: 'none', border: 'none', lineHeight: 1 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--coral)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,239,232,0.25)'}>×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {confirmDelete && <Modal title="Delete this conversation?" body="This can't be undone. The messages will be gone permanently." primaryLabel="Yes, delete it" primaryAction={() => { onDelete(confirmDelete); setConfirmDelete(null) }} secondaryLabel="Keep it" secondaryAction={() => setConfirmDelete(null)} danger />}
    </div>
  )
}

function EmojiPicker({ onSelect, onClose }) {
  return (
    <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, zIndex: 10, width: 240, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
      {EMOJI_GROUPS.map((group, gi) => (
        <div key={gi} style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: gi < EMOJI_GROUPS.length - 1 ? 8 : 0 }}>
          {group.map(emoji => (
            <button key={emoji} onClick={() => { onSelect(emoji); onClose() }} style={{ fontSize: 20, padding: 4, borderRadius: 6, background: 'transparent', cursor: 'pointer', border: 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{emoji}</button>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Chat View ──────────────────────────────────────────────────
function ChatView({ sessionId: initialSessionId, isExpresser, isSeedSession, isAISession, post, myProfile, currentUserId, preloadedOtherProfile, allListenerSessions, newListenerNotif, onNewListenerDismiss, onSwitchListener, showEndTip, onEndTipDismiss, onBack, onEnd }) {
  const [sessionId, setSessionId] = useState(initialSessionId) // may be null for pending listener sessions
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [otherTyping, setOtherTyping] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [ended, setEnded] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [otherProfile, setOtherProfile] = useState(preloadedOtherProfile ?? null)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [sessionClosed, setSessionClosed] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const typingChannel = useRef(null)
  const pendingTimer = useRef(null)
  const seenIds = useRef(new Set())

  const isAIChat = isSeedSession || isAISession
  const TYPING_REVEAL_MS = 3000

  // Sync sessionId if parent switches session (FAB multi-listener)
  useEffect(() => { setSessionId(initialSessionId) }, [initialSessionId])

  // Load other profile
  useEffect(() => {
    if (preloadedOtherProfile) { setOtherProfile(preloadedOtherProfile); return }
    if (isAIChat) return
    async function load() {
      if (!isExpresser && post?.user_id) {
        const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', post.user_id).single()
        if (data) setOtherProfile(data)
      } else if (isExpresser) {
        const { data: s } = await supabase.from('sessions').select('listener_id').eq('id', sessionId).single()
        if (s?.listener_id) { const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', s.listener_id).single(); if (data) setOtherProfile(data) }
      }
    }
    load()
  }, [post, isExpresser, isAIChat, sessionId, preloadedOtherProfile])

  // Load messages
  useEffect(() => {
    seenIds.current = new Set()
    if (isSeedSession && sessionId && !sessionId.startsWith('seed-')) {
      // Seed session with real DB ID — load from DB
      async function loadSeedMessages() {
        const { data } = await supabase.from('messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true })
        const msgs = data || []
        if (msgs.length === 0) {
          // First open — show opening post content
          const openingMsg = { id: `seed-init-${sessionId}`, sender_id: 'other', content: post?.content ?? '', created_at: new Date().toISOString() }
          setMessages([openingMsg])
        } else {
          msgs.forEach(m => seenIds.current.add(m.id))
          setMessages(msgs)
        }
        setHasInteracted(msgs.some(m => m.sender_id === currentUserId))
        setLoading(false)
      }
      loadSeedMessages(); return
    }
   // FIX: Look in Supabase even for seed sessions
    if (isSeedSession) {
      async function loadSeedFromSupabase() {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })
        
        const msgs = data || []
        
        if (msgs.length > 0) {
          msgs.forEach(m => seenIds.current.add(m.id))
          setMessages(msgs)
          setHasInteracted(msgs.some(m => m.sender_id === currentUserId))
        } else {
          // If no messages in DB yet, show the original post as the first bubble
          const openingMsg = { 
            id: `seed-init-${sessionId}`, 
            sender_id: 'other', 
            content: post?.content ?? '', 
            created_at: new Date().toISOString() 
          }
          setMessages([openingMsg])
          setHasInteracted(false)
        }
        setLoading(false)
      }
      loadSeedFromSupabase()
      return
    }
    // Pending session — no DB session yet, show the post as first message
    if (!sessionId) {
      const openingMsg = { id: 'pending-open', sender_id: 'other', content: post?.content ?? '', created_at: new Date().toISOString() }
      setMessages([openingMsg]); setLoading(false); return
    }
    // Also fetch session status to know if it's closed (disable input if so)
    async function loadMessages() {
      const { data: s } = await supabase.from('sessions').select('status').eq('id', sessionId).single()
      if (s?.status === 'closed') setSessionClosed(true)

      const { data } = await supabase.from('messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true })
      const msgs = data || []
      msgs.forEach(m => seenIds.current.add(m.id))
      // If any message is a system end-message, mark closed
      if (msgs.some(m => m.content?.startsWith('__system__:'))) setSessionClosed(true)
      setMessages(msgs)
      setHasInteracted(msgs.some(m => m.sender_id === currentUserId && !m.content?.startsWith('__system__:') && !m.is_ai_msg))
      setLoading(false)

      // Send any queued journal messages from sessionStorage
      if (isExpresser && post?.id) {
        const queued = getJournalQueue(post.id)
        if (queued.length) {
          clearJournalQueue(post.id)
          for (const item of queued) {
            const { data: inserted } = await supabase.from('messages')
              .insert({ session_id: sessionId, sender_id: item.userId, content: item.text })
              .select().single()
            if (inserted) { seenIds.current.add(inserted.id); setMessages(m => [...m, inserted]) }
          }
        }
      }
    }
    loadMessages()
  }, [sessionId])

  // AI listener greets when session opens — fires once if AI hasn't replied yet
  useEffect(() => {
    const hasAIReply = messages.some(m => m.is_ai_msg || (m.sender_id === 'other' && m.id.startsWith('ai-')))
    // Greet if: real AI session, not seed, not loading, AI hasn't spoken yet, have post content
    if (!isAISession || isSeedSession || loading || hasAIReply || !post?.content || !sessionId) return
    let fired = false
    async function aiGreet() {
      if (fired) return; fired = true
      const postText = post.content.trim()
      if (!postText) return
      setAiThinking(true)
      // Build history from ALL existing messages so AI has full context
      const existingHistory = messages
        .filter(m => m.content && m.content.trim() && !m.content.startsWith('__system__:'))
        .map(m => ({
          role: (m.sender_id === currentUserId && !m.is_ai_msg) ? 'user' : 'assistant',
          content: m.content.trim()
        }))
      // If no existing messages, use post content as the opening message
      const history = existingHistory.length > 0 ? existingHistory : [{ role: 'user', content: postText }]
      const aiText = await getAIResponse(history, 'listener', postText)
      setAiThinking(false)
      if (!aiText) return
      setOtherTyping(true)
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000))
      setOtherTyping(false)
      const aiMsg = { id: `ai-open-${Date.now()}`, sender_id: 'other', content: aiText, is_ai_msg: true, created_at: new Date().toISOString() }
      seenIds.current.add(aiMsg.id)
      // If no existing messages, show opening post + AI reply together
      if (messages.length === 0) {
        const openingMsg = { id: `init-${sessionId}`, sender_id: currentUserId, content: postText, is_ai_msg: false, created_at: new Date().toISOString() }
        seenIds.current.add(openingMsg.id)
        setMessages([openingMsg, aiMsg])
        const greetSid = !String(sessionId).startsWith('seed-') ? sessionId : null
        if (greetSid) {
          const { error: e1 } = await supabase.from('messages').insert({ session_id: greetSid, sender_id: currentUserId, content: postText })
          if (e1) console.error('Opening post save failed:', e1)
          const { error: e2 } = await supabase.from('messages').insert({ session_id: greetSid, sender_id: currentUserId, content: aiText, is_ai_msg: true })
          if (e2) console.error('AI greeting save failed:', e2)
        }
      } else {
        // User already sent messages — just append AI reply
        setMessages(m => [...m, aiMsg])
        const greetSid = !String(sessionId).startsWith('seed-') ? sessionId : null
        if (greetSid) {
          const { error } = await supabase.from('messages').insert({ session_id: greetSid, sender_id: currentUserId, content: aiText, is_ai_msg: true })
          if (error) console.error('AI greeting save failed:', error)
        }
      }
    }
    aiGreet()
  }, [isAISession, loading, sessionId, messages.length])

  // Real-time messages — deduplicated, with 3-second typing reveal
  useEffect(() => {
    if (isAIChat || !sessionId) return
    const ch = supabase.channel(`chat-${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const msg = payload.new
          // Deduplicate by real DB id — skip if already shown
          if (seenIds.current.has(msg.id)) return
          seenIds.current.add(msg.id)
          // System messages appear immediately
          // Detect system messages by content prefix (avoids RLS issues with sender_id = system)
          if (msg.content?.startsWith('__system__:')) {
            setSessionClosed(true)
            setMessages(m => m.find(x => x.id === msg.id) ? m : [...m, msg])
            return
          }
          // Own messages sent by the journal (or another device) — add without typing dots
          if (msg.sender_id === currentUserId) {
            setMessages(m => m.find(x => x.id === msg.id) ? m : [...m, msg])
            return
          }
          // Other person's messages — show typing dots then reveal
          setOtherTyping(true)
          clearTimeout(pendingTimer.current)
          pendingTimer.current = setTimeout(() => {
            setOtherTyping(false)
            setMessages(m => {
              if (m.find(x => x.id === msg.id)) return m
              return [...m, msg]
            })
          }, TYPING_REVEAL_MS)
        })
      .subscribe()
    typingChannel.current = supabase.channel(`typing-${sessionId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== currentUserId) {
          setOtherTyping(true)
          clearTimeout(pendingTimer.current)
          pendingTimer.current = setTimeout(() => setOtherTyping(false), 3000)
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
      if (typingChannel.current) supabase.removeChannel(typingChannel.current)
      clearTimeout(pendingTimer.current)
    }
  }, [sessionId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, otherTyping, aiThinking])

  function broadcastTyping() { typingChannel.current?.send({ type: 'broadcast', event: 'typing', payload: { user_id: currentUserId } }) }

 async function send() {
  if (!input.trim() || aiThinking) return
  const content = input.trim(); setInput(''); setHasInteracted(true)
  
  const tempId = `temp-${Date.now()}`
  const myMsg = { id: tempId, sender_id: currentUserId, content, created_at: new Date().toISOString() }
  seenIds.current.add(tempId)
  
  // Show message in UI immediately
  const updated = [...messages, myMsg]
  setMessages(updated)

  let activeSessionId = sessionId

  // IMPORTANT: If we don't have a sessionId, we MUST create one before saving messages
  if (!activeSessionId && post) {
    const { data: newSession, error } = await supabase.from('sessions')
      .insert({ 
        post_id: post.id, 
        expresser_id: isSeedSession ? '00000000-0000-0000-0000-000000000001' : post.user_id, 
        listener_id: currentUserId, 
        status: 'active' 
      })
      .select().single()
    
    if (newSession) {
      activeSessionId = newSession.id
      setSessionId(activeSessionId)
    } else {
      console.error("Could not link message to a session:", error)
      return
    }
  }

  // Save the User Message to the Database
  const { data: inserted } = await supabase.from('messages')
    .insert({ session_id: activeSessionId, sender_id: currentUserId, content })
    .select().single()

  if (inserted) {
    setMessages(m => m.map(msg => msg.id === tempId ? { ...msg, id: inserted.id } : msg))
  }

  // Handle AI Response
  if (isAIChat) {
    setAiThinking(true)
    const history = updated.map(m => ({
      role: m.sender_id === currentUserId ? 'user' : 'assistant',
      content: m.content
    }))
    
    const aiText = await getAIResponse(history, isSeedSession ? 'expresser' : 'listener', post?.content)
    setAiThinking(false)

    if (aiText) {
      setOtherTyping(true)
      await new Promise(r => setTimeout(r, 2000))
      setOtherTyping(false)

      // Save AI response to Database
      const { data: aiInserted } = await supabase.from('messages')
        .insert({ 
          session_id: activeSessionId, 
          sender_id: '00000000-0000-0000-0000-000000000001', 
          content: aiText, 
          is_ai_msg: true 
        })
        .select().single()

      if (aiInserted) setMessages(prev => [...prev, aiInserted])
    }
  }
}

  async function handleEndChat() {
    if (sessionId && !String(sessionId).startsWith('seed-')) {
      await supabase.from('sessions').update({ status: 'closed' }).eq('id', sessionId) //chatgpt
      // Prefix with __system__: so receiver renders it as a notice not a bubble
      // Using currentUserId (not 'system') so Supabase RLS allows the insert
      const systemContent = isExpresser
        ? '__system__:The expresser has closed this conversation.'
        : '__system__:Your listener has ended this conversation.'
      await supabase.from('messages').insert({
        session_id: sessionId,
        sender_id: currentUserId,
        content: systemContent
      })
    }
    setSessionClosed(true)
    // Mark seed chats as ended in localStorage
    if (isSeedSession && String(sessionId).startsWith('seed-')) {
      const pid = String(sessionId).replace('seed-', '')
      try {
        const stored = localStorage.getItem(`seed_msgs_${currentUserId}_${pid}`)
        if (stored) {
          const msgs = JSON.parse(stored)
          localStorage.setItem(`seed_msgs_${currentUserId}_${pid}_ended`, 'true')
        }
      } catch {}
    }
    if (isExpresser) { setShowRating(true) } else if (hasInteracted) { setEnded(true) } else { onEnd?.() }
  }

  function insertEmoji(e) { setInput(i => i + e); inputRef.current?.focus() }

const otherName = (() => {
  // 1. Try to find the seed data using the Post ID or the Session ID
  const seed = SEED_POSTS.find(s => s.id === post?.id || s.id === sessionId || sessionId === `seed-${s.id}`);
  
  if (isSeedSession && seed) {
    return seed.profiles?.full_name?.split(' ')[0] ?? 'Someone';
  }
  
  // 2. Fallback to the profile loaded from Supabase (for real chats)
  if (otherProfile?.full_name) {
    return otherProfile.full_name.split(' ')[0];
  }

  // 3. Last resort fallbacks
  if (post?.is_anonymous) return 'Anonymous';
  return isExpresser ? 'Listener' : 'Someone';
})();

const otherAvatar = (() => {
  const seed = SEED_POSTS.find(s => s.id === post?.id || s.id === sessionId || sessionId === `seed-${s.id}`);
  
  if (isSeedSession && seed) {
    return seed.profiles?.avatar_url ?? null;
  }
  
  return otherProfile?.avatar_url ?? null;
})();
  const myName = myProfile?.full_name?.split(' ')[0] ?? 'You'
  const myAvatar = myProfile?.avatar_url ?? null

  if (showRating) return <RatingScreen onSubmit={async (r) => { if (!isAIChat) await supabase.from('sessions').update({ rating: r }).eq('id', sessionId); onEnd?.() }} onSkip={() => onEnd?.()} />
  if (ended) {
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 52, animation: 'float 3s ease-in-out infinite' }}>✨</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 7vw, 32px)', fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--teal)' }}>You showed up for {otherName}.</h2>
        <p style={{ fontSize: 15, color: 'rgba(240,239,232,0.7)', lineHeight: 1.8, maxWidth: 300 }}>Being truly present for someone is one of the most human things there is. Thank you for being that person today.</p>
        <button className="btn-primary" style={{ maxWidth: 300 }} onClick={onEnd}>Back to home</button>
      </div>
    )
  }

  return (
    <>
      {showEndTip && !isExpresser && <Modal title="You've started listening 💙" body="When your conversation feels complete, tap 'End' in the top right to close it with care." primaryLabel="Got it" primaryAction={onEndTipDismiss} />}

      {/* New listener notification for expresser */}
      {newListenerNotif && isExpresser && (
        <Modal
          title="Someone else is here for you 💙"
          body="Another person has seen your words and wants to be present with you. Would you like to connect with them too?"
          primaryLabel="Yes, see their message"
          primaryAction={() => onSwitchListener?.(newListenerNotif)}
          secondaryLabel="Stay in this chat"
          secondaryAction={onNewListenerDismiss}
        />
      )}

      {showEndConfirm && <Modal
        title={isExpresser ? 'Ready to close this conversation?' : 'End this listening session?'}
        body={isExpresser ? 'You can always come back and express yourself again whenever you need to.' : hasInteracted ? "You've given your time and presence — that's a beautiful thing." : "It looks like you haven't responded yet. Are you sure you want to leave?"}
        primaryLabel={isExpresser ? 'Yes, close it' : hasInteracted ? 'End session' : 'Leave without chatting'}
        primaryAction={() => { setShowEndConfirm(false); handleEndChat() }}
        secondaryLabel="Keep talking"
        secondaryAction={() => setShowEndConfirm(false)}
      />}

      <div className="page" style={{ justifyContent: 'flex-start', height: '100dvh' }}>
        {/* Header */}
        <div style={{ padding: '52px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => onBack?.(hasInteracted)} style={{ color: 'rgba(240,239,232,0.5)', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <Avatar url={otherAvatar} name={otherName} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{otherName}</p>
            <p style={{ fontSize: 12, color: 'var(--teal)' }}>● {isExpresser ? 'your listener is here' : 'you are listening'}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {post?.emotion_tag && <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--teal)', border: '1px solid rgba(93,202,165,0.2)' }}>{post.emotion_tag}</span>}
            {!sessionClosed
              ? <button onClick={() => setShowEndConfirm(true)} style={{ fontSize: 12, fontWeight: 600, color: '#fff', padding: '5px 12px', border: 'none', borderRadius: 8, cursor: 'pointer', background: '#E24B4A', letterSpacing: '0.02em' }}>End</button>
              : <span style={{ fontSize: 11, color: 'rgba(240,239,232,0.35)', padding: '5px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>Ended</span>
            }
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!isExpresser && (
            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8 }}>
              <p style={{ fontSize: 12, color: 'rgba(240,239,232,0.6)', lineHeight: 1.6 }}>Be present, not a problem-solver. Let them feel heard first. 💙</p>
            </div>
          )}
          {loading && <div style={{ textAlign: 'center', padding: 20 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 1.2s infinite' }} /></div>}
          {messages.map(msg => {
            // System messages render as centered notices
            if (msg.content?.startsWith('__system__:')) {
              // If the other side ended, mark this chat as closed for us too
              if (!sessionClosed) setSessionClosed(true)
              return (
                <div key={msg.id} style={{ textAlign: 'center', padding: '8px 16px' }}>
                  <span style={{ fontSize: 12, color: 'rgba(240,239,232,0.4)', background: 'var(--bg2)', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)' }}>
                    {msg.content}
                  </span>
                </div>
              )
            }
            const isMine = msg.sender_id === currentUserId && !msg.is_ai_msg
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: 4 }}>
                {!isMine && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}><Avatar url={otherAvatar} name={otherName} size={22} /><span style={{ fontSize: 11, color: 'rgba(240,239,232,0.5)' }}>{otherName}</span></div>}
                {isMine && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 2 }}><span style={{ fontSize: 11, color: 'rgba(240,239,232,0.5)' }}>{myName}</span><Avatar url={myAvatar} name={myName} size={22} /></div>}
                <div style={{ maxWidth: '78%', padding: '12px 16px', borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMine ? 'var(--accent)' : 'var(--bg2)', border: isMine ? 'none' : '1px solid var(--border)', fontSize: 15, lineHeight: 1.6, color: isMine ? '#fff' : 'rgba(240,239,232,0.85)' }}>{msg.content}</div>
              </div>
            )
          })}
          {(otherTyping || aiThinking) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar url={otherAvatar} name={otherName} size={22} />
              <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(240,239,232,0.5)', display: 'inline-block', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input — disabled if session is closed */}
        {sessionClosed ? (
          <div style={{ padding: '16px 24px 32px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(240,239,232,0.35)' }}>This conversation has ended.</p>
          </div>
        ) : (
          <div style={{ padding: '12px 16px 36px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0, position: 'relative' }}>
            {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}
            <button onClick={() => setShowEmoji(s => !s)} style={{ width: 40, height: 40, borderRadius: '50%', background: showEmoji ? 'var(--accent-dim)' : 'transparent', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 18 }}>🙂</button>
            <textarea ref={inputRef} value={input} onChange={e => { setInput(e.target.value); if (!isAIChat) broadcastTyping() }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder={isExpresser ? 'Say what you need to say...' : 'Say something kind...'} rows={1}
              style={{ flex: 1, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 15, color: 'var(--text)', resize: 'none', lineHeight: 1.5, transition: 'border-color var(--transition)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            <button onClick={send} disabled={!input.trim() || aiThinking} style={{ width: 44, height: 44, borderRadius: '50%', background: input.trim() ? 'var(--accent)' : 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background var(--transition)', flexShrink: 0, cursor: input.trim() ? 'pointer' : 'default' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* Floating FAB for multi-listener switching — matches reference image */}
      {isExpresser && allListenerSessions && allListenerSessions.length > 1 && (
        <ListenerFAB sessions={allListenerSessions} currentSessionId={sessionId} onSwitch={onSwitchListener} />
      )}
    </>
  )
}

// Floating chat FAB rendered via portal
function ListenerFAB({ sessions, currentSessionId, onSwitch }) {
  const [open, setOpen] = useState(false)
  const activeSessions = sessions.filter(s => s.status !== 'closed')
  if (activeSessions.length <= 1) return null
  return createPortal(
    <div style={{ position: 'fixed', bottom: 88, right: 20, zIndex: 9998, pointerEvents: 'all' }}>
      {/* Popup card — appears above FAB */}
      {open && (
        <div style={{ position: 'absolute', bottom: 64, right: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '10px 0', width: 210, boxShadow: '0 8px 40px rgba(0,0,0,0.6)', zIndex: 9999, pointerEvents: 'all' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(240,239,232,0.4)', padding: '0 16px 8px' }}>Listeners</p>
          {activeSessions.map((s, i) => {
            const isCurrent = s.id === currentSessionId
            const name = s.listenerName || `Listener ${i + 1}`
            return (
              <button key={s.id} onClick={() => { onSwitch?.(s); setOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', background: isCurrent ? 'rgba(139,124,246,0.15)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--bg3)' }}
                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: isCurrent ? 'var(--accent)' : 'var(--bg3)', border: `2px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: isCurrent ? '#fff' : 'rgba(240,239,232,0.5)', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div>
                  <p style={{ fontSize: 13, color: isCurrent ? 'var(--accent)' : 'rgba(240,239,232,0.85)', fontWeight: isCurrent ? 600 : 400, margin: 0 }}>{name}</p>
                  {isCurrent && <p style={{ fontSize: 10, color: 'var(--teal)', margin: 0 }}>Current chat</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}
      {/* Circular FAB button */}
      <button onClick={() => setOpen(o => !o)}
        style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(139,124,246,0.5)', transition: 'transform 0.15s', transform: open ? 'scale(0.9)' : 'scale(1)', position: 'relative' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span style={{ position: 'absolute', top: -3, right: -3, width: 19, height: 19, borderRadius: '50%', background: 'var(--teal)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0e0e10' }}>
          {activeSessions.length}
        </span>
      </button>
    </div>,
    document.body
  )
}