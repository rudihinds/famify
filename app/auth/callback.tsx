import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../store";
import {
  handleOAuthCallback,
  handleEmailConfirmation,
  setSession,
} from "../../store/slices/authSlice";
import { supabase } from "../../lib/supabase";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState("processing");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("[CALLBACK] Starting auth callback with params:", params);

        // Handle email confirmation
        if (params.type === "signup" || params.token_hash) {
          console.log("[CALLBACK] Handling email confirmation");
          console.log("[CALLBACK] Token hash:", params.token_hash);
          setStatus("confirming");

          try {
            const result = await dispatch(
              handleEmailConfirmation({
                tokenHash: params.token_hash as string,
              }),
            ).unwrap();

            console.log("[CALLBACK] Email confirmation successful");
            console.log("[CALLBACK] Result:", {
              user: !!result.user,
              session: !!result.session,
            });
            setStatus("success");

            // Give a moment for profile creation to complete
            setTimeout(() => {
              Alert.alert(
                "Email Confirmed!",
                "Your account has been successfully verified. Welcome to Famify!",
                [
                  {
                    text: "Continue",
                    onPress: () => router.replace("/parent/dashboard"),
                  },
                ],
              );
            }, 1500);
            return;
          } catch (error: any) {
            console.error("[CALLBACK] Email confirmation failed:", error);
            setStatus("error");
            Alert.alert(
              "Confirmation Failed",
              "The confirmation link is invalid or has expired. Please try signing up again.",
              [
                {
                  text: "OK",
                  onPress: () => router.replace("/auth/parent-register"),
                },
              ],
            );
            return;
          }
        }

        // Handle OAuth callback
        console.log("[CALLBACK] Handling OAuth callback");
        setStatus("processing");
        const result = await dispatch(handleOAuthCallback()).unwrap();

        if (result.session) {
          console.log("[CALLBACK] OAuth callback successful");
          setStatus("success");
          router.replace("/parent/dashboard");
        } else {
          console.log("[CALLBACK] OAuth callback failed - no session");
          setStatus("error");
          router.replace("/auth/welcome");
        }
      } catch (error: any) {
        console.error("[CALLBACK] Auth callback error:", error);
        setStatus("error");

        Alert.alert(
          "Authentication Error",
          error.message ||
            "Something went wrong during authentication. Please try again.",
          [{ text: "OK", onPress: () => router.replace("/auth/welcome") }],
        );
      }
    };

    handleAuthCallback();
  }, [dispatch, router, params]);

  const getStatusMessage = () => {
    switch (status) {
      case "confirming":
        return "Confirming your email...";
      case "processing":
        return "Completing sign in...";
      case "success":
        return "Success! Redirecting...";
      case "error":
        return "Authentication failed";
      default:
        return "Processing...";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-indigo-50 justify-center items-center">
      <StatusBar style="dark" />
      <ActivityIndicator size="large" color="#4f46e5" />
      <Text className="mt-4 text-indigo-600 font-medium text-center px-6">
        {getStatusMessage()}
      </Text>
      {status === "confirming" && (
        <Text className="mt-2 text-gray-500 text-center px-6">
          Please wait while we verify your email address...
        </Text>
      )}
    </SafeAreaView>
  );
}
