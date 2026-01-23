import { useState, useEffect } from 'react'
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useFamily } from '../contexts/FamilyContext'
import { useAuth } from '../contexts/AuthContext'

export function useMeals() {
  const { family } = useFamily()
  const { user } = useAuth()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  const familyId = family?.id

  // Subscribe to meals collection
  useEffect(() => {
    if (!familyId) {
      setMeals([])
      setLoading(false)
      return
    }

    setLoading(true)
    
    const mealsRef = collection(db, 'families', familyId, 'meals')
    const q = query(mealsRef, orderBy('createdAt', 'desc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mealsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setMeals(mealsList)
      setLoading(false)
    }, (error) => {
      console.error('Error loading meals:', error)
      setLoading(false)
    })

    return unsubscribe
  }, [familyId])

  // Add a new meal to the library
  const addMeal = async ({ name, note, photo }) => {
    if (!familyId || !user) throw new Error('Not authenticated')

    const mealsRef = collection(db, 'families', familyId, 'meals')
    
    const mealDoc = {
      name: name.trim(),
      note: note?.trim() || null,
      photo: photo || null,
      addedBy: user.uid,
      addedByName: user.displayName || 'Unknown',
      favoritedBy: [], // Array of userIds who favorited this
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(mealsRef, mealDoc)
    return docRef.id
  }

  // Delete a meal
  const deleteMeal = async (mealId) => {
    if (!familyId) throw new Error('No family')
    
    const mealRef = doc(db, 'families', familyId, 'meals', mealId)
    await deleteDoc(mealRef)
  }

  // Toggle favorite for current user
  const toggleFavorite = async (mealId) => {
    if (!familyId || !user) throw new Error('Not authenticated')

    const meal = meals.find(m => m.id === mealId)
    if (!meal) return

    const mealRef = doc(db, 'families', familyId, 'meals', mealId)
    const isFavorited = meal.favoritedBy?.includes(user.uid)

    await updateDoc(mealRef, {
      favoritedBy: isFavorited 
        ? arrayRemove(user.uid)
        : arrayUnion(user.uid)
    })
  }

  // Check if current user favorited a meal
  const isFavorite = (mealId) => {
    const meal = meals.find(m => m.id === mealId)
    return meal?.favoritedBy?.includes(user?.uid) || false
  }

  // Get meals filtered by type
  const getMeals = (filter = 'all') => {
    switch (filter) {
      case 'favorites':
        return meals.filter(m => m.favoritedBy?.includes(user?.uid))
      case 'mine':
        return meals.filter(m => m.addedBy === user?.uid)
      default:
        return meals
    }
  }

  return {
    meals,
    loading,
    addMeal,
    deleteMeal,
    toggleFavorite,
    isFavorite,
    getMeals,
  }
}
