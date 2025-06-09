import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { supabase } from "../../lib/supabase";
import * as SecureStore from "expo-secure-store";

interface AuthState {
  user: any | null;
  session: any | null;
  deviceType: "parent" | "child" | "unlinked";
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  session: null,
  deviceType: "unlinked",
  isLoading: false,
  error: null,
};

// Parent authentication thunks
export const signUpParent = createAsyncThunk(
  "auth/signUpParent",
  async ({
    email,
    password,
    firstName,
    lastName,
  }: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // Create profile record
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        email: email,
      });

      if (profileError) throw profileError;
    }

    return data;
  },
);

export const signInParent = createAsyncThunk(
  "auth/signInParent",
  async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },
);

export const signInWithGoogle = createAsyncThunk(
  "auth/signInWithGoogle",
  async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });

    if (error) throw error;
    return data;
  },
);

export const signInWithFacebook = createAsyncThunk(
  "auth/signInWithFacebook",
  async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
    });

    if (error) throw error;
    return data;
  },
);

export const signOut = createAsyncThunk("auth/signOut", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  // Clear secure storage
  await SecureStore.deleteItemAsync("childPin");
  await SecureStore.deleteItemAsync("childProfile");

  return null;
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setDeviceType: (
      state,
      action: PayloadAction<"parent" | "child" | "unlinked">,
    ) => {
      state.deviceType = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setSession: (state, action) => {
      state.session = action.payload;
      state.user = action.payload?.user || null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Sign up parent
      .addCase(signUpParent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUpParent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.deviceType = "parent";
      })
      .addCase(signUpParent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Sign up failed";
      })
      // Sign in parent
      .addCase(signInParent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInParent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.deviceType = "parent";
      })
      .addCase(signInParent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Sign in failed";
      })
      // Google OAuth
      .addCase(signInWithGoogle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.deviceType = "parent";
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Google sign-in failed";
      })
      // Facebook OAuth
      .addCase(signInWithFacebook.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithFacebook.fulfilled, (state, action) => {
        state.isLoading = false;
        state.deviceType = "parent";
      })
      .addCase(signInWithFacebook.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Facebook sign-in failed";
      })
      // Sign out
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.session = null;
        state.deviceType = "unlinked";
        state.error = null;
      });
  },
});

export const { setDeviceType, clearError, setSession } = authSlice.actions;
export default authSlice.reducer;
