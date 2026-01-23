import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function OnboardingChoice() {
  const { userProfile } = useAuth()

  return (
    <div className="screen" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      paddingBottom: 0 
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>👨‍👩‍👧‍👦</div>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>
          Welcome, {userProfile?.name?.split(' ')[0] || 'there'}!
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Let's get your family set up
        </p>
      </div>

      <Link to="/onboarding/create" className="btn btn-primary">
        Create a Family
      </Link>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 16, 
        margin: '24px 0',
        color: 'var(--text-muted)'
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span>or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <Link to="/onboarding/join" className="btn btn-secondary">
        Join with Invite Code
      </Link>
    </div>
  )
}
