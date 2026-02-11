import { createContext, useContext, useState, useEffect, ReactNode } from 'react';


interface User {
    id: string;
    username: string;
    email: string;
    walletAddress?: string;
    profileImage?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, userData: User) => void;
    loginWithWallet: (address: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const loadUser = async () => {
            if (token) {
                try {
                    // Ideally, verify token with backend or store user in local storage
                    // For now, we'll try to get user profile if token exists
                    // Or rely on stored user data if we decide to store it

                    // Simple check: if token exists, we are "logged in" but might need user details
                    // Let's decode or fetch profile. For now, assuming persistence via localStorage for user too
                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                        setUser(JSON.parse(storedUser));
                    }
                } catch (error) {
                    console.error('Failed to load user', error);
                    logout();
                }
            }
            setLoading(false);
        };

        loadUser();
    }, [token]);

    const login = (newToken: string, userData: User) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const loginWithWallet = async (address: string) => {
        try {
            // We can't use 'api' from '../api/client' here if it causes circular deps or context issues?
            // But actually, we need to call the backend.
            // Let's assume we can fetch directly or use a simple fetch for now to avoid complexity imports if needed.
            // Or use the `api` client if imported.
            // Importing api client here *might* be fine.
            // For safety, I'll use fetch or axios directly if possible, OR import api.
            // Let's try importing api at the top.

            // Dynamic import or assumed global?
            // I'll just use fetch to be safe from circular dependency with axios interceptors using auth context?
            // Actually, axios interceptor usually uses localStorage, not AuthContext directly (unless planned).
            // Let's assume fetch for now.

            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await fetch(`${apiBaseUrl}/auth/wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: address })
            });

            const data = await response.json();
            if (data.status === 'success') {
                login(data.data.token, data.data);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Wallet login failed", error);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            loginWithWallet,
            logout,
            isAuthenticated: !!token,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
