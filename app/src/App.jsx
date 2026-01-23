import { BrowserRouter, Routes, Route, NavLink, Link, useNavigate, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useFamily } from './contexts/FamilyContext'
import { useMeals } from './hooks/useMeals'
import { useDay } from './hooks/useDay'
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
      <NavLink to="/profile" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        <span className="tab-icon">👤</span>
        Family
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
// Today Screen - Unified component that shows appropriate state
function Today() {
  const { members } = useFamily()
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  const { 
    day, 
    suggestions, 
    loading,
    volunteerAsChef,
    unvolunteer,
    toggleVote,
    hasVoted,
    isChef,
    hasChef,
    isDecided,
    chef,
    undoMealPick
  } = useDay(selectedDate)

  // Check if selected date is today
  const today = new Date()
  const isToday = selectedDate.toDateString() === today.toDateString()
  
  // Format selected date
  const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  // Navigate days
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const handleVolunteer = async () => {
    try {
      await volunteerAsChef()
    } catch (err) {
      console.error('Volunteer error:', err)
      alert(err.message)
    }
  }

  const handleUnvolunteer = async () => {
    try {
      await unvolunteer()
    } catch (err) {
      console.error('Unvolunteer error:', err)
      alert(err.message)
    }
  }

  const handleChangeMind = async () => {
    try {
      await undoMealPick()
    } catch (err) {
      console.error('Undo pick error:', err)
      alert(err.message)
    }
  }

  const handleVote = async (suggestionId) => {
    try {
      await toggleVote(suggestionId)
    } catch (err) {
      console.error('Vote error:', err)
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🍴</div>
            <div>Loading...</div>
          </div>
        </div>
        <TabBar />
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>Fork</h1>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
        <button 
          onClick={goToPreviousDay}
          style={{ 
            background: 'var(--surface)', 
            border: 'none', 
            borderRadius: '50%',
            width: 40,
            height: 40,
            fontSize: 18,
            cursor: 'pointer',
            color: 'var(--text)'
          }}
        >
          ←
        </button>
        <div className="date-label" style={{ margin: 0 }}>
          <div className="day">{isToday ? 'Today' : dayName}</div>
          <div className="date">{dateStr}</div>
        </div>
        <button 
          onClick={goToNextDay}
          style={{ 
            background: 'var(--surface)', 
            border: 'none', 
            borderRadius: '50%',
            width: 40,
            height: 40,
            fontSize: 18,
            cursor: 'pointer',
            color: 'var(--text)'
          }}
        >
          →
        </button>
      </div>
      
      {!isToday && (
        <button 
          onClick={goToToday}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontSize: 14,
            cursor: 'pointer',
            marginBottom: 16,
            display: 'block',
            width: '100%',
            textAlign: 'center'
          }}
        >
          ← Back to Today
        </button>
      )}

      {/* STATE: Decided - meal has been picked */}
      {isDecided && (
        <>
          <div className="card card-hero">
            <div className="emoji">🍽️</div>
            <h2>{day.decidedMealName}</h2>
            <p>{chef?.name || 'Someone'} is cooking</p>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 16 }}>
            Dinner time! Enjoy your meal.
          </p>
          {isChef && (
            <button 
              onClick={handleChangeMind}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--text-muted)', 
                fontSize: 12, 
                marginTop: 16,
                cursor: 'pointer',
                textDecoration: 'underline',
                display: 'block',
                width: '100%',
                textAlign: 'center'
              }}
            >
              Change my mind
            </button>
          )}
        </>
      )}

      {/* STATE: No Chef - need someone to volunteer */}
      {!isDecided && !hasChef && (
        <>
          <div className="card card-hero">
            <div className="emoji">👨‍🍳</div>
            <h2>No chef tonight</h2>
            <p>Who's cooking?</p>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ marginTop: 16 }}
            onClick={handleVolunteer}
          >
            I'll cook
          </button>
        </>
      )}

      {/* STATE: Undecided - have chef, waiting for meal pick */}
      {!isDecided && hasChef && (
        <>
          <div className="card" style={{ textAlign: 'center', padding: '24px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🍴</div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>What's for dinner?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {chef?.name || 'Someone'} is cooking · {isChef ? 'Pick when ready!' : 'Vote for your pick'}
            </p>
            {isChef && (
              <button 
                onClick={handleUnvolunteer}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  fontSize: 12, 
                  marginTop: 8,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Actually, I can't cook tonight
              </button>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Suggestions {suggestions.length > 0 && `(${suggestions.length})`}
              </h3>
              <Link to="/suggest-meal" style={{ color: 'var(--accent)', fontSize: 14, textDecoration: 'none' }}>+ Suggest</Link>
            </div>

            {suggestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                <p>No suggestions yet.</p>
                <Link to="/suggest-meal" className="btn btn-secondary btn-small" style={{ marginTop: 12 }}>
                  Be the first!
                </Link>
              </div>
            ) : (
              suggestions.map(suggestion => {
                const voted = hasVoted(suggestion.id)
                return (
                  <div key={suggestion.id} className="meal-card" style={{ flexWrap: 'wrap' }}>
                    <VoteButton voted={voted} onToggle={() => handleVote(suggestion.id)} />
                    <div className="meal-info" style={{ flex: 1, minWidth: 120 }}>
                      <div className="meal-name">{suggestion.mealName}</div>
                      <div className="meal-meta">{suggestion.suggestedByName} suggested</div>
                    </div>
                    <AvatarStack memberIds={suggestion.votes || []} members={members} />
                  </div>
                )
              })
            )}

            {/* Chef can pick meal */}
            {isChef && suggestions.length > 0 && (
              <Link 
                to="/pick-meal" 
                className="btn btn-primary"
                style={{ marginTop: 16 }}
              >
                Pick Tonight's Meal
              </Link>
            )}
          </div>
        </>
      )}
      
      <TabBar />
    </div>
  )
}

// Legacy routes redirect to unified Today
function TodayDecided() {
  return <Navigate to="/" replace />
}

function TodayUndecided() {
  return <Navigate to="/" replace />
}

function TodayNoChef() {
  return <Navigate to="/" replace />
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
  const { meals, loading: mealsLoading } = useMeals()
  const { suggestions, suggestMeal } = useDay()
  const [selected, setSelected] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Filter out meals already suggested
  const alreadySuggestedIds = suggestions.map(s => s.mealId)
  const availableMeals = meals.filter(m => !alreadySuggestedIds.includes(m.id))

  const handleSuggest = async () => {
    if (!selected) return
    
    const meal = meals.find(m => m.id === selected)
    if (!meal) return

    setSubmitting(true)
    setError('')

    try {
      await suggestMeal(meal)
      navigate('/')
    } catch (err) {
      console.error('Suggest error:', err)
      setError(err.message || 'Failed to suggest meal')
      setSubmitting(false)
    }
  }

  return (
    <div className="screen">
      <div className="back-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Suggest for Tonight</h1>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Pick a meal to suggest, or add a new one.
      </p>

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

      {mealsLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Loading meals...
        </div>
      ) : availableMeals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            {meals.length === 0 
              ? "No meals in your library yet."
              : "All meals have been suggested already!"}
          </p>
        </div>
      ) : (
        availableMeals.map(meal => (
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
          style={{ opacity: selected && !submitting ? 1 : 0.5 }}
          onClick={handleSuggest}
          disabled={!selected || submitting}
        >
          {submitting ? 'Suggesting...' : 'Suggest This'}
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
  const { suggestions, pickMeal, isChef, loading } = useDay()
  const [selected, setSelected] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Redirect if not chef
  if (!loading && !isChef) {
    return <Navigate to="/" replace />
  }

  const handlePick = async () => {
    if (!selected) return
    
    const suggestion = suggestions.find(s => s.id === selected)
    if (!suggestion) return

    setSubmitting(true)

    try {
      await pickMeal(suggestion)
      navigate('/confirm')
    } catch (err) {
      console.error('Pick meal error:', err)
      alert(err.message || 'Failed to pick meal')
      setSubmitting(false)
    }
  }

  // Format today
  const today = new Date()
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })

  return (
    <div className="screen">
      <div className="back-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Pick Tonight's Meal</h1>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        You're cooking {dayName}. What's it gonna be?
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Loading...
        </div>
      ) : suggestions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)' }}>No suggestions yet. Wait for your family to suggest meals!</p>
        </div>
      ) : (
        suggestions.map(suggestion => (
          <div 
            key={suggestion.id} 
            className={`radio-card ${selected === suggestion.id ? 'selected' : ''}`}
            onClick={() => setSelected(suggestion.id)}
            style={{ flexWrap: 'wrap', gap: 12 }}
          >
            <div className="radio-circle" />
            <div className="meal-info" style={{ flex: 1, minWidth: 100 }}>
              <div className="meal-name">{suggestion.mealName}</div>
              <div className="meal-meta">{suggestion.suggestedByName} suggested</div>
            </div>
            <AvatarStack memberIds={suggestion.votes || []} members={members} size={24} />
          </div>
        ))
      )}

      <div style={{ marginTop: 24 }}>
        <button 
          onClick={handlePick}
          disabled={!selected || submitting}
          className={`btn ${selected ? 'btn-primary' : 'btn-secondary'}`}
          style={{ opacity: selected && !submitting ? 1 : 0.5 }}
        >
          {submitting ? 'Picking...' : 'Pick This One'}
        </button>
      </div>
    </div>
  )
}

// Confirm Screen
function Confirm() {
  const navigate = useNavigate()
  const { day } = useDay()
  
  return (
    <div className="screen">
      <div className="celebration">
        <div className="emoji">🎉</div>
        <h2>{day?.decidedMealName || 'Dinner'} it is!</h2>
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
              <Today />
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
