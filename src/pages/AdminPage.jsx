import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ── Add your email here to restrict access ──
const ADMIN_EMAILS = ['your@email.com'] // replace with your actual email

export default function AdminPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('posts')
  const [posts, setPosts] = useState([])
  const [users, setUsers] = useState([])
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  // Guard — only admin emails can access
  useEffect(() => {
    if (!user) return
    if (!ADMIN_EMAILS.includes(user.email)) {
      navigate('/dashboard')
    }
  }, [user])

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadPosts(), loadUsers(), loadSessions(), loadStats()])
    setLoading(false)
  }

  async function loadPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100)
    setPosts(data || [])
  }

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setUsers(data || [])
  }

  async function loadSessions() {
    const { data } = await supabase
      .from('sessions')
      .select('*, posts(content, emotion_tag)')
      .order('created_at', { ascending: false })
      .limit(100)
    setSessions(data || [])
  }

  async function loadStats() {
    const [{ count: totalUsers }, { count: totalPosts }, { count: totalSessions }, { count: activeSessions }] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('sessions').select('id', { count: 'exact', head: true }),
      supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ])
    setStats({ totalUsers, totalPosts, totalSessions, activeSessions })
  }

  async function deletePost(postId) {
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  async function deleteUser(userId) {
    await supabase.from('profiles').delete().eq('id', userId)
    setUsers(prev => prev.filter(u => u.id !== userId))
  }

  const timeAgo = d => {
    const m = Math.floor((Date.now() - new Date(d)) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    if (m < 1440) return `${Math.floor(m / 60)}h ago`
    return `${Math.floor(m / 1440)}d ago`
  }

  const TABS = ['posts', 'users', 'sessions']

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '0 0 48px', fontFamily: 'var(--font-body)' }}>

      {/* Header */}
      <div style={{ padding: '32px 28px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Murmur Admin</h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{user?.email}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/dashboard')} style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'none', cursor: 'pointer' }}>
            ← App
          </button>
          <button onClick={loadAll} style={{ fontSize: 13, color: 'var(--accent)', padding: '7px 14px', border: '1px solid rgba(139,124,246,0.3)', borderRadius: 8, background: 'none', cursor: 'pointer' }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '20px 28px' }}>
        {[
          { label: 'Total users', value: stats.totalUsers ?? 0, color: 'var(--accent)' },
          { label: 'Total posts', value: stats.totalPosts ?? 0, color: 'var(--teal)' },
          { label: 'Total sessions', value: stats.totalSessions ?? 0, color: 'var(--amber)' },
          { label: 'Active now', value: stats.activeSessions ?? 0, color: 'var(--coral)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 28, fontWeight: 500, color: s.color, marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '0 28px', marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: tab === t ? 500 : 400, background: tab === t ? 'var(--accent-dim)' : 'transparent', color: tab === t ? 'var(--accent)' : 'var(--text-tertiary)', transition: 'all 0.2s' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '0 28px' }}>

        {/* Posts tab */}
        {tab === 'posts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4 }}>
              {posts.length} posts total
            </p>
            {posts.map(post => (
              <div key={post.id} style={{ padding: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                      {post.is_anonymous ? 'Anonymous' : (post.profiles?.full_name ?? 'Unknown')}
                    </span>
                    {post.profiles?.email && (
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{post.profiles.email}</span>
                    )}
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: post.status === 'open' ? 'rgba(93,202,165,0.15)' : 'rgba(136,135,128,0.15)', color: post.status === 'open' ? 'var(--teal)' : 'var(--text-tertiary)' }}>
                      {post.status}
                    </span>
                    {post.emotion_tag && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        {post.emotion_tag}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                      {timeAgo(post.created_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {post.content}
                  </p>
                </div>
                <button onClick={() => deletePost(post.id)} style={{ fontSize: 18, color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 4, opacity: 0.6 }}
                  title="Delete post"
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Users tab */}
        {tab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4 }}>
              {users.length} registered users
            </p>
            {users.map(u => (
              <div key={u.id} style={{ padding: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* Avatar */}
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid rgba(139,124,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt={u.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (u.full_name?.[0]?.toUpperCase() ?? '?')
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{u.full_name ?? 'No name'}</span>
                    {u.identity && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        {u.identity}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{u.email} · {u.phone ?? 'No phone'}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Joined {timeAgo(u.created_at)}</p>
                </div>
                <button onClick={() => deleteUser(u.id)} style={{ fontSize: 18, color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 4, opacity: 0.6 }}
                  title="Delete user"
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Sessions tab */}
        {tab === 'sessions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4 }}>
              {sessions.length} sessions total
            </p>
            {sessions.map(s => (
              <div key={s.id} style={{ padding: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: s.status === 'active' ? 'rgba(93,202,165,0.15)' : s.status === 'closed' ? 'rgba(136,135,128,0.15)' : 'rgba(232,131,106,0.15)', color: s.status === 'active' ? 'var(--teal)' : s.status === 'closed' ? 'var(--text-tertiary)' : 'var(--coral)' }}>
                    {s.status}
                  </span>
                  {s.is_ai && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'var(--accent-dim)', color: 'var(--accent)' }}>AI session</span>}
                  {s.rating && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(93,202,165,0.15)', color: 'var(--teal)' }}>Rating: {['😔','😊','🤍'][s.rating - 1]}</span>}
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{timeAgo(s.created_at)}</span>
                </div>
                {s.posts?.content && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                    "{s.posts.content.slice(0, 120)}{s.posts.content.length > 120 ? '...' : ''}"
                  </p>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
                  <span>Expresser: {s.expresser_id?.slice(0, 8)}...</span>
                  <span>Listener: {s.listener_id ? s.listener_id.slice(0, 8) + '...' : 'AI'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}