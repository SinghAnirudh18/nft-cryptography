import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSignMessage } from 'wagmi';


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
        const verifySession = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                const response = await fetch(`${apiBaseUrl}/auth/verify-token`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.valid && data.user) {
                        setUser(data.user);
                        // Optional: Refresh token in storage if needed, but for now just sync state
                    } else {
                        logout();
                    }
                } else {
                    logout();
                }
            } catch (error) {
                console.error('Session verification failed:', error);
                logout();
            } finally {
                setLoading(false);
            }
        };

        verifySession();
    }, []); // Run only on mount (or when token changes? logic suggests on mount check is sufficient if we trust internal state updates)

    const login = (newToken: string, userData: User) => {
        console.log("AuthContext: login called, setting token:", newToken.substring(0, 10) + "...");
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

    // Wagmi hook for signing messages
    const { signMessageAsync } = useSignMessage();

    const loginWithWallet = async (address: string) => {
        try {
            setLoading(true);
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

            // 1. Get Nonce
            const nonceResponse = await fetch(`${apiBaseUrl}/auth/nonce/${address}`);
            const nonceData = await nonceResponse.json();

            if (!nonceResponse.ok || !nonceData.nonce) {
                throw new Error(nonceData.error || 'Failed to get nonce');
            }

            // 2. Sign Message
            const message = `Sign in to DAO Marketplace using account ${address}. Nonce: ${nonceData.nonce}`;
            const signature = await signMessageAsync({ message });

            // 3. Verify Signature
            const verifyResponse = await fetch(`${apiBaseUrl}/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: address, signature, message })
            });

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok && verifyData.token) {
                login(verifyData.token, verifyData.user);
                setLoading(false);
                return true;
            } else {
                throw new Error(verifyData.error || 'Verification failed');
            }
        } catch (error: any) {
            console.error("Wallet login failed", error);
            setLoading(false);
            throw error; // Re-throw so component can show specific error
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
