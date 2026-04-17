import * as React from 'react';
import { auth, googleProvider, signInWithPopup, signOut, db, doc, getDoc, setDoc, getDocFromServer } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isConnected: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isConnected, setIsConnected] = React.useState(true);

  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        // We just need to see if we can reach the server
        await getDocFromServer(doc(db, '_connection_test_', 'ping'));
        setIsConnected(true);
      } catch (error: any) {
        // If it's a permission error, it means we reached the server but rules blocked us
        // If it's "offline", it means we couldn't reach the server
        if (error?.message?.includes('offline')) {
          setIsConnected(false);
        } else {
          // Other errors (like permission denied on the test path) still mean we are "connected" to the backend
          setIsConnected(true);
        }
      }
    };
    checkConnection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          // Sync photoURL if it exists in auth but not in profile
          if (user.photoURL && !profile.photoURL) {
            const updatedProfile = { ...profile, photoURL: user.photoURL };
            await setDoc(userDocRef, updatedProfile, { merge: true });
            setUserProfile(updatedProfile);
          } else {
            setUserProfile(profile);
          }
        } else {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'User',
            photoURL: user.photoURL || undefined,
            preferredCurrency: 'USD',
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, newProfile);
          setUserProfile(newProfile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isConnected, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
