import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { toast } from "sonner";

interface AuthUser extends User {
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    company?: string;
    role?: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ user: User | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: any) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  deleteAccount: () => Promise<{ error: AuthError | null }>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session:", error);
          toast.error("Failed to load session");
        } else {
          setSession(session);
          setUser(session?.user as AuthUser || null);
        }
      } catch (error) {
        console.error("Unexpected error getting session:", error);
        toast.error("Unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user as AuthUser || null);
        setLoading(false);

        // Handle different auth events
        switch (event) {
          case "SIGNED_IN":
            toast.success("Successfully signed in!");
            break;
          case "SIGNED_OUT":
            toast.success("Successfully signed out!");
            break;
          case "PASSWORD_RECOVERY":
            toast.info("Check your email for password reset instructions");
            break;
          case "USER_UPDATED":
            toast.success("Profile updated successfully!");
            break;
          case "TOKEN_REFRESHED":
            console.log("Token refreshed");
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, metadata = {}) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.fullName || "",
            company: metadata.company || "",
            role: metadata.role || "user",
            ...metadata
          }
        }
      });

      if (error) {
        toast.error(error.message);
        return { user: null, error };
      }

      if (data.user && !data.session) {
        toast.info("Check your email to confirm your account!");
      }

      return { user: data.user, error: null };
    } catch (error: any) {
      const authError = error as AuthError;
      toast.error("An unexpected error occurred during sign up");
      return { user: null, error: authError };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (error: any) {
      const authError = error as AuthError;
      toast.error("An unexpected error occurred during sign in");
      return { user: null, error: authError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error(error.message);
        return { error };
      }

      // Clear local state
      setUser(null);
      setSession(null);
      
      return { error: null };
    } catch (error: any) {
      const authError = error as AuthError;
      toast.error("An unexpected error occurred during sign out");
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success("Password reset email sent!");
      return { error: null };
    } catch (error: any) {
      const authError = error as AuthError;
      toast.error("An unexpected error occurred");
      return { error: authError };
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        data: updates
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      return { error: null };
    } catch (error: any) {
      const authError = error as AuthError;
      toast.error("An unexpected error occurred while updating profile");
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success("Password updated successfully!");
      return { error: null };
    } catch (error: any) {
      const authError = error as AuthError;
      toast.error("An unexpected error occurred while updating password");
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    try {
      setLoading(true);
      
      // Note: Supabase doesn't have a direct delete user method in the client
      // This would typically be handled by a server-side function
      // For now, we'll sign out the user and show a message
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error("Error signing out during account deletion");
        return { error };
      }

      toast.info("Account deletion requested. Please contact support to complete the process.");
      return { error: null };
    } catch (error: any) {
      const authError = error as AuthError;
      toast.error("An unexpected error occurred");
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    updatePassword,
    deleteAccount,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;