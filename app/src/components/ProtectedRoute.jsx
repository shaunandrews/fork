import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text-muted)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🍴</div>
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // If this is a join link, save the code and send to signup
    if (location.pathname.startsWith('/join/')) {
      const inviteCode = location.pathname.split('/join/')[1]
      if (inviteCode) {
        localStorage.setItem('pendingInviteCode', inviteCode)
      }
      return <Navigate to="/signup" state={{ from: location, inviteCode }} replace />
    }
    // Otherwise go to login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
