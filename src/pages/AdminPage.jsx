import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ── Replace with your actual email ────────────────────────────
const ADMIN_EMAILS = ['akhilneedspace@gmail.com']

const RATING_LABELS = {
  1: { emoji: '😔', label: 'Not great' },
  2: { emoji: '😊', label: 'It helped' },
  3: { emoji: '🤍', label: 'Really needed that' },
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('posts')
  const [posts, setPosts] = useState([])
  const [users, setUsers] = useState([])
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState('all')

  useEffect(() => {
    if (!user) return
    if (!ADMIN_EMAILS.includes(user.email)) navigate('/dashboard')
  }, [user])

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadPosts(), loadUsers(), loadSessions(), loadStats()])
    setLoading(false)
  }

  async function loadPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(full_name, email, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(200)
    setPosts(data || [])
  }

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    setUsers(data || [])
  }

  async function loadSessions() {
    // Load sessions with post content
    const { data: rawSessions } = await supabase
      .from('sessions')
      .select('*, posts(content, emotion_tag, is_anonymous, user_id)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (!rawSessions) { setSessions([]); return }

    // Enrich with expresser and listener names
    const enriched = await Promise.all(rawSessions.map(async (s) => {
      const [{ data: expresser }, { data: listener }] = await Promise.all([
        s.expresser_id
          ? supabase.from('profiles').select('full_name').eq('id', s.expresser_id).single()
          : { data: null },
        s.listener_id
          ? supabase.from('profiles').select('full_name').eq('id', s.listener_id).single()
          : { data: null },
      ])

      // Resolve deleted_by UUIDs to names
      let deletedByNames = []
      if (Array.isArray(s.deleted_by) && s.deleted_by.length > 0) {
        const { data: deletedProfiles } = await supabase
          .from('profiles')
          .select('full_name')
          .in('id', s.deleted_by)
        deletedByNames = (deletedProfiles || []).map(p => p.full_name).filter(Boolean)
      }

      return { ...s, expresserName: expresser?.full_name ?? 'Unknown', listenerName: s.is_ai ? 'AI Listener' : (listener?.full_name ?? 'Unknown'), deletedByNames }
    }))

    setSessions(enriched)
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

  // Filtered data based on selected user
  const filteredPosts = selectedUser === 'all' ? posts : posts.filter(p => p.user_id === selectedUser)
  const filteredSessions = selectedUser === 'all' ? sessions : sessions.filter(s => s.expresser_id === selectedUser || s.listener_id === selectedUser)

  const TABS = ['posts', 'users', 'sessions']

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '0 0 80px', fontFamily: 'var(--font-body)' }}>

      {/* Header */}
      <div style={{ padding: '32px 28px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Murmur Admin</h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{user?.email}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/dashboard')} style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'none', cursor: 'pointer' }}>← App</button>
          <button onClick={loadAll} style={{ fontSize: 13, color: 'var(--accent)', padding: '7px 14px', border: '1px solid rgba(139,124,246,0.3)', borderRadius: 8, background: 'none', cursor: 'pointer' }}>Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, padding: '20px 28px' }}>
        {[
          { label: 'Total users', value: stats.totalUsers ?? 0, color: '#8b7cf6' },
          { label: 'Total posts', value: stats.totalPosts ?? 0, color: '#5dcaa5' },
          { label: 'Total sessions', value: stats.totalSessions ?? 0, color: '#f0a742' },
          { label: 'Active now', value: stats.activeSessions ?? 0, color: '#e8836a' },
        ].map(s => (
          <div key={s.label} style={{ padding: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 28, fontWeight: 500, color: s.color, marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* User filter */}
      <div style={{ padding: '0 28px 16px' }}>
        <label style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8, display: 'block', fontWeight: 500, letterSpacing: '0.04em' }}>
          FILTER BY USER
        </label>
        <select
          value={selectedUser}
          onChange={e => setSelectedUser(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, color: 'var(--text)', cursor: 'pointer' }}
        >
          <option value="all">All users</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.full_name ?? u.email ?? u.id.slice(0, 8)}</option>
          ))}
        </select>
        {selectedUser !== 'all' && (
          <div style={{ marginTop: 10, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
            {(() => {
              const u = users.find(u => u.id === selectedUser)
              if (!u) return null
              const expressed = filteredPosts.length
              const listened = filteredSessions.filter(s => s.listener_id === selectedUser).length
              return (
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--accent)' }}>{u.full_name ?? 'Unknown'}</strong>
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📝 {expressed} posts</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>🎧 {listened} listening sessions</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Identity: {u.identity ?? '—'}</span>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '0 28px', marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: tab === t ? 500 : 400, background: tab === t ? 'rgba(139,124,246,0.15)' : 'transparent', color: tab === t ? '#8b7cf6' : 'var(--text-tertiary)', transition: 'all 0.2s' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '0 28px' }}>

        {/* Posts */}
        {tab === 'posts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4 }}>
              {filteredPosts.length} posts {selectedUser !== 'all' ? 'by this user' : 'total'}
            </p>
            {filteredPosts.map(post => (
              <div key={post.id} style={{ padding: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                    {/* Avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(139,124,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#8b7cf6', overflow: 'hidden' }}>
                        {post.profiles?.avatar_url
                          ? <img src={post.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : (post.profiles?.full_name?.[0]?.toUpperCase() ?? '?')
                        }
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                        {post.is_anonymous ? 'Anonymous' : (post.profiles?.full_name ?? 'Unknown')}
                      </span>
                    </div>
                    {post.profiles?.email && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{post.profiles.email}</span>}
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: post.status === 'open' ? 'rgba(93,202,165,0.15)' : 'rgba(136,135,128,0.15)', color: post.status === 'open' ? '#5dcaa5' : 'var(--text-tertiary)' }}>
                      {post.status}
                    </span>
                    {post.emotion_tag && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(139,124,246,0.15)', color: '#8b7cf6' }}>{post.emotion_tag}</span>}
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{timeAgo(post.created_at)}</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{post.content}</p>
                </div>
                <button onClick={() => deletePost(post.id)} style={{ fontSize: 18, color: '#e8836a', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 4, opacity: 0.6 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4 }}>{users.length} registered users</p>
            {users.map(u => {
              const expressed = posts.filter(p => p.user_id === u.id).length
              const listened = sessions.filter(s => s.listener_id === u.id).length
              return (
                <div key={u.id} style={{ padding: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(139,124,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#8b7cf6', flexShrink: 0, overflow: 'hidden' }}>
                    {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.full_name?.[0]?.toUpperCase() ?? '?')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{u.full_name ?? 'No name'}</span>
                      {u.identity && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(139,124,246,0.15)', color: '#8b7cf6' }}>{u.identity}</span>}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4 }}>{u.email} · {u.phone ?? 'No phone'}</p>
                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-tertiary)' }}>
                      <span>📝 {expressed} posts expressed</span>
                      <span>🎧 {listened} people listened to</span>
                      <span>Joined {timeAgo(u.created_at)}</span>
                    </div>
                    <button onClick={() => setSelectedUser(u.id === selectedUser ? 'all' : u.id)} style={{ marginTop: 8, fontSize: 12, color: '#8b7cf6', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {selectedUser === u.id ? 'Clear filter' : 'Filter by this user'}
                    </button>
                  </div>
                  <button onClick={() => deleteUser(u.id)} style={{ fontSize: 18, color: '#e8836a', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 4, opacity: 0.6 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>×</button>
                </div>
              )
            })}
          </div>
        )}

        {/* Sessions */}
        {tab === 'sessions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4 }}>
              {filteredSessions.length} sessions {selectedUser !== 'all' ? 'involving this user' : 'total'}
            </p>
            {filteredSessions.map(s => {
              const rating = RATING_LABELS[s.rating]
              return (
                <div key={s.id} style={{ padding: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: s.status === 'active' ? 'rgba(93,202,165,0.15)' : s.status === 'closed' ? 'rgba(136,135,128,0.15)' : 'rgba(232,131,106,0.15)', color: s.status === 'active' ? '#5dcaa5' : s.status === 'closed' ? 'var(--text-tertiary)' : '#e8836a' }}>
                      {s.status}
                    </span>
                    {s.is_ai && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(139,124,246,0.15)', color: '#8b7cf6' }}>AI session</span>}
                    {rating && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(93,202,165,0.15)', color: '#5dcaa5' }}>
                        {rating.emoji} {rating.label}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{timeAgo(s.created_at)}</span>
                  </div>

                  {/* Expresser + Listener names */}
                  <div style={{ display: 'flex', gap: 20, marginBottom: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: '#8b7cf6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expresser</span>
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>
                        {s.posts?.is_anonymous ? 'Anonymous' : (s.expresserName ?? 'Unknown')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: '#5dcaa5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Listener</span>
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>{s.listenerName}</span>
                    </div>
                  </div>

                  {s.posts?.content && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 8 }}>
                      "{s.posts.content.slice(0, 120)}{s.posts.content.length > 120 ? '...' : ''}"
                    </p>
                  )}

                  {/* Deleted by */}
                  {s.deletedByNames?.length > 0 && (
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
                      🗑 Deleted by: {s.deletedByNames.join(', ')} — chat preserved in database
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}