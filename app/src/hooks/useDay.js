import { useState, useEffect } from 'react'
import { 
  doc, 
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  query,
  orderBy,
  getDocs
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useFamily } from '../contexts/FamilyContext'
import { useAuth } from '../contexts/AuthContext'

// Format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0]
}

export function useDay(date = new Date()) {
  const { family, members, currentMember } = useFamily()
  const { user } = useAuth()
  const [day, setDay] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)

  const familyId = family?.id
  const dateString = formatDate(date)

  // Subscribe to day document and suggestions
  useEffect(() => {
    if (!familyId) {
      setDay(null)
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)

    // Listen to day document
    const dayRef = doc(db, 'families', familyId, 'days', dateString)
    const unsubDay = onSnapshot(dayRef, (doc) => {
      if (doc.exists()) {
        setDay({ id: doc.id, ...doc.data() })
      } else {
        setDay(null)
      }
    })

    // Listen to suggestions subcollection
    const suggestionsRef = collection(db, 'families', familyId, 'days', dateString, 'suggestions')
    const q = query(suggestionsRef, orderBy('suggestedAt', 'desc'))
    const unsubSuggestions = onSnapshot(q, (snapshot) => {
      const suggestionsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setSuggestions(suggestionsList)
      setLoading(false)
    })

    return () => {
      unsubDay()
      unsubSuggestions()
    }
  }, [familyId, dateString])

  // Volunteer to be chef
  const volunteerAsChef = async () => {
    if (!familyId || !user || !currentMember) throw new Error('Not authenticated')

    const dayRef = doc(db, 'families', familyId, 'days', dateString)
    
    await setDoc(dayRef, {
      chefId: user.uid,
      chefName: currentMember.name,
      decidedMealId: null,
      decidedMealName: null,
      decidedAt: null,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }

  // Remove yourself as chef
  const unvolunteer = async () => {
    if (!familyId || !user) throw new Error('Not authenticated')
    if (day?.chefId !== user.uid) throw new Error('You are not the chef')

    const dayRef = doc(db, 'families', familyId, 'days', dateString)
    
    await updateDoc(dayRef, {
      chefId: null,
      chefName: null,
      decidedMealId: null,
      decidedMealName: null,
      decidedAt: null,
      updatedAt: serverTimestamp(),
    })
  }

  // Suggest a meal for today
  const suggestMeal = async (meal) => {
    if (!familyId || !user || !currentMember) throw new Error('Not authenticated')

    // First ensure the day document exists
    const dayRef = doc(db, 'families', familyId, 'days', dateString)
    await setDoc(dayRef, {
      updatedAt: serverTimestamp(),
    }, { merge: true })

    // Check if this meal is already suggested
    const existing = suggestions.find(s => s.mealId === meal.id)
    if (existing) {
      throw new Error('This meal has already been suggested')
    }

    // Add suggestion
    const suggestionsRef = collection(db, 'families', familyId, 'days', dateString, 'suggestions')
    await addDoc(suggestionsRef, {
      mealId: meal.id,
      mealName: meal.name,
      suggestedBy: user.uid,
      suggestedByName: currentMember.name,
      votes: [user.uid], // Suggester automatically votes for their suggestion
      suggestedAt: serverTimestamp(),
    })
  }

  // Remove a suggestion (only suggester can do this)
  const removeSuggestion = async (suggestionId) => {
    if (!familyId || !user) throw new Error('Not authenticated')

    const suggestion = suggestions.find(s => s.id === suggestionId)
    if (!suggestion) throw new Error('Suggestion not found')
    if (suggestion.suggestedBy !== user.uid) throw new Error('You can only remove your own suggestions')

    const suggestionRef = doc(db, 'families', familyId, 'days', dateString, 'suggestions', suggestionId)
    await deleteDoc(suggestionRef)
  }

  // Toggle vote on a suggestion
  const toggleVote = async (suggestionId) => {
    if (!familyId || !user) throw new Error('Not authenticated')

    const suggestion = suggestions.find(s => s.id === suggestionId)
    if (!suggestion) throw new Error('Suggestion not found')

    const suggestionRef = doc(db, 'families', familyId, 'days', dateString, 'suggestions', suggestionId)
    const hasVoted = suggestion.votes?.includes(user.uid)

    await updateDoc(suggestionRef, {
      votes: hasVoted ? arrayRemove(user.uid) : arrayUnion(user.uid)
    })
  }

  // Check if current user voted for a suggestion
  const hasVoted = (suggestionId) => {
    const suggestion = suggestions.find(s => s.id === suggestionId)
    return suggestion?.votes?.includes(user?.uid) || false
  }

  // Pick the winning meal (chef only)
  const pickMeal = async (suggestion) => {
    if (!familyId || !user) throw new Error('Not authenticated')
    if (day?.chefId !== user.uid) throw new Error('Only the chef can pick the meal')

    const dayRef = doc(db, 'families', familyId, 'days', dateString)
    
    await updateDoc(dayRef, {
      decidedMealId: suggestion.mealId,
      decidedMealName: suggestion.mealName,
      decidedAt: serverTimestamp(),
    })
  }

  // Undo meal selection (chef only)
  const undoMealPick = async () => {
    if (!familyId || !user) throw new Error('Not authenticated')
    if (day?.chefId !== user.uid) throw new Error('Only the chef can change the meal')

    const dayRef = doc(db, 'families', familyId, 'days', dateString)
    
    await updateDoc(dayRef, {
      decidedMealId: null,
      decidedMealName: null,
      decidedAt: null,
      updatedAt: serverTimestamp(),
    })
  }

  // Admin: Reset the chef assignment (and meal) for the day
  const adminResetChef = async () => {
    if (!familyId || !user) throw new Error('Not authenticated')
    if (currentMember?.role !== 'admin') throw new Error('Only admins can reset the chef')

    const dayRef = doc(db, 'families', familyId, 'days', dateString)
    
    await updateDoc(dayRef, {
      chefId: null,
      chefName: null,
      decidedMealId: null,
      decidedMealName: null,
      decidedAt: null,
      updatedAt: serverTimestamp(),
    })
  }

  // Admin: Reset just the meal selection (keep chef)
  const adminResetMeal = async () => {
    if (!familyId || !user) throw new Error('Not authenticated')
    if (currentMember?.role !== 'admin') throw new Error('Only admins can reset the meal')
    if (!day?.decidedMealId) throw new Error('No meal to reset')

    const dayRef = doc(db, 'families', familyId, 'days', dateString)
    
    await updateDoc(dayRef, {
      decidedMealId: null,
      decidedMealName: null,
      decidedAt: null,
      updatedAt: serverTimestamp(),
    })
  }

  // Computed values
  const isChef = day?.chefId === user?.uid
  const hasChef = !!day?.chefId
  const isDecided = !!day?.decidedMealId
  const chef = hasChef ? members.find(m => m.id === day.chefId) : null

  // Sort suggestions by vote count
  const sortedSuggestions = [...suggestions].sort((a, b) => 
    (b.votes?.length || 0) - (a.votes?.length || 0)
  )

  return {
    day,
    suggestions: sortedSuggestions,
    loading,
    // Actions
    volunteerAsChef,
    unvolunteer,
    suggestMeal,
    removeSuggestion,
    toggleVote,
    hasVoted,
    pickMeal,
    undoMealPick,
    // Admin actions
    adminResetChef,
    adminResetMeal,
    // Computed
    isChef,
    hasChef,
    isDecided,
    chef,
    dateString,
  }
}
