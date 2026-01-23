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
  updateDoc
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
  const { user, userProfile } = useAuth()
  const [family, setFamily] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const familyId = userProfile?.familyId

  // Load family and members when familyId changes
  useEffect(() => {
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
  }, [familyId])

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

  const value = {
    family,
    members,
    currentMember,
    loading,
    hasFamily: !!familyId,
    createFamily,
    joinFamily,
  }

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  )
}
