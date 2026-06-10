import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types/db";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type UserRoles = {
  is_player: boolean;
  is_promoter: boolean;
  is_cancha: boolean;
  is_admin: boolean;
} | null;

// ─── AuthStateContext ─────────────────────────────────────────────────────────

interface AuthStateContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthStateContext = createContext<AuthStateContextValue | null>(null);

export function useAuthState(): AuthStateContextValue {
  const ctx = useContext(AuthStateContext);
  if (!ctx) throw new Error("useAuthState must be used inside AuthProvider");
  return ctx;
}

function AuthStateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthStateContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthStateContext.Provider>
  );
}

// ─── UserProfileContext ───────────────────────────────────────────────────────

interface UserProfileContextValue {
  profile: Profile | null;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (partial: Partial<Profile>) => void;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function useUserProfile(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error("useUserProfile must be used inside AuthProvider");
  return ctx;
}

function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuthState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  async function loadProfile(userId: string) {
    setProfileLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data as Profile | null);
    setProfileLoading(false);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  function updateProfile(partial: Partial<Profile>) {
    setProfile((prev) => (prev ? { ...prev, ...partial } : null));
  }

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      loadProfile(user.id);
    } else {
      setProfile(null);
      setProfileLoading(false);
    }
  }, [user?.id, authLoading]);

  return (
    <UserProfileContext.Provider value={{ profile, profileLoading, refreshProfile, updateProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

// ─── UserRolesContext ─────────────────────────────────────────────────────────

interface UserRolesContextValue {
  roles: UserRoles;
  rolesLoading: boolean;
  refreshRoles: () => Promise<void>;
}

const UserRolesContext = createContext<UserRolesContextValue | null>(null);

export function useUserRoles(): UserRolesContextValue {
  const ctx = useContext(UserRolesContext);
  if (!ctx) throw new Error("useUserRoles must be used inside AuthProvider");
  return ctx;
}

function UserRolesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuthState();
  const [roles, setRoles] = useState<UserRoles>(null);
  const [rolesLoading, setRolesLoading] = useState(true);

  async function loadRoles(userId: string) {
    setRolesLoading(true);
    const { data } = await supabase
      .from("user_roles")
      .select("is_player, is_promoter, is_cancha, is_admin")
      .eq("user_id", userId)
      .maybeSingle();
    setRoles(data as UserRoles | null);
    setRolesLoading(false);
  }

  async function refreshRoles() {
    if (user) await loadRoles(user.id);
  }

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      loadRoles(user.id);
    } else {
      setRoles(null);
      setRolesLoading(false);
    }
  }, [user?.id, authLoading]);

  return (
    <UserRolesContext.Provider value={{ roles, rolesLoading, refreshRoles }}>
      {children}
    </UserRolesContext.Provider>
  );
}

// ─── Combined AuthProvider ────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthStateProvider>
      <UserProfileProvider>
        <UserRolesProvider>{children}</UserRolesProvider>
      </UserProfileProvider>
    </AuthStateProvider>
  );
}

// ─── Aggregate hook (backward-compatible) ────────────────────────────────────

export function useAuth() {
  return { ...useAuthState(), ...useUserProfile(), ...useUserRoles() };
}
