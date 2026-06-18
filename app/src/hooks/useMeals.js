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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useFamily } from '../contexts/FamilyContext'
import { useAuth } from '../contexts/AuthContext'

// Resize image to square with max dimensions
async function resizeImage(file, maxSize = 1200) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Calculate dimensions for square crop from center
      const size = Math.min(img.width, img.height)
      const x = (img.width - size) / 2
      const y = (img.height - size) / 2
      
      // Scale down if larger than maxSize
      const outputSize = Math.min(size, maxSize)
      canvas.width = outputSize
      canvas.height = outputSize
      
      ctx.drawImage(img, x, y, size, size, 0, 0, outputSize, outputSize)
      
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    }
    
    img.src = URL.createObjectURL(file)
  })
}

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
  const addMeal = async ({ name, note, imageFile }) => {
    if (!familyId || !user) throw new Error('Not authenticated')

    const mealsRef = collection(db, 'families', familyId, 'meals')
    
    // Create the meal doc first to get the ID
    const mealDoc = {
      name: name.trim(),
      note: note?.trim() || null,
      imageUrl: null,
      addedBy: user.uid,
      addedByName: user.displayName || 'Unknown',
      favoritedBy: [], // Array of userIds who favorited this
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(mealsRef, mealDoc)
    
    // If there's an image, upload it and update the doc
    if (imageFile) {
      const resizedBlob = await resizeImage(imageFile, 1200)
      const storageRef = ref(storage, `meals/${familyId}/${docRef.id}.jpg`)
      await uploadBytes(storageRef, resizedBlob, { contentType: 'image/jpeg' })
      const imageUrl = await getDownloadURL(storageRef)
      
      await updateDoc(docRef, { imageUrl })
    }

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

  // Update an existing meal
  const updateMeal = async (mealId, { name, note, imageFile, removeImage }) => {
    if (!familyId || !user) throw new Error('Not authenticated')

    const mealRef = doc(db, 'families', familyId, 'meals', mealId)
    
    const updates = {
      name: name.trim(),
      note: note?.trim() || null,
    }

    // Handle image changes
    if (removeImage) {
      updates.imageUrl = null
      // TODO: Could also delete from storage, but leaving for now
    } else if (imageFile) {
      const resizedBlob = await resizeImage(imageFile, 1200)
      const storageRef = ref(storage, `meals/${familyId}/${mealId}.jpg`)
      await uploadBytes(storageRef, resizedBlob, { contentType: 'image/jpeg' })
      updates.imageUrl = await getDownloadURL(storageRef)
    }

    await updateDoc(mealRef, updates)
  }

  return {
    meals,
    loading,
    addMeal,
    updateMeal,
    deleteMeal,
    toggleFavorite,
    isFavorite,
    getMeals,
  }
}
