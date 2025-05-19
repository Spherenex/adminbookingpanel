// Add this to your AuthContext.js file to ensure user data is always saved

import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import { ref, set, get, serverTimestamp } from 'firebase/database';
import { auth, database } from '../firebase';

// Create the context
const AuthContext = createContext();

// Create the provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Save user to database function
  const saveUserToDatabase = async (user, additionalData = {}) => {
    if (!user) return;
    
    try {
      // First check if the user already exists
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        // User exists, update last login time and any new data
        const userData = snapshot.val();
        
        // Update user data
        await set(userRef, {
          ...userData,
          lastLogin: serverTimestamp(),
          // Include any new data that might have changed
          email: user.email || userData.email,
          name: user.displayName || additionalData.name || userData.name,
          // If there's a new profile picture, update it
          ...(user.photoURL && { profileImageUrl: user.photoURL }),
          // Add any additional data provided
          ...additionalData,
          // Make sure we keep the ID consistent
          id: user.uid
        });
        
        console.log("User data updated in database");
      } else {
        // User doesn't exist, create new record
        await set(userRef, {
          id: user.uid,
          name: user.displayName || additionalData.name || (user.email ? user.email.split('@')[0] : 'New User'),
          email: user.email || '',
          profileImageUrl: user.photoURL || '',
          role: additionalData.role || 'user',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          // Add any additional data
          ...additionalData
        });
        
        console.log("New user created in database");
      }
    } catch (error) {
      console.error("Error saving user data:", error);
      setError("Failed to save user data. Please try again.");
    }
  };

  // Login with email
  const login = async (email, password) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Save user to database with name extracted from email if not available
      const displayName = email.split('@')[0]; 
      await saveUserToDatabase(userCredential.user, { 
        name: displayName,
        lastLoginMethod: 'email' 
      });
      
      return userCredential.user;
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
      throw error;
    }
  };

  // Register with email
  const register = async (email, password, name) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Save user to database with provided name
      await saveUserToDatabase(userCredential.user, { 
        name: name,
        createdWith: 'email',
        isNewUser: true
      });
      
      return userCredential.user;
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.message);
      throw error;
    }
  };

  // Google sign in
  const signInWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Save user to database
      await saveUserToDatabase(result.user, {
        loginProvider: 'google.com',
        lastLoginMethod: 'google'
      });
      
      return result.user;
    } catch (error) {
      console.error("Google sign in error:", error);
      setError(error.message);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      setError(error.message);
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        // Update database on each sign in
        await saveUserToDatabase(user);
        setCurrentUser(user);
      } else {
        // User is signed out
        setCurrentUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  // Context value
  const value = {
    currentUser,
    login,
    register,
    signInWithGoogle,
    logout,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook for using the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext;