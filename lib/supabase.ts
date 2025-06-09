import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// These would be set in your environment variables
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key";

// Conditionally import AsyncStorage only for React Native
let AsyncStorage: any = null;
if (Platform.OS !== "web") {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: Platform.OS !== "web",
    detectSessionInUrl: Platform.OS === "web",
  },
});
