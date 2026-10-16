import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types';
import { auth, isFirebaseConfigured } from '../services/firebaseClient';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { fetchAdminTeam } from '../services/api';

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isStaff: boolean;
  loginAsDemo: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('vibepass_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser && fbUser.email) {
          try {
            const team = await fetchAdminTeam();
            const member = team.find((u) => u.email.toLowerCase() === fbUser.email?.toLowerCase());
            const user: AppUser = {
              uid: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || member?.name || fbUser.email.split('@')[0],
              role: member?.role || 'staff',
              createdAt: new Date().toISOString(),
            };
            setCurrentUser(user);
            localStorage.setItem('vibepass_user', JSON.stringify(user));
          } catch (e) {
            console.error('Erro ao verificar permissão do usuário', e);
          }
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        await signInWithEmailAndPassword(auth, email, pass);
        // onAuthStateChanged cuidará da atribuição
        return true;
      }

      // Verificação com time local
      const team = await fetchAdminTeam();
      const member = team.find((u) => u.email.toLowerCase() === email.toLowerCase());

      if (member) {
        // No modo teste local, aceita qualquer senha ou senha padrão
        const user: AppUser = {
          ...member,
        };
        setCurrentUser(user);
        localStorage.setItem('vibepass_user', JSON.stringify(user));
        return true;
      }

      // Se for a conta mestre inicial
      if (email.toLowerCase().includes('admin')) {
        const adminUser: AppUser = {
          uid: 'master-admin',
          email,
          name: 'Organizador Master',
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(adminUser);
        localStorage.setItem('vibepass_user', JSON.stringify(adminUser));
        return true;
      }

      throw new Error('E-mail não autorizado na equipe do evento.');
    } catch (err: any) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = (role: UserRole) => {
    const demoUser: AppUser = {
      uid: `demo-${role}-${Date.now()}`,
      email: role === 'admin' ? 'admin@vibepass.com' : 'portaria@vibepass.com',
      name: role === 'admin' ? 'Administrador Geral' : 'Operador Portaria',
      role,
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(demoUser);
    localStorage.setItem('vibepass_user', JSON.stringify(demoUser));
  };

  const logout = () => {
    if (isFirebaseConfigured && auth) {
      fbSignOut(auth).catch(console.error);
    }
    setCurrentUser(null);
    localStorage.removeItem('vibepass_user');
  };

  const isAdmin = currentUser?.role === 'admin';
  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'staff';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        login,
        logout,
        isAdmin,
        isStaff,
        loginAsDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
