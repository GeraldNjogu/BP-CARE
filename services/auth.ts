import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/context/AuthContext";
import { Database } from "@/lib/database.type";

export async function signUp(email: string, password: string, profile: Omit<UserProfile, "id" | "bmi">) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        // Pass all health data here so the Trigger can see it
        fullName: profile.fullName,
        age: profile.age,
        gender: profile.gender,
        height: profile.height,
        weight: profile.weight,
        smoking: profile.smoking,
        alcohol: profile.alcohol,
        conditions: profile.conditions || [],
      },
    },
  });

  if (authError || !authData.user) {
    throw authError || new Error("Signup failed");
  }

  // ALL manual inserts for "profiles" and "user_settings" are now removed.
  return authData.user;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await (supabase.from("profiles") as any)
    .select("*")
    .eq("id", userId)
    .maybeSingle(); // Changed from .single() to avoid 406 error

  if (error || !data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    age: data.age,
    gender: data.gender,
    height: data.height,
    weight: data.weight,
    bmi: data.bmi,
    smoking: data.smoking,
    alcohol: data.alcohol,
    conditions: data.conditions,
    photoUrl: data.photo_url || undefined,
  };
}
export async function updateProfile(userId: string, updates: Partial<UserProfile>) {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.age !== undefined) dbUpdates.age = updates.age;
  if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
  if (updates.height !== undefined) dbUpdates.height = updates.height;
  if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
  if (updates.bmi !== undefined) dbUpdates.bmi = updates.bmi;
  if (updates.smoking !== undefined) dbUpdates.smoking = updates.smoking;
  if (updates.alcohol !== undefined) dbUpdates.alcohol = updates.alcohol;
  if (updates.conditions !== undefined) dbUpdates.conditions = updates.conditions;
  if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await (supabase.from("profiles") as any)
    .update(dbUpdates)
    .eq("id", userId);
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const redirectTo = `${Constants.expoConfig?.extra?.EXPO_PUBLIC_RORK_AUTH_URL as string}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw error;
}
