import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function AccountPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [avatarUrl, setAvatarUrl] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data)
          setForm({ full_name: data.full_name ?? '', phone: data.phone ?? '' })
          if (data.avatar_url) setAvatarUrl(data.avatar_url)
        }
        setLoading(false)
      })
  }, [user])

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()

      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      setAvatarUrl(url)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ full_name: form.full_name, phone: form.phone })
      .eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const identityLabel = {
    carrier: 'The Carrier',
    anchor: 'The Anchor',
    wanderer: 'The Wanderer'
  }[profile?.identity] ?? '—'

  const initial = form.full_name?.[0]?.toUpperCase() ?? '?'

  if (loading) {
    return (
      <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--accent)', display: 'inline-block',
          animation: 'pulse 1.2s ease-in-out infinite'
        }} />
      </div>
    )
  }

  return (
    <div className="page" style={{ padding: '0 24px', justifyContent: 'flex-start' }}>

      <div className="orb" style={{
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(139,124,246,0.10) 0%, transparent 70%)',
        top: '-40px', right: '-60px'
      }} />

      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 1, paddingTop: 52,
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 14 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>

        {/* Avatar section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: avatarUrl ? 'transparent' : 'var(--accent-dim)',
              border: '2px solid rgba(139,124,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, color: 'var(--accent)', overflow: 'hidden'
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initial
              }
            </div>
            {/* Upload button overlay */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--accent)', border: '2px solid var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 13
              }}
            >
              {uploading ? '...' : '✎'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>
              {form.full_name || 'Your name'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--accent)', marginTop: 4 }}>
              {identityLabel}
            </p>
          </div>
        </div>

        {/* Personal info */}
        <div className="card">
          <p style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 16
          }}>
            Personal information
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Full name', field: 'full_name', type: 'text' },
              { label: 'Phone number', field: 'phone', type: 'tel' },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label style={{
                  display: 'block', fontSize: 12, color: 'var(--text-tertiary)',
                  marginBottom: 6, fontWeight: 500
                }}>
                  {label}
                </label>
                <input
                  type={type}
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', fontSize: 15, color: 'var(--text)',
                    transition: 'border-color var(--transition)'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            ))}

            {/* Email — read only */}
            <div>
              <label style={{
                display: 'block', fontSize: 12, color: 'var(--text-tertiary)',
                marginBottom: 6, fontWeight: 500
              }}>
                Email address
              </label>
              <input
                type="email"
                value={profile?.email ?? user?.email ?? ''}
                disabled
                style={{
                  width: '100%', padding: '12px 14px',
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', fontSize: 15,
                  color: 'var(--text-tertiary)', cursor: 'not-allowed'
                }}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            style={{ marginTop: 20 }}
          >
            {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>

        {/* Identity */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Your Murmur identity</p>
            <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--accent)' }}>{identityLabel}</p>
          </div>
          <span style={{ fontSize: 24, color: 'var(--accent)' }}>◎</span>
        </div>

        {/* Sign out */}
        <button
          onClick={async () => { await signOut(); navigate('/') }}
          className="btn-ghost"
          style={{ color: 'var(--coral)', borderColor: 'rgba(232,131,106,0.3)' }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}