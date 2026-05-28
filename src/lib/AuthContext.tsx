import React, { createContext, useContext } from "react";

// Simple local identity — no login required.
// UID is generated once and persisted in localStorage.
function getOrCreateUid(): string {
  const key = 'empire-uid';
  let uid = localStorage.getItem(key);
  if (!uid) {
    uid = 'local-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, uid);
  }
  return uid;
}

export interface LocalUser {
  uid: string;
  displayName: string;
  photoURL: null;
}

const LOCAL_USER: LocalUser = {
  uid: getOrCreateUid(),
  displayName: 'Empire Builder',
  photoURL: null,
};

interface AuthContextType {
  user: LocalUser;
  loading: false;
}

const AuthContext = createContext<AuthContextType>({
  user: LOCAL_USER,
  loading: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthContext.Provider value={{ user: LOCAL_USER, loading: false }}>
    {children}
  </AuthContext.Provider>
);

export const useAuth = () => useContext(AuthContext);
