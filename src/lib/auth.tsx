import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export type Role = "admin" | "editor" | "viewer";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  client_ids: string[];
  capacity_videos_per_week?: number;
  active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  signInWithGoogle: async () => {},
  logOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch custom user doc
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setAppUser(userDoc.data() as AppUser);
        } else {
          // If thor4tech@gmail.com, auto-create as admin
          const isAdmin = firebaseUser.email === "thor4tech@gmail.com";
          const newAppUser: AppUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || "",
            role: isAdmin ? "admin" : "viewer",
            client_ids: [],
            active: true,
            created_at: new Date().toISOString()
          };
          // Try to create it - if not admin, this might fail unless rules allow thor4tech@gmail.com explicitly
          try {
             await setDoc(userDocRef, newAppUser);
             setAppUser(newAppUser);
          } catch (error) {
             console.error("Failed to create user doc", error);
          }
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, appUser, loading, signInWithGoogle, logOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
