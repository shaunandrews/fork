import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useFamily } from '../contexts/FamilyContext'
import { COMMON_MEALS, getCategories, getMealsByCategory } from '../data/commonMeals'
import { addCommonMeals, addCommonMealsByCategory } from '../utils/initializeCommonMeals'
import { IconArrowLeft, IconCheck, IconPlus } from '@tabler/icons-react'

export function AddCommonMeals() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { familyId } = useFamily()
  const [selectedMeals, setSelectedMeals] = useState(new Set())
  const [activeCategory, setActiveCategory] = useState('All')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const categories = ['All', ...getCategories()]
  const mealsByCategory = getMealsByCategory()

  const mealsToShow = activeCategory === 'All'
    ? COMMON_MEALS
    : mealsByCategory[activeCategory] || []

  const toggleMeal = (mealName) => {
    const newSelected = new Set(selectedMeals)
    if (newSelected.has(mealName)) {
      newSelected.delete(mealName)
    } else {
      newSelected.add(mealName)
    }
    setSelectedMeals(newSelected)
  }

  const selectCategory = () => {
    if (activeCategory === 'All') {
      // Select all meals
      setSelectedMeals(new Set(COMMON_MEALS.map(m => m.name)))
    } else {
      // Select all meals in current category
      const categoryMeals = mealsByCategory[activeCategory] || []
      const newSelected = new Set(selectedMeals)
      categoryMeals.forEach(meal => newSelected.add(meal.name))
      setSelectedMeals(newSelected)
    }
  }

  const deselectCategory = () => {
    if (activeCategory === 'All') {
      // Deselect all meals
      setSelectedMeals(new Set())
    } else {
      // Deselect all meals in current category
      const categoryMeals = mealsByCategory[activeCategory] || []
      const newSelected = new Set(selectedMeals)
      categoryMeals.forEach(meal => newSelected.delete(meal.name))
      setSelectedMeals(newSelected)
    }
  }

  const handleAdd = async () => {
    if (selectedMeals.size === 0) {
      setError('Please select at least one meal')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const mealNames = Array.from(selectedMeals)
      const count = await addCommonMeals(familyId, user, mealNames)
      navigate('/meals', {
        state: { message: `Added ${count} meal${count !== 1 ? 's' : ''} to your library!` }
      })
    } catch (err) {
      console.error('Failed to add meals:', err)
      setError(err.message || 'Failed to add meals')
      setSubmitting(false)
    }
  }

  const allInCategorySelected = () => {
    const categoryMeals = activeCategory === 'All'
      ? COMMON_MEALS
      : mealsByCategory[activeCategory] || []
    return categoryMeals.every(meal => selectedMeals.has(meal.name))
  }

  return (
    <div className="screen">
      <div className="back-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IconArrowLeft size={24} stroke={2} />
        </button>
        <h1>Add Common Meals</h1>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
        Select meals to add to your family's library. Tap to select/deselect.
      </p>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
          color: '#ef4444',
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      {/* Category filters */}
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        marginBottom: 16,
        paddingBottom: 8
      }}>
        {categories.map(category => (
          <button
            key={category}
            className={`filter ${activeCategory === category ? 'active' : ''}`}
            onClick={() => setActiveCategory(category)}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Select/Deselect category button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {selectedMeals.size} selected
        </div>
        <button
          onClick={allInCategorySelected() ? deselectCategory : selectCategory}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          {allInCategorySelected() ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Meal list */}
      <div style={{ marginBottom: 80 }}>
        {mealsToShow.map(meal => (
          <div
            key={meal.name}
            className="meal-card"
            onClick={() => toggleMeal(meal.name)}
            style={{
              cursor: 'pointer',
              background: selectedMeals.has(meal.name)
                ? 'var(--surface-hover)'
                : 'var(--surface)',
              border: selectedMeals.has(meal.name)
                ? '2px solid var(--primary)'
                : '1px solid var(--border)'
            }}
          >
            <div className="meal-info">
              <div className="meal-name">{meal.name}</div>
              <div className="meal-meta">{meal.category}</div>
            </div>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: selectedMeals.has(meal.name)
                ? '2px solid var(--primary)'
                : '2px solid var(--border)',
              background: selectedMeals.has(meal.name)
                ? 'var(--primary)'
                : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {selectedMeals.has(meal.name) && (
                <IconCheck size={16} stroke={3} color="white" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed bottom button */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        zIndex: 10
      }}>
        <button
          className="btn"
          onClick={handleAdd}
          disabled={submitting || selectedMeals.size === 0}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          {submitting ? (
            'Adding...'
          ) : (
            <>
              <IconPlus size={20} stroke={2} />
              Add {selectedMeals.size} Meal{selectedMeals.size !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
