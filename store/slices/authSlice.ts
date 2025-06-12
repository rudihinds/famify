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

// Get dynamic redirect URL
const getRedirectUrl = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  // For mobile/native, use the app scheme or deep link
  return "exp://localhost:8081/--/auth/callback";
};

// Helper function to create user profile
const createUserProfile = async (
  user: any,
  additionalData?: { firstName?: string; lastName?: string },
) => {
  console.log("[AUTH] Creating profile for user:", user.id);
  console.log("[AUTH] User metadata:", user.user_metadata);
  console.log("[AUTH] Current session:", await supabase.auth.getSession());

  const profileData = {
    id: user.id,
    email: user.email || "",
    first_name:
      additionalData?.firstName || user.user_metadata?.first_name || "User",
    last_name: additionalData?.lastName || user.user_metadata?.last_name || "",
  };

  console.log("[AUTH] Profile data to insert:", profileData);

  // First check if profile already exists
  const { data: existingProfiles, error: fetchError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id);

  if (fetchError) {
    console.error("[AUTH] Error checking existing profile:", fetchError);
  } else if (existingProfiles && existingProfiles.length > 0) {
    console.log("[AUTH] Profile already exists for user:", user.id);
    return { success: true, existed: true };
  }

  // Try to insert the profile
  const { data, error } = await supabase.from("profiles").insert(profileData);

  if (error) {
    console.error("[AUTH] Profile creation error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    if (error.code === "23505") {
      console.log("[AUTH] Profile already exists (duplicate key):", user.id);
      return { success: true, existed: true };
    }

    // If it's an RLS error, log additional context
    if (error.message.includes("row-level security")) {
      console.error(
        "[AUTH] RLS Policy violation - user may not be properly authenticated",
      );
      console.error(
        "[AUTH] Current auth state:",
        await supabase.auth.getUser(),
      );
    }

    throw error;
  }

  console.log("[AUTH] Profile created successfully:", data);
  return { success: true, existed: false };
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
    console.log("[AUTH] Starting parent signup for:", email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getRedirectUrl(),
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) {
      console.error("[AUTH] Signup error:", error);
      throw error;
    }

    console.log("[AUTH] Signup response:", {
      user: !!data.user,
      session: !!data.session,
    });

    if (!data.user) {
      throw new Error("User registration failed");
    }

    // Only create profile if we have an active session (auto-confirmed)
    if (data.user && data.session) {
      console.log("[AUTH] User auto-confirmed, creating profile immediately");
      try {
        await createUserProfile(data.user, { firstName, lastName });
      } catch (profileError) {
        console.error(
          "[AUTH] Profile creation failed during signup:",
          profileError,
        );
        // Don't throw - user is still registered
      }
    } else {
      console.log(
        "[AUTH] Email confirmation required, profile will be created after confirmation",
      );
    }

    return {
      user: data.user,
      session: data.session,
      needsEmailConfirmation: !data.session,
    };
  },
);

export const signInParent = createAsyncThunk(
  "auth/signInParent",
  async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        throw new Error("Invalid email or password");
      }
      throw error;
    }

    // Verify user has a profile, create one if missing
    if (data.user) {
      console.log("[AUTH] Checking for existing profile after sign in");
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id);

      if (profileError) {
        console.error("[AUTH] Profile fetch error:", profileError);
      } else if (!profiles || profiles.length === 0) {
        console.log("[AUTH] No profile found after sign in, creating one");
        try {
          await createUserProfile(data.user);
          console.log("[AUTH] Profile created successfully after sign in");
        } catch (createError) {
          console.error(
            "[AUTH] Failed to create profile after sign in:",
            createError,
          );
        }
      } else {
        console.log("[AUTH] Profile exists for user:", data.user.id);
      }
    }

    return data;
  },
);

export const signInWithGoogle = createAsyncThunk(
  "auth/signInWithGoogle",
  async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectUrl(),
      },
    });

    if (error) throw error;

    // Note: For OAuth, the actual user data will be available after redirect
    // This thunk mainly initiates the OAuth flow
    return data;
  },
);

export const signInWithFacebook = createAsyncThunk(
  "auth/signInWithFacebook",
  async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: getRedirectUrl(),
      },
    });

    if (error) throw error;

    // Note: For OAuth, the actual user data will be available after redirect
    // This thunk mainly initiates the OAuth flow
    return data;
  },
);

// Handle email confirmation and create profile
export const handleEmailConfirmation = createAsyncThunk(
  "auth/handleEmailConfirmation",
  async ({ tokenHash }: { tokenHash: string }) => {
    console.log("[AUTH] Handling email confirmation with token hash");

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

    if (error) {
      console.error("[AUTH] Email confirmation error:", error);
      throw error;
    }

    if (!data.session || !data.user) {
      throw new Error("No session created after email confirmation");
    }

    console.log("[AUTH] Email confirmed successfully");
    console.log("[AUTH] Session created:", !!data.session);
    console.log("[AUTH] User authenticated:", !!data.user);

    // Wait a moment to ensure session is fully established
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify the session is active before creating profile
    const { data: sessionCheck } = await supabase.auth.getSession();
    console.log(
      "[AUTH] Session check after confirmation:",
      !!sessionCheck.session,
    );

    // Create profile after successful email confirmation
    try {
      console.log(
        "[AUTH] Attempting to create profile after email confirmation",
      );
      const profileResult = await createUserProfile(data.user);
      console.log("[AUTH] Profile creation result:", profileResult);
    } catch (profileError) {
      console.error(
        "[AUTH] Profile creation failed after email confirmation:",
        profileError,
      );
      // Don't throw - user is still authenticated, but log the issue
      console.error(
        "[AUTH] This is a critical issue - user authenticated but no profile created",
      );
    }

    return data;
  },
);

// Handle OAuth callback and create profile if needed
export const handleOAuthCallback = createAsyncThunk(
  "auth/handleOAuthCallback",
  async () => {
    console.log("[AUTH] Handling OAuth callback");

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("[AUTH] OAuth session error:", error);
      throw error;
    }
    if (!data.session) throw new Error("No session found");

    const user = data.session.user;
    console.log("[AUTH] OAuth session found for user:", user.id);

    // Check if user has a profile, create one if not
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id);

    if (profileError) {
      console.error("[AUTH] Error fetching OAuth user profile:", profileError);
    } else if (!profiles || profiles.length === 0) {
      console.log("[AUTH] No profile found, creating one for OAuth user");
      try {
        await createUserProfile(user);
      } catch (createError) {
        console.error("[AUTH] OAuth profile creation failed:", createError);
        // Don't throw - user is still authenticated
      }
    } else {
      console.log("[AUTH] Profile already exists for OAuth user");
    }

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
      // Handle email confirmation
      .addCase(handleEmailConfirmation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(handleEmailConfirmation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.deviceType = "parent";
      })
      .addCase(handleEmailConfirmation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Email confirmation failed";
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
        state.user = action.payload.user;
        state.session = action.payload.session;
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
        // OAuth flow initiated, actual session will be set via callback
      })
      .addCase(signInWithFacebook.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Facebook sign-in failed";
      })
      // OAuth callback handling
      .addCase(handleOAuthCallback.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(handleOAuthCallback.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.session?.user || null;
        state.session = action.payload.session;
        state.deviceType = "parent";
      })
      .addCase(handleOAuthCallback.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "OAuth callback failed";
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
