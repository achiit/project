import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  diagnosticCenter: any;
  login: (center: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [diagnosticCenter, setDiagnosticCenter] = useState(null);

  const login = (center: any) => {
    setIsAuthenticated(true);
    setDiagnosticCenter(center);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setDiagnosticCenter(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, diagnosticCenter, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}