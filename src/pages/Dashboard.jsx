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

  const title = filled === 3 ? "You're a Rockstar 💫"
               : filled === 2 ? "You're a Superstar 🌟"
               : "You're a Star ✨"

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
  const [activeExpresserPost, setActiveExpresserPost] = useState(null)
  const [siblingsSessions, setSiblingsSessions] = useState([]) 
  const [currentListenerSession, setCurrentListenerSession] = useState(null) 
  const currentListenerSessionRef = useRef(null) 
  const [newListenerNotif, setNewListenerNotif] = useState(null) 
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
    loadSeedChats() 
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
        if (session.expresser_id === AI_EXPRESSER_ID) {
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

    const withMessages = await Promise.all(
      enriched.map(async (s) => {
        const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('session_id', s.id).eq('sender_id', user.id)
        return { ...s, userMsgCount: count || 0 }
      })
    )

    setPastChats(prev => {
      // FIX 1: Filter so chats only show if listener has sent at least 1 message
      const cleaned = withMessages.filter(s => {
        const notDeleted = !s.deleted_by || !Array.isArray(s.deleted_by) || !s.deleted_by.includes(user.id);
        const hasInteracted = s.userMsgCount > 0;
        return notDeleted && hasInteracted;
      });

      const existingIds = new Set(cleaned.map(c => c.id))
      const merged = [...cleaned, ...prev.filter(c => c.is_seed && !existingIds.has(c.id))]
      return merged
    })
  }

  function loadSeedChats() {
    const seedEntries = []
    for (const post of SEED_POSTS) {
      const stored = localStorage.getItem(`seed_msgs_${user.id}_${post.id}`) 
      if (!stored) continue
      try {
        const msgs = JSON.parse(stored)
        if (!msgs || msgs.length === 0) continue 
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

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('my-sessions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions', filter: `expresser_id=eq.${user.id}` },
        async (payload) => {
          const newSession = payload.new
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
  }, [user]) 

  useEffect(() => { currentListenerSessionRef.current = currentListenerSession }, [currentListenerSession])

  // FIX 3: Removed the 5-minute close_inactive_sessions interval code

  useEffect(() => {
    if (activeExpresserSessions.length === 1 && !currentListenerSession) {
      setCurrentListenerSession(activeExpresserSessions[0])
      if (view === 'listener') setView('home')
    }
  }, [activeExpresserSessions])

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

  return (
    <div className="page" style={{ padding: '0 24px', justifyContent: 'flex-start' }}>
      <div className="orb" style={{ width: 380, height: 380, background: 'radial-gradient(circle, rgba(139,124,246,0.10) 0%, transparent 70%)', top: '-60px', right: '-80px' }} />
      <div className="orb" style={{ width: 260, height: 260, background: 'radial-gradient(circle, rgba(93,202,165,0.08) 0%, transparent 70%)', bottom: '160px', left: '-60px' }} />

      {showResumeModal && pendingListenerSession && (
        <Modal title="You have an ongoing conversation" body="It looks like you stepped away from a chat. Would you like to continue where you left off?" primaryLabel="Continue conversation" primaryAction={() => { setShowResumeModal(false); setSelectedChat(pendingListenerSession); setView('chat-detail') }} secondaryLabel="Leave it for now" secondaryAction={() => { setShowResumeModal(false); setPendingListenerSession(null) }} />
      )}

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

  async function triggerAI() {
    setAiJoining(true)
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
          You've reached the limit for today. Rest now.
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
        </div>
      </div>
    )
  }

  if (phase === 'wait') {
    const pct = Math.min((waitSeconds / AI_WAIT_SECS) * 100, 100)
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
        <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '18px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: aiJoining ? 'var(--accent)' : 'var(--teal)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
              <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{aiJoining ? 'Connecting you now...' : 'Looking for a listener who cares...'}</p>
            </div>
          </div>
          <button onClick={onBrowseListeners} className="btn-ghost">Browse while you wait</button>
        </div>
      </div>
    )
  }

  return (
    <>
      {showConfirm && <Modal title="Leave without sharing?" body="Your words are still here, waiting to be heard." primaryLabel="Keep writing" primaryAction={() => setShowConfirm(false)} secondaryLabel="Yes, go back" secondaryAction={() => { setShowConfirm(false); onBack() }} />}
      <div className="page" style={{ padding: '0 24px', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', zIndex: 1, paddingTop: 52 }}>
          <button onClick={() => text.trim().length > 0 ? setShowConfirm(true) : onBack()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,239,232,0.5)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </button>
        </div>
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>What's on your mind?</h2>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Start wherever feels right..." rows={6} className="textarea" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TAGS.map(t => (
              <button key={t} onClick={() => setTag(tag === t ? null : t)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, border: `1px solid ${tag === t ? 'var(--accent)' : 'var(--border)'}`, background: tag === t ? 'var(--accent-dim)' : 'transparent', color: tag === t ? 'var(--accent)' : 'rgba(240,239,232,0.6)', cursor: 'pointer' }}>{t}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg2)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: 14 }}>Share anonymously</p>
            <button onClick={() => setAnonymous(a => !a)} style={{ width: 44, height: 26, borderRadius: 13, background: anonymous ? 'var(--accent)' : 'var(--bg3)', position: 'relative', border: '1px solid var(--border)' }}>
              <span style={{ position: 'absolute', top: 3, left: anonymous ? 20 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: '0.2s' }} />
            </button>
          </div>
        </div>
        <div style={{ paddingBottom: 48 }}>
          <button className="btn-primary" disabled={text.trim().length < 5 || loading} onClick={handleSubmit}>{loading ? 'Sharing...' : 'Yes, I want to share my feelings'}</button>
        </div>
      </div>
    </>
  )
}

// ── Listener View ──────────────────────────────────────────────
function ListenerView({ user, myProfile, todayListenerCount, onBack, onComplete }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState(null)
  const [visible, setVisible] = useState(false)
  const [showEndTip, setShowEndTip] = useState(false)

  const DAILY_LISTEN_LIMIT  = 10

  useEffect(() => { setTimeout(() => setVisible(true), 80) }, [])

  useEffect(() => {
    fetchPosts()
    const ch = supabase.channel('open-posts').on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts).subscribe()
    return () => supabase.removeChannel(ch)
  }, [user.id])

  async function fetchPosts() {
    setLoading(true);
    const { data: allPosts } = await supabase.from('posts').select('*, profiles(full_name, avatar_url)').eq('status', 'open').neq('user_id', user.id);
    const { data: mySessions } = await supabase.from('sessions').select('post_id').eq('listener_id', user.id);
    const interactedPostIds = new Set(mySessions?.map(s => s.post_id.toString()) || []);
    const filteredSeeds = SEED_POSTS.filter(seed => !interactedPostIds.has(seed.id.toString()));
    const filteredDbPosts = (allPosts || []).filter(dbPost => {
      const cleanId = dbPost.id.toString();
      const isSeed = SEED_POSTS.some(s => s.id === cleanId);
      return !isSeed && !interactedPostIds.has(cleanId);
    });
    setPosts([...filteredSeeds, ...filteredDbPosts]);
    setLoading(false);
  }

  async function handleSelectPost(post) {
    const cleanId = post.id.toString();
    const { data: existing } = await supabase.from('sessions').select('*').eq('post_id', cleanId).eq('listener_id', user.id).maybeSingle();
    if (existing) {
      setActiveSession({ ...existing, post: { ...post, id: cleanId }, is_seed: post.is_seed });
      return;
    }
    if (post.is_seed) {
      setActiveSession({ id: null, post: { ...post, id: cleanId }, is_seed: true, isPending: true });
      setShowEndTip(true);
      return;
    }
    setActiveSession({ id: null, post: { ...post, id: cleanId }, isPending: true });
    setShowEndTip(true);
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
        onBack(activeSession, didInteract)
      }}
      onEnd={() => { setActiveSession(null); onComplete?.(); fetchPosts() }}
    />
  }

  return (
    <div className="page" style={{ padding: '0 24px' }}>
      <div style={{ paddingTop: 52, marginBottom: 24 }}>
        <button onClick={() => onBack(null)} className="btn-ghost" style={{ marginBottom: 20 }}>Back</button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>Someone needs a listener.</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? <p>Loading...</p> : posts.map(post => <PostCard key={post.id} post={post} onClick={() => handleSelectPost(post)} />)}
      </div>
    </div>
  )
}

function PostCard({ post, onClick }) {
  const seed = SEED_POSTS.find(s => s.id === post.id);
  const name = seed ? seed.profiles?.full_name?.split(' ')[0] : (post.is_anonymous ? 'Anonymous' : post.profiles?.full_name?.split(' ')[0]);
  return (
    <button onClick={onClick} className="card" style={{ width: '100%', textAlign: 'left', padding: 18, background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', cursor: 'pointer' }}>
      <p style={{ fontWeight: 500, marginBottom: 8 }}>{name}</p>
      <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.7)' }}>"{post.content}"</p>
    </button>
  )
}

function PastChatsView({ chats, userId, onOpen, onDelete, onBack }) {
  const [confirmDelete, setConfirmDelete] = useState(null)
  return (
    <div className="page" style={{ padding: '0 24px' }}>
      <div style={{ paddingTop: 52, marginBottom: 24 }}>
        <button onClick={onBack} className="btn-ghost" style={{ marginBottom: 20 }}>Back</button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>Your conversations</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {chats.map(chat => (
          <div key={chat.id} style={{ padding: 16, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => onOpen(chat)} style={{ background: 'none', border: 'none', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
              <p style={{ fontSize: 14 }}>Conversation with {chat.otherProfile?.full_name || 'Someone'}</p>
            </button>
            <button onClick={() => setConfirmDelete(chat.id)} style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer' }}>Delete</button>
          </div>
        ))}
      </div>
      {confirmDelete && <Modal title="Delete?" primaryLabel="Delete" primaryAction={() => { onDelete(confirmDelete); setConfirmDelete(null) }} secondaryLabel="Cancel" secondaryAction={() => setConfirmDelete(null)} danger />}
    </div>
  )
}

function EmojiPicker({ onSelect, onClose }) {
  return (
    <div style={{ position: 'absolute', bottom: '100%', left: 0, background: 'var(--bg2)', border: '1px solid var(--border)', padding: 12, borderRadius: 12, zIndex: 10, display: 'flex', flexWrap: 'wrap', gap: 8, width: 200 }}>
      {EMOJI_GROUPS.flat().map(e => <button key={e} onClick={() => { onSelect(e); onClose() }} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>{e}</button>)}
    </div>
  )
}

// ── Chat View ──────────────────────────────────────────────────
function ChatView({ sessionId: initialSessionId, isExpresser, isSeedSession, isAISession, post, myProfile, currentUserId, preloadedOtherProfile, allListenerSessions, newListenerNotif, onNewListenerDismiss, onSwitchListener, showEndTip, onEndTipDismiss, onBack, onEnd }) {
  const [sessionId, setSessionId] = useState(initialSessionId)
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

  useEffect(() => { setSessionId(initialSessionId) }, [initialSessionId])

  useEffect(() => {
    if (preloadedOtherProfile) { setOtherProfile(preloadedOtherProfile); return }
    if (isAIChat) return
    async function load() {
      if (!isExpresser && post?.user_id) {
        const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', post.user_id).single()
        if (data) setOtherProfile(data)
      } else if (isExpresser && sessionId) {
        const { data: s } = await supabase.from('sessions').select('listener_id').eq('id', sessionId).single()
        if (s?.listener_id) { const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', s.listener_id).single(); if (data) setOtherProfile(data) }
      }
    }
    load()
  }, [post, isExpresser, isAIChat, sessionId])

  useEffect(() => {
    seenIds.current = new Set()
    async function loadMessages() {
      if (sessionId) {
        const { data: s } = await supabase.from('sessions').select('status').eq('id', sessionId).single()
        if (s?.status === 'closed') setSessionClosed(true)
        const { data } = await supabase.from('messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true })
        const msgs = data || []
        msgs.forEach(m => seenIds.current.add(m.id))
        setMessages(msgs)
        setHasInteracted(msgs.some(m => m.sender_id === currentUserId))
      } else {
        setMessages([{ id: 'init', sender_id: 'other', content: post?.content ?? '', created_at: new Date().toISOString() }])
      }
      setLoading(false)
    }
    loadMessages()
  }, [sessionId])

  useEffect(() => {
    if (isAIChat || !sessionId) return
    const ch = supabase.channel(`chat-${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const msg = payload.new
          if (seenIds.current.has(msg.id)) return
          seenIds.current.add(msg.id)
          if (msg.content?.startsWith('__system__:')) {
            setMessages(m => [...m, msg])
            return
          }
          if (msg.sender_id !== currentUserId) {
            setOtherTyping(true)
            clearTimeout(pendingTimer.current)
            pendingTimer.current = setTimeout(() => {
              setOtherTyping(false)
              setMessages(m => [...m, msg])
            }, 2000)
          } else {
            setMessages(m => [...m, msg])
          }
        })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [sessionId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, otherTyping, aiThinking])

  async function send() {
    if (!input.trim() || aiThinking) return
    const content = input.trim();
    setInput('');
    setHasInteracted(true);
    let activeSessionId = sessionId;

    if (!activeSessionId && post) {
      const cleanPostId = post.id.toString();
      const { data: existing } = await supabase.from('sessions').select('id').eq('post_id', cleanPostId).eq('listener_id', currentUserId).maybeSingle();
      if (existing) {
        activeSessionId = existing.id;
        setSessionId(activeSessionId);
      } else {
        const { data: newS } = await supabase.from('sessions').insert({ post_id: cleanPostId, expresser_id: post.user_id || '00000000-0000-0000-0000-000000000001', listener_id: currentUserId, status: 'active' }).select().single();
        if (newS) {
          activeSessionId = newS.id;
          setSessionId(activeSessionId);
        }
      }
    }

    const { data: inserted } = await supabase.from('messages').insert({ session_id: activeSessionId, sender_id: currentUserId, content }).select().single();
    if (inserted) {
      seenIds.current.add(inserted.id);
      setMessages(m => [...m, inserted]);
    }

    // FIX 2: AI Persona logic. Check if it's Jordanian, Aisha, etc. to prevent persona switching.
    const reallyIsAIChat = isAIChat || post?.is_seed;
    if (reallyIsAIChat) {
      setAiThinking(true);
      const history = [...messages, { sender_id: currentUserId, content }].map(m => ({
        role: m.sender_id === currentUserId ? 'user' : 'assistant',
        content: m.content
      }));
      // Pass the original post content to getAIResponse to maintain the seed persona context
      const aiText = await getAIResponse(history, isSeedSession ? 'expresser' : 'listener', post?.content);
      setAiThinking(false);
      if (aiText) {
        setOtherTyping(true);
        await new Promise(r => setTimeout(r, 1500));
        setOtherTyping(false);
        const { data: aiInserted } = await supabase.from('messages').insert({ session_id: activeSessionId, sender_id: '00000000-0000-0000-0000-000000000001', content: aiText, is_ai_msg: true }).select().single();
        if (aiInserted) {
          seenIds.current.add(aiInserted.id);
          setMessages(m => [...m, aiInserted]);
        }
      }
    }
  }

  async function handleEndChat() {
    if (sessionId) {
      await supabase.from('sessions').update({ status: 'closed' }).eq('id', sessionId)
      const systemContent = isExpresser ? '__system__:Expresser ended chat' : '__system__:Listener ended chat'
      await supabase.from('messages').insert({ session_id: sessionId, sender_id: currentUserId, content: systemContent })
    }
    setSessionClosed(true)
    if (isExpresser) { setShowRating(true) } else if (hasInteracted) { setEnded(true) } else { onEnd?.() }
  }

  const seedRecord = SEED_POSTS.find(s => s.id === post?.id);
  const otherName = seedRecord ? seedRecord.profiles?.full_name?.split(' ')[0] : (post?.is_anonymous ? 'Anonymous' : (otherProfile?.full_name?.split(' ')[0] ?? 'Someone'));

  if (showRating) return <RatingScreen onSubmit={() => onEnd?.()} onSkip={() => onEnd?.()} />
  if (ended) return <div className="page"><h2>Chat ended</h2><button className="btn-primary" onClick={onEnd}>Home</button></div>

  return (
    <div className="page" style={{ height: '100dvh' }}>
      <div style={{ padding: '52px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => onBack?.(hasInteracted)} className="btn-ghost">Back</button>
        <Avatar name={otherName} size={38} />
        <div style={{ flex: 1 }}><p style={{ fontWeight: 500 }}>{otherName}</p></div>
        {!sessionClosed && <button onClick={() => setShowEndConfirm(true)} style={{ background: '#E24B4A', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 8 }}>End</button>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ alignSelf: msg.sender_id === currentUserId ? 'flex-end' : 'flex-start', background: msg.sender_id === currentUserId ? 'var(--accent)' : 'var(--bg2)', padding: 12, borderRadius: 12, maxWidth: '80%' }}>
            {msg.content}
          </div>
        ))}
        {otherTyping && <p style={{ fontSize: 12, color: 'gray' }}>{otherName} is typing...</p>}
        {aiThinking && <p style={{ fontSize: 12, color: 'gray' }}>Thinking...</p>}
        <div ref={bottomRef} />
      </div>
      {!sessionClosed && (
        <div style={{ padding: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 10, position: 'relative' }}>
          {showEmoji && <EmojiPicker onSelect={e => setInput(i => i + e)} onClose={() => setShowEmoji(false)} />}
          <button onClick={() => setShowEmoji(!showEmoji)} className="btn-ghost">🙂</button>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} style={{ flex: 1, padding: 10, borderRadius: 10, background: 'var(--bg2)', color: 'white', border: '1px solid var(--border)' }} rows={1} />
          <button onClick={send} className="btn-primary" style={{ padding: '0 20px' }}>Send</button>
        </div>
      )}
      {showEndConfirm && <Modal title="End conversation?" primaryLabel="Yes" primaryAction={handleEndChat} secondaryLabel="No" secondaryAction={() => setShowEndConfirm(false)} />}
    </div>
  )
}