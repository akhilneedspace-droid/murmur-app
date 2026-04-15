import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getAIResponse } from '../lib/ai'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Still up?'
}

const SEED_POSTS = [
  { id: 'seed-1', content: "I've been really hard on myself lately. Like nothing I do is ever enough, no matter how hard I try.", emotion_tag: 'overwhelmed', is_anonymous: false, created_at: new Date(Date.now() - 4 * 60000).toISOString(), profiles: { full_name: 'Priya', avatar_url: null }, is_seed: true },
  { id: 'seed-2', content: "Had a panic attack at work today and had to pretend everything was fine. I'm exhausted from holding it together.", emotion_tag: 'anxious', is_anonymous: true, created_at: new Date(Date.now() - 9 * 60000).toISOString(), profiles: null, is_seed: true },
  { id: 'seed-3', content: "My relationship ended two weeks ago and I still reach for my phone to text them. I don't know how to stop.", emotion_tag: 'sad', is_anonymous: false, created_at: new Date(Date.now() - 14 * 60000).toISOString(), profiles: { full_name: 'Jordan', avatar_url: null }, is_seed: true },
  { id: 'seed-4', content: "I got the promotion I worked two years for and I feel... nothing. I thought I'd be happy. Is that normal?", emotion_tag: 'confused', is_anonymous: false, created_at: new Date(Date.now() - 22 * 60000).toISOString(), profiles: { full_name: 'Sam', avatar_url: null }, is_seed: true },
  { id: 'seed-5', content: "I've been cancelling plans with friends because I just don't have the energy. I miss who I used to be.", emotion_tag: 'numb', is_anonymous: false, created_at: new Date(Date.now() - 35 * 60000).toISOString(), profiles: { full_name: 'Marcus', avatar_url: null }, is_seed: true },
  { id: 'seed-6', content: "I snapped at someone I love today and I can't stop thinking about it. I hate when I'm like this.", emotion_tag: 'guilty', is_anonymous: false, created_at: new Date(Date.now() - 48 * 60000).toISOString(), profiles: { full_name: 'Aisha', avatar_url: null }, is_seed: true },
  { id: 'seed-7', content: "Just got back from my first solo trip and I feel so proud of myself. Six months ago I couldn't have done that.", emotion_tag: 'grateful', is_anonymous: false, created_at: new Date(Date.now() - 55 * 60000).toISOString(), profiles: { full_name: 'Lena', avatar_url: null }, is_seed: true },
  { id: 'seed-8', content: "I finally told my best friend how much they mean to me after years of being too scared to say it. Feels amazing.", emotion_tag: 'happy', is_anonymous: false, created_at: new Date(Date.now() - 70 * 60000).toISOString(), profiles: { full_name: 'Carlos', avatar_url: null }, is_seed: true },
]

const seedChatStore = {}

const EMOJI_GROUPS = [
  ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💗'],
  ['😊','😢','😔','😰','😤','😌','🥺','😶','🤗','😓'],
  ['🙏','💪','🤝','👋','✨','🌱','🌊','🌙','☀️','🕊️'],
]

// ── Portal Modal ───────────────────────────────────────────────
function Modal({ title, body, primaryLabel, primaryAction, secondaryLabel, secondaryAction, danger }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--bg2)', borderRadius: 20, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
        <p style={{ fontSize: 17, fontWeight: 500, textAlign: 'center', lineHeight: 1.4, color: 'var(--text)' }}>{title}</p>
        {body && <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>{body}</p>}
        {primaryLabel && <button onClick={primaryAction} style={{ width: '100%', padding: 14, borderRadius: 'var(--radius)', background: danger ? '#E24B4A' : 'var(--accent)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>{primaryLabel}</button>}
        {secondaryLabel && <button onClick={secondaryAction} className="btn-ghost">{secondaryLabel}</button>}
      </div>
    </div>,
    document.body
  )
}

// ── Avatar ─────────────────────────────────────────────────────
function Avatar({ url, name, size = 36, style: extra = {} }) {
  const initial = (name || '?')[0].toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: url ? 'transparent' : 'var(--accent-dim)', border: '1px solid rgba(139,124,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, color: 'var(--accent)', overflow: 'hidden', flexShrink: 0, ...extra }}>
      {url ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
    </div>
  )
}

// ── Rating Screen ──────────────────────────────────────────────
function RatingScreen({ onSubmit, onSkip }) {
  const [selected, setSelected] = useState(null)
  const OPTIONS = [
    { value: 1, emoji: '😔', label: 'Not great' },
    { value: 2, emoji: '😊', label: 'It helped' },
    { value: 3, emoji: '🤍', label: 'Really needed that' },
  ]
  return (
    <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 28, textAlign: 'center' }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 10 }}>How did that feel?</h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Your honest feedback helps us make Murmur better for everyone.</p>
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        {OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setSelected(opt.value)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 20px', borderRadius: 'var(--radius)', background: selected === opt.value ? 'var(--accent-dim)' : 'var(--bg2)', border: `1px solid ${selected === opt.value ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all var(--transition)', minWidth: 80 }}>
            <span style={{ fontSize: 28 }}>{opt.emoji}</span>
            <span style={{ fontSize: 12, color: selected === opt.value ? 'var(--accent)' : 'var(--text-secondary)' }}>{opt.label}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
        <button className="btn-primary" disabled={!selected} onClick={() => onSubmit(selected)}>Share my feedback</button>
        <button onClick={onSkip} style={{ fontSize: 14, color: 'var(--text-tertiary)', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none' }}>Skip for now</button>
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
  const [activeExpresserSession, setActiveExpresserSession] = useState(null)
  const [listenerCount, setListenerCount] = useState(0)
  const [pastChats, setPastChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [pendingListenerSession, setPendingListenerSession] = useState(null)
  const [showResumeModal, setShowResumeModal] = useState(false)

  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])

  useEffect(() => {
    if (!user) return
    loadProfile()
    loadListenerCount()
    fetchPastChats()
  }, [user])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
  }

  async function loadListenerCount() {
    const { count } = await supabase.from('sessions').select('id', { count: 'exact' }).eq('listener_id', user.id).eq('status', 'closed')
    setListenerCount(count ?? 0)
  }

  async function fetchPastChats() {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*, posts(content, emotion_tag, is_anonymous, user_id)')
      .or(`expresser_id.eq.${user.id},listener_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!sessions) { setPastChats([]); return }

    const enriched = await Promise.all(
      sessions.map(async (session) => {
        const otherId = session.expresser_id === user.id ? session.listener_id : session.expresser_id
        let otherProfile = null
        if (otherId) {
          const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', otherId).single()
          otherProfile = data ?? null
        }
        return { ...session, otherProfile }
      })
    )

    const visible = enriched.filter(s => !s.deleted_by || !Array.isArray(s.deleted_by) || !s.deleted_by.includes(user.id))
    setPastChats(visible)
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
        (payload) => setActiveExpresserSession(payload.new))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  if (activeExpresserSession && view !== 'listener') {
    return <ChatView sessionId={activeExpresserSession.id} isExpresser={true} isAISession={activeExpresserSession.is_ai} currentUserId={user.id} myProfile={profile} onBack={() => { setActiveExpresserSession(null); setView('home') }} onEnd={() => { setActiveExpresserSession(null); setView('home'); fetchPastChats() }} />
  }

  if (view === 'expresser') return <ExpresserView user={user} myProfile={profile} onBack={() => setView('home')} onSessionStart={s => setActiveExpresserSession(s)} />

  if (view === 'listener') {
    return <ListenerView user={user} myProfile={profile}
      onBack={(session) => { if (session?.id) { setPendingListenerSession(session); setShowResumeModal(true) } setView('home') }}
      onComplete={fetchPastChats} />
  }

  if (view === 'chats') return <PastChatsView chats={pastChats} userId={user?.id} onOpen={chat => { setSelectedChat(chat); setView('chat-detail') }} onDelete={deleteChat} onBack={() => { fetchPastChats(); setView('home') }} />

  if (view === 'chat-detail' && selectedChat) {
    return <ChatView sessionId={selectedChat.id} isExpresser={selectedChat.expresser_id === user?.id} currentUserId={user.id} myProfile={profile} post={selectedChat.posts} preloadedOtherProfile={selectedChat.otherProfile} onBack={() => { setSelectedChat(null); setView('chats') }} onEnd={() => { setSelectedChat(null); setView('chats'); fetchPastChats() }} />
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  return (
    <div className="page" style={{ padding: '0 24px', justifyContent: 'flex-start' }}>
      <div className="orb" style={{ width: 380, height: 380, background: 'radial-gradient(circle, rgba(139,124,246,0.10) 0%, transparent 70%)', top: '-60px', right: '-80px' }} />
      <div className="orb" style={{ width: 260, height: 260, background: 'radial-gradient(circle, rgba(93,202,165,0.08) 0%, transparent 70%)', bottom: '160px', left: '-60px' }} />

      {showResumeModal && pendingListenerSession && (
        <Modal title="You have an ongoing conversation" body="It looks like you stepped away from a chat. Would you like to continue where you left off?" primaryLabel="Continue conversation" primaryAction={() => { setShowResumeModal(false); setSelectedChat(pendingListenerSession); setView('chat-detail') }} secondaryLabel="Leave it for now" secondaryAction={() => { setShowResumeModal(false); setPendingListenerSession(null) }} />
      )}

      <div style={{ position: 'relative', zIndex: 1, paddingTop: 52, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 2 }}>{getGreeting()}</p>
          <h2 style={{ fontSize: 22, fontWeight: 500 }}>Hey, {firstName} 👋</h2>
        </div>
        <button onClick={() => navigate('/account')} style={{ background: 'none', cursor: 'pointer', border: 'none' }}>
          <Avatar url={profile?.avatar_url} name={profile?.full_name || '?'} size={40} />
        </button>
      </div>

      {listenerCount > 0 && (
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 16, padding: '16px 20px', background: 'linear-gradient(135deg, rgba(93,202,165,0.08), rgba(139,124,246,0.08))', border: '1px solid rgba(93,202,165,0.2)', borderRadius: 'var(--radius)', opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease 0.1s' }}>
          <p style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>You're a rockstar ✨</p>
          <p style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500 }}>You've shown up for {listenerCount} {listenerCount === 1 ? 'person' : 'people'} when they needed it most.</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>That matters more than you know.</p>
        </div>
      )}

      <div style={{ position: 'relative, zIndex: 1', display: 'flex', flexDirection: 'column', gap: 12, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s' }}>
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 6vw, 30px)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6 }}>How do you want to show up today?</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>You can switch roles at any time.</p>
        </div>
        <RoleCard role="Expresser" title="Yes, I want to share my feelings" description="Write what's on your mind. Someone will listen — human or AI. You are seen." color="var(--accent)" hoverBorder="rgba(139,124,246,0.4)" hoverBg="var(--accent-glow)" onClick={() => setView('expresser')} />
        <RoleCard role="Listener" title="I want to be there for someone" description="Browse what people are sharing. Pick one and simply be present." color="var(--teal)" hoverBorder="rgba(93,202,165,0.4)" hoverBg="rgba(93,202,165,0.05)" onClick={() => setView('listener')} />
        <button onClick={() => { fetchPastChats(); setView('chats') }} style={{ width: '100%', textAlign: 'left', padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color var(--transition)' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>Your conversations</p>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{pastChats.length > 0 ? `${pastChats.length} past ${pastChats.length === 1 ? 'chat' : 'chats'}` : 'No conversations yet'}</p>
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
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{description}</div>
        </div>
        <svg style={{ flexShrink: 0, marginTop: 2, opacity: 0.4 }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
    </button>
  )
}

// ── Expresser View ─────────────────────────────────────────────
function ExpresserView({ user, myProfile, onBack, onSessionStart }) {
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
  const [journalText, setJournalText] = useState('')
  const [showJournal, setShowJournal] = useState(false)

  const ACK_DURATION_MS = 10000
  const AI_WAIT_SECS    = 10

  useEffect(() => { setTimeout(() => setVisible(true), 80) }, [])

  useEffect(() => {
    if (phase !== 'acknowledge') return
    const t = setTimeout(() => setPhase('wait'), ACK_DURATION_MS)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'wait') return
    const iv = setInterval(() => {
      setWaitSeconds(s => {
        const next = s + 1
        if (next >= AI_WAIT_SECS && !aiJoining) { clearInterval(iv); triggerAI() }
        return next
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [phase, aiJoining])

  useEffect(() => {
    if (!postId) return
    const ch = supabase.channel(`post-${postId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions', filter: `post_id=eq.${postId}` },
        (payload) => onSessionStart(payload.new))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [postId])

  async function triggerAI() {
    setAiJoining(true)
    const { data } = await supabase.from('sessions')
      .insert({ post_id: postId, expresser_id: user.id, listener_id: null, status: 'active', is_ai: true })
      .select().single()
    if (data) onSessionStart({ ...data, is_ai: true })
  }

  async function handleSubmit() {
    if (text.trim().length < 5) return
    setLoading(true)
    try {
      const { data, error: e } = await supabase.from('posts')
        .insert({ user_id: user.id, content: text.trim(), emotion_tag: tag, is_anonymous: anonymous, status: 'open' })
        .select().single()
      if (e) throw e
      setPostId(data.id)
      setPostContent(text.trim())
      setPhase('acknowledge')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const TAGS = ['anxious', 'overwhelmed', 'sad', 'angry', 'confused', 'numb', 'grateful', 'venting']

  if (phase === 'acknowledge') {
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 24, textAlign: 'center' }}>
        <div style={{ animation: 'fadeUp 0.6s ease both' }}>
          <div style={{ fontSize: 52, marginBottom: 16, animation: 'float 3s ease-in-out infinite' }}>🤍</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 7vw, 34px)', fontWeight: 400, color: 'var(--accent)', letterSpacing: '-0.02em', marginBottom: 14 }}>Thank you for sharing.</h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, maxWidth: 300 }}>
            We know it wasn't easy to put your heart into words. What you just did takes real courage — and it matters deeply.
          </p>
        </div>
        <div style={{ width: '100%', maxWidth: 340, padding: '16px 20px', background: 'var(--bg2)', border: '1px solid rgba(139,124,246,0.2)', borderRadius: 'var(--radius)', textAlign: 'left', animation: 'fadeUp 0.6s ease 0.2s both' }}>
          <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Your words</p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>"{postContent.slice(0, 140)}{postContent.length > 140 ? '...' : ''}"</p>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', animation: 'fadeUp 0.6s ease 0.4s both' }}>Finding a listener for you...</p>
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
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>"{postContent.slice(0, 140)}{postContent.length > 140 ? '...' : ''}"</p>
          </div>

          <div style={{ padding: '18px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: aiJoining ? 'var(--accent)' : 'var(--teal)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
              <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
                {aiJoining ? 'Connecting you now...' : 'Looking for a listener who cares...'}
              </p>
            </div>
            {!aiJoining && (
              <>
                <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 1s linear' }} />
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                  If no one is free right now, a warm listener will step in for you.
                </p>
              </>
            )}
          </div>

          {/* Journal prompt — private note, not sent anywhere */}
          <div style={{ padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: showJournal ? 10 : 0, lineHeight: 1.6 }}>
              💭 Sometimes writing more helps. Anything else on your mind?
            </p>
            {showJournal ? (
              <textarea
                value={journalText}
                onChange={e => setJournalText(e.target.value)}
                placeholder="Keep going... this is just for you, not sent to anyone."
                rows={3}
                autoFocus
                style={{ width: '100%', padding: '12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, lineHeight: 1.7, color: 'var(--text)', resize: 'none', marginTop: 4 }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            ) : (
              <button onClick={() => setShowJournal(true)} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', marginTop: 6 }}>
                Write a little more
              </button>
            )}
          </div>
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
          <button onClick={() => text.trim().length > 0 ? setShowConfirm(true) : onBack()} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </button>
        </div>
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 24, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 0.35s ease, transform 0.35s ease' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 6 }}>What's on your mind?</h2>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>There's no right way to do this. Just say what's true for you.</p>
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Start wherever feels right..." rows={6}
            style={{ width: '100%', padding: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 15, lineHeight: 1.7, color: 'var(--text)', resize: 'none', transition: 'border-color var(--transition)' }}
            onFocus={e => e.target.style.borderColor = 'rgba(139,124,246,0.4)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10, letterSpacing: '0.04em' }}>HOW ARE YOU FEELING? (optional)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TAGS.map(t => (
                <button key={t} onClick={() => setTag(tag === t ? null : t)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, border: `1px solid ${tag === t ? 'var(--accent)' : 'var(--border)'}`, background: tag === t ? 'var(--accent-dim)' : 'transparent', color: tag === t ? 'var(--accent)' : 'var(--text-secondary)', transition: 'all var(--transition)', cursor: 'pointer' }}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>Share anonymously</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Your name stays hidden from listeners</p>
            </div>
            <button onClick={() => setAnonymous(a => !a)} style={{ width: 44, height: 26, borderRadius: 13, background: anonymous ? 'var(--accent)' : 'var(--bg3)', border: '1px solid var(--border)', position: 'relative', transition: 'background var(--transition)', cursor: 'pointer', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 3, left: anonymous ? 20 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left var(--transition)' }} />
            </button>
          </div>
          {error && <p style={{ fontSize: 14, color: 'var(--coral)', textAlign: 'center' }}>{error}</p>}
        </div>
        <div style={{ position: 'relative', zIndex: 1, paddingBottom: 48 }}>
          <button className="btn-primary" disabled={text.trim().length < 5 || loading} onClick={handleSubmit}>
            {loading ? 'Sharing...' : 'Yes, I want to share my feelings'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Listener View ──────────────────────────────────────────────
function ListenerView({ user, myProfile, onBack, onComplete }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState(null)
  const [visible, setVisible] = useState(false)
  const [showEndTip, setShowEndTip] = useState(false)

  useEffect(() => { setTimeout(() => setVisible(true), 80) }, [])

  useEffect(() => {
    fetchPosts()
    const ch = supabase.channel('open-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchPosts() {
    const { data } = await supabase.from('posts').select('*, profiles(full_name, avatar_url)').eq('status', 'open').neq('user_id', user.id).order('created_at', { ascending: false })
    setPosts([...(data || []), ...SEED_POSTS])
    setLoading(false)
  }

  async function handleSelectPost(post) {
    if (post.is_seed) {
      if (!seedChatStore[post.id]) {
        seedChatStore[post.id] = [{ id: `seed-init-${post.id}`, sender_id: 'other', content: post.content, created_at: new Date().toISOString() }]
      }
      setActiveSession({ id: `seed-${post.id}`, is_seed: true, post })
      setShowEndTip(true)
      return
    }

    // Fetch expresser profile explicitly — this fixes the "Someone" bug
    const { data: expresserProfile } = await supabase
      .from('profiles').select('full_name, avatar_url').eq('id', post.user_id).single()

    const enrichedPost = { ...post, profiles: expresserProfile ?? post.profiles }

    const { data: session } = await supabase.from('sessions')
      .insert({ post_id: post.id, expresser_id: post.user_id, listener_id: user.id, status: 'active' })
      .select().single()

    if (session) {
      await supabase.from('posts').update({ status: 'active' }).eq('id', post.id)
      setActiveSession({ ...session, post: enrichedPost })
      setShowEndTip(true)
    }
  }

  if (activeSession) {
    return <ChatView sessionId={activeSession.id} isExpresser={false} isSeedSession={activeSession.is_seed} post={activeSession.post} myProfile={myProfile} currentUserId={user.id} showEndTip={showEndTip} onEndTipDismiss={() => setShowEndTip(false)} onBack={() => onBack(activeSession)} onEnd={() => { setActiveSession(null); onComplete?.(); fetchPosts() }} />
  }

  return (
    <div className="page" style={{ padding: '0 24px', justifyContent: 'flex-start' }}>
      <div className="orb" style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(93,202,165,0.08) 0%, transparent 70%)', top: '-40px', right: '-60px' }} />
      <div style={{ position: 'relative', zIndex: 1, paddingTop: 52, marginBottom: 24 }}>
        <button onClick={() => onBack(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 20, background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 6 }}>Someone needs a listener.</h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Choose one person to be present with.</p>
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 48, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 0.4s ease, transform 0.4s ease' }}>
        {loading
          ? <div style={{ textAlign: 'center', padding: 40 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block', animation: 'pulse 1.2s infinite' }} /></div>
          : posts.map((post, idx) => <PostCard key={post.id} post={post} delay={idx * 0.06} onClick={() => handleSelectPost(post)} />)
        }
      </div>
    </div>
  )
}

function PostCard({ post, delay, onClick }) {
  const [hovered, setHovered] = useState(false)
  const name = post.is_anonymous ? 'Anonymous' : (post.profiles?.full_name?.split(' ')[0] ?? 'Someone')
  const avatarUrl = post.is_anonymous ? null : post.profiles?.avatar_url
  const timeAgo = d => { const m = Math.floor((Date.now() - new Date(d)) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; return `${Math.floor(m / 60)}h ago` }
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width: '100%', textAlign: 'left', padding: 18, background: hovered ? 'rgba(93,202,165,0.04)' : 'var(--bg2)', border: `1px solid ${hovered ? 'rgba(93,202,165,0.35)' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all var(--transition)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar url={avatarUrl} name={name} size={28} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{name}</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{timeAgo(post.created_at)}</span>
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 12 }}>"{post.content}"</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {post.emotion_tag && <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--teal)', border: '1px solid rgba(93,202,165,0.2)' }}>{post.emotion_tag}</span>}
        <span style={{ fontSize: 12, marginLeft: 'auto', color: hovered ? 'var(--teal)' : 'var(--text-tertiary)', transition: 'color var(--transition)' }}>{hovered ? 'Start listening →' : 'Tap to listen'}</span>
      </div>
    </button>
  )
}

function PastChatsView({ chats, userId, onOpen, onDelete, onBack }) {
  const [confirmDelete, setConfirmDelete] = useState(null)
  const timeAgo = d => { const m = Math.floor((Date.now() - new Date(d)) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; if (m < 1440) return `${Math.floor(m / 60)}h ago`; return `${Math.floor(m / 1440)}d ago` }

  return (
    <div className="page" style={{ padding: '0 24px', justifyContent: 'flex-start' }}>
      <div style={{ position: 'relative', zIndex: 1, paddingTop: 52, marginBottom: 24 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 20, background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 6 }}>Your conversations</h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Every conversation here meant something.</p>
      </div>

      {chats.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-tertiary)' }}>
          <p style={{ fontSize: 32, marginBottom: 16 }}>◎</p>
          <p style={{ fontSize: 15 }}>No conversations yet.</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>When you connect with someone, it'll show up here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 48 }}>
          {chats.map(chat => {
            const isExp = chat.expresser_id === userId
            const isOngoing = chat.status === 'active'
            const preview = chat.posts?.content?.slice(0, 80) ?? ''
            const tag = chat.posts?.emotion_tag
            const isAnon = chat.posts?.is_anonymous
            const otherName = isAnon ? 'Anonymous' : (chat.otherProfile?.full_name?.split(' ')[0] ?? 'Someone')
            const otherAvatar = isAnon ? null : chat.otherProfile?.avatar_url

            return (
              <div key={chat.id} style={{ padding: 16, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <button onClick={() => onOpen(chat)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: isExp ? 'var(--accent)' : 'var(--teal)' }}>{isExp ? 'You expressed' : 'You listened'}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: isOngoing ? 'rgba(93,202,165,0.15)' : 'rgba(136,135,128,0.15)', color: isOngoing ? 'var(--teal)' : 'var(--text-tertiary)', border: `1px solid ${isOngoing ? 'rgba(93,202,165,0.3)' : 'var(--border)'}`, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {isOngoing ? 'Ongoing' : 'Ended'}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{timeAgo(chat.created_at)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Avatar url={otherAvatar} name={otherName} size={22} />
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{otherName}</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>"{preview}{preview.length === 80 ? '...' : ''}"</p>
                  {tag && <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, padding: '3px 8px', borderRadius: 8, background: 'var(--bg3)', color: isExp ? 'var(--accent)' : 'var(--teal)' }}>{tag}</span>}
                </button>
                <button onClick={() => setConfirmDelete(chat.id)} style={{ color: 'var(--text-tertiary)', fontSize: 20, cursor: 'pointer', flexShrink: 0, padding: 4, background: 'none', border: 'none', lineHeight: 1 }}>×</button>
              </div>
            )
          })}
        </div>
      )}

      {confirmDelete && (
        <Modal title="Delete this conversation?" body="This can't be undone. The messages will be gone permanently." primaryLabel="Yes, delete it" primaryAction={() => { onDelete(confirmDelete); setConfirmDelete(null) }} secondaryLabel="Keep it" secondaryAction={() => setConfirmDelete(null)} danger />
      )}
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
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {emoji}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Chat View ──────────────────────────────────────────────────
function ChatView({ sessionId, isExpresser, isSeedSession, isAISession, post, myProfile, currentUserId, preloadedOtherProfile, showEndTip, onEndTipDismiss, onBack, onEnd }) {
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
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const typingChannel = useRef(null)

  const isAIChat = isSeedSession || isAISession

  // Load the other person's profile correctly for both roles
  useEffect(() => {
    if (preloadedOtherProfile) { setOtherProfile(preloadedOtherProfile); return }
    if (isAIChat) return

    async function loadOtherProfile() {
      if (!isExpresser && post?.user_id) {
        // Listener sees expresser's profile — fetch by expresser's user_id from post
        const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', post.user_id).single()
        if (data) setOtherProfile(data)
      } else if (isExpresser) {
        // Expresser sees listener's profile — get listener_id from session first
        const { data: session } = await supabase.from('sessions').select('listener_id').eq('id', sessionId).single()
        if (session?.listener_id) {
          const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', session.listener_id).single()
          if (data) setOtherProfile(data)
        }
      }
    }
    loadOtherProfile()
  }, [post, isExpresser, isAIChat, sessionId, preloadedOtherProfile])

  // Load messages
  useEffect(() => {
    if (isSeedSession) {
      const pid = sessionId.replace('seed-', '')
      const msgs = seedChatStore[pid] || []
      setMessages(msgs)
      setHasInteracted(msgs.some(m => m.sender_id === currentUserId))
      setLoading(false)
      return
    }
    supabase.from('messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true })
      .then(({ data }) => {
        const msgs = data || []
        setMessages(msgs)
        setHasInteracted(msgs.some(m => m.sender_id === currentUserId))
        setLoading(false)
      })
  }, [sessionId])

  // Real-time
  useEffect(() => {
    if (isAIChat) return
    const ch = supabase.channel(`chat-${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${sessionId}` },
        (payload) => { if (payload.new.sender_id !== currentUserId) { setMessages(m => [...m, payload.new]); setOtherTyping(false) } })
      .subscribe()
    typingChannel.current = supabase.channel(`typing-${sessionId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => { if (payload.user_id !== currentUserId) { setOtherTyping(true); setTimeout(() => setOtherTyping(false), 2000) } })
      .subscribe()
    return () => { supabase.removeChannel(ch); if (typingChannel.current) supabase.removeChannel(typingChannel.current) }
  }, [sessionId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, otherTyping, aiThinking])

  function broadcastTyping() { typingChannel.current?.send({ type: 'broadcast', event: 'typing', payload: { user_id: currentUserId } }) }

  async function send() {
    if (!input.trim() || aiThinking) return
    const content = input.trim()
    setInput('')
    setHasInteracted(true)
    const myMsg = { id: `temp-${Date.now()}`, sender_id: currentUserId, content, created_at: new Date().toISOString() }
    const updated = [...messages, myMsg]
    setMessages(updated)

    if (isAIChat) {
      const pid = sessionId.replace('seed-', '')
      seedChatStore[pid] = updated
      setAiThinking(true)
      const history = updated.map(m => ({ role: m.sender_id === currentUserId ? 'user' : 'assistant', content: m.content }))
      const aiText = await getAIResponse(history, 'expresser', post?.content ?? '')
      setAiThinking(false)
      const aiMsg = { id: `ai-${Date.now()}`, sender_id: 'other', content: aiText, created_at: new Date().toISOString() }
      const withAI = [...updated, aiMsg]
      setMessages(withAI)
      seedChatStore[pid] = withAI
      return
    }

    const { error } = await supabase.from('messages').insert({ session_id: sessionId, sender_id: currentUserId, content })
    if (error) setMessages(m => m.filter(msg => msg.id !== myMsg.id))
    inputRef.current?.focus()
  }

  async function handleEndChat() {
    if (!isAIChat) await supabase.from('sessions').update({ status: 'closed' }).eq('id', sessionId)
    if (isExpresser) { setShowRating(true) }
    else if (hasInteracted) { setEnded(true) }
    else { onEnd?.() }
  }

  function insertEmoji(e) { setInput(i => i + e); inputRef.current?.focus() }

  // Resolve names — the key fix for "Someone"
  const otherName = (() => {
    if (isSeedSession) return post?.is_anonymous ? 'Anonymous' : (post?.profiles?.full_name?.split(' ')[0] ?? 'Someone')
    if (post?.is_anonymous) return 'Anonymous'
    // Use explicitly fetched otherProfile — not the join from the post object
    return otherProfile?.full_name?.split(' ')[0] ?? (isExpresser ? 'Listener' : 'Someone')
  })()

  const otherAvatar = (() => {
    if (isSeedSession) return post?.is_anonymous ? null : (post?.profiles?.avatar_url ?? null)
    if (post?.is_anonymous) return null
    return otherProfile?.avatar_url ?? null
  })()

  const myName = myProfile?.full_name?.split(' ')[0] ?? 'You'
  const myAvatar = myProfile?.avatar_url ?? null

  if (showRating) {
    return <RatingScreen onSubmit={async (rating) => { if (!isAIChat) await supabase.from('sessions').update({ rating }).eq('id', sessionId); onEnd?.() }} onSkip={() => onEnd?.()} />
  }

  if (ended) {
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 52, animation: 'float 3s ease-in-out infinite' }}>✨</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 7vw, 32px)', fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--teal)' }}>You showed up for {otherName}.</h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, maxWidth: 300 }}>Being truly present for someone is one of the most human things there is. Thank you for being that person today.</p>
        <button className="btn-primary" style={{ maxWidth: 300 }} onClick={onEnd}>Back to home</button>
      </div>
    )
  }

  return (
    <>
      {showEndTip && !isExpresser && <Modal title="You've started listening 💙" body="When your conversation feels complete, tap 'End' in the top right to close it with care." primaryLabel="Got it" primaryAction={onEndTipDismiss} />}
      {showEndConfirm && (
        <Modal
          title={isExpresser ? 'Ready to close this conversation?' : 'End this listening session?'}
          body={isExpresser ? 'You can always come back and express yourself again whenever you need to.' : hasInteracted ? "You've given your time and presence — that's a beautiful thing." : "It looks like you haven't responded yet. Are you sure you want to leave?"}
          primaryLabel={isExpresser ? 'Yes, close it' : hasInteracted ? 'End session' : 'Leave without chatting'}
          primaryAction={() => { setShowEndConfirm(false); handleEndChat() }}
          secondaryLabel="Keep talking"
          secondaryAction={() => setShowEndConfirm(false)}
        />
      )}

      <div className="page" style={{ justifyContent: 'flex-start', height: '100dvh' }}>
        <div style={{ padding: '52px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={onBack} style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <Avatar url={otherAvatar} name={otherName} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{otherName}</p>
            <p style={{ fontSize: 12, color: 'var(--teal)' }}>● {isExpresser ? 'your listener is here' : 'you are listening'}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {post?.emotion_tag && <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--teal)', border: '1px solid rgba(93,202,165,0.2)' }}>{post.emotion_tag}</span>}
            <button onClick={() => setShowEndConfirm(true)} style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'none' }}>End</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!isExpresser && (
            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8 }}>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>Be present, not a problem-solver. Let them feel heard first. 💙</p>
            </div>
          )}

          {loading && <div style={{ textAlign: 'center', padding: 20 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 1.2s infinite' }} /></div>}

          {messages.map(msg => {
            const isMine = msg.sender_id === currentUserId
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: 4 }}>
                {!isMine && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}><Avatar url={otherAvatar} name={otherName} size={22} /><span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{otherName}</span></div>}
                {isMine && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 2 }}><span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{myName}</span><Avatar url={myAvatar} name={myName} size={22} /></div>}
                <div style={{ maxWidth: '78%', padding: '12px 16px', borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMine ? 'var(--accent)' : 'var(--bg2)', border: isMine ? 'none' : '1px solid var(--border)', fontSize: 15, lineHeight: 1.6, color: isMine ? '#fff' : 'var(--text-secondary)' }}>
                  {msg.content}
                </div>
              </div>
            )
          })}

          {(otherTyping || aiThinking) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar url={otherAvatar} name={otherName} size={22} />
              <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-tertiary)', display: 'inline-block', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: '12px 16px 36px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0, position: 'relative' }}>
          {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}
          <button onClick={() => setShowEmoji(s => !s)} style={{ width: 40, height: 40, borderRadius: '50%', background: showEmoji ? 'var(--accent-dim)' : 'transparent', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 18 }}>🙂</button>
          <textarea ref={inputRef} value={input}
            onChange={e => { setInput(e.target.value); if (!isAIChat) broadcastTyping() }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={isExpresser ? 'Say what you need to say...' : 'Say something kind...'}
            rows={1} style={{ flex: 1, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 15, color: 'var(--text)', resize: 'none', lineHeight: 1.5, transition: 'border-color var(--transition)' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <button onClick={send} disabled={!input.trim() || aiThinking} style={{ width: 44, height: 44, borderRadius: '50%', background: input.trim() ? 'var(--accent)' : 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background var(--transition)', flexShrink: 0, cursor: input.trim() ? 'pointer' : 'default' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>
    </>
  )
}