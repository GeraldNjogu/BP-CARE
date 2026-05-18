import createContextHook from "@nkzw/create-context-hook";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, signIn, signUp, signOut, updateProfile } from "@/services/auth";
import { Alert } from "react-native";

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  age: number;
  gender: "male" | "female" | "other";
  height: number;
  weight: number;
  bmi: number;
  smoking: "never" | "former" | "current";
  alcohol: "none" | "light" | "moderate" | "heavy";
  conditions: string[];
  photoUrl?: string;
};

type AuthState = {
  isAuthenticated: boolean;
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (profile: Omit<UserProfile, "id" | "bmi"> & { password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
};

export const [AuthProvider, useAuth] = createContextHook((): AuthState => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user && mounted) {
        const profile = await getProfile(session.user.id);
        if (profile) {
          setUser(profile);
          setIsAuthenticated(true);
        }
      }
      if (mounted) setIsLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        const profile = await getProfile(session.user.id);
        if (profile) {
          setUser(profile);
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const authUser = await signIn(email, password);
      const profile = await getProfile(authUser.id);
      if (profile) {
        setUser(profile);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

const signup = useCallback(async (profile: Omit<UserProfile, "id" | "bmi"> & { password: string }) => {
  try {
    const { password, ...rest } = profile;
    
    // 1. Perform the actual signup
    const authUser = await signUp(rest.email, password, rest);
    
    if (!authUser) return false;

    // 2. WAIT for the database trigger to finish (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    // 3. Try to fetch the newly created profile
    const newProfile = await getProfile(authUser.id);
    
    if (newProfile) {
      setUser(newProfile);
      setIsAuthenticated(true);
      return true; // Now it will correctly report success!
    }
    
    // If it reaches here, the profile really didn't create
    return false;
  } catch (error) {
    console.error("Signup error:", error);
    return false;
  }
}, []);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const updateUser = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;
    await updateProfile(user.id, updates);
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }, [user]);

  return { isAuthenticated, user, isLoading, login, signup, logout, updateUser };
});
