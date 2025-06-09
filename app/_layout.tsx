import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";
import { Platform } from "react-native";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "../store";
import { supabase } from "../lib/supabase";
import { useDispatch } from "react-redux";
import { setSession } from "../store/slices/authSlice";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    // Only initialize auth on client side
    if (Platform.OS !== "web" || typeof window !== "undefined") {
      // Get initial session
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          dispatch(setSession(session));
        })
        .catch((error) => {
          console.warn("Failed to get initial session:", error);
        });

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        dispatch(setSession(session));
      });

      return () => subscription.unsubscribe();
    }
  }, [dispatch]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_TEMPO && Platform.OS === "web") {
      const { TempoDevtools } = require("tempo-devtools");
      TempoDevtools.init();
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <ThemeProvider value={DefaultTheme}>
            <Stack
              screenOptions={({ route }) => ({
                headerShown: !route.name.startsWith("tempobook"),
              })}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen
                name="auth/welcome"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="auth/parent-login"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="auth/parent-register"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="parent/dashboard"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="child/scanner"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="child/profile-setup"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="child/pin-creation"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="child/pin-login"
                options={{ headerShown: false }}
              />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}
