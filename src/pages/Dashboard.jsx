import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getAIResponse } from '../lib/ai'

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 23 || h < 4)  return 'Still up? All '
  if (h >= 4  && h < 12) return 'Good mornin'
  if (h >= 12 && h < 16) return 'Good noon'
  if (h >= 16 && h < 18) return 'Good evening'
  if (h >= 18 && h < 20) return 'Hope your evening is going great!'
  return "Don't forget to sleep o"
}

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
  const title = filled === 3 ? "You're a Rockstar 💫" : filled === 2 ? "You're a Superstar 🌟" : "You're a Star ✨"
  const progress = count < 4 ? `${4 - count} more listen${4 - count === 1 ? '' : 's'} to reach Superstar`
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
    { id: 'seed-9', content: "I've worked on a project, but my boss took all the credit.", emotion_tag: 'angry', is_anonymous: false, created_at: new Date(Date.now() - 4 * 60000).toISOString(), profiles: { full_name: 'Santosh', avatar_url: null }, is_seed: true },
  { id: 'seed-1', content: "I've been really hard on myself lately. Like nothing I do is ever enough, no matter how hard I try.", emotion_tag: 'overwhelmed', is_anonymous: false, created_at: new Date(Date.now() - 4 * 60000).toISOString(), profiles: { full_name: 'Priya', avatar_url: null }, is_seed: true },
  { id: 'seed-2', content: "Had a panic attack at work today and had to pretend everything was fine. I'm exhausted from holding it together.", emotion_tag: 'anxious', is_anonymous: true, created_at: new Date(Date.now() - 9 * 60000).toISOString(), profiles: null, is_seed: true },
  { id: 'seed-3', content: "My relationship ended two weeks ago and I still reach for my phone to text them. I don't know how to stop.", emotion_tag: 'sad', is_anonymous: false, created_at: new Date(Date.now() - 14 * 60000).toISOString(), profiles: { full_name: 'Jordan', avatar_url: null }, is_seed: true },
  { id: 'seed-4', content: "I got the promotion I worked two years for and I feel... nothing. I thought I'd be happy. Is that normal?", emotion_tag: 'confused', is_anonymous: false, created_at: new Date(Date.now() - 22 * 60000).toISOString(), profiles: { full_name: 'Sam', avatar_url: null }, is_seed: true },
  { id: 'seed-5', content: "I've been cancelling plans with friends because I just don't have the energy. I miss who I used to be.", emotion_tag: 'numb', is_anonymous: false, created_at: new Date(Date.now() - 35 * 60000).toISOString(), profiles: { full_name: 'Marcus', avatar_url: null }, is_seed: true },
  { id: 'seed-6', content: "I snapped at someone I love today and I can't stop thinking about it. I hate when I'm like this.", emotion_tag: 'guilty', is_anonymous: false, created_at: new Date(Date.now() - 48 * 60000).toISOString(), profiles: { full_name: 'Aisha', avatar_url: null }, is_seed: true },
  { id: 'seed-7', content: "Just got back from my first solo trip and I feel so proud of myself. Six months ago I couldn't have done that.", emotion_tag: 'grateful', is_anonymous: false, created_at: new Date(Date.now() - 55 * 60000).toISOString(), profiles: { full_name: 'Lena', avatar_url: null }, is_seed: true },
  { id: 'seed-8', content: "I finally told my best friend how much they mean to me after years of being too scared. Feels amazing.", emotion_tag: 'happy', is_anonymous: false, created_at: new Date(Date.now() - 70 * 60000).toISOString(), profiles: { full_name: 'Carlos', avatar_url: null }, is_seed: true },
]

const seedChatStore = {}
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
  useEffect(() => { if (!user) return; loadProfile(); loadListenerCount(); fetchPastChats() }, [user])
  useEffect(() => { currentListenerSessionRef.current = currentListenerSession }, [currentListenerSession])

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
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*, posts(content, emotion_tag, is_anonymous, user_id, id)')
      .or(`expresser_id.eq.${user.id},listener_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    if (!sessions) { setPastChats([]); return }
    const enriched = await Promise.all(sessions.map(async (session) => {
      // AI seed sessions stored in DB: expresser_id = listener_id = user.id, is_ai = true
      // These show as "You listened" with AI as expresser
      const isAISeedDB = session.is_ai && session.expresser_id === user.id && session.listener_id === user.id
      if (isAISeedDB) {
        const seedPost = SEED_POSTS.find(p => session.posts?.content === p.content)
        return {
          ...session,
          is_seed: true,
          otherProfile: { full_name: seedPost?.profiles?.full_name ?? 'AI', avatar_url: null }
        }
      }
      const otherId = session.expresser_id === user.id ? session.listener_id : session.expresser_id
      let otherProfile = null
      if (otherId) {
        const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', otherId).single()
        otherProfile = data ?? null
      }
      return { ...session, otherProfile }
    }))
    setPastChats(enriched.filter(s => !s.deleted_by || !Array.isArray(s.deleted_by) || !s.deleted_by.includes(user.id)))
  }

  async function deleteChat(sessionId) {
    // For seed chats stored only in localStorage (no real DB session)
    if (String(sessionId).startsWith('seed-')) {
      const pid = String(sessionId).replace('seed-', '')
      try { localStorage.removeItem(`seed_msgs_${pid}`) } catch {}
      setPastChats(prev => prev.filter(c => c.id !== sessionId))
      return
    }
    const { data: session } = await supabase.from('sessions').select('deleted_by').eq('id', sessionId).single()
    const existing = Array.isArray(session?.deleted_by) ? session.deleted_by : []
    await supabase.from('sessions').update({ deleted_by: [...new Set([...existing, user.id])] }).eq('id', sessionId)
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

  useEffect(() => {
    if (!user) return
    const iv = setInterval(() => supabase.rpc('close_inactive_sessions'), 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [user])

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
  if (view === 'listener') return (
    <ListenerView user={user} myProfile={profile} todayListenerCount={todayListenerCount}
      onBack={(s, didInteract) => {
        if (s?.id && didInteract && s.status !== 'closed') { setPendingListenerSession(s); setShowResumeModal(true) }
        setView('home')
      }}
      onComplete={() => { fetchPastChats(); loadListenerCount() }} />
  )
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
        <Modal title="You have an ongoing conversation" body="It looks like you stepped away from a chat. Would you like to continue where you left off?"
          primaryLabel="Continue conversation" primaryAction={() => { setShowResumeModal(false); setSelectedChat(pendingListenerSession); setView('chat-detail') }}
          secondaryLabel="Leave it for now" secondaryAction={() => { setShowResumeModal(false); setPendingListenerSession(null) }} />
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

      {activeExpresserSessions.length > 1 && (
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 16, padding: '14px 18px', background: 'rgba(93,202,165,0.08)', border: '1px solid rgba(93,202,165,0.25)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--teal)' }}>💬 {activeExpresserSessions.length} people are here for you</p>
          <button onClick={() => setCurrentListenerSession(activeExpresserSessions[0])} style={{ fontSize: 13, color: 'var(--teal)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>View chats</button>
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s' }}>
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 6vw, 30px)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6, color: 'var(--text)' }}>How do you want to show up today?</h1>
          <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.55)' }}>You can switch roles at any time.</p>
        </div>
        <RoleCard role="Expresser" title="Yes, I want to share my feelings" description="Write what's on your mind - thoughts, feelings, anything." color="var(--accent)" hoverBorder="rgba(139,124,246,0.4)" hoverBg="var(--accent-glow)" onClick={() => setView('expresser')} />
        <RoleCard role="Listener" title="I want to be there for someone" description="Browse what people are sharing. Pick one and listen with care." color="var(--teal)" hoverBorder="rgba(93,202,165,0.4)" hoverBg="rgba(93,202,165,0.05)" onClick={() => setView('listener')} />
        <button onClick={() => { fetchPastChats(); setView('chats') }} style={{ width: '100%', textAlign: 'left', padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color var(--transition)' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>Your conversatio</p>
            <p style={{ fontSize: 13, color: 'rgba(240,239,232,0.5)' }}>{pastChats.length > 0 ? `${pastChats.length} past ${pastChats.length === 1 ? 'chat' : 'chats'}` : 'No conversations yet'}</p>
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
  const AI_WAIT_SECS = 15
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

  const TAGS = ['anxious', 'happy', 'overwhelmed', 'sad', 'angry', 'confused', 'numb', 'grateful', 'venting']

  if (rateLimited) {
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🌙</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--accent)' }}>You've shared a lot today.</h2>
        <p style={{ fontSize: 15, color: 'rgba(240,239,232,0.7)', lineHeight: 1.8, maxWidth: 300 }}>You've reached the limit of {DAILY_POST_LIMIT} posts for today. This isn't a punishment — it's a gentle reminder to rest. Your feelings will still be here tomorrow, and so will we.</p>
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
          <button onClick={onBrowseListeners} style={{ padding: '13px 20px', borderRadius: 'var(--radius)', background: 'transparent', border: '1px solid var(--border)', color: 'rgba(240,239,232,0.6)', fontSize: 14, cursor: 'pointer', textAlign: 'center', transition: 'border-color var(--transition)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(51,137,199,0.5)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
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

function ListenerView({ user, myProfile, todayListenerCount, onBack, onComplete }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState(null)
  const [visible, setVisible] = useState(false)
  const [showEndTip, setShowEndTip] = useState(false)
  const [showBurnoutNudge, setShowBurnoutNudge] = useState(false)
  const [showBurnoutBlock, setShowBurnoutBlock] = useState(false)

  const DAILY_LISTEN_NUDGE = 3
  const DAILY_LISTEN_LIMIT = 10

  useEffect(() => { setTimeout(() => setVisible(true), 80) }, [])

  useEffect(() => {
    if (todayListenerCount >= DAILY_LISTEN_LIMIT) { setShowBurnoutBlock(true); return }
    if (todayListenerCount >= DAILY_LISTEN_NUDGE) setShowBurnoutNudge(true)
    fetchPosts()
    const ch = supabase.channel('open-posts').on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts).subscribe()
    return () => supabase.removeChannel(ch)
  }, [todayListenerCount])

  async function fetchPosts() {
    const { data } = await supabase.from('posts').select('*, profiles(full_name, avatar_url)').eq('status', 'open').neq('user_id', user.id).order('created_at', { ascending: false })
    setPosts([...(data || []), ...SEED_POSTS]); setLoading(false)
  }

  async function handleSelectPost(post) {
    if (todayListenerCount >= DAILY_LISTEN_LIMIT) { setShowBurnoutBlock(true); return }
    if (post.is_seed) {
      // Check if we already have a DB session for this seed post
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('*')
        .eq('listener_id', user.id)
        .eq('expresser_id', user.id)
        .eq('is_ai', true)
        .order('created_at', { ascending: false })
        .limit(20)
      // Match by post content since seed posts don't have real post_ids
      const matched = existingSession?.find(s => {
        const storedKey = `seed_post_id_${s.id}`
        return localStorage.getItem(storedKey) === post.id
      })
      if (matched) {
        setActiveSession({ ...matched, is_seed: true, post })
        setShowEndTip(false); return
      }
      // New seed chat — use in-memory + localStorage, create DB session on first message
      if (!seedChatStore[post.id]) {
        seedChatStore[post.id] = [{ id: `seed-init-${post.id}`, sender_id: 'other', content: post.content, created_at: new Date().toISOString() }]
      }
      setActiveSession({ id: `seed-${post.id}`, is_seed: true, post, seedPostId: post.id })
      setShowEndTip(true); return
    }
    const { data: expresserProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', post.user_id).single()
    const enrichedPost = { ...post, profiles: expresserProfile ?? post.profiles }
    const { data: existing } = await supabase.from('sessions').select('*').eq('post_id', post.id).eq('listener_id', user.id).single()
    if (existing) { setActiveSession({ ...existing, post: enrichedPost }); setShowEndTip(false); return }
    setActiveSession({ id: null, post: enrichedPost, isPending: true }); setShowEndTip(true)
  }

  if (showBurnoutBlock) {
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🌿</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--teal)' }}>You've given a lot today.</h2>
        <p style={{ fontSize: 15, color: 'rgba(240,239,232,0.7)', lineHeight: 1.8, maxWidth: 300 }}>You've listened to {DAILY_LISTEN_LIMIT} people today — that's genuinely remarkable. Rest now. Come back tomorrow.</p>
        <button className="btn-ghost" style={{ maxWidth: 280 }} onClick={() => onBack(null)}>Back to home</button>
      </div>
    )
  }

  if (activeSession) {
    return <ChatView
      key={activeSession.id ?? `seed-${activeSession.seedPostId}`}
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
      onEnd={() => { setActiveSession(null); onComplete?.(); fetchPosts() }}
    />
  }

  return (
    <div className="page" style={{ padding: '0 24px', justifyContent: 'flex-start' }}>
      <div className="orb" style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(93,202,165,0.08) 0%, transparent 70%)', top: '-40px', right: '-60px' }} />
      {showBurnoutNudge && (
        <Modal title="You've been showing up a lot today 💙" body={`You've listened to ${todayListenerCount} people today. How are you doing? It's okay to rest.`}
          primaryLabel="I'm okay, keep going" primaryAction={() => setShowBurnoutNudge(false)}
          secondaryLabel="I'll rest for now" secondaryAction={() => onBack(null)} />
      )}
      <div style={{ position: 'relative', zIndex: 1, paddingTop: 52, marginBottom: 24 }}>
        <button onClick={() => onBack(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(240,239,232,0.5)', fontSize: 14, marginBottom: 20, background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 6, color: 'var(--text)' }}>Someone needs a listener.</h2>
        <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.5)' }}>Choose one person to be present with. · {DAILY_LISTEN_LIMIT - todayListenerCount} sessions remaining today</p>
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 48, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 0.4s ease, transform 0.4s ease' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block', animation: 'pulse 1.2s infinite' }} /></div>
          : posts.map((post, idx) => <PostCard key={post.id} post={post} delay={idx * 0.06} onClick={() => handleSelectPost(post)} />)}
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
  function dateBucket(isoStr) {
    const diffDays = Math.floor((new Date() - new Date(isoStr)) / 86400000)
    if (diffDays === 0) return 'Today'; if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return 'This week'; if (diffDays < 30) return 'This month'; return 'Earlier'
  }
  const BUCKET_ORDER = ['Today', 'Yesterday', 'This week', 'This month', 'Earlier']
  const myExpressions = chats.filter(c => c.expresser_id === userId && !c.is_seed)
  const myListening = chats.filter(c => c.listener_id === userId && (c.expresser_id !== userId || c.is_seed))
  const expressionGroups = Object.values(myExpressions.reduce((acc, chat) => {
    const key = chat.posts?.id ?? chat.id
    if (!acc[key]) acc[key] = { post: chat.posts, sessions: [], date: chat.created_at, id: key }
    acc[key].sessions.push(chat)
    if (new Date(chat.created_at) > new Date(acc[key].date)) acc[key].date = chat.created_at
    return acc
  }, {}))
  const rows = [
    ...expressionGroups.map(g => ({ type: 'expression', date: g.date, data: g })),
    ...myListening.map(c => ({ type: 'listening', date: c.created_at, data: c })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))
  const buckets = rows.reduce((acc, row) => {
    const b = dateBucket(row.date); if (!acc[b]) acc[b] = []; acc[b].push(row); return acc
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
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(240,239,232,0.35)', marginBottom: 10 }}>{bucket}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {buckets[bucket].map(row => {
                  if (row.type === 'expression') {
                    const { post, sessions, id } = row.data
                    const hasActive = sessions.some(s => s.status === 'active')
                    const preview = post?.content?.slice(0, 100) ?? ''
                    return (
                      <div key={`exp-${id}`} style={{ padding: '14px 16px', background: 'var(--bg2)', border: `1px solid ${hasActive ? 'rgba(93,202,165,0.25)' : 'var(--border)'}`, borderRadius: 'var(--radius)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)' }}>You expressed</span>
                            {hasActive && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'rgba(93,202,165,0.15)', color: 'var(--teal)', fontWeight: 600, textTransform: 'uppercase' }}>Live</span>}
                          </div>
                          {post?.emotion_tag && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--bg3)', color: 'rgba(240,239,232,0.5)' }}>{post.emotion_tag}</span>}
                        </div>
                        <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.75)', lineHeight: 1.6, marginBottom: 10 }}>"{preview}{preview.length === 100 ? '...' : ''}"</p>
                        {sessions.length === 1 ? (
                          <button onClick={() => onOpen(sessions[0])} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <span style={{ fontSize: 12, color: 'rgba(240,239,232,0.5)' }}>💬 1 listener ·</span>
                            <span style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'underline' }}>Open chat</span>
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: sessions[0].status === 'active' ? 'rgba(93,202,165,0.15)' : 'rgba(136,135,128,0.15)', color: sessions[0].status === 'active' ? 'var(--teal)' : 'rgba(240,239,232,0.4)', fontWeight: 600, textTransform: 'uppercase' }}>{sessions[0].status === 'active' ? 'Ongoing' : 'Ended'}</span>
                            <button onClick={e => { e.stopPropagation(); setConfirmDelete(sessions[0].id) }} style={{ marginLeft: 'auto', color: 'rgba(240,239,232,0.25)', fontSize: 16, cursor: 'pointer', background: 'none', border: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--coral)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,239,232,0.25)'}>×</button>
                          </button>
                        ) : (
                          <div>
                            <p style={{ fontSize: 12, color: 'rgba(240,239,232,0.5)', marginBottom: 6 }}>💬 {sessions.length} listeners responded</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {sessions.map((session, idx) => {
                                const oName = session.otherProfile?.full_name?.split(' ')[0] ?? `Listener ${idx + 1}`
                                return (
                                  <div key={session.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg3)', borderRadius: 8 }}>
                                    <Avatar url={session.otherProfile?.avatar_url} name={oName} size={20} />
                                    <span style={{ fontSize: 13, color: 'rgba(240,239,232,0.7)', flex: 1 }}>{oName}</span>
                                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: session.status === 'active' ? 'rgba(93,202,165,0.15)' : 'rgba(136,135,128,0.15)', color: session.status === 'active' ? 'var(--teal)' : 'rgba(240,239,232,0.4)', fontWeight: 600, textTransform: 'uppercase' }}>{session.status === 'active' ? 'Live' : 'Ended'}</span>
                                    <button onClick={() => onOpen(session)} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Open</button>
                                    <button onClick={() => setConfirmDelete(session.id)} style={{ color: 'rgba(240,239,232,0.25)', fontSize: 14, cursor: 'pointer', background: 'none', border: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--coral)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,239,232,0.25)'}>×</button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }
                  const chat = row.data
                  const isOngoing = chat.status === 'active'
                  const preview = chat.posts?.content?.slice(0, 100) ?? ''
                  const isAnon = chat.posts?.is_anonymous
                  const otherName = isAnon ? 'Anonymous' : (chat.otherProfile?.full_name?.split(' ')[0] ?? 'Someone')
                  const otherAvatar = isAnon ? null : chat.otherProfile?.avatar_url
                  return (
                    <div key={`listen-${chat.id}`} style={{ padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <button onClick={() => onOpen(chat)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Avatar url={otherAvatar} name={otherName} size={24} />
                          <span style={{ fontSize: 13, color: 'rgba(240,239,232,0.8)', fontWeight: 500 }}>{otherName}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--teal)' }}>You listened</span>
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 600, background: isOngoing ? 'rgba(93,202,165,0.15)' : 'rgba(136,135,128,0.15)', color: isOngoing ? 'var(--teal)' : 'rgba(240,239,232,0.4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{isOngoing ? 'Live' : 'Ended'}</span>
                        </div>
                        <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.7)', lineHeight: 1.6 }}>"{preview}{preview.length === 100 ? '...' : ''}"</p>
                        {chat.posts?.emotion_tag && <span style={{ display: 'inline-block', marginTop: 6, fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--bg3)', color: 'var(--teal)' }}>{chat.posts.emotion_tag}</span>}
                      </button>
                      <button onClick={() => setConfirmDelete(chat.id)} style={{ color: 'rgba(240,239,232,0.25)', fontSize: 20, cursor: 'pointer', flexShrink: 0, padding: 4, background: 'none', border: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--coral)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,239,232,0.25)'}>×</button>
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
            <button key={emoji} onClick={() => { onSelect(emoji); onClose() }} style={{ fontSize: 20, padding: 4, borderRadius: 6, background: 'transparent', cursor: 'pointer', border: 'none' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{emoji}</button>
          ))}
        </div>
      ))}
    </div>
  )
}

function ChatView({
  sessionId: initialSessionId,
  isExpresser,
  isSeedSession,
  isAISession,
  post,
  myProfile,
  currentUserId,
  preloadedOtherProfile,
  onBack,
  onEnd
}) {
  const [sessionId, setSessionId] = useState(initialSessionId)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [aiThinking, setAiThinking] = useState(false)
  const [sessionClosed, setSessionClosed] = useState(false)

  const bottomRef = useRef(null)
  const seenIds = useRef(new Set())

  const isAIChat = isSeedSession || isAISession

  // ✅ Normalize ONLY for UI (never DB)
  function normalizeMessage(m) {
    const isAI = !!m.is_ai_msg
    return {
      ...m,
      is_ai_msg: isAI
    }
  }

  // ✅ Load messages
  useEffect(() => {
    if (!sessionId) return

    async function loadMessages() {
      setLoading(true)

      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      const msgs = (data || []).map(normalizeMessage)

      msgs.forEach(m => seenIds.current.add(m.id))

      setMessages(msgs)
      setLoading(false)
    }

    loadMessages()
  }, [sessionId])

  // ✅ Scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiThinking])

  // ✅ Send message
  async function send() {
    if (!input.trim() || aiThinking) return

    const content = input.trim()
    setInput('')

    const tempId = `temp-${Date.now()}`

    const myMsg = {
      id: tempId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      is_ai_msg: false
    }

    setMessages(m => [...m, myMsg])

    // ✅ Save user msg
    const { data: savedUserMsg } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        sender_id: currentUserId,
        content,
        is_ai_msg: false
      })
      .select()
      .single()

    if (savedUserMsg) {
      setMessages(m =>
        m.map(msg => (msg.id === tempId ? savedUserMsg : msg))
      )
    }

    // ✅ AI response
    if (isAIChat) {
      setAiThinking(true)

      const history = [...messages, myMsg].map(m => ({
        role: m.is_ai_msg ? 'assistant' : 'user',
        content: m.content
      }))

      const aiText = await getAIResponse(
        history,
        isSeedSession ? 'expresser' : 'listener',
        post?.content ?? ''
      )

      setAiThinking(false)

      if (!aiText) return

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender_id: currentUserId, // ✅ ALWAYS USER ID
        content: aiText,
        is_ai_msg: true,
        created_at: new Date().toISOString()
      }

      setMessages(m => [...m, aiMsg])

      // ✅ Save AI msg (IMPORTANT FIX)
      await supabase.from('messages').insert({
        session_id: sessionId,
        sender_id: currentUserId, // ✅ NOT "other"
        content: aiText,
        is_ai_msg: true
      })
    }
  }

  // ✅ UI helpers
  const myName = myProfile?.full_name?.split(' ')[0] ?? 'You'

  function isMine(msg) {
    return !msg.is_ai_msg && msg.sender_id === currentUserId
  }

  // ✅ Render
  return (
    <div className="page" style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => onBack?.()}>{'< Back'}</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {loading && <p>Loading...</p>}

       {messages.map(msg => {
          const isMine = msg.sender_id === currentUserId && !msg.is_ai_msg
          const isAI = msg.is_ai_msg === true

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isMine ? 'flex-end' : 'flex-start',
                marginBottom: 10
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: 12,
                  borderRadius: 16,
                  background: isMine ? '#6c5ce7' : '#2d3436',
                  color: '#fff'
                }}
              >
                {msg.content}
              </div>
            </div>
          )
        })}

        {aiThinking && <p>AI is typing...</p>}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!sessionClosed && (
        <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type..."
            style={{ flex: 1, padding: 10 }}
          />
          <button onClick={send}>Send</button>
        </div>
      )}
    </div>
  )
}

function ListenerFAB({ sessions, currentSessionId, onSwitch }) {
  const [open, setOpen] = useState(false)
  const activeSessions = sessions.filter(s => s.status !== 'closed')
  if (activeSessions.length <= 1) return null
  return createPortal(
    <div style={{ position: 'fixed', bottom: 88, right: 20, zIndex: 9998, pointerEvents: 'all' }}>
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
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: isCurrent ? 'var(--accent)' : 'var(--bg3)', border: `2px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: isCurrent ? '#fff' : 'rgba(240,239,232,0.5)', flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <p style={{ fontSize: 13, color: isCurrent ? 'var(--accent)' : 'rgba(240,239,232,0.85)', fontWeight: isCurrent ? 600 : 400, margin: 0 }}>{name}</p>
                  {isCurrent && <p style={{ fontSize: 10, color: 'var(--teal)', margin: 0 }}>Current chat</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}
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
