import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useQuiz } from '../context/QuizContext'

const STEPS = ['details', 'otp', 'done']

export default function Signup() {
  const navigate = useNavigate()
  const { identity } = useQuiz()

  const [step, setStep] = useState('details')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visible] = useState(true)

  // ── Step 1: Create account + send OTP ──
  async function handleSignup(e) {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) { setError('Please enter your full name.'); return }
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    // AU phone validation chatgpt
if (phone && !/^\+61[0-9]{9}$/.test(phone)) {
  setError('Please enter a valid Australian phone number (+61XXXXXXXXX)')
  return
}

    setLoading(true)
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() }
        }
      })

      if (signupError) {
        if (signupError.message.toLowerCase().includes('already registered')) {
          setError('An account with this email already exists. Try signing in instead.')
        } else {
          setError(signupError.message)
        }
        return
      }

      if (data.user) {
        // Save profile to profiles table
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() ? phone.trim() : null,
          country: 'AU',
          identity: identity ?? null,
        })
        setStep('otp')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify OTP ──
  async function handleVerifyOtp(e) {
    e.preventDefault()
    if (!otp.trim() || otp.trim().length < 4) { setError('Please enter the code from your email.'); return }
    setLoading(true)
    setError('')
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: 'signup',
      })
      if (verifyError) {
        if (verifyError.message.toLowerCase().includes('expired')) {
          setError('That code has expired. Please request a new one.')
        } else if (verifyError.message.toLowerCase().includes('invalid')) {
          setError('That code doesn\'t match. Please check and try again.')
        } else {
          setError(verifyError.message)
        }
        return
      }
      // Upsert profile after verified — this works because user is now confirmed
      const { data: { user: confirmedUser } } = await supabase.auth.getUser()
      if (confirmedUser) {
        await supabase.from('profiles').upsert({
          id: confirmedUser.id,
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() ? phone.trim() : null,
          country: 'AU',
          identity: identity ?? null,
        }, { onConflict: 'id' })
      }
      setStep('done')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOtp() {
    setError('')
    setLoading(true)
    try {
      await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() })
      setError('✓ New code sent — check your inbox.')
    } catch {
      setError('Couldn\'t resend. Please wait a moment and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Done ──
  if (step === 'done') {
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 52, animation: 'float 3s ease-in-out infinite' }}>🤍</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
          Welcome to Murmur.
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(240,239,232,0.7)', lineHeight: 1.7 }}>
          You're all set. Taking you home...
        </p>
      </div>
    )
  }

  // ── OTP step ──
  if (step === 'otp') {
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'space-between' }}>
        <div className="orb" style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(139,124,246,0.14) 0%, transparent 70%)', top: '-40px', right: '-60px' }} />

        <div style={{ position: 'relative', zIndex: 1, paddingTop: 52 }}>
          <button onClick={() => setStep('details')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(240,239,232,0.5)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </button>
        </div>

        <form onSubmit={handleVerifyOtp} style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
          <div>
            <div style={{ fontSize: 42, marginBottom: 16, textAlign: 'center' }}>📬</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 7vw, 34px)', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2, textAlign: 'center' }}>
              Check your inbox
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(240,239,232,0.65)', lineHeight: 1.7, textAlign: 'center' }}>
              We sent a 6-digit code to <strong style={{ color: 'var(--text)' }}>{email}</strong>. Enter it below to confirm your account.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'rgba(240,239,232,0.5)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.03em' }}>
              Verification code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={otp}
              onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
              placeholder="Enter your code"
              autoFocus
              style={{
                width: '100%', padding: '16px', background: 'var(--bg2)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                fontSize: 24, letterSpacing: '0.15em', color: 'var(--text)',
                textAlign: 'center', transition: 'border-color var(--transition)'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {error && (
            <p style={{ fontSize: 14, color: error.startsWith('✓') ? 'var(--teal)' : 'var(--coral)', textAlign: 'center', lineHeight: 1.5 }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={loading || otp.trim().length < 4}>
            {loading ? 'Verifying...' : 'Confirm my account'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(240,239,232,0.5)' }}>
            Didn't receive it? Check your spam folder, or{' '}
            <button type="button" onClick={handleResendOtp} disabled={loading}
              style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
              resend the code
            </button>
          </p>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(240,239,232,0.35)', lineHeight: 1.6 }}>
            The code expires after 24 hours. Make sure to verify before then.
          </p>
        </form>
        <div style={{ height: 48 }} />
      </div>
    )
  }

  // ── Details step ──
  return (
    <div className="page" style={{ padding: '0 28px', justifyContent: 'space-between' }}>
      <div className="orb" style={{ width: 340, height: 340, background: 'radial-gradient(circle, rgba(139,124,246,0.14) 0%, transparent 70%)', top: '-60px', right: '-80px' }} />

      <div style={{ position: 'relative', zIndex: 1, paddingTop: 52 }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(240,239,232,0.5)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
      </div>

      <form onSubmit={handleSignup} style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 8vw, 38px)', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2, color: 'var(--text)' }}>
            Create your account
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(240,239,232,0.6)', lineHeight: 1.6 }}>
            Just a few details to get you set up safely.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Full name', value: fullName, setter: setFullName, type: 'text', placeholder: 'Your name', required: true },
            { label: 'Email address', value: email, setter: setEmail, type: 'email', placeholder: 'your@email.com', required: true },
            { label: 'Phone number (optional)', value: phone, setter: setPhone, type: 'tel', placeholder: '+61 400 000 000', required: false },
            { label: 'Password', value: password, setter: setPassword, type: 'password', placeholder: 'At least 8 characters', required: true },
          ].map(({ label, value, setter, type, placeholder, required }) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(240,239,232,0.5)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.03em' }}>
                {label}
              </label>
              <input
                type={type}
                inputMode={label.includes('Phone') ? 'numeric' : undefined}
                value={value}
                onChange={e => {
                if (label.includes('Phone')) {
                  // allow digits and +
                  const val = e.target.value.replace(/[^\d+]/g, '')
                  setter(val)
                } else {
                  setter(e.target.value)
                }
                setError('')
                }}
                onBlur={e => {
                  if (!label.includes('Phone')) return

                  let val = e.target.value.replace(/\D/g, '') // digits only

                  if (!val) {
                    setter('')
                    return
                  }

                  // Cases:
                  // 0412345678 → +61412345678
                  if (val.startsWith('0')) {
                    val = '61' + val.slice(1)
                  }

                  // 412345678 → +61412345678
                  else if (val.length === 9) {
                    val = '61' + val
                  }

                  // 61412345678 → already correct
                  else if (val.startsWith('61')) {
                    // keep as is
                  }

                  else {
                    // invalid → reset
                    setError('Enter a valid Australian phone number')
                    return
                  }

                  setter('+' + val)
                }}
                placeholder={placeholder}
                required={required}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', fontSize: 15, color: 'var(--text)',
                  transition: 'border-color var(--transition)'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                //onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          ))}
        </div>

        {error && (
          <p style={{ fontSize: 14, color: 'var(--coral)', textAlign: 'center', lineHeight: 1.5 }}>{error}</p>
        )}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating your account...' : 'Create account'}
        </button>

        {/* Terms statement — no checkbox needed */}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(240,239,232,0.38)', lineHeight: 1.7 }}>
          By creating your account you agree to our{' '}
          <span onClick={() => window.open('/terms', '_blank')} style={{ color: 'rgba(240,239,232,0.6)', textDecoration: 'underline', cursor: 'pointer' }}>Terms of Service</span>
          {' '}and{' '}
          <span onClick={() => window.open('/privacy', '_blank')} style={{ color: 'rgba(240,239,232,0.6)', textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span>.
          Murmur is peer support — not a mental health service.
        </p>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(240,239,232,0.5)' }}>
          Already have an account?{' '}
          <button type="button" onClick={() => navigate('/login')}
            style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
            Sign in
          </button>
        </p>
      </form>
      <div style={{ height: 48 }} />
    </div>
  )
}