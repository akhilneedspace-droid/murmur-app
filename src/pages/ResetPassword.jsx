import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase puts the token in the URL hash — listen for the session
    supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') setReady(true)
  // Also handle token from URL hash directly
  if (session?.user && event === 'SIGNED_IN') setReady(true)
})

// Also parse hash on mount
const hash = window.location.hash
if (hash.includes('type=recovery') || hash.includes('access_token')) {
  setReady(true)
}
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError("Passwords don't match."); return }
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => navigate('/dashboard'), 2500)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 52, animation: 'float 3s ease-in-out infinite' }}>✅</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--accent)' }}>Password updated</h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>Taking you home in a moment...</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
      </div>
    )
  }

  return (
    <div className="page" style={{ padding: '0 28px', justifyContent: 'space-between' }}>
      <div className="orb" style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(139,124,246,0.14) 0%, transparent 70%)', top: '-40px', left: '-60px' }} />
      <div style={{ position: 'relative', zIndex: 1, paddingTop: 52 }} />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 8vw, 36px)', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 8 }}>
              Choose a new password
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Make it something you'll remember — at least 8 characters.
            </p>
          </div>
          {[
            { label: 'New password', value: password, setter: setPassword, placeholder: 'At least 8 characters' },
            { label: 'Confirm password', value: confirm, setter: setConfirm, placeholder: 'Same password again' },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.03em' }}>{label}</label>
              <input type="password" value={value} onChange={e => { setter(e.target.value); setError('') }} placeholder={placeholder}
                style={{ width: '100%', padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 15, color: 'var(--text)', transition: 'border-color var(--transition)' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
          ))}
          {error && <p style={{ fontSize: 14, color: 'var(--coral)', textAlign: 'center' }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
      <div style={{ height: 48 }} />
    </div>
  )
}