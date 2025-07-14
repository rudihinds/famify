import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { supabase } from "../../lib/supabase";

interface ChildProfile {
  id: string;
  name: string;
  age: number;
  avatar_url: string;
  focus_areas: string[];
  parent_id: string;
  pin_hash?: string;
  famcoin_balance: number;
  created_at: string;
  updated_at: string;
}

interface ChildState {
  profile: ChildProfile | null;
  isAuthenticated: boolean;
  pinAttempts: number;
  isLocked: boolean;
  lockUntil: number | null;
  sessionExpiry: number | null;
  lastActivity: number;
  isLoading: boolean;
  error: string | null;
  currentBalance: number; // Current FAMCOIN balance
  balanceLastUpdated: string | null;
}

const initialState: ChildState = {
  profile: null,
  isAuthenticated: false,
  pinAttempts: 0,
  isLocked: false,
  lockUntil: null,
  sessionExpiry: null,
  lastActivity: Date.now(),
  isLoading: false,
  error: null,
  currentBalance: 0,
  balanceLastUpdated: null,
};

// Validate PIN format
const validatePin = (pin: string): boolean => {
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) return false;

  // Check for sequential numbers
  const sequential = [
    "1234",
    "2345",
    "3456",
    "4567",
    "5678",
    "6789",
    "7890",
    "0123",
  ];
  const reverseSequential = sequential.map((s) =>
    s.split("").reverse().join(""),
  );

  if (sequential.includes(pin) || reverseSequential.includes(pin)) return false;

  // Check for all same digits
  if (pin === pin[0].repeat(4)) return false;

  return true;
};

// Hash PIN
const hashPin = async (pin: string): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin + "famify_salt",
  );
};

export const createChildProfile = createAsyncThunk(
  "child/createProfile",
  async ({
    name,
    age,
    avatar,
    focusAreas,
    parentId,
  }: {
    name: string;
    age: number;
    avatar: string;
    focusAreas: string[];
    parentId: string;
  }) => {
    const { data, error } = await supabase
      .from("children")
      .insert({
        name,
        age,
        avatar_url: avatar,
        focus_areas: focusAreas,
        parent_id: parentId,
        famcoin_balance: 0,
        pin_hash: "temp_hash_to_be_set", // Temporary value, will be updated during PIN creation
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
);

export const createPin = createAsyncThunk(
  "child/createPin",
  async ({ pin, childId }: { pin: string; childId: string }) => {
    if (!validatePin(pin)) {
      throw new Error("Invalid PIN format");
    }

    const hashedPin = await hashPin(pin);

    // Store PIN hash in database
    const { error } = await supabase
      .from("children")
      .update({ pin_hash: hashedPin })
      .eq("id", childId);

    if (error) throw error;

    // Store PIN hash locally for offline validation
    await SecureStore.setItemAsync("childPin", hashedPin);

    return hashedPin;
  },
);

export const validatePinLogin = createAsyncThunk(
  "child/validatePin",
  async ({ pin }: { pin: string }, { getState }) => {
    const state = getState() as any;
    const childState = state.child;

    if (
      childState.isLocked &&
      childState.lockUntil &&
      Date.now() < childState.lockUntil
    ) {
      throw new Error("Account is locked. Please try again later.");
    }

    const hashedPin = await hashPin(pin);
    const storedPin = await SecureStore.getItemAsync("childPin");

    if (hashedPin !== storedPin) {
      throw new Error("Invalid PIN");
    }

    // Create 2-hour session
    const sessionExpiry = Date.now() + 2 * 60 * 60 * 1000; // 2 hours

    return { sessionExpiry };
  },
);

const childSlice = createSlice({
  name: "child",
  initialState,
  reducers: {
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    incrementPinAttempts: (state) => {
      state.pinAttempts += 1;
      if (state.pinAttempts >= 3) {
        state.isLocked = true;
        state.lockUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
      }
    },
    resetPinAttempts: (state) => {
      state.pinAttempts = 0;
      state.isLocked = false;
      state.lockUntil = null;
    },
    checkSessionExpiry: (state) => {
      if (state.sessionExpiry && Date.now() > state.sessionExpiry) {
        state.isAuthenticated = false;
        state.sessionExpiry = null;
      }
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.sessionExpiry = null;
      state.pinAttempts = 0;
      state.isLocked = false;
      state.lockUntil = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setProfile: (state, action: PayloadAction<ChildProfile>) => {
      state.profile = action.payload;
      state.currentBalance = action.payload.famcoin_balance || 0;
      state.balanceLastUpdated = new Date().toISOString();
    },
    devModeLogin: (state, action: PayloadAction<ChildProfile>) => {
      // Dev mode: bypass PIN and set authenticated
      state.profile = action.payload;
      state.isAuthenticated = true;
      state.sessionExpiry = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
      state.pinAttempts = 0;
      state.isLocked = false;
      state.lockUntil = null;
      state.lastActivity = Date.now();
      // Set initial balance from profile
      state.currentBalance = action.payload.famcoin_balance || 0;
      state.balanceLastUpdated = new Date().toISOString();
    },
    updateBalance: (state, action: PayloadAction<number>) => {
      state.currentBalance = action.payload;
      state.balanceLastUpdated = new Date().toISOString();
      // Also update profile if it exists
      if (state.profile) {
        state.profile.famcoin_balance = action.payload;
      }
    },
    setBalanceLastUpdated: (state, action: PayloadAction<string>) => {
      state.balanceLastUpdated = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create profile
      .addCase(createChildProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createChildProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(createChildProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to create profile";
      })
      // Create PIN
      .addCase(createPin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPin.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createPin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to create PIN";
      })
      // Validate PIN
      .addCase(validatePinLogin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(validatePinLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.sessionExpiry = action.payload.sessionExpiry;
        state.pinAttempts = 0;
        state.isLocked = false;
        state.lockUntil = null;
        state.lastActivity = Date.now();
      })
      .addCase(validatePinLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Invalid PIN";
      });
  },
});

export const {
  updateLastActivity,
  incrementPinAttempts,
  resetPinAttempts,
  checkSessionExpiry,
  logout,
  clearError,
  setProfile,
  devModeLogin,
  updateBalance,
  setBalanceLastUpdated,
} = childSlice.actions;

export default childSlice.reducer;
