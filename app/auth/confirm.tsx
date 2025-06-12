import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../store";
import { setSession } from "../../store/slices/authSlice";
import { supabase } from "../../lib/supabase";
import { CheckCircle, XCircle, Mail } from "lucide-react-native";

export default function EmailConfirmScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "expired"
  >("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        if (!params.token_hash) {
          setStatus("error");
          setMessage(
            "Invalid confirmation link. Please check your email and try again.",
          );
          return;
        }

        // Verify the email confirmation token
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: params.token_hash as string,
          type: "email",
        });

        if (error) {
          console.error("Email confirmation error:", error);

          if (error.message.includes("expired")) {
            setStatus("expired");
            setMessage(
              "This confirmation link has expired. Please request a new one.",
            );
          } else if (error.message.includes("already confirmed")) {
            setStatus("success");
            setMessage("Your email is already confirmed! You can now sign in.");
          } else {
            setStatus("error");
            setMessage(
              "Failed to confirm your email. The link may be invalid or expired.",
            );
          }
          return;
        }

        if (data.session) {
          // Create profile after successful email confirmation
          const user = data.session.user;
          try {
            const { error: profileError } = await supabase
              .from("profiles")
              .insert({
                id: user.id,
                email: user.email || "",
                first_name: user.user_metadata?.first_name || "User",
                last_name: user.user_metadata?.last_name || "",
              });

            if (profileError && profileError.code !== "23505") {
              // Ignore duplicate key errors
              console.error("Profile creation error:", profileError);
            }
          } catch (profileError) {
            console.error("Profile creation failed:", profileError);
          }

          dispatch(setSession(data.session));
          setStatus("success");
          setMessage(
            "Your email has been successfully confirmed! Welcome to Famify.",
          );
        } else {
          setStatus("error");
          setMessage(
            "Email confirmed but no session created. Please try signing in.",
          );
        }
      } catch (error: any) {
        console.error("Email confirmation error:", error);
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };

    confirmEmail();
  }, [dispatch, params]);

  const handleContinue = () => {
    if (status === "success") {
      router.replace("/parent/dashboard");
    } else {
      router.replace("/auth/parent-login");
    }
  };

  const handleResendConfirmation = () => {
    Alert.alert(
      "Resend Confirmation",
      "To resend the confirmation email, please go back to the registration page and create your account again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Go to Registration",
          onPress: () => router.replace("/auth/parent-register"),
        },
      ],
    );
  };

  const getIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircle size={64} color="#10b981" />;
      case "error":
      case "expired":
        return <XCircle size={64} color="#ef4444" />;
      default:
        return <Mail size={64} color="#6366f1" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case "success":
        return "Email Confirmed!";
      case "expired":
        return "Link Expired";
      case "error":
        return "Confirmation Failed";
      default:
        return "Confirming Email...";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <StatusBar style="dark" />
      <View className="flex-1 justify-center items-center px-6">
        <View className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-lg items-center">
          {status === "loading" ? (
            <ActivityIndicator size="large" color="#6366f1" className="mb-6" />
          ) : (
            <View className="mb-6">{getIcon()}</View>
          )}

          <Text className="text-2xl font-bold text-center mb-4 text-gray-800">
            {getTitle()}
          </Text>

          <Text className="text-center mb-8 text-gray-600 leading-6">
            {message}
          </Text>

          {status !== "loading" && (
            <View className="w-full">
              <TouchableOpacity
                onPress={handleContinue}
                className="bg-indigo-600 py-4 px-6 rounded-xl mb-3 w-full"
              >
                <Text className="text-white font-bold text-lg text-center">
                  {status === "success"
                    ? "Continue to Dashboard"
                    : "Back to Sign In"}
                </Text>
              </TouchableOpacity>

              {status === "expired" && (
                <TouchableOpacity
                  onPress={handleResendConfirmation}
                  className="bg-gray-100 py-4 px-6 rounded-xl w-full"
                >
                  <Text className="text-gray-700 font-medium text-lg text-center">
                    Resend Confirmation
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
