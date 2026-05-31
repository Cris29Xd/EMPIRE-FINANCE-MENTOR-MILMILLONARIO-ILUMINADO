import React, { createContext, useContext } from "react";

// No Firebase Auth — personal app uses a local UUID as ownerId.
const UID_KEY = 'empire-uid';

function getUid(): string {
  let uid = localStorage.getItem(UID_KEY);
  if (!uid) {
    uid = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(UID_KEY, uid);
  }
  return uid;
}

export interface LocalUser { uid: string; displayName: string; photoURL: null; }

const LOCAL_USER: LocalUser = { uid: getUid(), displayName: 'Empire Builder', photoURL: null };

const AuthContext = createContext({ user: LOCAL_USER, loading: false });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthContext.Provider value={{ user: LOCAL_USER, loading: false }}>
    {children}
  </AuthContext.Provider>
);

export const useAuth = () => useContext(AuthContext);
