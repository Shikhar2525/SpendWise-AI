import * as React from 'react';
import { auth, googleProvider, signInWithPopup, signOut, db, doc, getDoc, setDoc, getDocFromServer } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isConnected: boolean;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  markTutorialSeen: () => Promise<void>;
  redeemCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  updatePlan: (plan: 'Essential' | 'Intelligent' | 'Architect', months?: number) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isConnected, setIsConnected] = React.useState(true);
  const isAdmin = user?.email === 'shikhar.mandloi@gmail.com';

  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        await getDocFromServer(doc(db, '_connection_test_', 'ping'));
        setIsConnected(true);
      } catch (error: any) {
        if (error?.message?.includes('offline')) {
          setIsConnected(false);
        } else {
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
          let updated = false;
          let updatedProfile = { ...profile };

          if (user.photoURL && !profile.photoURL) {
            updatedProfile.photoURL = user.photoURL;
            updated = true;
          }

          if (profile.hasSeenTutorial === undefined) {
            updatedProfile.hasSeenTutorial = false;
            updated = true;
          }

          if (profile.plan === undefined) {
            updatedProfile.plan = 'Essential';
            updated = true;
          }

          if (isAdmin && profile.role !== 'admin') {
            updatedProfile.role = 'admin';
            updated = true;
          }

          // Check for plan expiration
          if (profile.plan !== 'Essential' && profile.planExpiresAt) {
            if (new Date(profile.planExpiresAt) < new Date()) {
              updatedProfile.plan = 'Essential';
              updatedProfile.planExpiresAt = null;
              updated = true;
            }
          }

          if (updated) {
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
            hasSeenTutorial: false,
            plan: 'Essential',
            role: isAdmin ? 'admin' : 'user',
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

  const markTutorialSeen = async () => {
    if (!user || !userProfile) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { hasSeenTutorial: true }, { merge: true });
      setUserProfile({ ...userProfile, hasSeenTutorial: true });
    } catch (error) {
      console.error('Error marking tutorial as seen:', error);
    }
  };

  const updatePlan = async (plan: 'Essential' | 'Intelligent' | 'Architect', months?: number) => {
    if (!user || !userProfile) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      let expiresAt = null;
      if (months) {
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        expiresAt = date.toISOString();
      }
      const updates = { plan, planExpiresAt: expiresAt };
      await setDoc(userDocRef, updates, { merge: true });
      setUserProfile({ ...userProfile, ...updates });
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  const redeemCoupon = async (code: string) => {
    if (!user || !userProfile) return { success: false, message: 'Not logged in' };
    
    if (code === 'SPENDWISENEW100') {
      await updatePlan('Intelligent', 1);
      return { success: true, message: 'Coupon redeemed! You now have 1 month of Intelligent features.' };
    }
    
    return { success: false, message: 'Invalid coupon code' };
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isConnected, isAdmin, signIn, logout, markTutorialSeen, updatePlan, redeemCoupon }}>
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
