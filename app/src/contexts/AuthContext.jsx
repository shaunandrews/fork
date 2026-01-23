import { createContext, useContext, useEffect, useState } from 'react'
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      
      if (firebaseUser) {
        // Listen to user profile from Firestore (real-time updates for familyId changes)
        const userRef = doc(db, 'users', firebaseUser.uid)
        const unsubProfile = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUserProfile(doc.data())
          }
          setLoading(false)
        })
        return unsubProfile
      } else {
        setUserProfile(null)
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  const signUp = async (email, password, name, avatar = '👤') => {
    // Create auth account
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)
    console.log('Auth account created:', newUser.uid)
    
    // Update display name
    await updateProfile(newUser, { displayName: name })
    console.log('Display name updated')
    
    // Create user document in Firestore
    const userDoc = {
      email: newUser.email,
      name: name,
      avatar: avatar,
      familyId: null,
      createdAt: new Date().toISOString(),
    }
    
    try {
      await setDoc(doc(db, 'users', newUser.uid), userDoc)
      console.log('Firestore user doc created')
    } catch (firestoreError) {
      console.error('Firestore write failed:', firestoreError.code, firestoreError.message)
      // Continue anyway - auth worked, Firestore might have permission issues
    }
    
    setUserProfile(userDoc)
    return newUser
  }

  const signIn = async (email, password) => {
    const { user: loggedInUser } = await signInWithEmailAndPassword(auth, email, password)
    return loggedInUser
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUserProfile(null)
  }

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
