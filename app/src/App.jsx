import { BrowserRouter, Routes, Route, NavLink, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './screens/Login'
import { Signup } from './screens/Signup'
import './index.css'

// Family members (will come from Firestore later)
const family = [
  { id: 'shaun', name: 'Shaun', avatar: '👨' },
  { id: 'amy', name: 'Amy', avatar: '👩' },
  { id: 'mason', name: 'Mason', avatar: '👦' },
  { id: 'emma', name: 'Emma', avatar: '👧' },
  { id: 'olivia', name: 'Olivia', avatar: '👧' },
]

const currentUser = family[0] // Shaun

// Mock data - Meal library (no votes here)
const mealLibrary = [
  { id: 1, name: 'Tacos', addedBy: 'amy' },
  { id: 2, name: 'Spaghetti & Meatballs', addedBy: 'shaun' },
  { id: 3, name: 'Mac & Cheese', addedBy: 'mason' },
  { id: 4, name: 'Chicken Stir Fry', addedBy: 'amy' },
  { id: 5, name: 'Grilled Cheese & Soup', addedBy: 'shaun' },
  { id: 6, name: 'Pizza (homemade)', addedBy: 'mason' },
  { id: 7, name: 'Burgers', addedBy: 'shaun' },
  { id: 8, name: 'Chicken Parm', addedBy: 'amy' },
]

// Tonight's suggestions (with who voted)
const initialSuggestions = [
  { id: 1, name: 'Tacos', suggestedBy: 'amy', votedBy: ['amy', 'mason', 'emma'] },
  { id: 2, name: 'Spaghetti & Meatballs', suggestedBy: 'shaun', votedBy: ['shaun', 'olivia'] },
  { id: 3, name: 'Mac & Cheese', suggestedBy: 'mason', votedBy: ['mason'] },
  { id: 4, name: 'Chicken Stir Fry', suggestedBy: 'amy', votedBy: [] },
]

const weekData = [
  { day: 'Mon', date: 20, chef: 'Amy', meal: 'Tacos' },
  { day: 'Tue', date: 21, chef: 'Shaun', meal: 'Spaghetti' },
  { day: 'Wed', date: 22, chef: 'Amy', meal: 'Stir Fry' },
  { day: 'Thu', date: 23, chef: 'Amy', meal: null, isToday: true },
  { day: 'Fri', date: 24, chef: null, meal: null },
  { day: 'Sat', date: 25, chef: 'Shaun', meal: null },
  { day: 'Sun', date: 26, chef: null, meal: null },
]

// Helper to get family member by id
const getMember = (id) => family.find(m => m.id === id) || family[0]

// Avatar Stack Component
function AvatarStack({ memberIds, size = 28 }) {
  if (memberIds.length === 0) {
    return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No votes yet</span>
  }
  
  return (
    <div style={{ display: 'flex', marginLeft: 8 }}>
      {memberIds.map((id, i) => (
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
          title={getMember(id).name}
        >
          {getMember(id).avatar}
        </div>
      ))}
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

// Today Screen - Decided
function TodayDecided() {
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
        <p>Amy is cooking</p>
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

// Today Screen - Undecided (shows tonight's suggestions with voting)
function TodayUndecided() {
  const [suggestions, setSuggestions] = useState(initialSuggestions)

  const toggleVote = (mealId) => {
    setSuggestions(prev => prev.map(meal => {
      if (meal.id !== mealId) return meal
      
      const hasVoted = meal.votedBy.includes(currentUser.id)
      return {
        ...meal,
        votedBy: hasVoted 
          ? meal.votedBy.filter(id => id !== currentUser.id)
          : [...meal.votedBy, currentUser.id]
      }
    }))
  }

  // Sort by vote count
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
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Amy is cooking · Vote for your pick</p>
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Suggestions</h3>
          <Link to="/suggest-meal" style={{ color: 'var(--accent)', fontSize: 14, textDecoration: 'none' }}>+ Suggest</Link>
        </div>

        {sortedSuggestions.map(meal => {
          const hasVoted = meal.votedBy.includes(currentUser.id)
          return (
            <div key={meal.id} className="meal-card" style={{ flexWrap: 'wrap' }}>
              <VoteButton voted={hasVoted} onToggle={() => toggleVote(meal.id)} />
              <div className="meal-info" style={{ flex: 1, minWidth: 120 }}>
                <div className="meal-name">{meal.name}</div>
                <div className="meal-meta">{getMember(meal.suggestedBy).name} suggested</div>
              </div>
              <AvatarStack memberIds={meal.votedBy} />
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

// Meals Screen - Library (no voting, just browse/favorite)
function Meals() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [favorites, setFavorites] = useState({ 1: true, 2: true, 5: true })

  const toggleFavorite = (id) => {
    setFavorites(f => ({ ...f, [id]: !f[id] }))
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>Meals</h1>
        <Link to="/add-meal" className="header-btn">+</Link>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
        Your family's meal ideas. Suggest one for tonight from here.
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

      {mealLibrary
        .filter(meal => {
          if (activeFilter === 'favorites') return favorites[meal.id]
          if (activeFilter === 'mine') return meal.addedBy === currentUser.id
          return true
        })
        .map(meal => (
          <div key={meal.id} className="meal-card">
            <div className="meal-info">
              <div className="meal-name">{meal.name}</div>
              <div className="meal-meta">Added by {getMember(meal.addedBy).name}</div>
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
              {favorites[meal.id] ? '❤️' : '🤍'}
            </button>
          </div>
        ))
      }

      <TabBar />
    </div>
  )
}

// Suggest Meal Screen - Pick from library to suggest for tonight
function SuggestMeal() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)

  // Filter out meals already suggested for tonight
  const alreadySuggested = initialSuggestions.map(m => m.id)
  const availableMeals = mealLibrary.filter(m => !alreadySuggested.includes(m.id))

  return (
    <div className="screen">
      <div className="back-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Suggest for Tonight</h1>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Pick a meal to suggest, or add a new one.
      </p>

      {availableMeals.map(meal => (
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
      ))}

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

// Add Meal Screen - Add to library
function AddMeal() {
  const navigate = useNavigate()
  
  return (
    <div className="screen">
      <div className="back-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Add Meal</h1>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Add a new meal to your family's library.
      </p>

      <div className="form-group">
        <label className="form-label">What's the meal?</label>
        <input 
          type="text" 
          className="form-input" 
          placeholder="Beef tacos, lasagna, etc."
        />
      </div>

      <div className="form-group">
        <label className="form-label">Add a photo (optional)</label>
        <div className="photo-upload">
          📷 Tap to add photo
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Note (optional)</label>
        <textarea 
          className="form-input" 
          placeholder="The good corn tortillas from Wegmans..."
        />
      </div>

      <button className="btn btn-primary" onClick={() => navigate('/meals')}>
        Add to Library
      </button>
    </div>
  )
}

// Week Screen
function Week() {
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

// Pick Meal Screen (Chef view)
function PickMeal() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  
  // Sort by votes
  const sortedSuggestions = [...initialSuggestions].sort((a, b) => b.votedBy.length - a.votedBy.length)

  return (
    <div className="screen">
      <div className="back-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Pick Tonight's Meal</h1>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        You're cooking Thursday. What's it gonna be?
      </p>

      {sortedSuggestions.map(meal => (
        <div 
          key={meal.id} 
          className={`radio-card ${selected === meal.id ? 'selected' : ''}`}
          onClick={() => setSelected(meal.id)}
          style={{ flexWrap: 'wrap', gap: 12 }}
        >
          <div className="radio-circle" />
          <div className="meal-info" style={{ flex: 1, minWidth: 100 }}>
            <div className="meal-name">{meal.name}</div>
            <div className="meal-meta">{getMember(meal.suggestedBy).name} suggested</div>
          </div>
          <AvatarStack memberIds={meal.votedBy} size={24} />
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

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }
  
  return (
    <div className="screen">
      <div className="back-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Profile</h1>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>{userProfile?.avatar || currentUser.avatar}</div>
        <h2 style={{ marginBottom: 4 }}>{userProfile?.name || currentUser.name}</h2>
        <p style={{ color: 'var(--text-muted)' }}>Andrews Family</p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-muted)' }}>YOUR STATS</h3>
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>12</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Meals added</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>8</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nights cooked</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>5</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Favorites</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-muted)' }}>FAMILY</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {family.filter(m => m.id !== currentUser.id).map(member => (
            <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 32 }}>{member.avatar}</span>
              <span>{member.name}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-secondary" style={{ marginTop: 8 }}>
        Invite Family Member
      </button>

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

// Onboarding placeholder (will build in Phase 2)
function Onboarding() {
  const { userProfile } = useAuth()
  
  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh', paddingBottom: 0 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>👋</div>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Welcome, {userProfile?.name || 'there'}!</h1>
        <p style={{ color: 'var(--text-muted)' }}>Let's get your family set up.</p>
      </div>

      <Link to="/" className="btn btn-primary">
        Continue to App (Demo)
      </Link>
      
      <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-muted)', fontSize: 14 }}>
        Family creation/join coming in Phase 2
      </p>
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
        
        {/* Protected routes */}
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <TodayDecided />
          </ProtectedRoute>
        } />
        <Route path="/today-undecided" element={
          <ProtectedRoute>
            <TodayUndecided />
          </ProtectedRoute>
        } />
        <Route path="/today-no-chef" element={
          <ProtectedRoute>
            <TodayNoChef />
          </ProtectedRoute>
        } />
        <Route path="/meals" element={
          <ProtectedRoute>
            <Meals />
          </ProtectedRoute>
        } />
        <Route path="/suggest-meal" element={
          <ProtectedRoute>
            <SuggestMeal />
          </ProtectedRoute>
        } />
        <Route path="/add-meal" element={
          <ProtectedRoute>
            <AddMeal />
          </ProtectedRoute>
        } />
        <Route path="/week" element={
          <ProtectedRoute>
            <Week />
          </ProtectedRoute>
        } />
        <Route path="/pick-meal" element={
          <ProtectedRoute>
            <PickMeal />
          </ProtectedRoute>
        } />
        <Route path="/confirm" element={
          <ProtectedRoute>
            <Confirm />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
