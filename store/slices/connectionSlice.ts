import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { supabase } from "../../lib/supabase";
import * as Crypto from "expo-crypto";

interface ConnectionToken {
  id: string;
  token: string;
  childName: string;
  parentId: string;
  expiresAt: string;
  used: boolean;
}

interface ConnectionState {
  currentToken: ConnectionToken | null;
  isGenerating: boolean;
  isScanning: boolean;
  error: string | null;
}

const initialState: ConnectionState = {
  currentToken: null,
  isGenerating: false,
  isScanning: false,
  error: null,
};

export const generateConnectionToken = createAsyncThunk(
  "connection/generateToken",
  async ({ childName, parentId }: { childName: string; parentId: string }) => {
    // Generate unique token
    const token = await Crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    const { data, error } = await supabase
      .from("connection_tokens")
      .insert({
        token,
        child_name: childName,
        parent_id: parentId,
        expires_at: expiresAt,
        used: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
);

export const validateConnectionToken = createAsyncThunk(
  "connection/validateToken",
  async ({ token }: { token: string }) => {
    const { data, error } = await supabase
      .from("connection_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .single();

    if (error) throw new Error("Invalid or expired QR code");

    // Check if token is expired
    if (new Date(data.expires_at) < new Date()) {
      throw new Error("QR code has expired");
    }

    // Mark token as used
    const { error: updateError } = await supabase
      .from("connection_tokens")
      .update({ used: true })
      .eq("id", data.id);

    if (updateError) throw updateError;

    return data;
  },
);

const connectionSlice = createSlice({
  name: "connection",
  initialState,
  reducers: {
    clearCurrentToken: (state) => {
      state.currentToken = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setScanning: (state, action: PayloadAction<boolean>) => {
      state.isScanning = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate token
      .addCase(generateConnectionToken.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateConnectionToken.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.currentToken = action.payload;
      })
      .addCase(generateConnectionToken.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.error.message || "Failed to generate QR code";
      })
      // Validate token
      .addCase(validateConnectionToken.pending, (state) => {
        state.isScanning = true;
        state.error = null;
      })
      .addCase(validateConnectionToken.fulfilled, (state) => {
        state.isScanning = false;
      })
      .addCase(validateConnectionToken.rejected, (state, action) => {
        state.isScanning = false;
        state.error = action.error.message || "Failed to validate QR code";
      });
  },
});

export const { clearCurrentToken, clearError, setScanning } =
  connectionSlice.actions;
export default connectionSlice.reducer;
