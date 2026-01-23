import { createContext, useContext, useEffect, useState } from 'react'
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  updateDoc,
  deleteDoc,
  arrayRemove,
  collectionGroup
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './AuthContext'

const FamilyContext = createContext(null)

export function useFamily() {
  const context = useContext(FamilyContext)
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider')
  }
  return context
}

// Generate random invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1 to avoid confusion
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function FamilyProvider({ children }) {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [family, setFamily] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const familyId = userProfile?.familyId

  // Load family and members when familyId changes
  useEffect(() => {
    // Wait for auth to finish loading first
    if (authLoading) {
      return
    }

    if (!familyId) {
      setFamily(null)
      setMembers([])
      setLoading(false)
      return
    }

    setLoading(true)

    // Listen to family doc
    const familyRef = doc(db, 'families', familyId)
    const unsubFamily = onSnapshot(familyRef, (doc) => {
      if (doc.exists()) {
        setFamily({ id: doc.id, ...doc.data() })
      } else {
        setFamily(null)
      }
    })

    // Listen to members subcollection
    const membersRef = collection(db, 'families', familyId, 'members')
    const unsubMembers = onSnapshot(membersRef, (snapshot) => {
      const membersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setMembers(membersList)
      setLoading(false)
    })

    return () => {
      unsubFamily()
      unsubMembers()
    }
  }, [familyId, authLoading])

  // Create a new family
  const createFamily = async (familyName) => {
    if (!user || !userProfile) throw new Error('Must be logged in')

    const inviteCode = generateInviteCode()
    const familyRef = doc(collection(db, 'families'))
    
    // Create family doc
    await setDoc(familyRef, {
      name: familyName,
      inviteCode: inviteCode,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
    })

    // Add current user as admin member
    const memberRef = doc(db, 'families', familyRef.id, 'members', user.uid)
    await setDoc(memberRef, {
      name: userProfile.name,
      avatar: userProfile.avatar || '👤',
      role: 'admin',
      joinedAt: new Date().toISOString(),
    })

    // Update user's familyId
    const userRef = doc(db, 'users', user.uid)
    await updateDoc(userRef, { familyId: familyRef.id })

    return { familyId: familyRef.id, inviteCode }
  }

  // Join an existing family by invite code
  const joinFamily = async (inviteCode) => {
    if (!user || !userProfile) throw new Error('Must be logged in')

    // Find family by invite code
    const familiesRef = collection(db, 'families')
    const q = query(familiesRef, where('inviteCode', '==', inviteCode.toUpperCase()))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      throw new Error('Invalid invite code')
    }

    const familyDoc = snapshot.docs[0]
    const familyId = familyDoc.id

    // Check if already a member
    const memberRef = doc(db, 'families', familyId, 'members', user.uid)
    const memberDoc = await getDoc(memberRef)
    
    if (memberDoc.exists()) {
      throw new Error('You are already a member of this family')
    }

    // Add user as member
    await setDoc(memberRef, {
      name: userProfile.name,
      avatar: userProfile.avatar || '👤',
      role: 'member',
      joinedAt: new Date().toISOString(),
    })

    // Update user's familyId
    const userRef = doc(db, 'users', user.uid)
    await updateDoc(userRef, { familyId: familyId })

    return { familyId, familyName: familyDoc.data().name }
  }

  // Get current user's member record
  const currentMember = members.find(m => m.id === user?.uid)
  const isAdmin = currentMember?.role === 'admin'

  // Remove a member from the family (admin only)
  const removeMember = async (memberId) => {
    if (!user || !familyId) throw new Error('Not authenticated')
    if (!isAdmin) throw new Error('Only admins can remove members')
    if (memberId === user.uid) throw new Error('You cannot remove yourself')

    // 1. Clean up days where this member was the chef
    const daysRef = collection(db, 'families', familyId, 'days')
    const daysQuery = query(daysRef, where('chefId', '==', memberId))
    const daysSnapshot = await getDocs(daysQuery)
    
    for (const dayDoc of daysSnapshot.docs) {
      await updateDoc(dayDoc.ref, {
        chefId: null,
        chefName: null,
        decidedMealId: null,
        decidedMealName: null,
        decidedAt: null
      })
    }

    // 2. Remove their votes from all suggestions (scan all days)
    const allDaysSnapshot = await getDocs(daysRef)
    for (const dayDoc of allDaysSnapshot.docs) {
      const suggestionsRef = collection(dayDoc.ref, 'suggestions')
      const suggestionsSnapshot = await getDocs(suggestionsRef)
      
      for (const suggestionDoc of suggestionsSnapshot.docs) {
        const votes = suggestionDoc.data().votes || []
        if (votes.includes(memberId)) {
          await updateDoc(suggestionDoc.ref, {
            votes: arrayRemove(memberId)
          })
        }
      }
    }

    // 3. Delete from members subcollection
    const memberRef = doc(db, 'families', familyId, 'members', memberId)
    await deleteDoc(memberRef)

    // 4. Clear their familyId in users collection (so they can join another family)
    try {
      const userRef = doc(db, 'users', memberId)
      await updateDoc(userRef, { familyId: null })
    } catch (err) {
      // User doc might not exist anymore, that's ok
      console.log('Could not update user doc:', err)
    }
  }

  // Update current user's avatar
  const updateAvatar = async (newAvatar) => {
    if (!user) throw new Error('Not authenticated')

    // Update user doc
    const userRef = doc(db, 'users', user.uid)
    await updateDoc(userRef, { avatar: newAvatar })

    // Update member doc if in a family
    if (familyId) {
      const memberRef = doc(db, 'families', familyId, 'members', user.uid)
      await updateDoc(memberRef, { avatar: newAvatar })
    }
  }

  const value = {
    family,
    members,
    currentMember,
    loading,
    hasFamily: !!familyId,
    isAdmin,
    createFamily,
    joinFamily,
    removeMember,
    updateAvatar,
  }

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  )
}
