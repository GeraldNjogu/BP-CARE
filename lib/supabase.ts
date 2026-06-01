import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// 1. Pull from process environment or your app.config.js extra payload
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.supabaseAnonKey;

// 2. Terminal diagnostic logs
console.log('--- SUPABASE INITIALIZATION DIAGNOSTICS ---');
console.log('URL String present:', !!supabaseUrl);
console.log('Anon Key string present:', !!supabaseAnonKey);
console.log('------------------------------------------');

// 3. Fallbacks to prevent application runtime bundle crashes if keys disappear
const finalUrl = supabaseUrl || "https://placeholder-if-missing.supabase.co";
const finalAnonKey = supabaseAnonKey || "placeholder-key-if-missing";

// 4. Single explicit export instance
export const supabase = createClient(finalUrl, finalAnonKey);