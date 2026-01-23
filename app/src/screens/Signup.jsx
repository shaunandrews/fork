import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const EMOJI_OPTIONS = ['😀', '😎', '🤓', '🧑‍🍳', '👨', '👩', '👦', '👧', '🧔', '👱', '👴', '👵', '🐱', '🐶', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯']

export function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState('😀')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Check for pending invite code
  const pendingInviteCode = location.state?.inviteCode || localStorage.getItem('pendingInviteCode')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      await signUp(email, password, name, avatar)
      
      // If there's a pending invite code, go to join flow
      if (pendingInviteCode) {
        navigate(`/join/${pendingInviteCode}`, { replace: true })
      } else {
        navigate('/onboarding', { replace: true })
      }
    } catch (err) {
      console.error('Signup error:', err.code, err.message, err)
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists')
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address')
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak')
      } else {
        setError(`Error: ${err.code || err.message || 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh', paddingBottom: 0 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{pendingInviteCode ? '👨‍👩‍👧‍👦' : '🍴'}</div>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>
          {pendingInviteCode ? 'Join a Family' : 'Join Fork'}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {pendingInviteCode 
            ? "Create an account to join your family" 
            : "Create your account"}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 12,
            padding: 12,
            marginBottom: 20,
            color: '#ef4444',
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Your name</label>
          <input
            type="text"
            className="form-input"
            placeholder="Shaun"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Pick your avatar</label>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={{
              width: '100%',
              padding: 16,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              fontSize: 48,
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            {avatar}
          </button>
          {showEmojiPicker && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8,
              marginTop: 12,
              padding: 12,
              background: 'var(--surface)',
              borderRadius: 12
            }}>
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setAvatar(emoji)
                    setShowEmojiPicker(false)
                  }}
                  style={{
                    background: avatar === emoji ? 'var(--accent-soft)' : 'none',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 28,
                    padding: 8,
                    cursor: 'pointer'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
          style={{ marginTop: 8, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-muted)', fontSize: 14 }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          Sign in
        </Link>
      </p>
    </div>
  )
}
