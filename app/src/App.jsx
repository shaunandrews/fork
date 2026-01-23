import { BrowserRouter, Routes, Route, NavLink, Link, useNavigate, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useFamily } from './contexts/FamilyContext'
import { useMeals } from './hooks/useMeals'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './screens/Login'
import { Signup } from './screens/Signup'
import { OnboardingChoice } from './screens/Onboarding/Choice'
import { CreateFamily } from './screens/Onboarding/CreateFamily'
import { JoinFamily } from './screens/Onboarding/JoinFamily'
import './index.css'

// RequireFamily - redirects to onboarding if no family
function RequireFamily({ children }) {
  const { hasFamily, loading } = useFamily()
  
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
  
  if (!hasFamily) {
    return <Navigate to="/onboarding" replace />
  }
  
  return children
}

// RequireNoFamily - redirects to app if already has family (for onboarding)
function RequireNoFamily({ children }) {
  const { hasFamily, loading } = useFamily()
  
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
  
  if (hasFamily) {
    return <Navigate to="/" replace />
  }
  
  return children
}

// Helper to get family member by id (uses context members)
const getMemberFromList = (members, id) => {
  return members.find(m => m.id === id) || { name: 'Unknown', avatar: '👤' }
}

// Avatar Stack Component
function AvatarStack({ memberIds, members, size = 28 }) {
  if (!memberIds || memberIds.length === 0) {
    return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No votes yet</span>
  }
  
  return (
    <div style={{ display: 'flex', marginLeft: 8 }}>
      {memberIds.map((id, i) => {
        const member = getMemberFromList(members, id)
        return (
          <div 
            key={id} 
            style={{ 
              width: size, 
              height: size, 
              borderRadius: '50%', 
              background: 'var(--surface-hover)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: size * 0.6,
              marginLeft: i > 0 ? -8 : 0,
              border: '2px solid var(--bg)',
              position: 'relative',
              zIndex: memberIds.length - i
            }}
            title={member.name}
          >
            {member.avatar}
          </div>
        )
      })}
    </div>
  )
}

// Vote Button Component
function VoteButton({ voted, onToggle }) {
  return (
    <button 
      onClick={onToggle}
      style={{
        background: voted ? 'var(--accent)' : 'var(--accent-soft)',
        border: 'none',
        borderRadius: 8,
        padding: '8px 12px',
        cursor: 'pointer',
        color: voted ? 'white' : 'var(--accent)',
        fontWeight: 600,
        fontSize: 16
      }}
    >
      {voted ? '▲' : '△'}
    </button>
  )
}

// Tab Bar Component
function TabBar() {
  return (
    <nav className="tab-bar">
      <NavLink to="/" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} end>
        <span className="tab-icon">🍽️</span>
        Today
      </NavLink>
      <NavLink to="/meals" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        <span className="tab-icon">📋</span>
        Meals
      </NavLink>
      <NavLink to="/week" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        <span className="tab-icon">📅</span>
        Week
      </NavLink>
    </nav>
  )
}

// Mock data for prototype screens (will be replaced with Firestore in Phase 3-4)
const mockMealLibrary = [
  { id: 1, name: 'Tacos', addedBy: 'member1' },
  { id: 2, name: 'Spaghetti & Meatballs', addedBy: 'member2' },
  { id: 3, name: 'Mac & Cheese', addedBy: 'member1' },
  { id: 4, name: 'Chicken Stir Fry', addedBy: 'member2' },
  { id: 5, name: 'Grilled Cheese & Soup', addedBy: 'member1' },
  { id: 6, name: 'Pizza (homemade)', addedBy: 'member1' },
  { id: 7, name: 'Burgers', addedBy: 'member2' },
  { id: 8, name: 'Chicken Parm', addedBy: 'member2' },
]

// Today Screen - Decided
function TodayDecided() {
  const { family } = useFamily()
  
  return (
    <div className="screen">
      <div className="header">
        <h1>Fork</h1>
        <Link to="/profile" className="header-btn">👤</Link>
      </div>
      
      <div className="date-label">
        <div className="day">Thursday</div>
        <div className="date">January 23</div>
      </div>

      <div className="card card-hero">
        <div className="emoji">🍝</div>
        <h2>Spaghetti & Meatballs</h2>
        <p>Demo Chef is cooking</p>
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 16 }}>
        Dinner at 6:00 PM
      </p>

      <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
        <Link to="/today-undecided" className="btn btn-secondary" style={{ flex: 1, fontSize: 14 }}>
          View: Undecided
        </Link>
        <Link to="/today-no-chef" className="btn btn-secondary" style={{ flex: 1, fontSize: 14 }}>
          View: No Chef
        </Link>
      </div>
      
      <TabBar />
    </div>
  )
}

// Today Screen - Undecided
function TodayUndecided() {
  const { members, currentMember } = useFamily()
  const [suggestions, setSuggestions] = useState([
    { id: 1, name: 'Tacos', suggestedBy: members[0]?.id, votedBy: members.slice(0, 2).map(m => m.id) },
    { id: 2, name: 'Spaghetti', suggestedBy: members[0]?.id, votedBy: [members[0]?.id].filter(Boolean) },
  ])

  const toggleVote = (mealId) => {
    if (!currentMember) return
    setSuggestions(prev => prev.map(meal => {
      if (meal.id !== mealId) return meal
      const hasVoted = meal.votedBy.includes(currentMember.id)
      return {
        ...meal,
        votedBy: hasVoted 
          ? meal.votedBy.filter(id => id !== currentMember.id)
          : [...meal.votedBy, currentMember.id]
      }
    }))
  }

  const sortedSuggestions = [...suggestions].sort((a, b) => b.votedBy.length - a.votedBy.length)

  return (
    <div className="screen">
      <div className="header">
        <h1>Fork</h1>
        <Link to="/profile" className="header-btn">👤</Link>
      </div>
      
      <div className="date-label">
        <div className="day">Thursday</div>
        <div className="date">January 23</div>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '24px 20px' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🍴</div>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}>What's for dinner?</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Vote for your pick</p>
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Suggestions</h3>
          <Link to="/suggest-meal" style={{ color: 'var(--accent)', fontSize: 14, textDecoration: 'none' }}>+ Suggest</Link>
        </div>

        {sortedSuggestions.map(meal => {
          const hasVoted = currentMember && meal.votedBy.includes(currentMember.id)
          const suggester = getMemberFromList(members, meal.suggestedBy)
          return (
            <div key={meal.id} className="meal-card" style={{ flexWrap: 'wrap' }}>
              <VoteButton voted={hasVoted} onToggle={() => toggleVote(meal.id)} />
              <div className="meal-info" style={{ flex: 1, minWidth: 120 }}>
                <div className="meal-name">{meal.name}</div>
                <div className="meal-meta">{suggester.name} suggested</div>
              </div>
              <AvatarStack memberIds={meal.votedBy} members={members} />
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
        <Link to="/" className="btn btn-secondary" style={{ flex: 1, fontSize: 14 }}>
          View: Decided
        </Link>
        <Link to="/today-no-chef" className="btn btn-secondary" style={{ flex: 1, fontSize: 14 }}>
          View: No Chef
        </Link>
      </div>
      
      <TabBar />
    </div>
  )
}

// Today Screen - No Chef
function TodayNoChef() {
  return (
    <div className="screen">
      <div className="header">
        <h1>Fork</h1>
        <Link to="/profile" className="header-btn">👤</Link>
      </div>
      
      <div className="date-label">
        <div className="day">Thursday</div>
        <div className="date">January 23</div>
      </div>

      <div className="card card-hero">
        <div className="emoji">👨‍🍳</div>
        <h2>No chef tonight</h2>
        <p>Who's cooking?</p>
      </div>

      <button className="btn btn-primary" style={{ marginTop: 16 }}>
        I'll cook
      </button>

      <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
        <Link to="/" className="btn btn-secondary" style={{ flex: 1, fontSize: 14 }}>
          View: Decided
        </Link>
        <Link to="/today-undecided" className="btn btn-secondary" style={{ flex: 1, fontSize: 14 }}>
          View: Undecided
        </Link>
      </div>
      
      <TabBar />
    </div>
  )
}

// Meals Screen
function Meals() {
  const { members } = useFamily()
  const { getMeals, toggleFavorite, isFavorite, loading } = useMeals()
  const [activeFilter, setActiveFilter] = useState('all')

  const filteredMeals = getMeals(activeFilter)
  
  // Helper to get member name
  const getMemberName = (userId) => {
    const member = members.find(m => m.id === userId)
    return member?.name || 'Someone'
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>Meals</h1>
        <Link to="/add-meal" className="header-btn">+</Link>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
        Your family's meal ideas. Suggest one for tonight.
      </p>

      <div className="filters">
        <button 
          className={`filter ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter ${activeFilter === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveFilter('favorites')}
        >
          Favorites
        </button>
        <button 
          className={`filter ${activeFilter === 'mine' ? 'active' : ''}`}
          onClick={() => setActiveFilter('mine')}
        >
          Mine
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Loading meals...
        </div>
      ) : filteredMeals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
          <p style={{ color: 'var(--text-muted)' }}>
            {activeFilter === 'all' 
              ? "No meals yet. Add your first one!"
              : activeFilter === 'favorites'
              ? "No favorites yet. Tap ♡ on meals you love."
              : "You haven't added any meals yet."}
          </p>
        </div>
      ) : (
        filteredMeals.map(meal => (
          <div key={meal.id} className="meal-card">
            <div className="meal-info">
              <div className="meal-name">{meal.name}</div>
              <div className="meal-meta">Added by {getMemberName(meal.addedBy)}</div>
            </div>
            <Link 
              to="/suggest-meal" 
              className="btn btn-secondary btn-small"
              style={{ fontSize: 12, padding: '8px 12px' }}
            >
              Suggest
            </Link>
            <button 
              className="meal-fav"
              onClick={() => toggleFavorite(meal.id)}
            >
              {isFavorite(meal.id) ? '❤️' : '🤍'}
            </button>
          </div>
        ))
      )}

      <TabBar />
    </div>
  )
}

// Suggest Meal Screen
function SuggestMeal() {
  const navigate = useNavigate()
  const { meals, loading } = useMeals()
  const [selected, setSelected] = useState(null)

  return (
    <div className="screen">
      <div className="back-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Suggest for Tonight</h1>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Pick a meal to suggest, or add a new one.
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Loading meals...
        </div>
      ) : meals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            No meals in your library yet.
          </p>
        </div>
      ) : (
        meals.map(meal => (
          <div 
            key={meal.id} 
            className={`radio-card ${selected === meal.id ? 'selected' : ''}`}
            onClick={() => setSelected(meal.id)}
          >
            <div className="radio-circle" />
            <div className="meal-info">
              <div className="meal-name">{meal.name}</div>
            </div>
          </div>
        ))
      )}

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <Link to="/add-meal" className="btn btn-secondary">
          + Add New Meal
        </Link>
      </div>

      <div style={{ marginTop: 24 }}>
        <button 
          className={`btn ${selected ? 'btn-primary' : 'btn-secondary'}`}
          style={{ opacity: selected ? 1 : 0.5 }}
          onClick={() => selected && navigate('/today-undecided')}
        >
          Suggest This
        </button>
      </div>
    </div>
  )
}

// Add Meal Screen
function AddMeal() {
  const navigate = useNavigate()
  const { addMeal } = useMeals()
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Please enter a meal name')
      return
    }

    setLoading(true)
    setError('')

    try {
      await addMeal({ name, note })
      navigate('/meals')
    } catch (err) {
      console.error('Add meal error:', err)
      setError(err.message || 'Failed to add meal')
      setLoading(false)
    }
  }
  
  return (
    <div className="screen">
      <div className="back-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Add Meal</h1>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Add a new meal to your family's library.
      </p>

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
          <label className="form-label">What's the meal?</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Beef tacos, lasagna, etc."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Add a photo (optional)</label>
          <div className="photo-upload">
            📷 Tap to add photo (coming soon)
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Note (optional)</label>
          <textarea 
            className="form-input" 
            placeholder="The good corn tortillas from Wegmans..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Adding...' : 'Add to Library'}
        </button>
      </form>
    </div>
  )
}

// Week Screen
function Week() {
  const { members } = useFamily()
  
  const weekData = [
    { day: 'Mon', date: 20, chef: members[0]?.name || 'Chef', meal: 'Tacos' },
    { day: 'Tue', date: 21, chef: members[0]?.name || 'Chef', meal: 'Spaghetti' },
    { day: 'Wed', date: 22, chef: members[0]?.name || 'Chef', meal: 'Stir Fry' },
    { day: 'Thu', date: 23, chef: members[0]?.name || 'Chef', meal: null, isToday: true },
    { day: 'Fri', date: 24, chef: null, meal: null },
    { day: 'Sat', date: 25, chef: members[0]?.name || 'Chef', meal: null },
    { day: 'Sun', date: 26, chef: null, meal: null },
  ]

  return (
    <div className="screen">
      <div className="header">
        <h1>This Week</h1>
        <Link to="/profile" className="header-btn">👤</Link>
      </div>

      {weekData.map((day, i) => (
        <div key={i} className={`week-day ${day.isToday ? 'today' : ''}`}>
          <div className="day-date">
            <div className="day-name">{day.day}</div>
            <div className="day-num">{day.date}</div>
          </div>
          <div className="day-info">
            {day.chef ? (
              <>
                <div className="day-chef">{day.chef} cooking</div>
                {day.meal ? (
                  <div className="day-meal">{day.meal}</div>
                ) : day.isToday ? (
                  <Link to="/pick-meal" className="day-meal" style={{ color: 'var(--accent)' }}>
                    Pick meal →
                  </Link>
                ) : (
                  <div className="day-meal" style={{ color: 'var(--text-muted)' }}>—</div>
                )}
              </>
            ) : (
              <button className="btn btn-secondary btn-small">
                I'll cook
              </button>
            )}
          </div>
        </div>
      ))}

      <TabBar />
    </div>
  )
}

// Pick Meal Screen
function PickMeal() {
  const navigate = useNavigate()
  const { members } = useFamily()
  const [selected, setSelected] = useState(null)
  
  const suggestions = [
    { id: 1, name: 'Tacos', suggestedBy: members[0]?.id, votedBy: members.slice(0, 2).map(m => m.id) },
    { id: 2, name: 'Spaghetti', suggestedBy: members[0]?.id, votedBy: [members[0]?.id].filter(Boolean) },
    { id: 3, name: 'Mac & Cheese', suggestedBy: members[0]?.id, votedBy: [] },
  ]

  return (
    <div className="screen">
      <div className="back-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Pick Tonight's Meal</h1>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        You're cooking Thursday. What's it gonna be?
      </p>

      {suggestions.map(meal => (
        <div 
          key={meal.id} 
          className={`radio-card ${selected === meal.id ? 'selected' : ''}`}
          onClick={() => setSelected(meal.id)}
          style={{ flexWrap: 'wrap', gap: 12 }}
        >
          <div className="radio-circle" />
          <div className="meal-info" style={{ flex: 1, minWidth: 100 }}>
            <div className="meal-name">{meal.name}</div>
            <div className="meal-meta">{getMemberFromList(members, meal.suggestedBy).name} suggested</div>
          </div>
          <AvatarStack memberIds={meal.votedBy} members={members} size={24} />
        </div>
      ))}

      <div style={{ marginTop: 24 }}>
        <Link 
          to="/confirm" 
          className={`btn ${selected ? 'btn-primary' : 'btn-secondary'}`}
          style={{ opacity: selected ? 1 : 0.5 }}
        >
          Pick This One
        </Link>
      </div>
    </div>
  )
}

// Confirm Screen
function Confirm() {
  const navigate = useNavigate()
  
  return (
    <div className="screen">
      <div className="celebration">
        <div className="emoji">🎉</div>
        <h2>Tacos it is!</h2>
        <p>Your family has been notified.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Done
        </button>
      </div>
    </div>
  )
}

// Profile Screen
function Profile() {
  const navigate = useNavigate()
  const { signOut, userProfile } = useAuth()
  const { family, members, currentMember } = useFamily()
  const [copied, setCopied] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const getInviteUrl = () => {
    // Use the actual hostname for the invite link
    return `${window.location.origin}/join/${family?.inviteCode}`
  }

  const handleCopyInvite = async () => {
    if (!family?.inviteCode) {
      alert('No invite code available')
      return
    }
    
    const inviteUrl = getInviteUrl()
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        // Fallback: create a temporary input
        const input = document.createElement('input')
        input.value = inviteUrl
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Copy failed:', err)
      // Last resort: show the URL in an alert so user can copy manually
      alert(`Copy this link:\n${inviteUrl}`)
    }
  }

  const handleShare = async () => {
    if (!family?.inviteCode) {
      alert('No invite code available')
      return
    }

    const inviteUrl = getInviteUrl()
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${family.name} on Fork`,
          text: `Join our family on Fork to help plan dinners!`,
          url: inviteUrl
        })
      } catch (err) {
        // User cancelled share - that's ok
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err)
          handleCopyInvite()
        }
      }
    } else {
      // No native share, copy instead
      handleCopyInvite()
    }
  }
  
  return (
    <div className="screen">
      <div className="back-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Profile</h1>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>{currentMember?.avatar || '👤'}</div>
        <h2 style={{ marginBottom: 4 }}>{userProfile?.name || 'User'}</h2>
        <p style={{ color: 'var(--text-muted)' }}>{family?.name || 'No family'}</p>
      </div>

      {family && (
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-muted)' }}>INVITE CODE</h3>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            background: 'var(--bg)',
            padding: 16,
            borderRadius: 12,
            marginBottom: 12
          }}>
            <span style={{ 
              fontSize: 24, 
              fontWeight: 600, 
              letterSpacing: 4,
              fontFamily: 'monospace'
            }}>
              {family.inviteCode}
            </span>
            <button 
              onClick={handleCopyInvite}
              style={{
                background: 'var(--accent-soft)',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <button className="btn btn-secondary" onClick={handleShare}>
            Share Invite Link
          </button>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-muted)' }}>FAMILY MEMBERS</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {members.map(member => (
            <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 32 }}>{member.avatar}</span>
              <span>{member.name}</span>
              {member.role === 'admin' && (
                <span style={{ 
                  fontSize: 10, 
                  background: 'var(--accent-soft)', 
                  color: 'var(--accent)',
                  padding: '2px 8px',
                  borderRadius: 10
                }}>Admin</span>
              )}
              {member.id === currentMember?.id && (
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(you)</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <button 
        className="btn btn-secondary" 
        style={{ marginTop: 8, color: '#ef4444' }}
        onClick={handleSignOut}
      >
        Sign Out
      </button>
    </div>
  )
}

// App
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Join link (public-ish, but needs auth) */}
        <Route path="/join/:code" element={
          <ProtectedRoute>
            <JoinFamily />
          </ProtectedRoute>
        } />
        
        {/* Onboarding (needs auth, but no family) */}
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <RequireNoFamily>
              <OnboardingChoice />
            </RequireNoFamily>
          </ProtectedRoute>
        } />
        <Route path="/onboarding/create" element={
          <ProtectedRoute>
            <RequireNoFamily>
              <CreateFamily />
            </RequireNoFamily>
          </ProtectedRoute>
        } />
        <Route path="/onboarding/join" element={
          <ProtectedRoute>
            <RequireNoFamily>
              <JoinFamily />
            </RequireNoFamily>
          </ProtectedRoute>
        } />
        
        {/* Main app (needs auth + family) */}
        <Route path="/" element={
          <ProtectedRoute>
            <RequireFamily>
              <TodayDecided />
            </RequireFamily>
          </ProtectedRoute>
        } />
        <Route path="/today-undecided" element={
          <ProtectedRoute>
            <RequireFamily>
              <TodayUndecided />
            </RequireFamily>
          </ProtectedRoute>
        } />
        <Route path="/today-no-chef" element={
          <ProtectedRoute>
            <RequireFamily>
              <TodayNoChef />
            </RequireFamily>
          </ProtectedRoute>
        } />
        <Route path="/meals" element={
          <ProtectedRoute>
            <RequireFamily>
              <Meals />
            </RequireFamily>
          </ProtectedRoute>
        } />
        <Route path="/suggest-meal" element={
          <ProtectedRoute>
            <RequireFamily>
              <SuggestMeal />
            </RequireFamily>
          </ProtectedRoute>
        } />
        <Route path="/add-meal" element={
          <ProtectedRoute>
            <RequireFamily>
              <AddMeal />
            </RequireFamily>
          </ProtectedRoute>
        } />
        <Route path="/week" element={
          <ProtectedRoute>
            <RequireFamily>
              <Week />
            </RequireFamily>
          </ProtectedRoute>
        } />
        <Route path="/pick-meal" element={
          <ProtectedRoute>
            <RequireFamily>
              <PickMeal />
            </RequireFamily>
          </ProtectedRoute>
        } />
        <Route path="/confirm" element={
          <ProtectedRoute>
            <RequireFamily>
              <Confirm />
            </RequireFamily>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <RequireFamily>
              <Profile />
            </RequireFamily>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
