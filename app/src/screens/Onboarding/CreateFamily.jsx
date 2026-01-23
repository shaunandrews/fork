import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFamily } from '../../contexts/FamilyContext'

export function CreateFamily() {
  const [familyName, setFamilyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { createFamily } = useFamily()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!familyName.trim()) {
      setError('Please enter a family name')
      return
    }

    setLoading(true)

    try {
      await createFamily(familyName.trim())
      // Force a page reload to refresh auth state with new familyId
      window.location.href = '/'
    } catch (err) {
      console.error('Create family error:', err)
      setError(err.message || 'Failed to create family')
    } finally {
      setLoading(false)
    }
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
        <div style={{ fontSize: 64, marginBottom: 16 }}>🏠</div>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Create Your Family</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          You'll be able to invite others after
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
          <label className="form-label">Family Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="The Andrews Family"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
          style={{ marginTop: 8, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Creating...' : 'Create Family'}
        </button>
      </form>
    </div>
  )
}
