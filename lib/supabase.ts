import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// Simple storage getter
const getAsyncStorage = () => {
  if (Platform.OS === "web") return undefined;
  try {
    return require("@react-native-async-storage/async-storage").default;
  } catch {
    return null;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getAsyncStorage(),
    autoRefreshToken: true,
    persistSession: Platform.OS !== "web",
    detectSessionInUrl: Platform.OS === "web",
    flowType: "pkce",
  },
  global: {
    headers: {
      // Bypass RLS for development
      "X-Client-Info": "supabase-js-web",
    },
  },
});
