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
  { id: '00000000-0000-0000-0000-000000000011', content: "I am Sake and i m not feeling good.", emotion_tag: 'sad', is_anonymous: false, created_at: new Date(Date.now()).toISOString(), profiles: { full_name: 'Sake', avatar_url: null }, is_seed: true },

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
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('*, posts(content, emotion_tag, is_anonymous, user_id, id)')
    .or(`expresser_id.eq.${user.id},listener_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error || !sessions) { 
    console.error("Error fetching chats:", error);
    return; 
  }

  const enriched = await Promise.all(
    sessions.map(async (session) => {
      // 1. Handle AI Sessions (Matches by Expresser ID)
      if (session.expresser_id === AI_EXPRESSER_ID) {
        // Match the session's post_id to your SEED_POSTS array
        const seed = SEED_POSTS.find(s => s.id === session.post_id || s.id === session.posts?.id);
        
        return { 
          ...session, 
          otherProfile: { 
            full_name: seed?.profiles?.full_name ?? 'AI Expresser', 
            avatar_url: seed?.profiles?.avatar_url ?? null 
          }, 
          is_ai_seed: true 
        }
      }

      // 2. Handle Human Sessions
      const otherId = session.expresser_id === user.id ? session.listener_id : session.expresser_id
      let otherProfile = null
      
      if (otherId && otherId !== AI_EXPRESSER_ID) {
        const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', otherId).single()
        otherProfile = data ?? null
      }
      return { ...session, otherProfile }
    })
  )

  // Filter out deleted chats and set state
  setPastChats(enriched.filter(s =>
    !s.deleted_by || !Array.isArray(s.deleted_by) || !s.deleted_by.includes(user.id)
  ));
}

  // Load seed chats from localStorage and add to pastChats
  function loadSeedChats() {
  const seedEntries = []
  for (const post of SEED_POSTS) {
    const stored = localStorage.getItem(`seed_msgs_${user.id}_${post.id}`)
    if (!stored) continue

    try {
      const msgs = JSON.parse(stored)
      // Only include if the user actually replied
      if (!msgs || msgs.length === 0) continue 

      const isEnded = localStorage.getItem(`seed_msgs_${user.id}_${post.id}_ended`) === 'true'
      
      seedEntries.push({
        id: `seed-${post.id}`, // Keeping the prefix for local storage tracking
        is_seed: true,
        is_ai: true,
        status: isEnded ? 'closed' : 'active',
        expresser_id: 'ai',
        listener_id: user.id,
        created_at: msgs[msgs.length - 1]?.created_at ?? new Date().toISOString(),
        // We nest 'post' inside 'posts' to match your database schema structure
        posts: { 
          ...post,
          id: post.id 
        }, 
        // Explicitly pull the name from the seed profile to avoid the "AI" label
        otherProfile: { 
          full_name: post.profiles?.full_name ?? (post.is_anonymous ? 'Anonymous' : 'Someone'), 
          avatar_url: post.profiles?.avatar_url ?? null 
        }
      })
    } catch (err) {
      console.error("Error parsing seed chat:", err)
    }
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
 if (view === 'listener') {
  // 1. Create a list of IDs the user has already talked to
  const interactedPostIds = new Set(pastChats.map(chat => chat.post_id || chat.posts?.id));
  
  // 2. This is the NEW variable: It filters your SEED_POSTS array
  const availableSeeds = SEED_POSTS.filter(seed => !interactedPostIds.has(seed.id));

  return (
    <ListenerView 
      user={user} 
      myProfile={profile} 
      todayListenerCount={todayListenerCount}
      seedPosts={availableSeeds} // 3. Pass the new variable here
      onBack={(s, didInteract) => {
        if (s?.id && didInteract && s.status !== 'closed') {
          setPendingListenerSession(s)
          setShowResumeModal(true)
        }
        setView('home')
      }}
      onComplete={() => { fetchPastChats(); loadListenerCount() }} 
    />
  );
}
  
 
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
// 1. Added seedPosts to the props here
function ListenerView({ user, myProfile, todayListenerCount, seedPosts, onBack, onComplete }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState(null)
  const [visible, setVisible] = useState(false)
  const [showEndTip, setShowEndTip] = useState(false)
  const [showBurnoutNudge, setShowBurnoutNudge] = useState(false)
  const [showBurnoutBlock, setShowBurnoutBlock] = useState(false)
  
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

    // 2. Fetch the posts from the database
    const { data: postsData } = await supabase
    .from('posts')
    .select('*, profiles(full_name, avatar_url)')
    .eq('status', 'open')
    .neq('user_id', user.id)
    .order('created_at', { descending: false })
    
    // CHANGE HERE: Use 'seedPosts' from props instead of the global SEED_POSTS
    // This ensures "Sake" is included and correctly filtered.
    setPosts([...(postsData || []), ...(seedPosts || [])])
  setLoading(false)
  }

 async function handleSelectPost(post) {
  console.log("Post Clicked:", post.id, "Is Seed?", post.is_seed);

  if (todayListenerCount >= DAILY_LISTEN_LIMIT) { 
    setShowBurnoutBlock(true); 
    return; 
  }

  if (post.is_seed) {
    // 1. Try to find if a session already exists in DB
    const { data: existingSeed } = await supabase
      .from('sessions')
      .select('*')
      .eq('post_id', post.id)
      .eq('listener_id', user.id)
      .maybeSingle();

    if (existingSeed) {
      setActiveSession({ ...existingSeed, is_seed: true, post });
      setShowEndTip(true);
      return;
    }

    // 2. Try to create a session in DB
    const { data: newSession, error: createError } = await supabase
      .from('sessions')
      .insert({
        post_id: post.id,
        expresser_id: '00000000-0000-0000-0000-000000000001', 
        listener_id: user.id,
        status: 'active'
      })
      .select()
      .single();

    // 3. If DB complains (Error 23503 or 409), we fallback to a LOCAL session
    // This stops the "Failed to load resource" lockup.
    if (createError) {
      console.warn("Using local fallback for AI session due to:", createError.message);
      
      // We manually create the session object so ChatView can open
      setActiveSession({ 
        id: `seed-session-${post.id}`, // Temporary unique ID
        post_id: post.id,
        listener_id: user.id,
        is_seed: true, 
        post 
      });
      setShowEndTip(true);
      return;
    }

    if (newSession) {
      setActiveSession({ ...newSession, is_seed: true, post });
      setShowEndTip(true);
    }
    return;
  }

  // --- Standard Human Post Logic ---
  const { data: existing } = await supabase.from('sessions')
    .select('*').eq('post_id', post.id).eq('listener_id', user.id).maybeSingle();

  if (existing) {
    setActiveSession({ ...existing, post });
    return;
  }

  setActiveSession({ id: null, post, isPending: true });
  setShowEndTip(true);
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

      <div style={{ position: 'relative', zIndex: 1, paddingTop: 52, marginBottom: 24 }}>
        <button onClick={() => onBack(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(240,239,232,0.5)', fontSize: 14, marginBottom: 20, background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 6, color: 'var(--text)' }}>Someone needs a listener.</h2>
        <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.5)' }}>Choose one person to be present with. · {DAILY_LISTEN_LIMIT - todayListenerCount} sessions remaining</p>
      </div>

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
  const [hovered, setHovered] = useState(false);

  // Instead of searching SEED_POSTS, use the 'post' object directly.
  // It already has is_seed, is_anonymous, and profiles data.
  const name = post.is_anonymous 
    ? 'Anonymous' 
    : (post.profiles?.full_name?.split(' ')[0] ?? 'Someone');

  const avatarUrl = post.is_anonymous ? null : post.profiles?.avatar_url;

  const timeAgo = d => { 
    if(!d) return 'just now';
    const m = Math.floor((Date.now() - new Date(d)) / 60000); 
    if (m < 1) return 'just now'; 
    if (m < 60) return `${m} min ago`; 
    return `${Math.floor(m / 60)}h ago`; 
  };

  return (
    <button 
      onClick={(e) => {
        e.stopPropagation(); // Safety to ensure the button click triggers
        onClick();
      }} 
      onMouseEnter={() => setHovered(true)} 
      onMouseLeave={() => setHovered(false)}
      style={{ 
        width: '100%', textAlign: 'left', padding: 18, 
        background: hovered ? 'rgba(93,202,165,0.04)' : 'var(--bg2)', 
        border: `1px solid ${hovered ? 'rgba(93,202,165,0.35)' : 'var(--border)'}`, 
        borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all var(--transition)',
        display: 'block' // Ensures the button takes up the full width/height for clicking
      }}
    >
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
  );
}

function PastChatsView({ chats, userId, onOpen, onDelete, onBack, SEED_POSTS = [] }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  function dateBucket(isoStr) {
    const d = new Date(isoStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return 'This week';
    return 'Earlier';
  }

  // 1. Separate roles + Handle Seed Post Sessions
  const myExpressions = chats.filter(c => c.expresser_id === userId);
  const myListening = chats.filter(c => c.listener_id === userId);

  // 2. Group expressions (Restores the Multi-Listener FAB logic)
  const expressionGroups = Object.values(
    myExpressions.reduce((acc, chat) => {
      const key = chat.post_id || chat.id;
      if (!acc[key]) acc[key] = { post: chat.posts, sessions: [], date: chat.created_at, id: key };
      acc[key].sessions.push(chat);
      if (new Date(chat.created_at) > new Date(acc[key].date)) acc[key].date = chat.created_at;
      return acc;
    }, {})
  );

  const rows = [
    ...expressionGroups.map(g => ({ type: 'expression', date: g.date, data: g })),
    ...myListening.map(c => ({ type: 'listening', date: c.created_at, data: c })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const buckets = rows.reduce((acc, row) => {
    const b = dateBucket(row.date);
    if (!acc[b]) acc[b] = [];
    acc[b].push(row);
    return acc;
  }, {});

  return (
    <div className="past-chats-container" style={{ padding: '24px', color: 'var(--text)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <button onClick={onBack} className="back-btn">←</button>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Conversations</h2>
      </div>

      {Object.keys(buckets).length === 0 ? (
        <div style={{ opacity: 0.5, textAlign: 'center', marginTop: 40 }}>No conversations yet.</div>
      ) : (
        ['Today', 'Yesterday', 'This week', 'Earlier'].map(b => buckets[b] && (
          <div key={b} style={{ marginBottom: 32 }}>
            <h4 style={{ fontSize: 12, textTransform: 'uppercase', opacity: 0.4, marginBottom: 16 }}>{b}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {buckets[b].map((row, i) => {
                const isExp = row.type === 'expression';
                const item = row.data;

                // Logic to identify Seed Post details for the "Listening" view
                let seedContent = null;
if (!isExp && (!item.posts || item.expresser_id === '00000000-0000-0000-0000-000000000001')) {
  seedContent = SEED_POSTS.find(s => s.id === item.post_id);
                }

                return (
                  <div key={i} className="chat-card" style={{
                    background: 'var(--bg2)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 11, color: isExp ? 'var(--accent)' : 'var(--teal)', fontWeight: 600 }}>
                        {isExp ? 'YOUR EXPRESSION' : 'YOU LISTENED'}
                      </span>
                      <button onClick={() => setConfirmDelete(isExp ? item.id : item.id)} style={{ background: 'none', border: 'none', color: 'red', opacity: 0.3 }}>Delete</button>
                    </div>

                    <p style={{ margin: '0 0 16px 0', fontSize: 14, opacity: 0.8 }}>
                      {isExp ? (item.post?.content || "No content") : (item.posts?.content || seedContent?.content || "Seed conversation")}
                    </p>

                    {/* LISTENER AVATARS / SESSIONS */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {isExp ? item.sessions.map(s => (
                        <div key={s.id} onClick={() => onOpen(s)} style={{ cursor: 'pointer', position: 'relative' }}>
                          <Avatar url={s.otherProfile?.avatar_url} size={32} />
                          {s.status === 'active' && <div className="status-indicator" />}
                        </div>
                      )) : (
                        <div onClick={() => onOpen(item)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar url={seedContent ? null : item.otherProfile?.avatar_url} name={seedContent ? "AI" : item.otherProfile?.full_name} size={32} />
                          <span style={{ fontSize: 12 }}>{seedContent ? "AI Mentor" : item.otherProfile?.full_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
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
  const TYPING_REVEAL_MS = 3000

  useEffect(() => { setSessionId(initialSessionId) }, [initialSessionId])

  // 1. Profile Loading
  useEffect(() => {
    if (preloadedOtherProfile) { setOtherProfile(preloadedOtherProfile); return }
    if (isAIChat) return
    async function load() {
      if (!isExpresser && post?.user_id) {
        const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', post.user_id).single()
        if (data) setOtherProfile(data)
      } else if (isExpresser && sessionId) {
        const { data: s } = await supabase.from('sessions').select('listener_id').eq('id', sessionId).single()
        if (s?.listener_id) { 
          const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', s.listener_id).single()
          if (data) setOtherProfile(data) 
        }
      }
    }
    load()
  }, [post, isExpresser, isAIChat, sessionId])

  // 2. Message Loading
  useEffect(() => {
    seenIds.current = new Set()
    async function loadMessages() {
      setLoading(true)
      if (sessionId && !String(sessionId).startsWith('seed-')) {
        const { data: s } = await supabase.from('sessions').select('status').eq('id', sessionId).single()
        if (s?.status === 'closed') setSessionClosed(true)

        const { data } = await supabase.from('messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true })
        const msgs = data || []
        msgs.forEach(m => seenIds.current.add(m.id))
        if (msgs.some(m => m.content?.startsWith('__system__:'))) setSessionClosed(true)
        setMessages(msgs)
        setHasInteracted(msgs.some(m => m.sender_id === currentUserId && !m.is_ai_msg))
      } else {
        const openingMsg = { id: 'init', sender_id: 'other', content: post?.content ?? '', created_at: new Date().toISOString() }
        setMessages([openingMsg])
      }
      setLoading(false)
    }
    loadMessages()
  }, [sessionId])

  // 3. AI Greeting Logic (Fixed to prevent double replies on resume)
  useEffect(() => {
    if (!isAISession || isSeedSession || loading || !post?.content || !sessionId) return
    const hasAIReply = messages.some(m => m.is_ai_msg || m.id.startsWith('ai-'))
    const hasUserReply = messages.some(m => m.sender_id === currentUserId)
    
    if (hasAIReply || hasUserReply || messages.length > 1) return

    async function aiGreet() {
      setAiThinking(true)
      const aiText = await getAIResponse([{ role: 'user', content: post.content }], 'listener', post.content)
      setAiThinking(false)
      if (!aiText) return
      
      setOtherTyping(true)
      await new Promise(r => setTimeout(r, 2000))
      setOtherTyping(false)

      const aiMsg = { id: `ai-${Date.now()}`, sender_id: 'other', content: aiText, is_ai_msg: true, created_at: new Date().toISOString() }
      setMessages(prev => [...prev, aiMsg])
      await supabase.from('messages').insert({ session_id: sessionId, sender_id: currentUserId, content: aiText, is_ai_msg: true })
    }
    aiGreet()
  }, [isAISession, loading, sessionId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, otherTyping, aiThinking])

  // 4. Send Function
  // REPLACE your current send() function with this one:
async function send() {
  if (!input.trim() || aiThinking) return
  const content = input.trim(); setInput(''); setHasInteracted(true)
  const tempId = `temp-${Date.now()}`
  const myMsg = { id: tempId, sender_id: currentUserId, content, created_at: new Date().toISOString() }
  
  setMessages(prev => [...prev, myMsg])

  let activeId = sessionId

  // Logic to convert local seed sessions to real DB sessions on first message
  if (!activeId || String(activeId).startsWith('seed-')) {
    const { data: newSession } = await supabase.from('sessions').insert({
      post_id: post.id,
      expresser_id: isSeedSession ? currentUserId : post.user_id,
      listener_id: isSeedSession ? '00000000-0000-0000-0000-000000000001' : currentUserId,
      status: 'active',
      is_ai: isAIChat // Use is_ai to match your schema
    }).select().single()
    
    if (newSession) {
      activeId = newSession.id
      setSessionId(activeId)
    }
  }

  if (isAIChat) {
    setAiThinking(true)
    const history = [...messages, myMsg].map(m => ({ 
      role: m.sender_id === currentUserId ? 'user' : 'assistant', 
      content: m.content 
    }))
    const aiText = await getAIResponse(history, isSeedSession ? 'expresser' : 'listener', post?.content ?? '')
    setAiThinking(false)
    
    if (aiText) {
      setOtherTyping(true); await new Promise(r => setTimeout(r, 1500)); setOtherTyping(false)
      const aiMsg = { id: `ai-${Date.now()}`, sender_id: 'other', content: aiText, is_ai_msg: true, created_at: new Date().toISOString() }
      setMessages(prev => [...prev, aiMsg])
      
      await supabase.from('messages').insert([
        { session_id: activeId, sender_id: currentUserId, content },
        { session_id: activeId, sender_id: '00000000-0000-0000-0000-000000000001', content: aiText, is_ai_msg: true }
      ])
    }
  } else {
    await supabase.from('messages').insert({ session_id: activeId, sender_id: currentUserId, content })
  }
}

  // 5. End Chat Logic
  async function handleEndChat() {
    // 1. Update Database immediately
    if (sessionId && !String(sessionId).startsWith('seed-')) {
      await supabase.from('sessions').update({ status: 'closed' }).eq('id', sessionId)
      
      const sysMsg = isExpresser 
        ? '__system__:The expresser has closed this conversation.' 
        : '__system__:Your listener has ended this conversation.'
      
      await supabase.from('messages').insert({ 
        session_id: sessionId, 
        sender_id: currentUserId, 
        content: sysMsg 
      })
    }

    // 2. Update Local UI States
    setSessionClosed(true)
    
    if (isExpresser) {
      setShowRating(true) 
    } else if (hasInteracted) {
      setEnded(true)
    } else {
      onEnd?.() // Go back if no interaction happened
    }
  }

  const otherName = isSeedSession ? (post?.profiles?.full_name?.split(' ')[0] ?? 'Someone') : (post?.is_anonymous ? 'Anonymous' : (otherProfile?.full_name?.split(' ')[0] ?? (isExpresser ? 'Listener' : 'Someone')))
  const otherAvatar = post?.is_anonymous ? null : (otherProfile?.avatar_url ?? post?.profiles?.avatar_url)

  if (showRating) return <RatingScreen onSubmit={async (r) => { if (!isAIChat) await supabase.from('sessions').update({ rating: r }).eq('id', sessionId); onEnd?.() }} onSkip={() => onEnd?.()} />
  if (ended) return (
    <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 20 }}>✨</div>
      <h2 style={{ color: 'var(--teal)', marginBottom: 12 }}>You showed up for {otherName}.</h2>
      <p style={{ color: 'rgba(240,239,232,0.7)', lineHeight: 1.6, marginBottom: 24 }}>Being truly present for someone is a beautiful thing. Thank you.</p>
      <button className="btn-primary" onClick={onEnd}>Back to home</button>
    </div>
  )

  return (
    <>
      {showEndConfirm && <Modal 
        title="End conversation?" 
        body="This will close the chat for both of you." 
        primaryLabel="End Chat" 
        primaryAction={() => { setShowEndConfirm(false); handleEndChat() }}
        secondaryLabel="Cancel" secondaryAction={() => setShowEndConfirm(false)} 
      />}

      <div className="page" style={{ justifyContent: 'flex-start', height: '100dvh' }}>
        {/* Header */}
        <div style={{ padding: '52px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => onBack?.(hasInteracted)} style={{ color: 'rgba(240,239,232,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <Avatar url={otherAvatar} name={otherName} size={38} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 500 }}>{otherName}</p>
            <p style={{ fontSize: 12, color: 'var(--teal)' }}>● {isExpresser ? 'your listener is here' : 'you are listening'}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {post?.emotion_tag && <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--teal)', border: '1px solid rgba(93,202,165,0.2)' }}>{post.emotion_tag}</span>}
            {!sessionClosed ? (
              <button onClick={() => setShowEndConfirm(true)} style={{ background: '#E24B4A', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>End</button>
            ) : (
              <span style={{ fontSize: 11, color: 'rgba(240,239,232,0.35)', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>Ended</span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!isExpresser && (
            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8 }}>
              <p style={{ fontSize: 12, color: 'rgba(240,239,232,0.6)', lineHeight: 1.6 }}>Be present, not a problem-solver. Let them feel heard first. 💙</p>
            </div>
          )}
          {messages.map((msg, i) => {
            if (msg.content?.startsWith('__system__:')) return <div key={i} style={{ textAlign: 'center', margin: '10px 0' }}><span style={{ fontSize: 11, color: 'rgba(240,239,232,0.4)', background: 'var(--bg2)', padding: '4px 12px', borderRadius: 12 }}>{msg.content.replace('__system__:', '')}</span></div>
            const isMine = msg.sender_id === currentUserId && !msg.is_ai_msg
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: 4 }}>
                <div style={{ 
                  maxWidth: '85%', padding: '12px 16px', borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', 
                  background: isMine ? 'var(--accent)' : 'var(--bg2)', border: isMine ? 'none' : '1px solid var(--border)', fontSize: 15
                }}>
                  {msg.content}
                </div>
              </div>
            )
          })}
          {(otherTyping || aiThinking) && <div className="typing-bubble"><span></span><span></span><span></span></div>}
          <div ref={bottomRef} />
        </div>

        {/* Bottom Bar */}
        {sessionClosed ? (
          <div style={{ padding: '20px', textAlign: 'center', borderTop: '1px solid var(--border)', color: 'rgba(240,239,232,0.4)', fontSize: 13 }}>This conversation has ended.</div>
        ) : (
          <div style={{ padding: '12px 16px 40px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setShowEmoji(!showEmoji)} style={{ background: 'none', border: 'none', fontSize: 20 }}>🙂</button>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={isExpresser ? "Say what's on your mind..." : "Respond with kindness..."}
                style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 24, padding: '12px 48px 12px 16px', color: 'white', fontSize: 15, resize: 'none', outline: 'none' }}
                rows={1}
              />
              <button onClick={send} disabled={!input.trim()} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? "var(--teal)" : "rgba(255,255,255,0.2)"} strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}// This is the very last bracket of the ChatView function}

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