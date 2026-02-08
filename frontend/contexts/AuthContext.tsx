"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type AuthContextType = {
    user: User | null;
    loading: boolean;
    isDemoMode: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isDemoMode: false });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);

            // 自動ログインロジック
            if (!user && process.env.NEXT_PUBLIC_AUTO_LOGIN === "true") {
                const email = process.env.NEXT_PUBLIC_DEMO_EMAIL;
                const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

                if (email && password) {
                    try {
                        console.log("Auto-logging in as demo user...");
                        const { signInWithEmailAndPassword } = await import("firebase/auth");
                        await signInWithEmailAndPassword(auth, email, password);
                        setIsDemoMode(true);
                    } catch (error) {
                        console.error("Auto-login failed:", error);
                    }
                }
            }

            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, isDemoMode }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
