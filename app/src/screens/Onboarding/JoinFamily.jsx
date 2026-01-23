import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFamily } from '../../contexts/FamilyContext'

export function JoinFamily() {
  const { code: urlCode } = useParams()
  const [inviteCode, setInviteCode] = useState(urlCode || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { joinFamily } = useFamily()
  const navigate = useNavigate()

  // Auto-submit if we have a code from URL
  useEffect(() => {
    if (urlCode && urlCode.length === 6) {
      handleJoin(urlCode)
    }
  }, [urlCode])

  const handleJoin = async (code) => {
    setError('')
    setLoading(true)

    try {
      await joinFamily(code)
      // Force a page reload to refresh auth state with new familyId
      window.location.href = '/'
    } catch (err) {
      console.error('Join family error:', err)
      setError(err.message || 'Failed to join family')
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!inviteCode.trim() || inviteCode.trim().length !== 6) {
      setError('Please enter a 6-character invite code')
      return
    }

    await handleJoin(inviteCode.trim())
  }

  return (
    <div className="screen" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      paddingBottom: 0 
    }}>
      <div className="back-header" style={{ position: 'absolute', top: 16, left: 16 }}>
        <button className="back-btn" onClick={() => navigate('/onboarding')}>←</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔗</div>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Join a Family</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Enter the invite code you received
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
          <label className="form-label">Invite Code</label>
          <input
            type="text"
            className="form-input"
            placeholder="ABC123"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{ 
              textAlign: 'center', 
              fontSize: 24, 
              letterSpacing: 8,
              textTransform: 'uppercase'
            }}
            autoFocus
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
          style={{ marginTop: 8, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Joining...' : 'Join Family'}
        </button>
      </form>
    </div>
  )
}
