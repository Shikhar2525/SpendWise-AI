import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { toast } from 'sonner';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export let isFirebaseConnected = false;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Provide user-friendly toast feedback
  if (errorMessage.includes('permission-denied')) {
    toast.error('Access Denied: You do not have permission for this action.');
  } else if (errorMessage.includes('not-found')) {
    toast.error('Resource not found.');
  } else {
    toast.error(`Operation failed: ${operationType}. Please try again.`);
  }

  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    // Try to fetch a document to verify connection
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firebase connection successful.");
    isFirebaseConnected = true;
  } catch (error) {
    console.error("Firebase Connection Error:", error);
    isFirebaseConnected = false;
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error("Firestore is unable to reach the backend. This usually means:");
        console.error("1. Firestore is not enabled in your Firebase Console.");
        console.error("2. The Project ID 'spendwise-ai-83b2d' is incorrect.");
        console.error("3. You are using a named database instead of '(default)'.");
      }
    }
  }
}
testConnection();

export { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  onSnapshot,
  signInWithPopup,
  signOut,
  getDocFromServer
};
