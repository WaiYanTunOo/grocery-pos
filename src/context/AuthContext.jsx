import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase.js';
import { defaultStoreId } from '../firebase.js';
import { writeAudit } from '../services/firestoreService.js';
import { formatAuthError } from '../utils/authErrors.js';
import { normalizeRole, resolveUserRole } from '../utils/roles.js';

const AuthContext = createContext(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}

function userRef(uid) {
  return doc(db, 'users', uid);
}

async function loadUserProfile(firebaseUser) {
  const snapshot = await getDoc(userRef(firebaseUser.uid));
  if (!snapshot.exists()) {
    const profile = {
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email,
      role: 'cashier',
      status: 'active',
      storeId: defaultStoreId,
      createdAt: Date.now()
    };
    await setDoc(userRef(firebaseUser.uid), profile);
    return profile;
  }
  const profile = snapshot.data();
  return {
    ...profile,
    role: resolveUserRole(profile, firebaseUser)
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthError('');
      setLoading(true);
      try {
        if (!currentUser) {
          setUser(null);
          setProfile(null);
          return;
        }
        const nextProfile = await loadUserProfile(currentUser);
        await updateDoc(userRef(currentUser.uid), { lastSeenAt: Date.now() }).catch(() => {});
        setUser(currentUser);
        setProfile(nextProfile);
      } catch (error) {
        console.error(error);
        const formatted = formatAuthError(error);
        setAuthError(`${formatted.title} - ${formatted.body}`);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => {
      const resolvedRole = resolveUserRole(profile, user);
      const resolvedStoreId = profile?.storeId || defaultStoreId;
      return {
        user,
        profile,
        role: resolvedRole,
        storeId: resolvedStoreId,
        loading,
        authError,
        isAdmin: resolvedRole === 'admin',
        async login(email, password) {
          const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
          await writeAudit(resolvedStoreId, credential.user, 'LOGIN', `${credential.user.email} logged in`);
        },
        async register({ email, password, displayName, requestedRole, setupCode }) {
          const cleanEmail = email.trim();
          const requested = normalizeRole(requestedRole);
          const setupCodeFromEnv = import.meta.env.VITE_MANAGER_SETUP_CODE;
          const setupCodeMatches = setupCodeFromEnv && setupCode === setupCodeFromEnv;
          const canCreateAdmin = requested === 'admin' && (!setupCodeFromEnv || setupCodeMatches);

          if (requested === 'admin' && !canCreateAdmin) {
            throw new Error('ADMIN_SETUP_CODE_REQUIRED');
          }

          const role = canCreateAdmin ? 'admin' : 'cashier';
          const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          if (displayName) await updateProfile(credential.user, { displayName });

          await setDoc(userRef(credential.user.uid), {
            email: cleanEmail,
            displayName: displayName || cleanEmail,
            role,
            status: 'active',
            storeId: defaultStoreId,
            createdAt: Date.now(),
            createdAtServer: serverTimestamp()
          });
          await writeAudit(defaultStoreId, credential.user, 'REGISTER', `${cleanEmail} registered as ${role}`);
        },
        async logout() {
          if (user) await writeAudit(resolvedStoreId, user, 'LOGOUT', `${user.email} logged out`).catch(() => {});
          await signOut(auth);
        }
      };
    },
    [authError, loading, profile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
