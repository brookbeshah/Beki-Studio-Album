import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { Administrator, UserRole, AdminPermissions, SUPER_ADMIN_PERMISSIONS, DEFAULT_ADMIN_PERMISSIONS } from '../types';

interface AuthContextType {
  user: User | null;
  adminProfile: Administrator | null;
  role: UserRole | null;
  permissions: AdminPermissions | null;
  isSuperAdmin: boolean;
  isAuthorizedAdmin: boolean;
  hasPermission: (key: keyof AdminPermissions) => boolean;
  loading: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<Administrator | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        await verifyAndLoadAdmin(currentUser);
      } else {
        setUser(null);
        setAdminProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const verifyAndLoadAdmin = async (currentUser: User): Promise<Administrator | null> => {
    const rawEmail = currentUser.email;
    if (!rawEmail) {
      setAuthError("Your account is not authorized to access Beki's Studio.");
      await fbSignOut(auth);
      setAdminProfile(null);
      return null;
    }

    const normalizedEmail = rawEmail.trim().toLowerCase();

    // Authoritative Server-Side Super Admin Verification
    let isOwner = false;
    try {
      const idToken = await currentUser.getIdToken();
      const meRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        isOwner = !!meData.isSuperAdmin;
      } else {
        // Fallback for bootstrap
        isOwner = normalizedEmail === 'primeonebrokerageinc@gmail.com';
      }
    } catch {
      // Offline / client fallback
      isOwner = normalizedEmail === 'primeonebrokerageinc@gmail.com';
    }

    try {
      // 1. Check direct doc /administrators/{uid}
      const adminDocRef = doc(db, 'administrators', currentUser.uid);
      const adminDoc = await getDoc(adminDocRef);

      if (adminDoc.exists()) {
        const data = adminDoc.data() as Administrator;

        // Check if deactivated
        if (data.status === 'INACTIVE') {
          setAuthError("Your administrator access has been deactivated.");
          await fbSignOut(auth);
          setAdminProfile(null);
          return null;
        }

        // Update last login
        await updateDoc(adminDocRef, {
          lastLoginAt: new Date().toISOString(),
          lastLoginProvider: 'google.com',
          photoURL: currentUser.photoURL || data.photoURL || '',
          name: currentUser.displayName || data.name || 'Administrator',
        });

        const profile: Administrator = {
          ...data,
          role: isOwner ? 'SUPER_ADMIN' : data.role || 'ADMIN',
          permissions: isOwner ? SUPER_ADMIN_PERMISSIONS : (data.permissions || DEFAULT_ADMIN_PERMISSIONS),
          lastLoginAt: new Date().toISOString(),
        };

        setAdminProfile(profile);
        setAuthError(null);
        return profile;
      }

      // 2. Check by normalizedEmail in /administrators collection
      const adminsRef = collection(db, 'administrators');
      const q = query(adminsRef, where('normalizedEmail', '==', normalizedEmail), limit(1));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        const docSnap = querySnap.docs[0];
        const data = docSnap.data() as Administrator;

        if (data.status === 'INACTIVE') {
          setAuthError("Your administrator access has been deactivated.");
          await fbSignOut(auth);
          setAdminProfile(null);
          return null;
        }

        // Migrate or link document to currentUser.uid
        await updateDoc(docSnap.ref, {
          id: currentUser.uid,
          lastLoginAt: new Date().toISOString(),
          lastLoginProvider: 'google.com',
          photoURL: currentUser.photoURL || data.photoURL || '',
        });

        const profile: Administrator = {
          ...data,
          id: currentUser.uid,
          role: isOwner ? 'SUPER_ADMIN' : data.role || 'ADMIN',
          permissions: isOwner ? SUPER_ADMIN_PERMISSIONS : (data.permissions || DEFAULT_ADMIN_PERMISSIONS),
          lastLoginAt: new Date().toISOString(),
        };

        setAdminProfile(profile);
        setAuthError(null);
        return profile;
      }

      // 3. If matching the configured Super Admin email, bootstrap Super Admin record
      if (isOwner) {
        const superAdmin: Administrator = {
          id: currentUser.uid,
          name: currentUser.displayName || "Beki's Studio Owner",
          email: rawEmail,
          normalizedEmail,
          photoURL: currentUser.photoURL || '',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          permissions: SUPER_ADMIN_PERMISSIONS,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          createdBy: 'system_bootstrap',
          lastLoginProvider: 'google.com',
        };

        await setDoc(adminDocRef, superAdmin);
        setAdminProfile(superAdmin);
        setAuthError(null);
        return superAdmin;
      }

      // 4. Not authorized
      setAuthError("Your account is not authorized to access Beki's Studio.");
      await fbSignOut(auth);
      setAdminProfile(null);
      return null;
    } catch (err) {
      console.error('Error verifying admin authorization:', err);

      // Super Admin recovery fallback
      if (isOwner) {
        const fallbackSuperAdmin: Administrator = {
          id: currentUser.uid,
          name: currentUser.displayName || "Beki's Studio Owner",
          email: rawEmail,
          normalizedEmail,
          photoURL: currentUser.photoURL || '',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          permissions: SUPER_ADMIN_PERMISSIONS,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          createdBy: 'system',
          lastLoginProvider: 'google.com',
        };
        setAdminProfile(fallbackSuperAdmin);
        setAuthError(null);
        return fallbackSuperAdmin;
      }

      setAuthError("Your account is not authorized to access Beki's Studio.");
      await fbSignOut(auth);
      setAdminProfile(null);
      return null;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    setLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await verifyAndLoadAdmin(result.user);
      setLoading(false);
      return !!profile;
    } catch (err: any) {
      setLoading(false);
      if (err?.code === 'auth/popup-closed-by-user') {
        return false;
      }
      setAuthError(err?.message || 'Authentication failed. Please try again.');
      return false;
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setUser(null);
      setAdminProfile(null);
    }
  };

  const clearAuthError = () => setAuthError(null);

  const role = adminProfile?.role || null;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAuthorizedAdmin = !!adminProfile && adminProfile.status === 'ACTIVE';
  const permissions = adminProfile?.permissions || (isSuperAdmin ? SUPER_ADMIN_PERMISSIONS : null);

  const hasPermission = (key: keyof AdminPermissions): boolean => {
    if (isSuperAdmin) return true;
    if (!permissions) return false;
    return !!permissions[key];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        adminProfile,
        role,
        permissions,
        isSuperAdmin,
        isAuthorizedAdmin,
        hasPermission,
        loading,
        authError,
        loginWithGoogle,
        logout,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
